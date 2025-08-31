import { PathRuleBuilder } from '../src/path-rule-builder';
import { PathNormalizer } from '../src/path-normalizer';

describe('PathRuleBuilder', () => {
  describe('builder pattern', () => {
    it('should create a rule with exact segments', () => {
      const rule = PathRuleBuilder.create()
        .exact('user')
        .exact('profile')
        .transform(() => 'transformed')
        .build();

      expect(rule.pattern).toEqual(['user', 'profile']);
      expect(rule.transform([], {} as any)).toBe('transformed');
    });

    it('should throw error when transform is not set', () => {
      const builder = PathRuleBuilder.create().exact('user').exact('profile');

      expect(() => builder.build()).toThrow('Transform function is required');
    });

    it('should chain multiple builder methods', () => {
      const rule = PathRuleBuilder.create()
        .exact('api')
        .wildcard()
        .regex(/^v\d+$/)
        .deepWildcard()
        .transform((matched) => matched.join('/'))
        .setPriority(10)
        .build();

      expect(rule.pattern).toHaveLength(4);
      expect(rule.pattern[0]).toBe('api');
      expect(rule.pattern[1]).toBe('*');
      expect(rule.pattern[2]).toBeInstanceOf(RegExp);
      expect(rule.pattern[3]).toBe('**');
      expect(rule.priority).toBe(10);
    });

    it('should set default priority to 0', () => {
      const rule = PathRuleBuilder.create()
        .exact('test')
        .transform(() => 'result')
        .build();

      expect(rule.priority).toBe(0);
    });
  });

  describe('exact method', () => {
    it('should add exact string matcher', () => {
      const rule = PathRuleBuilder.create()
        .exact('users')
        .exact('settings')
        .transform(() => 'result')
        .build();

      expect(rule.pattern).toEqual(['users', 'settings']);
    });

    it('should handle special characters', () => {
      const rule = PathRuleBuilder.create()
        .exact("user['email']")
        .exact('primary')
        .transform(() => 'result')
        .build();

      expect(rule.pattern[0]).toBe("user['email']");
      expect(rule.pattern[1]).toBe('primary');
    });
  });

  describe('regex method', () => {
    it('should add regex pattern matcher', () => {
      const pattern = /^user_\d+$/;
      const rule = PathRuleBuilder.create()
        .regex(pattern)
        .transform(() => 'result')
        .build();

      expect(rule.pattern[0]).toBe(pattern);
    });

    it('should allow multiple regex patterns', () => {
      const rule = PathRuleBuilder.create()
        .regex(/^[a-z]+$/)
        .regex(/^\d+$/)
        .transform(() => 'result')
        .build();

      expect(rule.pattern[0]).toBeInstanceOf(RegExp);
      expect(rule.pattern[1]).toBeInstanceOf(RegExp);
    });
  });

  describe('wildcard methods', () => {
    it('should add single wildcard', () => {
      const rule = PathRuleBuilder.create()
        .wildcard()
        .transform(() => 'result')
        .build();

      expect(rule.pattern).toEqual(['*']);
    });

    it('should add deep wildcard', () => {
      const rule = PathRuleBuilder.create()
        .deepWildcard()
        .transform(() => 'result')
        .build();

      expect(rule.pattern).toEqual(['**']);
    });

    it('should combine wildcards with other patterns', () => {
      const rule = PathRuleBuilder.create()
        .exact('api')
        .wildcard()
        .deepWildcard()
        .transform(() => 'result')
        .build();

      expect(rule.pattern).toEqual(['api', '*', '**']);
    });
  });

  describe('custom method', () => {
    it('should add custom matcher function', () => {
      const customMatcher = (segment: string): boolean => segment.startsWith('test_');

      const rule = PathRuleBuilder.create()
        .custom(customMatcher)
        .transform(() => 'result')
        .build();

      expect(rule.pattern[0]).toBe(customMatcher);
    });

    it('should have access to all matcher parameters', () => {
      const customMatcher = jest.fn((_x: string, _y: number, _z: string[]) => true);

      const rule = PathRuleBuilder.create()
        .custom(customMatcher)
        .transform(() => 'result')
        .build();

      // Test that the matcher is properly stored
      const matcher = rule.pattern[0] as typeof customMatcher;
      matcher('test', 1, ['root', 'test', 'end']);
      expect(customMatcher).toHaveBeenCalledWith('test', 1, ['root', 'test', 'end']);
    });
  });

  describe('oneOf method', () => {
    it('should create matcher for array of values', () => {
      const rule = PathRuleBuilder.create()
        .oneOf(['en', 'fr', 'de'])
        .transform(() => 'result')
        .build();

      const matcher = rule.pattern[0] as (_x: string, _y: number, _z: string[]) => boolean;
      expect(matcher('en', 0, [])).toBe(true);
      expect(matcher('fr', 0, [])).toBe(true);
      expect(matcher('es', 0, [])).toBe(false);
    });

    it('should handle empty array', () => {
      const rule = PathRuleBuilder.create()
        .oneOf([])
        .transform(() => 'result')
        .build();

      const matcher = rule.pattern[0] as (_x: string, _y: number, _z: string[]) => boolean;
      expect(matcher('anything', 0, [])).toBe(false);
    });

    it('should work with other pattern types', () => {
      const rule = PathRuleBuilder.create()
        .exact('locale')
        .oneOf(['en-US', 'en-GB', 'fr-FR'])
        .exact('messages')
        .transform(() => 'result')
        .build();

      expect(rule.pattern).toHaveLength(3);
      expect(rule.pattern[0]).toBe('locale');
      expect(typeof rule.pattern[1]).toBe('function');
      expect(rule.pattern[2]).toBe('messages');
    });
  });

  describe('transform method', () => {
    it('should set transform function', () => {
      const transformFn = jest.fn(() => 'transformed');

      const rule = PathRuleBuilder.create().exact('test').transform(transformFn).build();

      const result = rule.transform(['test'], {} as any);
      expect(transformFn).toHaveBeenCalled();
      expect(result).toBe('transformed');
    });

    it('should have access to matched segments and context', () => {
      const transformFn = jest.fn((matched, context) => {
        return `${matched.join('_')}_${context.segments.length}`;
      });

      const rule = PathRuleBuilder.create().exact('test').transform(transformFn).build();

      const context = {
        segments: ['test', 'path'],
        matchedIndices: [0],
        wildcardCaptures: {},
      };

      const result = rule.transform(['test'], context);
      expect(result).toBe('test_2');
    });

    it('should allow returning null for removal', () => {
      const rule = PathRuleBuilder.create()
        .exact('deprecated')
        .transform(() => null)
        .build();

      expect(rule.transform([], {} as any)).toBe(null);
    });

    it('should allow returning array', () => {
      const rule = PathRuleBuilder.create()
        .exact('test')
        .transform(() => ['new', 'path', 'segments'])
        .build();

      expect(rule.transform([], {} as any)).toEqual(['new', 'path', 'segments']);
    });
  });

  describe('setPriority method', () => {
    it('should set rule priority', () => {
      const rule = PathRuleBuilder.create()
        .exact('test')
        .transform(() => 'result')
        .setPriority(100)
        .build();

      expect(rule.priority).toBe(100);
    });

    it('should allow negative priority', () => {
      const rule = PathRuleBuilder.create()
        .exact('test')
        .transform(() => 'result')
        .setPriority(-10)
        .build();

      expect(rule.priority).toBe(-10);
    });

    it('should override priority if called multiple times', () => {
      const rule = PathRuleBuilder.create()
        .exact('test')
        .setPriority(5)
        .setPriority(10)
        .transform(() => 'result')
        .setPriority(15)
        .build();

      expect(rule.priority).toBe(15);
    });
  });

  describe('integration with PathNormalizer', () => {
    let normalizer: PathNormalizer;

    beforeEach(() => {
      normalizer = new PathNormalizer();
    });

    it('should work with PathNormalizer.addRules', () => {
      const rules = [
        PathRuleBuilder.create()
          .exact('user')
          .exact('email')
          .transform(() => 'profile.email')
          .setPriority(10)
          .build(),
        PathRuleBuilder.create()
          .exact('user')
          .wildcard()
          .transform((_, context) => `profile.${context.segments[1]}`)
          .setPriority(5)
          .build(),
      ];

      normalizer.addRules(rules);

      expect(normalizer.normalizePath('user.email').normalized).toBe('profile.email');
      expect(normalizer.normalizePath('user.name').normalized).toBe('profile.name');
    });

    it('should handle complex patterns', () => {
      const rule = PathRuleBuilder.create()
        .exact('api')
        .oneOf(['v1', 'v2', 'v3'])
        .deepWildcard()
        .transform((_, context) => {
          const version = context.segments[1];
          const remaining = context.segments.slice(2);
          return `internal.${version}.${remaining.join('.')}`;
        })
        .setPriority(10)
        .build();

      normalizer.addRules([rule]);

      expect(normalizer.normalizePath('api.v1.users').normalized).toBe('internal.v1.users');
      expect(normalizer.normalizePath('api.v2.posts.comments').normalized).toBe(
        'internal.v2.posts.comments'
      );
      expect(normalizer.normalizePath('api.v4.users').matched).toBe(false);
    });

    it('should respect priority in rule evaluation', () => {
      const catchAll = PathRuleBuilder.create()
        .wildcard()
        .wildcard()
        .transform(() => 'catch-all')
        .setPriority(0)
        .build();

      const specific = PathRuleBuilder.create()
        .exact('user')
        .exact('email')
        .transform(() => 'specific')
        .setPriority(10)
        .build();

      normalizer.addRules([catchAll, specific]);

      expect(normalizer.normalizePath('user.email').normalized).toBe('specific');
      expect(normalizer.normalizePath('other.path').normalized).toBe('catch-all');
    });
  });

  describe('complex builder patterns', () => {
    it('should build localization rules', () => {
      const locales = ['en', 'fr', 'de', 'es'];

      const rule = PathRuleBuilder.create()
        .exact('i18n')
        .oneOf(locales)
        .exact('messages')
        .deepWildcard()
        .transform((_, context) => {
          const locale = context.segments[1];
          const messageKey = context.segments.slice(3).join('.');
          return `translations.${locale}.${messageKey}`;
        })
        .setPriority(10)
        .build();

      const normalizer = new PathNormalizer();
      normalizer.addRules([rule]);

      const result = normalizer.normalizePath('i18n.en.messages.home.welcome');
      expect(result.normalized).toBe('translations.en.home.welcome');
    });

    it('should build array index transformation rules', () => {
      const rule = PathRuleBuilder.create()
        .exact('items')
        .custom((s) => !isNaN(Number(s)))
        .exact('subitems')
        .custom((s) => !isNaN(Number(s)))
        .wildcard()
        .transform((_, context) => {
          const [, itemIdx, , subIdx, field] = context.segments;
          return `data[${itemIdx}].children[${subIdx}].${field}`;
        })
        .build();

      const normalizer = new PathNormalizer();
      normalizer.addRules([rule]);

      const result = normalizer.normalizePath('items.2.subitems.5.name');
      expect(result.normalized).toBe('data[2].children[5].name');
    });

    it('should build conditional transformation rules', () => {
      const rule = PathRuleBuilder.create()
        .exact('field')
        .wildcard()
        .transform((_, context) => {
          const fieldName = context.segments[1];
          if (fieldName?.startsWith('temp_')) {
            return null; // Remove temporary fields
          }
          return `validated.${fieldName}`;
        })
        .build();

      const normalizer = new PathNormalizer();
      normalizer.addRules([rule]);

      expect(normalizer.normalizePath('field.temp_draft').normalized).toBe(null);
      expect(normalizer.normalizePath('field.username').normalized).toBe('validated.username');
    });
  });
});
