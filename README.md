# Path Normalizer

A flexible and powerful path normalization utility for mapping backend error paths to frontend form fields. Perfect for handling complex form validation scenarios where backend and frontend field structures don't match.

## Features

- 🎯 **Flexible Pattern Matching**: Support for exact matches, wildcards, regex, and custom matchers
- 🌳 **Tree-like Structure**: Efficient matching with support for nested paths and deep wildcards
- 🔄 **Transform Functions**: Powerful transformation capabilities for complex path mappings
- 📦 **TypeScript Support**: Full type safety and IntelliSense support
- 🎨 **Builder Pattern**: Intuitive API for creating rules
- ⚡ **Performance Optimized**: Priority-based rule evaluation for optimal performance
- 🔧 **Framework Agnostic**: Works with any form library (react-hook-form, formik, etc.)

## Installation

```bash
npm install path-normalizer
# or
yarn add path-normalizer
# or
pnpm add path-normalizer
```

## Quick Start

```typescript
import { PathNormalizer, PathRuleBuilder } from 'path-normalizer';

// Create a normalizer instance
const normalizer = new PathNormalizer({
  delimiter: '.',
  caseInsensitive: false
});

// Add a simple rule
normalizer.addRule(
  ['user', 'email'],
  (matched) => ['profile', 'contact', 'email']
);

// Normalize a path
const result = normalizer.normalizePath('user.email');
console.log(result.normalized); // 'profile.contact.email'
```

## Advanced Usage

### Wildcard Patterns

```typescript
// Single wildcard - matches any single segment
normalizer.addRule(
  ['users', '*', 'email'],
  (matched, context) => {
    const userId = context.segments[1];
    return `users[${userId}].emailAddress`;
  }
);

// Deep wildcard - matches any remaining segments
normalizer.addRule(
  ['api', 'v1', '**'],
  (matched, context) => {
    const remainingPath = context.segments.slice(2);
    return ['internal', 'api', ...remainingPath];
  }
);
```

### Using the Builder Pattern

```typescript
const rule = PathRuleBuilder.create()
  .exact('text_templates')
  .oneOf(['en', 'ua', 'az']) // Match any of these locales
  .deepWildcard() // Match any nested path
  .transform((matched, context) => {
    const locale = context.segments[1];
    const localeIndex = ['en', 'ua', 'az'].indexOf(locale);
    const remainingPath = context.segments.slice(2);
    
    return [
      'localization_fields',
      localeIndex.toString(),
      'text_templates',
      ...remainingPath
    ];
  })
  .setPriority(10) // Higher priority rules are evaluated first
  .build();

normalizer.addRules([rule]);
```

### React Hook Form Integration

```typescript
import { useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { PathNormalizer } from 'path-normalizer';

export function useNormalizedFormErrors({ 
  methods, 
  backendErrors,
  normalizer 
}) {
  const { setError, clearErrors } = methods;

  useEffect(() => {
    if (!backendErrors) return;

    clearErrors();

    Object.entries(backendErrors).forEach(([path, message]) => {
      const result = normalizer.normalizePath(path);
      
      if (result.matched && result.normalized) {
        setError(result.normalized, {
          type: 'manual',
          message
        });
      }
    });
  }, [backendErrors, normalizer, setError, clearErrors]);
}
```

## Real-World Example

Handling complex backend error paths in a multi-language form:

```typescript
// Backend sends: text_templates['en'].text
// Frontend needs: localization_fields.0.text_templates.text

const normalizer = new PathNormalizer();
const allowedLocales = ['en', 'ua', 'az'];

normalizer.addRule(
  ['text_templates', (seg) => allowedLocales.includes(seg), '**'],
  (matched, context) => {
    const locale = context.segments[1];
    const localeIndex = allowedLocales.indexOf(locale);
    const remainingPath = context.segments.slice(2);
    
    return [
      'localization_fields',
      localeIndex.toString(),
      'text_templates',
      ...remainingPath
    ].join('.');
  },
  10 // High priority
);

// Test it
const paths = [
  "text_templates['en'].text",
  "text_templates['en'].variables[0]",
  "text_templates['az'].settings.enabled"
];

paths.forEach(path => {
  const result = normalizer.normalizePath(path);
  console.log(`${path} -> ${result.normalized}`);
});

// Output:
// text_templates['en'].text -> localization_fields.0.text_templates.text
// text_templates['en'].variables[0] -> localization_fields.0.text_templates.variables.0
// text_templates['az'].settings.enabled -> localization_fields.2.text_templates.settings.enabled
```

## API Reference

### PathNormalizer

#### Constructor Options

```typescript
interface PathNormalizerOptions {
  delimiter?: string;        // Path delimiter (default: '.')
  caseInsensitive?: boolean; // Case-insensitive matching (default: false)
  throwOnUnmatched?: boolean; // Throw error for unmatched paths (default: false)
}
```

#### Methods

- `addRule(pattern, transform, priority?)`: Add a normalization rule
- `addRules(rules)`: Add multiple rules at once
- `normalizePath(path)`: Normalize a single path
- `normalizePaths(paths)`: Normalize multiple paths
- `clearRules()`: Remove all rules

### PathRuleBuilder

Fluent API for building rules:

- `exact(segment)`: Match exact segment
- `regex(pattern)`: Match with regex
- `wildcard()`: Match any single segment
- `deepWildcard()`: Match any remaining segments
- `oneOf(values)`: Match any of the provided values
- `custom(matcher)`: Custom matcher function
- `transform(fn)`: Set transformation function
- `setPriority(n)`: Set rule priority
- `build()`: Build the rule

### PathTransformers

Helper functions for common transformations:

- `replaceSegment(index, newValue)`: Replace a segment at index
- `prefix(...segments)`: Add prefix segments
- `mapTo(template, replacements)`: Map to template with replacements
- `remove()`: Remove the path entirely

## Comparison with Alternatives

| Feature | path-normalizer | path-to-regexp
|---------|--------------|--------------
| Wildcard support | ✅ |  ✅
| Custom matchers | ✅ | ❌
| Tree-like patterns | ✅ | ❌
| TypeScript | ✅ | ✅

## Why Use This Library?

1. **Designed for Real-World Form Validation**: Built specifically for the common problem of mapping backend validation errors to frontend form fields

2. **Flexible Pattern Matching**: Unlike simple string replacement, supports complex patterns including wildcards, regex, and custom matchers

3. **Performance Optimized**: Priority-based evaluation ensures the most likely rules are checked first

4. **Type-Safe**: Full TypeScript support with proper type inference

5. **Framework Agnostic**

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed history of changes and updates.
