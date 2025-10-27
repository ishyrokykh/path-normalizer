# Changelog

## [1.0.3] - 2024-12-19

### Changed
- **README overhaul**: Completely rewritten README for broader npm audience appeal
- **Improved documentation**: Added compelling value proposition and real-world examples
- **Enhanced examples**: Added simple bracket notation conversion examples (`test[0].path` → `test.0.path`)
- **Better use cases**: Added 4 practical scenarios (API mapping, form validation, config normalization, multi-language)
- **Framework integration**: Added React Hook Form and Formik integration examples
- **Streamlined API reference**: Focused on most important methods and patterns
- **npm-friendly features**: Emphasized zero-config, universal compatibility, and performance

### Added
- **Quick Examples section**: Immediate value demonstration with simple path conversions
- **Common Use Cases**: 4 real-world scenarios developers face daily
- **Framework Integration**: Ready-to-use code for React Hook Form and Formik
- **Why Choose section**: Clear benefits and competitive advantages
- **Get Started Today**: Clear call-to-action with installation and use cases

## [1.0.2] - 2024-09-20

### Added
- **Bracket notation support**: Added `useDefaultNormalization` parameter to `normalizePath()` method
- **Default bracket conversion**: Paths like `'user[0].email[1].test'` are automatically converted to `'user.0.email.1.test'` when no rules match
- **Dual build system**: Both readable and minified versions of the package
  - Regular builds (`index.cjs`, `index.esm.js`) for source code inspection in node_modules
  - Minified builds (`index.min.cjs`, `index.min.esm.js`) for optimal performance
- **Enhanced build configuration**: 
  - Production builds with Terser minification
  - Source maps for debugging
  - Optimized bundle sizes (8.3K minified vs 36K readable)
- **Comprehensive changelog system**: Added CHANGELOG.md with detailed version history
- **Release automation scripts**: Added npm scripts for easier version management

### Changed
- **Package distribution**: Now uses minified files as main entry points for better performance
- **Bundle optimization**: Significantly reduced package size through minification
- **Build process**: Enhanced rollup configuration with separate development and production builds

### Fixed
- **Package size**: Reduced from 210kB to 129kB unpacked size
- **Performance**: Minified bundles load faster in production environments

## [1.0.1] - 2024-09-20

### Added
- **Bracket notation support**: Added `useDefaultNormalization` parameter to `normalizePath()` method
- **Default bracket conversion**: Paths like `'user[0].email[1].test'` are automatically converted to `'user.0.email.1.test'` when no rules match
- **Dual build system**: Both readable and minified versions of the package
  - Regular builds (`index.cjs`, `index.esm.js`) for source code inspection in node_modules
  - Minified builds (`index.min.cjs`, `index.min.esm.js`) for optimal performance
- **Enhanced build configuration**: 
  - Production builds with Terser minification
  - Source maps for debugging
  - Optimized bundle sizes (8.3K minified vs 36K readable)

### Changed
- **Package distribution**: Now uses minified files as main entry points for better performance
- **Bundle optimization**: Significantly reduced package size through minification
- **Build process**: Enhanced rollup configuration with separate development and production builds

### Fixed
- **Package size**: Reduced from 210kB to 129kB unpacked size
- **Performance**: Minified bundles load faster in production environments

## [1.0.0] - 2024-09-20

### Added
- **Core PathNormalizer class**: Advanced path normalization with tree-like pattern matching
- **Flexible pattern matching**: Support for exact matches, wildcards (`*`, `**`), regex patterns, and custom matcher functions
- **PathRuleBuilder**: Intuitive builder pattern for creating normalization rules
- **PathTransformers**: Pre-built transformation utilities for common use cases
- **Priority-based rule evaluation**: Higher priority rules are evaluated first
- **Multiple output formats**: Support for both CommonJS and ES modules
- **TypeScript support**: Full type definitions and IntelliSense support
- **Comprehensive test suite**: 97 test cases covering all functionality
- **Documentation**: Complete API documentation with examples

### Features
- **Exact string matching**: Match specific path segments
- **Wildcard matching**: Single (`*`) and deep (`**`) wildcards with capture support
- **Regex matching**: Pattern matching with regular expressions
- **Custom matchers**: Function-based segment matching with full context
- **Transform functions**: Flexible path transformation with context access
- **Multiple path normalization**: Batch processing of multiple paths
- **Case-insensitive matching**: Optional case-insensitive pattern matching
- **Error handling**: Configurable error throwing for unmatched paths
- **Source maps**: Full source map support for debugging

### Examples
- Form field mapping for backend error paths
- API response path normalization
- Complex nested object path transformations
- Dynamic path rewriting based on patterns

---

## Version History

- **1.0.1**: Enhanced with bracket notation support and dual build system
- **1.0.0**: Initial release with core path normalization functionality

## Migration Guide

### From 1.0.0 to 1.0.1

No breaking changes. The new `useDefaultNormalization` parameter is optional and defaults to `true` for backward compatibility.

```javascript
// This continues to work as before
const result = normalizer.normalizePath('user[0].email');

// New optional parameter for controlling bracket notation conversion
const result = normalizer.normalizePath('user[0].email', false); // Disable default conversion
```

## Contributing

When making changes, please update this changelog following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

### Changelog Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
