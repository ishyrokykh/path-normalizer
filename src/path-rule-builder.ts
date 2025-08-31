import type { PathRule, PathSegmentMatcher, PathTransformer } from './types';

/**
 * Convenience builder for common patterns
 */
export class PathRuleBuilder {
  private pattern: PathSegmentMatcher[] = [];
  private transformFn?: PathTransformer;
  private priority = 0;

  static create(): PathRuleBuilder {
    return new PathRuleBuilder();
  }

  exact(segment: string): this {
    this.pattern.push(segment);
    return this;
  }

  regex(pattern: RegExp): this {
    this.pattern.push(pattern);
    return this;
  }

  wildcard(): this {
    this.pattern.push('*');
    return this;
  }

  deepWildcard(): this {
    this.pattern.push('**');
    return this;
  }

  custom(matcher: (segment: string, index: number, segments: string[]) => boolean): this {
    this.pattern.push(matcher);
    return this;
  }

  oneOf(values: string[]): this {
    this.pattern.push((segment) => values.includes(segment));
    return this;
  }

  transform(fn: PathTransformer): this {
    this.transformFn = fn;
    return this;
  }

  setPriority(priority: number): this {
    this.priority = priority;
    return this;
  }

  build(): PathRule {
    if (!this.transformFn) {
      throw new Error('Transform function is required');
    }
    return {
      pattern: this.pattern,
      transform: this.transformFn,
      priority: this.priority,
    };
  }
}
