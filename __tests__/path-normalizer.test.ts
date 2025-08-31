import { PathNormalizer } from '../src/path-normalizer';
import type { PathSegmentMatcher } from '../src/types';

describe('PathNormalizer', () => {
    let normalizer: PathNormalizer;

    beforeEach(() => {
        normalizer = new PathNormalizer();
    });

    describe('constructor options', () => {
        it('should use default options when none provided', () => {
            const instance = new PathNormalizer();
            const result = instance.normalizePath('test.path');
            expect(result.original).toBe('test.path');
        });

        it('should respect custom delimiter', () => {
            const instance = new PathNormalizer({ delimiter: '/' });
            instance.addRule(
                ['user', 'profile'],
                (matched) => matched.join('/')
            );
            const result = instance.normalizePath('user.profile');
            expect(result.normalized).toBe('user/profile');
        });

        it('should handle case-insensitive matching when enabled', () => {
            const instance = new PathNormalizer({ caseInsensitive: true });
            instance.addRule(
                ['USER', 'EMAIL'],
                () => 'profile.email'
            );
            const result = instance.normalizePath('user.email');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('profile.email');
        });

        it('should throw on unmatched paths when throwOnUnmatched is true', () => {
            const instance = new PathNormalizer({ throwOnUnmatched: true });
            expect(() => instance.normalizePath('unknown.path')).toThrow('No matching rule for path: unknown.path');
        });
    });

    describe('exact string matching', () => {
        it('should match exact path segments', () => {
            normalizer.addRule(
                ['user', 'email'],
                () => 'profile.contact.email'
            );

            const result = normalizer.normalizePath('user.email');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('profile.contact.email');
        });

        it('should not match partial paths', () => {
            normalizer.addRule(
                ['user', 'email', 'primary'],
                () => 'profile.email'
            );

            const result = normalizer.normalizePath('user.email');
            expect(result.matched).toBe(false);
            expect(result.normalized).toBe('user.email');
        });

        it('should handle paths with bracket notation', () => {
            // Note: toPath parses 'user[0]' as ['user', '0']
            normalizer.addRule(
                ['user', '0', 'email'],
                () => 'users.0.emailAddress'
            );

            const result = normalizer.normalizePath('user[0].email');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('users.0.emailAddress');
        });
    });

    describe('wildcard matching', () => {
        it('should match single wildcard (*)', () => {
            normalizer.addRule(
                ['users', '*', 'email'],
                (_, context) => {
                    const userId = context.segments[1];
                    return `user_${userId}_email`;
                }
            );

            const result = normalizer.normalizePath('users.123.email');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('user_123_email');
        });

        it('should capture wildcard values', () => {
            normalizer.addRule(
                ['*', 'settings', '*'],
                (_, context) => {
                    const captures = Object.values(context.wildcardCaptures);
                    return `${captures[0]?.toString()}_config_${captures[1]?.toString()}`;
                }
            );

            const result = normalizer.normalizePath('user.settings.theme');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('user_config_theme');
        });

        it('should match deep wildcard (**)', () => {
            normalizer.addRule(
                ['api', '**'],
                (_, context) => {
                    const remaining = context.segments.slice(1);
                    return ['internal', ...remaining].join('.');
                }
            );

            const result = normalizer.normalizePath('api.users.profile.settings');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('internal.users.profile.settings');
        });

        it('should handle deep wildcard at the end of pattern', () => {
            normalizer.addRule(
                ['config', 'locales', '**'],
                (_, context) => {
                    const path = context.segments.slice(2);
                    return `i18n.${path.join('.')}`;
                }
            );

            const result1 = normalizer.normalizePath('config.locales.en');
            expect(result1.normalized).toBe('i18n.en');

            const result2 = normalizer.normalizePath('config.locales.en.messages.welcome');
            expect(result2.normalized).toBe('i18n.en.messages.welcome');
        });

        it('should match empty path with deep wildcard', () => {
            normalizer.addRule(
                ['data', '**'],
                (_, context) => {
                    const remaining = context.segments.slice(1);
                    return remaining.length > 0 ? `store.${remaining.join('.')}` : 'store';
                }
            );

            const result = normalizer.normalizePath('data');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('store');
        });
    });

    describe('regex matching', () => {
        it('should match paths with regex patterns', () => {
            normalizer.addRule(
                [/^user_\d+$/, 'email'],
                (matched) => `users.${matched[0]}.emailAddress`
            );

            const result = normalizer.normalizePath('user_123.email');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('users.user_123.emailAddress');
        });

        it('should not match when regex does not match', () => {
            normalizer.addRule(
                [/^user_\d+$/, 'email'],
                () => 'matched'
            );

            const result = normalizer.normalizePath('user_abc.email');
            expect(result.matched).toBe(false);
        });

        it('should handle complex regex patterns', () => {
            normalizer.addRule(
                ['fields', /^(name|email|phone)$/],
                (_, context) => `contact.${context.segments[1]}`
            );

            expect(normalizer.normalizePath('fields.email').normalized).toBe('contact.email');
            expect(normalizer.normalizePath('fields.name').normalized).toBe('contact.name');
            expect(normalizer.normalizePath('fields.address').matched).toBe(false);
        });
    });

    describe('custom matcher functions', () => {
        it('should match with custom function', () => {
            const isNumeric = (segment: string): boolean => !isNaN(Number(segment));

            normalizer.addRule(
                ['items', isNumeric, 'value'],
                (_, context) => `array[${context.segments[1]}].data`
            );

            const result = normalizer.normalizePath('items.5.value');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('array[5].data');
        });

        it('should provide all context to custom matcher', () => {
            const matchSecondSegment: PathSegmentMatcher = (segment, index, segments) => {
                return index === 1 && segments[0] === 'special' && segment.startsWith('test_');
            };

            normalizer.addRule(
                ['special', matchSecondSegment],
                (matched) => `validated.${matched[1]}`
            );

            const result = normalizer.normalizePath('special.test_123');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('validated.test_123');
        });

        it('should handle complex validation in custom matcher', () => {
            const validLocales = ['en', 'fr', 'de', 'es'];
            const isValidLocale = (segment: string): boolean => validLocales.includes(segment);

            normalizer.addRule(
                ['i18n', isValidLocale, 'messages'],
                (_, context) => {
                    const locale = context.segments[1];
                    const index = validLocales.indexOf(locale ?? "");
                    return `translations[${index}].content`;
                }
            );

            expect(normalizer.normalizePath('i18n.en.messages').normalized).toBe('translations[0].content');
            expect(normalizer.normalizePath('i18n.es.messages').normalized).toBe('translations[3].content');
            expect(normalizer.normalizePath('i18n.jp.messages').matched).toBe(false);
        });
    });

    describe('transform functions', () => {
        it('should transform matched paths', () => {
            normalizer.addRule(
                ['old', 'path'],
                () => 'new.location'
            );

            const result = normalizer.normalizePath('old.path');
            expect(result.normalized).toBe('new.location');
        });

        it('should return array from transform function', () => {
            normalizer.addRule(
                ['user', 'settings'],
                () => ['profile', 'preferences', 'general']
            );

            const result = normalizer.normalizePath('user.settings');
            expect(result.normalized).toBe('profile.preferences.general');
        });

        it('should handle null return (path removal)', () => {
            normalizer.addRule(
                ['deprecated', '*'],
                () => null
            );

            const result = normalizer.normalizePath('deprecated.anything');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe(null);
        });

        it('should have access to full context in transform', () => {
            normalizer.addRule(
                ['data', '*', '*'],
                (matched, context) => {
                    return `${context.segments[0]}_${context.matchedIndices.length}_${matched.join('_')}`;
                }
            );

            const result = normalizer.normalizePath('data.type.value');
            expect(result.normalized).toBe('data_3_data_type_value');
        });
    });

    describe('priority handling', () => {
        it('should evaluate higher priority rules first', () => {
            normalizer.addRule(['user', '*'], () => 'low-priority', 1);
            normalizer.addRule(['user', 'email'], () => 'high-priority', 10);

            const result = normalizer.normalizePath('user.email');
            expect(result.normalized).toBe('high-priority');
        });

        it('should respect priority with overlapping patterns', () => {
            normalizer.addRule(['*', '*'], () => 'catch-all', 0);
            normalizer.addRule(['api', '*'], () => 'api-specific', 5);
            normalizer.addRule(['api', 'users'], () => 'most-specific', 10);

            expect(normalizer.normalizePath('api.users').normalized).toBe('most-specific');
            expect(normalizer.normalizePath('api.posts').normalized).toBe('api-specific');
            expect(normalizer.normalizePath('other.path').normalized).toBe('catch-all');
        });

        it('should maintain rule order for same priority', () => {
            normalizer.addRule(['test', '*'], () => 'first', 5);
            normalizer.addRule(['test', 'specific'], () => 'second', 5);

            // First matching rule with same priority wins
            const result = normalizer.normalizePath('test.specific');
            expect(result.normalized).toBe('first');
        });
    });

    describe('multiple path normalization', () => {
        beforeEach(() => {
            normalizer.addRule(['user', 'email'], () => 'profile.email');
            normalizer.addRule(['user', 'name'], () => 'profile.name');
            normalizer.addRule(['settings', '*'], (_, context) => `config.${context.segments[1]}`);
        });

        it('should normalize multiple paths', () => {
            const paths = ['user.email', 'user.name', 'settings.theme', 'unknown.path'];
            const results = normalizer.normalizePaths(paths);

            expect(results).toHaveLength(4);
            expect(results[0]?.normalized).toBe('profile.email');
            expect(results[1]?.normalized).toBe('profile.name');
            expect(results[2]?.normalized).toBe('config.theme');
            expect(results[3]?.matched).toBe(false);
        });

        it('should handle empty array', () => {
            const results = normalizer.normalizePaths([]);
            expect(results).toEqual([]);
        });

        it('should preserve original paths in results', () => {
            const paths = ['user.email', 'unknown'];
            const results = normalizer.normalizePaths(paths);

            expect(results[0]?.original).toBe('user.email');
            expect(results[1]?.original).toBe('unknown');
        });
    });

    describe('edge cases', () => {
        it('should handle empty path', () => {
            normalizer.addRule([], () => 'root');
            const result = normalizer.normalizePath('');
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('root');
        });

        it('should handle single segment paths', () => {
            normalizer.addRule(['single'], () => 'mapped');
            const result = normalizer.normalizePath('single');
            expect(result.normalized).toBe('mapped');
        });

        it('should handle paths with empty segments', () => {
            const result = normalizer.normalizePath('user..email');
            expect(result.original).toBe('user..email');
            // Will have empty string as middle segment
        });

        it('should handle very long paths', () => {
            const longPath = Array(100).fill('segment').join('.');
            normalizer.addRule(['segment', '**'], () => 'compressed');

            const result = normalizer.normalizePath(longPath);
            expect(result.normalized).toBe('compressed');
        });

        it('should handle paths with quoted bracket notation', () => {
            // Note: toPath parses "user['email']" as ['user', 'email']
            normalizer.addRule(
                ['user', 'email', 'primary'],
                () => 'user.email.main'
            );

            const result = normalizer.normalizePath("user['email'].primary");
            expect(result.matched).toBe(true);
            expect(result.normalized).toBe('user.email.main');
        });
    });

    describe('clearRules', () => {
        it('should remove all rules', () => {
            normalizer.addRule(['test'], () => 'mapped');
            expect(normalizer.normalizePath('test').matched).toBe(true);

            normalizer.clearRules();
            expect(normalizer.normalizePath('test').matched).toBe(false);
        });

        it('should allow chaining', () => {
            const result = normalizer
                .addRule(['test'], () => 'mapped')
                .clearRules()
                .addRule(['new'], () => 'newmapped');

            expect(result).toBe(normalizer);
            expect(normalizer.normalizePath('test').matched).toBe(false);
            expect(normalizer.normalizePath('new').matched).toBe(true);
        });
    });

    describe('complex real-world scenarios', () => {
        it('should handle form field localization', () => {
            const locales = ['en', 'fr', 'de'];

            normalizer.addRule(
                ['fields', (s) => locales.includes(s), '*'],
                (_, context) => {
                    const locale = context.segments[1];
                    const field = context.segments[2];
                    const index = locales.indexOf(locale ?? "");
                    return `localization[${index}].fields.${field}`;
                }
            );

            expect(normalizer.normalizePath('fields.en.title').normalized)
                .toBe('localization[0].fields.title');
            expect(normalizer.normalizePath('fields.de.description').normalized)
                .toBe('localization[2].fields.description');
        });

        it('should handle nested array indices', () => {
            normalizer.addRule(
                ['items', /^\d+$/, 'subitems', /^\d+$/, 'value'],
                (_, context) => {
                    const [, itemIndex, , subIndex] = context.segments;
                    return `data[${itemIndex}][${subIndex}].content`;
                }
            );

            const result = normalizer.normalizePath('items.2.subitems.5.value');
            expect(result.normalized).toBe('data[2][5].content');
        });
    });
});
