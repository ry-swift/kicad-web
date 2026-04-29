import { tokenizeSExpr } from './tokenizer.js';
import {
  DEFAULT_SEXPR_PARSE_OPTIONS,
  SExprParseError,
  type SExprAtom,
  type SExprDocument,
  type SExprList,
  type SExprNode,
  type SExprParseOptions
} from './types.js';

// 转换流程第二层：把 token 流组装成 CST。
// CST 保留 atom 的 raw 文本和 source span，后续 KiCad parser 才会解释这些 list 的领域含义。
export function parseSExprDocument(input: string, options: SExprParseOptions = {}): SExprDocument {
  const limits = { ...DEFAULT_SEXPR_PARSE_OPTIONS, ...options };
  const tokens = tokenizeSExpr(input, limits);
  const expressions: SExprNode[] = [];
  const stack: SExprList[] = [];

  for (const token of tokens) {
    if (token.kind === 'open') {
      const list: SExprList = {
        kind: 'list',
        items: [],
        span: { start: token.span.start, end: token.span.end },
        ...(stack.length === 0 ? { sourceText: input } : {})
      };
      appendNode(stack, expressions, list);
      stack.push(list);

      if (stack.length > limits.maxDepth) {
        throw new SExprParseError(`S-expression nesting exceeds ${limits.maxDepth}`, token.span.start);
      }
      continue;
    }

    if (token.kind === 'close') {
      const list = stack.pop();
      if (!list) {
        throw new SExprParseError('Unexpected closing parenthesis', token.span.start);
      }
      list.span = { ...list.span, end: token.span.end };
      continue;
    }

    const atom: SExprAtom = {
      kind: 'atom',
      atomType: token.atomType ?? 'symbol',
      value: token.value ?? token.raw,
      raw: token.raw,
      span: token.span
    };
    appendNode(stack, expressions, atom);
  }

  const unclosed = stack.at(-1);
  if (unclosed) {
    throw new SExprParseError('Unclosed list', unclosed.span.start);
  }

  return {
    expressions,
    source: input
  };
}

function appendNode(stack: SExprList[], expressions: SExprNode[], node: SExprNode): void {
  const parent = stack.at(-1);
  if (parent) {
    parent.items.push(node);
    return;
  }
  expressions.push(node);
}
