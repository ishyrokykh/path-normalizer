import toPath from 'lodash/toPath';

import type {
  NormalizedPath,
  PathNormalizerOptions,
  PathRule,
  PathSegmentMatcher,
  PathTransformer,
} from './types';

/**
 * Advanced path normalizer with tree-like pattern matching
 */
export class PathNormalizer {
  private rules: PathRule[] = [];
  private delimiter: string;
  private caseInsensitive: boolean;
  private throwOnUnmatched: boolean;

  constructor(options: PathNormalizerOptions = {}) {
    this.delimiter = options.delimiter ?? '.';
    this.caseInsensitive = options.caseInsensitive ?? false;
    this.throwOnUnmatched = options.throwOnUnmatched ?? false;
  }

  /**
   * Add a normalization rule
   */
  addRule(pattern: PathSegmentMatcher[], transform: PathTransformer, priority = 0): this {
    this.rules.push({ pattern, transform, priority });
    this.rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return this;
  }

  /**
   * Add multiple rules at once
   */
  addRules(rules: PathRule[]): this {
    rules.forEach((rule) => this.addRule(rule.pattern, rule.transform, rule.priority));
    return this;
  }

  /**
   * Check if a segment matches a pattern
   */
  private matchSegment(
    segment: string,
    pattern: PathSegmentMatcher,
    index: number,
    segments: string[]
  ): boolean | { captures?: string | string[] } {
    if (pattern === '*') {
      return { captures: segment };
    }

    if (pattern === '**') {
      return { captures: segments.slice(index) };
    }

    if (typeof pattern === 'string') {
      return this.caseInsensitive
        ? segment.toLowerCase() === pattern.toLowerCase()
        : segment === pattern;
    }

    if (pattern instanceof RegExp) {
      return pattern.test(segment);
    }

    if (typeof pattern === 'function') {
      return pattern(segment, index, segments);
    }

    return false;
  }

  /**
   * Match a path against a rule pattern
   */
  private matchPath(
    segments: string[],
    pattern: PathSegmentMatcher[]
  ): false | { matchedIndices: number[]; wildcardCaptures: Record<string, string | string[]> } {
    const matchedIndices: number[] = [];
    const wildcardCaptures: Record<string, string | string[]> = {};
    let segmentIndex = 0;
    let patternIndex = 0;
    let wildcardIndex = 0;

    while (patternIndex < pattern.length && segmentIndex < segments.length) {
      const patternItem = pattern[patternIndex];

      if (patternItem === '**') {
        // Deep wildcard - consume all remaining segments
        wildcardCaptures[`wildcard_${wildcardIndex++}`] = segments.slice(segmentIndex);
        matchedIndices.push(
          ...Array.from({ length: segments.length - segmentIndex }, (_, i) => segmentIndex + i)
        );
        return { matchedIndices, wildcardCaptures };
      }

      const segment = segments[segmentIndex];
      if (segment === undefined || patternItem === undefined) {
        return false;
      }

      const matchResult = this.matchSegment(segment, patternItem, segmentIndex, segments);

      if (matchResult === false) {
        return false;
      }

      if (typeof matchResult === 'object' && matchResult.captures !== undefined) {
        wildcardCaptures[`wildcard_${wildcardIndex++}`] = matchResult.captures;
      }

      matchedIndices.push(segmentIndex);
      segmentIndex++;
      patternIndex++;
    }

    // Check if we've consumed all pattern items and segments
    if (patternIndex === pattern.length && segmentIndex === segments.length) {
      return { matchedIndices, wildcardCaptures };
    }

    // Handle trailing ** in pattern
    if (patternIndex === pattern.length - 1 && pattern[patternIndex] === '**') {
      return { matchedIndices, wildcardCaptures };
    }

    return false;
  }

  /**
   * Normalize a single path
   */
  normalizePath(path: string, useDefaultNormalization: boolean = true): NormalizedPath {
    const segments = toPath(path);

    for (const rule of this.rules) {
      const matchResult = this.matchPath(segments, rule.pattern);

      if (matchResult !== false) {
        const matched = segments.filter((_, i) => matchResult.matchedIndices.includes(i));
        const transformed = rule.transform(matched, {
          segments,
          matchedIndices: matchResult.matchedIndices,
          wildcardCaptures: matchResult.wildcardCaptures,
        });

        if (transformed === null) {
          return { original: path, normalized: null, matched: true, rule };
        }

        const normalizedPath = Array.isArray(transformed)
          ? transformed.join(this.delimiter)
          : transformed;

        return { original: path, normalized: normalizedPath, matched: true, rule };
      }
    }

    if (this.throwOnUnmatched) {
      throw new Error(`No matching rule for path: ${path}`);
    }

    if (useDefaultNormalization) {
      const normalizedPath = segments.join(this.delimiter);
      return { original: path, normalized: normalizedPath, matched: false };
    }

    return { original: path, normalized: path, matched: false };
  }

  /**
   * Normalize multiple paths
   */
  normalizePaths(paths: string[], useDefaultNormalization: boolean = true): NormalizedPath[] {
    return paths.map((path) => this.normalizePath(path, useDefaultNormalization));
  }

  /**
   * Clear all rules
   */
  clearRules(): this {
    this.rules = [];
    return this;
  }
}
