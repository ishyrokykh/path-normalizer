# Path Normalizer

**Transform any path format into any other format** - the ultimate path mapping utility for JavaScript/TypeScript applications.

Perfect for handling API responses, form validation errors, configuration mapping, and any scenario where you need to convert between different path structures.

## Why You Need This

Ever struggled with these common problems?

- **API returns**: `user[0].email` but your form expects `users.0.emailAddress`
- **Backend errors**: `text_templates['en'].title` but frontend needs `localization[0].fields.title`
- **Config mapping**: `api.users.profile` needs to become `internal.userData.profile`

Path Normalizer solves all of these with simple, powerful rules.

## Installation

```bash
npm install path-normalizer
```

## Quick Examples

### Basic Path Conversion
```typescript
import { PathNormalizer } from 'path-normalizer';

const normalizer = new PathNormalizer();

// Convert bracket notation to dot notation
normalizer.normalizePath("test[0].path"); 
// → "test.0.path"

// Map specific paths
normalizer.addRule(['user', 'email'], () => 'profile.email');
normalizer.normalizePath('user.email'); 
// → "profile.email"
```

### Wildcard Matching
```typescript
// Match any user ID
normalizer.addRule(['users', '*', 'email'], (_, context) => {
  const userId = context.segments[1];
  return `user_${userId}_email`;
});

normalizer.normalizePath('users.123.email'); 
// → "user_123_email"
```

### Real-World Form Validation
```typescript
// Backend: "text_templates['en'].title"
// Frontend: "localization[0].fields.title"

const locales = ['en', 'fr', 'de'];
normalizer.addRule(['text_templates', (s) => locales.includes(s), '*'], (_, context) => {
  const locale = context.segments[1];
  const field = context.segments[2];
  const index = locales.indexOf(locale);
  return `localization[${index}].fields.${field}`;
});

normalizer.normalizePath("text_templates['en'].title");
// → "localization[0].fields.title"
```

## Key Features

- ⚡ **Zero Config**: Works out of the box with sensible defaults
- 🎯 **Smart Matching**: Wildcards, regex, and custom matchers
- 🔄 **Flexible Transform**: Convert any path to any other format
- 📦 **TypeScript**: Full type safety and IntelliSense
- 🚀 **Performance**: Priority-based rule evaluation
- 🔧 **Universal**: Works with any framework or library

## Common Use Cases

### 1. API Response Mapping
```typescript
// API returns: "user[0].profile.email"
// Your app expects: "users.0.emailAddress"

normalizer.addRule(['user', '*', 'profile', 'email'], (_, context) => {
  const userId = context.segments[1];
  return `users.${userId}.emailAddress`;
});
```

### 2. Form Validation Error Mapping
```typescript
// Backend error: "form_data['contact'].email"
// React Hook Form field: "contact.email"

normalizer.addRule(['form_data', '*', 'email'], (_, context) => {
  const section = context.segments[1];
  return `${section}.email`;
});
```

### 3. Configuration Normalization
```typescript
// Config file: "api.users.profile.settings"
// Internal structure: "userConfig.profile"

normalizer.addRule(['api', 'users', 'profile', '**'], () => 'userConfig.profile');
```

### 4. Multi-language Content Mapping
```typescript
// CMS path: "content['en'].sections[0].title"
// App path: "localization.en.sections.0.title"

normalizer.addRule(['content', '*', 'sections', '*', '*'], (_, context) => {
  const lang = context.segments[1];
  const sectionIndex = context.segments[3];
  const field = context.segments[4];
  return `localization.${lang}.sections.${sectionIndex}.${field}`;
});
```

## Framework Integration

### React Hook Form
```typescript
import { useEffect } from 'react';
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

### Formik
```typescript
import { FormikErrors } from 'formik';
import { PathNormalizer } from 'path-normalizer';

const normalizeFormErrors = (errors: Record<string, string>, normalizer: PathNormalizer) => {
  const normalized: FormikErrors<any> = {};
  
  Object.entries(errors).forEach(([path, message]) => {
    const result = normalizer.normalizePath(path);
    if (result.matched && result.normalized) {
      normalized[result.normalized] = message;
    }
  });
  
  return normalized;
};
```

## API Reference

### Core Methods

```typescript
// Create normalizer
const normalizer = new PathNormalizer({
  delimiter: '.',           // Path separator (default: '.')
  caseInsensitive: false,   // Case-sensitive matching (default: false)
  throwOnUnmatched: false   // Don't throw on unmatched paths (default: false)
});

// Add rules
normalizer.addRule(['user', 'email'], () => 'profile.email');
normalizer.addRule(['users', '*', 'email'], (_, context) => {
  const userId = context.segments[1];
  return `user_${userId}_email`;
});

// Normalize paths
const result = normalizer.normalizePath('user.email');
// result.normalized = 'profile.email'
// result.matched = true
// result.original = 'user.email'

// Normalize multiple paths
const results = normalizer.normalizePaths(['user.email', 'users.123.email']);
```

### Pattern Types

```typescript
// Exact match
['user', 'email']

// Wildcard (any single segment)
['users', '*', 'email']

// Deep wildcard (any remaining segments)
['api', '**']

// Regex
[/^user_\d+$/, 'email']

// Custom matcher function
['items', (seg) => !isNaN(Number(seg)), 'value']

// Mixed patterns
['data', '*', /^(name|email)$/, '**']
```

### Advanced Features

```typescript
// Priority-based rules (higher number = higher priority)
normalizer.addRule(['user', '*'], () => 'low-priority', 1);
normalizer.addRule(['user', 'email'], () => 'high-priority', 10);

// Builder pattern for complex rules
import { PathRuleBuilder } from 'path-normalizer';

const rule = PathRuleBuilder.create()
  .exact('text_templates')
  .oneOf(['en', 'fr', 'de'])
  .deepWildcard()
  .transform((matched, context) => {
    const locale = context.segments[1];
    const index = ['en', 'fr', 'de'].indexOf(locale);
    return `localization[${index}].${context.segments.slice(2).join('.')}`;
  })
  .setPriority(10)
  .build();

normalizer.addRules([rule]);
```

## Why Choose Path Normalizer?

### ✅ **Built for Real Problems**
- Solves actual pain points developers face daily
- Handles complex API-to-frontend path mapping
- Works with any form library or framework

### ✅ **Powerful Yet Simple**
- Zero configuration needed to get started
- Intuitive API that scales from simple to complex
- Full TypeScript support with excellent IntelliSense

### ✅ **Performance First**
- Priority-based rule evaluation
- Optimized for high-frequency path transformations
- Minimal bundle size impact

### ✅ **Battle Tested**
- Comprehensive test coverage
- Used in production applications
- Active maintenance and updates

## Get Started Today

```bash
npm install path-normalizer
```

**Perfect for:**
- Form validation error mapping
- API response transformation  
- Configuration normalization
- Multi-language content mapping
- Any path-to-path conversion needs

---

📖 **Full Documentation**: [GitHub Repository](https://github.com/ishyrokykh/path-normalizer)  
🐛 **Report Issues**: [GitHub Issues](https://github.com/ishyrokykh/path-normalizer/issues)  
📝 **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
