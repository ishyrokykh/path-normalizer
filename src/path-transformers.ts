import type { PathTransformer } from './types';

/**
 * Helper functions for common transformations
 */
export const PathTransformers = {
  /**
   * Replace a segment at a specific position
   */
  replaceSegment(index: number, newValue: string | ((old: string) => string)): PathTransformer {
    return (_, context) => {
      const result = [...context.segments];
      const currentValue = result[index];
      if (currentValue !== undefined) {
        if (typeof newValue === 'function') {
          result[index] = newValue(currentValue);
        } else {
          result[index] = newValue;
        }
      }
      return result;
    };
  },

  /**
   * Prefix path with segments
   */
  prefix(...segments: string[]): PathTransformer {
    return (matched: string[]) => [...segments, ...matched];
  },

  /**
   * Map to a completely different path structure
   */
  mapTo(
    template: string,
    replacements: Record<
      string,
      (context: {
        segments: string[];
        matchedIndices: number[];
        wildcardCaptures: Record<string, string | string[]>;
      }) => string
    >
  ): PathTransformer {
    return (_, context) => {
      let result = template;
      for (const [key, replacer] of Object.entries(replacements)) {
        result = result.replace(`{${key}}`, replacer(context));
      }
      return result;
    };
  },

  /**
   * Remove the path entirely
   */
  remove(): PathTransformer {
    return () => null;
  },
};
