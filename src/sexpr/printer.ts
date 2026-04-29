import type { SExprAtom, SExprDocument, SExprList, SExprNode } from './types.js';

export type SExprPrintStyle = 'compact' | 'kicad';

export interface SExprPrintOptions {
  readonly indent?: string;
  readonly trailingNewline?: boolean;
  readonly maxInlineAtoms?: number;
  readonly style?: SExprPrintStyle;
}

const DEFAULT_PRINT_OPTIONS = {
  indent: '\t',
  trailingNewline: true,
  maxInlineAtoms: 4,
  style: 'compact'
} as const satisfies Required<SExprPrintOptions>;

// 转换流程的回写出口：把 CST/AST 中保留的 S-expression 节点重新打印成 KiCad 可读文本。
// 它只负责格式化和字符串转义，不判断 symbol/pin 等 KiCad 语义是否合法。
export function printSExprDocument(document: SExprDocument, options: SExprPrintOptions = {}): string {
  const resolved = { ...DEFAULT_PRINT_OPTIONS, ...options };
  const body = document.expressions.map((node) => printSExpr(node, resolved)).join('\n');
  return resolved.trailingNewline ? `${body}\n` : body;
}

export function printSExpr(node: SExprNode, options: SExprPrintOptions = {}): string {
  return printNode(node, { ...DEFAULT_PRINT_OPTIONS, ...options }, 0);
}

function printNode(node: SExprNode, options: Required<SExprPrintOptions>, depth: number): string {
  if (node.kind === 'atom') {
    return printAtom(node);
  }
  return printList(node, options, depth);
}

function printList(list: SExprList, options: Required<SExprPrintOptions>, depth: number): string {
  if (list.items.length === 0) {
    return '()';
  }

  if (options.style === 'kicad') {
    return printKicadList(list, options, depth);
  }

  const inline = list.items.every((item) => item.kind === 'atom') && list.items.length <= options.maxInlineAtoms;
  if (inline) {
    return `(${list.items.map((item) => printNode(item, options, depth)).join(' ')})`;
  }

  const [head, ...rest] = list.items;
  const currentIndent = options.indent.repeat(depth);
  const childIndent = options.indent.repeat(depth + 1);
  const headText = head ? printNode(head, options, depth + 1) : '';
  const children = rest.map((item) => `${childIndent}${printNode(item, options, depth + 1)}`).join('\n');

  if (children.length === 0) {
    return `(${headText})`;
  }

  return `(${headText}\n${children}\n${currentIndent})`;
}

function printKicadList(list: SExprList, options: Required<SExprPrintOptions>, depth: number): string {
  if (list.items.every((item) => item.kind === 'atom')) {
    return `(${list.items.map((item) => printNode(item, options, depth)).join(' ')})`;
  }

  const [head, ...rest] = list.items;
  const currentIndent = options.indent.repeat(depth);
  const childIndent = options.indent.repeat(depth + 1);
  const headText = head ? printNode(head, options, depth + 1) : '';
  const children = rest.map((item) => `${childIndent}${printNode(item, options, depth + 1)}`).join('\n');

  if (children.length === 0) {
    return `(${headText})`;
  }

  return `(${headText}\n${children}\n${currentIndent})`;
}

function printAtom(atom: SExprAtom): string {
  if (atom.atomType === 'string') {
    return `"${escapeSExprString(atom.value)}"`;
  }
  return atom.raw || atom.value;
}

function escapeSExprString(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\t', '\\t');
}
