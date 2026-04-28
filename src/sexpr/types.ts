export type SExprAtomType = 'symbol' | 'number' | 'string';

export interface SourcePosition {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface SourceSpan {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface SExprAtom {
  readonly kind: 'atom';
  readonly atomType: SExprAtomType;
  readonly value: string;
  readonly raw: string;
  readonly span: SourceSpan;
}

export interface SExprList {
  readonly kind: 'list';
  readonly items: SExprNode[];
  span: SourceSpan;
}

export type SExprNode = SExprAtom | SExprList;

export interface SExprDocument {
  readonly expressions: SExprNode[];
  readonly source?: string;
}

export interface SExprParseOptions {
  readonly maxInputBytes?: number;
  readonly maxDepth?: number;
  readonly maxTokens?: number;
}

export const DEFAULT_SEXPR_PARSE_OPTIONS = {
  maxInputBytes: 5 * 1024 * 1024,
  maxDepth: 128,
  maxTokens: 200_000
} as const satisfies Required<SExprParseOptions>;

export class SExprParseError extends Error {
  readonly position?: SourcePosition;

  constructor(message: string, position?: SourcePosition) {
    super(position ? `${message} at ${position.line}:${position.column}` : message);
    this.name = 'SExprParseError';
    if (position) {
      this.position = position;
    }
  }
}
