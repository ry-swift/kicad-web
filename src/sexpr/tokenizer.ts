import {
  DEFAULT_SEXPR_PARSE_OPTIONS,
  SExprParseError,
  type SExprAtomType,
  type SExprParseOptions,
  type SourcePosition,
  type SourceSpan
} from './types.js';

export type SExprTokenKind = 'open' | 'close' | 'atom';

export interface SExprToken {
  readonly kind: SExprTokenKind;
  readonly atomType?: SExprAtomType;
  readonly value?: string;
  readonly raw: string;
  readonly span: SourceSpan;
}

const NUMBER_PATTERN = /^[+-]?(?:(?:\d+\.\d*)|(?:\d*\.\d+)|(?:\d+))(?:[eE][+-]?\d+)?$/;

export function tokenizeSExpr(input: string, options: SExprParseOptions = {}): SExprToken[] {
  const limits = { ...DEFAULT_SEXPR_PARSE_OPTIONS, ...options };
  const byteLength = new TextEncoder().encode(input).length;
  if (byteLength > limits.maxInputBytes) {
    throw new SExprParseError(`S-expression input exceeds ${limits.maxInputBytes} bytes`);
  }

  const state = new TokenizerState(input);
  const tokens: SExprToken[] = [];

  while (!state.isDone()) {
    state.skipWhitespaceAndComments();
    if (state.isDone()) {
      break;
    }

    const token = readToken(state);
    tokens.push(token);
    if (tokens.length > limits.maxTokens) {
      throw new SExprParseError(`S-expression input exceeds ${limits.maxTokens} tokens`, token.span.start);
    }
  }

  return tokens;
}

function readToken(state: TokenizerState): SExprToken {
  const start = state.position();
  const char = state.peek();

  if (char === '(') {
    state.advance();
    return { kind: 'open', raw: '(', span: { start, end: state.position() } };
  }

  if (char === ')') {
    state.advance();
    return { kind: 'close', raw: ')', span: { start, end: state.position() } };
  }

  if (char === '"') {
    return readStringToken(state);
  }

  return readBareAtomToken(state);
}

function readStringToken(state: TokenizerState): SExprToken {
  const start = state.position();
  let raw = state.advance();
  let value = '';

  while (!state.isDone()) {
    const char = state.advance();
    raw += char;

    if (char === '"') {
      return {
        kind: 'atom',
        atomType: 'string',
        value,
        raw,
        span: { start, end: state.position() }
      };
    }

    if (char === '\\') {
      if (state.isDone()) {
        throw new SExprParseError('Unterminated escape sequence in string', state.position());
      }
      const escaped = state.advance();
      raw += escaped;
      value += unescapeChar(escaped);
      continue;
    }

    value += char;
  }

  throw new SExprParseError('Unterminated string literal', start);
}

function readBareAtomToken(state: TokenizerState): SExprToken {
  const start = state.position();
  let raw = '';

  while (!state.isDone()) {
    const char = state.peek();
    if (isWhitespace(char) || char === '(' || char === ')') {
      break;
    }
    raw += state.advance();
  }

  if (raw.length === 0) {
    throw new SExprParseError(`Unexpected character "${state.peek()}"`, start);
  }

  return {
    kind: 'atom',
    atomType: NUMBER_PATTERN.test(raw) ? 'number' : 'symbol',
    value: raw,
    raw,
    span: { start, end: state.position() }
  };
}

function unescapeChar(char: string): string {
  switch (char) {
    case 'n':
      return '\n';
    case 'r':
      return '\r';
    case 't':
      return '\t';
    case '"':
      return '"';
    case '\\':
      return '\\';
    default:
      return char;
  }
}

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

class TokenizerState {
  private offset = 0;
  private line = 1;
  private column = 1;

  constructor(private readonly input: string) {}

  isDone(): boolean {
    return this.offset >= this.input.length;
  }

  peek(): string {
    return this.input[this.offset] ?? '';
  }

  advance(): string {
    const char = this.input[this.offset];
    if (char === undefined) {
      return '';
    }

    this.offset += 1;
    if (char === '\n') {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return char;
  }

  position(): SourcePosition {
    return {
      offset: this.offset,
      line: this.line,
      column: this.column
    };
  }

  skipWhitespaceAndComments(): void {
    while (!this.isDone()) {
      const char = this.peek();
      if (isWhitespace(char)) {
        this.advance();
        continue;
      }

      // KiCad 输出通常不带注释；这里兼容常见 S-expression 分号注释，
      // 注释不会进入 CST，避免后续 KiCad 语义层误把注释当节点。
      if (char === ';') {
        while (!this.isDone() && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      break;
    }
  }
}
