import { PathNormalizer, PathRuleBuilder, PathTransformers } from '../src';

describe('Integration Tests', () => {
  describe('Text Template Form Scenario', () => {
    let normalizer: PathNormalizer;
    const allowedLocales = ['en', 'ua', 'az'];

    beforeEach(() => {
      normalizer = new PathNormalizer({
        delimiter: '.',
        caseInsensitive: false,
      });

      // Rule 1: Handle text_templates with locale and any nested path
      normalizer.addRule(
        ['text_templates', (seg) => allowedLocales.includes(seg), '**'],
        (_, context) => {
          const locale = context.segments[1];
          const localeIndex = allowedLocales.indexOf(locale ?? '');
          const remainingPath = context.segments.slice(2).join('.');

          if (localeIndex === -1) return null;

          const base = `localization_fields.${localeIndex}.text_templates`;
          return remainingPath ? `${base}.${remainingPath}` : base;
        },
        10
      );

      // Rule 2: Handle simple top-level fields
      normalizer.addRule(['redirect_url'], (matched) => matched.join('.'), 5);
      normalizer.addRule(['category'], (matched) => matched.join('.'), 5);
      normalizer.addRule(['name'], (matched) => matched.join('.'), 5);

      // Rule 3: Handle nested config paths
      normalizer.addRule(['config', '**'], (_, context) => context.segments.join('.'), 3);
    });

    it('should handle basic text_templates paths', () => {
      const result = normalizer.normalizePath("text_templates['en'].text");
      expect(result.matched).toBe(true);
      expect(result.normalized).toBe('localization_fields.0.text_templates.text');
    });

    it('should handle array indices in text_templates', () => {
      const result = normalizer.normalizePath("text_templates['ua'].variables[0]");
      expect(result.matched).toBe(true);
      expect(result.normalized).toBe('localization_fields.1.text_templates.variables.0');
    });

    it('should handle deeply nested text_templates paths', () => {
      const result = normalizer.normalizePath("text_templates['az'].settings.enabled");
      expect(result.matched).toBe(true);
      expect(result.normalized).toBe('localization_fields.2.text_templates.settings.enabled');
    });

    it('should handle top-level fields', () => {
      expect(normalizer.normalizePath('name').normalized).toBe('name');
      expect(normalizer.normalizePath('redirect_url').normalized).toBe('redirect_url');
      expect(normalizer.normalizePath('category').normalized).toBe('category');
    });

    it('should handle config paths', () => {
      expect(normalizer.normalizePath('config.settings.timeout').normalized).toBe(
        'config.settings.timeout'
      );
      expect(normalizer.normalizePath('config').normalized).toBe('config');
    });

    it('should not match unknown fields', () => {
      const result = normalizer.normalizePath('unknown_field');
      expect(result.matched).toBe(false);
      expect(result.normalized).toBe('unknown_field');
    });

    it('should handle batch processing of backend errors', () => {
      const backendErrors: Record<string, string> = {
        "text_templates['en'].text": 'This field is required',
        "text_templates['ua'].variables[0]": 'Invalid variable format',
        name: 'Name must be unique',
        'config.settings.timeout': 'Timeout must be positive',
        'unknown.field': 'Some error',
      };

      const errorPaths = Object.keys(backendErrors);
      const results = normalizer.normalizePaths(errorPaths);

      const normalizedErrors: Record<string, string> = {};
      results.forEach((result, index) => {
        if (result.matched && result.normalized) {
          const errorPath = errorPaths[index];

          if (errorPath && backendErrors[errorPath]) {
            normalizedErrors[result.normalized] = backendErrors[errorPath];
          }
        }
      });

      expect(normalizedErrors).toEqual({
        'localization_fields.0.text_templates.text': 'This field is required',
        'localization_fields.1.text_templates.variables.0': 'Invalid variable format',
        name: 'Name must be unique',
        'config.settings.timeout': 'Timeout must be positive',
      });
    });
  });

  describe('Advanced Normalizer with Builder Pattern', () => {
    let normalizer: PathNormalizer;
    const allowedLocales = ['en', 'ua', 'az'];

    beforeEach(() => {
      normalizer = new PathNormalizer();

      const textTemplatesRule = PathRuleBuilder.create()
        .exact('text_templates')
        .oneOf(allowedLocales)
        .deepWildcard()
        .transform((_, context) => {
          const locale = context.segments[1];
          const localeIndex = allowedLocales.indexOf(locale ?? '');
          const remainingPath = context.segments.slice(2);

          return [
            'localization_fields',
            localeIndex.toString(),
            'text_templates',
            ...remainingPath,
          ];
        })
        .setPriority(10)
        .build();

      const localeFieldsRule = PathRuleBuilder.create()
        .regex(/^locale_/)
        .deepWildcard()
        .transform((_, context) => {
          return ['localization_fields', ...context.segments.slice(1)];
        })
        .setPriority(5)
        .build();

      normalizer.addRules([textTemplatesRule, localeFieldsRule]);
    });

    it('should handle text_templates with builder pattern', () => {
      const paths = ["text_templates['en'].text", "text_templates['az'].variables[0].name"];

      const results = normalizer.normalizePaths(paths);

      expect(results[0]?.normalized).toBe('localization_fields.0.text_templates.text');
      expect(results[1]?.normalized).toBe('localization_fields.2.text_templates.variables.0.name');
    });

    it('should handle locale_ prefix fields', () => {
      const paths = ['locale_en.title', 'locale_settings.enabled', 'locale_config.theme.dark'];

      const results = normalizer.normalizePaths(paths);

      results.forEach((result) => {
        expect(result.matched).toBe(true);
        expect(result.normalized?.startsWith('localization_fields.')).toBe(true);
      });
    });
  });

  describe('Complex Multi-Language Form', () => {
    let normalizer: PathNormalizer;

    beforeEach(() => {
      normalizer = new PathNormalizer();
      const languages = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES'];

      // Handle language-specific fields
      normalizer.addRule(
        ['fields', (seg) => languages.includes(seg), '**'],
        (_, context) => {
          const lang = context.segments[1];
          const langIndex = languages.indexOf(lang ?? '');
          const fieldPath = context.segments.slice(2);
          return `i18n[${langIndex}].content.${fieldPath.join('.')}`;
        },
        20
      );

      // Handle validation rules
      normalizer.addRule(
        ['validation', '*', 'rules', '**'],
        (_, context) => {
          const fieldName = context.segments[1];
          const rules = context.segments.slice(3);
          return `validators.${fieldName}.${rules.join('.')}`;
        },
        15
      );

      // Handle metadata
      normalizer.addRule(
        ['meta', '**'],
        (_, context) => {
          return `metadata.${context.segments.slice(1).join('.')}`;
        },
        10
      );
    });

    it('should handle complex language field paths', () => {
      const testCases = [
        {
          input: "fields['en-US'].title",
          expected: 'i18n[0].content.title',
        },
        {
          input: "fields['fr-FR'].description.long",
          expected: 'i18n[2].content.description.long',
        },
        {
          input: "fields['de-DE'].items[0].name",
          expected: 'i18n[3].content.items.0.name',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizer.normalizePath(input);
        expect(result.normalized).toBe(expected);
      });
    });

    it('should handle validation paths', () => {
      const paths = [
        'validation.email.rules.required',
        'validation.password.rules.minLength.value',
        'validation.username.rules.pattern.flags',
      ];

      const results = normalizer.normalizePaths(paths);

      expect(results[0]?.normalized).toBe('validators.email.required');
      expect(results[1]?.normalized).toBe('validators.password.minLength.value');
      expect(results[2]?.normalized).toBe('validators.username.pattern.flags');
    });

    it('should handle metadata paths', () => {
      const result = normalizer.normalizePath('meta.created.timestamp');
      expect(result.normalized).toBe('metadata.created.timestamp');
    });
  });

  describe('API Response Mapping', () => {
    let normalizer: PathNormalizer;

    beforeEach(() => {
      normalizer = new PathNormalizer();

      // Map snake_case to camelCase
      normalizer.addRule(
        ['user_profile', '**'],
        (_, context) => {
          const remaining = context.segments.slice(1);
          return ['userProfile', ...remaining];
        },
        10
      );

      // Map array notation to dot notation
      normalizer.addRule(
        ['items', /^\d+$/, '**'],
        (_, context) => {
          const index = context.segments[1];
          const remaining = context.segments.slice(2);
          return [`items[${index}]`, ...remaining];
        },
        10
      );

      // Flatten nested response structure
      normalizer.addRule(
        ['data', 'attributes', '**'],
        (_, context) => {
          return context.segments.slice(2);
        },
        15
      );
    });

    it('should map snake_case to camelCase', () => {
      const paths = [
        'user_profile.first_name',
        'user_profile.last_name',
        'user_profile.email_address',
      ];

      const results = normalizer.normalizePaths(paths);

      expect(results[0]?.normalized).toBe('userProfile.first_name');
      expect(results[1]?.normalized).toBe('userProfile.last_name');
      expect(results[2]?.normalized).toBe('userProfile.email_address');
    });

    it('should convert array notation', () => {
      const paths = ['items.0.name', 'items.1.description', 'items.10.value.nested'];

      const results = normalizer.normalizePaths(paths);

      expect(results[0]?.normalized).toBe('items[0].name');
      expect(results[1]?.normalized).toBe('items[1].description');
      expect(results[2]?.normalized).toBe('items[10].value.nested');
    });

    it('should flatten API response structure', () => {
      const paths = [
        'data.attributes.name',
        'data.attributes.settings.theme',
        'data.attributes.permissions.admin',
      ];

      const results = normalizer.normalizePaths(paths);

      expect(results[0]?.normalized).toBe('name');
      expect(results[1]?.normalized).toBe('settings.theme');
      expect(results[2]?.normalized).toBe('permissions.admin');
    });
  });

  describe('PathTransformers Helpers', () => {
    let normalizer: PathNormalizer;

    beforeEach(() => {
      normalizer = new PathNormalizer();
    });

    it('should use replaceSegment transformer', () => {
      normalizer.addRule(['old', 'path', 'here'], PathTransformers.replaceSegment(0, 'new'));

      const result = normalizer.normalizePath('old.path.here');
      expect(result.normalized).toBe('new.path.here');
    });

    it('should use replaceSegment with function', () => {
      normalizer.addRule(
        ['user', '*'],
        PathTransformers.replaceSegment(1, (old) => old.toUpperCase())
      );

      const result = normalizer.normalizePath('user.john');
      expect(result.normalized).toBe('user.JOHN');
    });

    it('should use prefix transformer', () => {
      normalizer.addRule(['email'], PathTransformers.prefix('user', 'contact'));

      const result = normalizer.normalizePath('email');
      expect(result.normalized).toBe('user.contact.email');
    });

    it('should use mapTo transformer', () => {
      normalizer.addRule(
        ['user', '*', 'setting', '*'],
        PathTransformers.mapTo('profiles.{userId}.preferences.{settingName}', {
          userId: (context) => context.segments[1] ?? '',
          settingName: (context) => context.segments[3] ?? '',
        })
      );

      const result = normalizer.normalizePath('user.123.setting.theme');
      expect(result.normalized).toBe('profiles.123.preferences.theme');
    });

    it('should use remove transformer', () => {
      normalizer.addRule(['deprecated', '**'], PathTransformers.remove());

      const result = normalizer.normalizePath('deprecated.old.feature');
      expect(result.matched).toBe(true);
      expect(result.normalized).toBe(null);
    });
  });

  describe('Performance with Large Rule Sets', () => {
    let normalizer: PathNormalizer;

    beforeEach(() => {
      normalizer = new PathNormalizer();

      // Add 100 rules with different priorities
      for (let i = 0; i < 100; i++) {
        normalizer.addRule([`rule${i}`, '*'], (matched) => `transformed${i}.${matched[1]}`, i);
      }

      // Add catch-all rule with lowest priority
      normalizer.addRule(['**'], (_, context) => `default.${context.segments.join('.')}`, -1);
    });

    it('should handle large number of rules efficiently', () => {
      const startTime = performance.now();

      // Test high-priority rule
      const result1 = normalizer.normalizePath('rule99.test');
      expect(result1.normalized).toBe('transformed99.test');

      // Test medium-priority rule
      const result2 = normalizer.normalizePath('rule50.value');
      expect(result2.normalized).toBe('transformed50.value');

      // Test low-priority rule
      const result3 = normalizer.normalizePath('rule0.data');
      expect(result3.normalized).toBe('transformed0.data');

      // Test catch-all
      const result4 = normalizer.normalizePath('unknown.path');
      expect(result4.normalized).toBe('default.unknown.path');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 10ms for 4 operations)
      expect(duration).toBeLessThan(10);
    });

    it('should batch process paths efficiently', () => {
      const paths = Array.from({ length: 100 }, (_, i) => `rule${i}.test`);

      const startTime = performance.now();
      const results = normalizer.normalizePaths(paths);
      const endTime = performance.now();

      expect(results).toHaveLength(100);
      expect(results[0]?.normalized).toBe('transformed0.test');
      expect(results[99]?.normalized).toBe('transformed99.test');

      // Should complete batch in reasonable time (< 20ms for 100 paths)
      expect(endTime - startTime).toBeLessThan(20);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let normalizer: PathNormalizer;

    beforeEach(() => {
      normalizer = new PathNormalizer();
    });

    it('should handle circular references in transform', () => {
      normalizer.addRule(['recursive'], () => 'recursive');

      const result = normalizer.normalizePath('recursive');
      expect(result.normalized).toBe('recursive');
    });

    it('should handle empty string paths', () => {
      normalizer.addRule([], () => 'root');
      const result = normalizer.normalizePath('');
      expect(result.normalized).toBe('root');
    });

    it('should handle paths with empty segments', () => {
      // toPath handles 'user..email' as ['user', '', 'email']
      normalizer.addRule(['user', '', 'email'], () => 'handled_empty');

      const result = normalizer.normalizePath('user..email');
      expect(result.matched).toBe(true);
      expect(result.normalized).toBe('handled_empty');
    });

    it('should handle paths with literal undefined string', () => {
      // When undefined is joined, it becomes the string 'undefined'
      const pathWithUndefined = ['user', undefined, 'email'].join('.');
      normalizer.addRule(['user', '*', 'email'], () => 'handled');

      const result = normalizer.normalizePath(pathWithUndefined);
      expect(result.matched).toBe(true); // 'undefined' matches wildcard
      expect(result.normalized).toBe('handled');
    });

    it('should handle special characters in paths', () => {
      const specialPaths = [
        'field[\'with\']["brackets"]',
        'path.with.dots...multiple',
        'path/with/slashes',
        'field[with-dashes]',
        'field_with_underscores',
      ];

      normalizer.addRule(['**'], (matched) => matched);

      specialPaths.forEach((path) => {
        const result = normalizer.normalizePath(path);
        expect(result.matched).toBe(true);
        expect(result.original).toBe(path);
      });
    });

    it('should handle very deeply nested paths', () => {
      const deepPath = Array(50).fill('level').join('.');

      normalizer.addRule(['level', '**'], () => 'flattened');

      const result = normalizer.normalizePath(deepPath);
      expect(result.normalized).toBe('flattened');
    });

    it('should handle concurrent normalization', async () => {
      normalizer.addRule(['async', '*'], (matched) => `processed.${matched[1]}`);

      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(normalizer.normalizePath(`async.${i}`))
      );

      const results = await Promise.all(promises);

      results.forEach((result, i) => {
        expect(result.normalized).toBe(`processed.${i}`);
      });
    });
  });
});
