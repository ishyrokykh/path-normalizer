/**
 * Path normalization rule types
 */
export type PathSegmentMatcher =
  | RegExp // Pattern match
  | ((segment: string, index: number, segments: string[]) => boolean) // Custom matcher
  | string; // Exact match and wildcard support * - matches any single segment, ** - matches any remaining segments

export type PathTransformer = (
  matched: string[],
  context: {
    segments: string[];
    matchedIndices: number[];
    wildcardCaptures: Record<string, string | string[]>;
  }
) => string | string[] | null; // null means remove this path

export interface PathRule {
  pattern: PathSegmentMatcher[];
  transform: PathTransformer;
  priority?: number; // Higher priority rules are evaluated first
}

export interface PathNormalizerOptions {
  delimiter?: string;
  caseInsensitive?: boolean;
  throwOnUnmatched?: boolean;
}

export interface NormalizedPath {
  original: string;
  normalized: string | null;
  matched: boolean;
  rule?: PathRule;
}
