import { printSExprDocument, type SExprList } from '../sexpr/index.js';
import type { KicadSymbolLibrary } from './types.js';

export type KicadSerializeFormat = 'kicad' | 'compact';

export interface KicadSerializeOptions {
  readonly trailingNewline?: boolean;
  readonly format?: KicadSerializeFormat;
  readonly preserveSourceText?: boolean;
}

// 当前阶段的安全回写路径：未编辑的导入文件优先返回解析时保留的原始文本。
// 这样浏览器导出的 `.kicad_sym` 与源文件保持相同行数和排版；后续有真实编辑时，
// 可关闭 `preserveSourceText` 或指定 `format`，再由 S-expression printer 重新排版。
export function serializeKicadSymbolLibrary(
  library: KicadSymbolLibrary,
  options: KicadSerializeOptions = {}
): string {
  return serializeKicadSymbolLibraryCst(library.source, options);
}

export function serializeKicadSymbolLibraryCst(root: SExprList, options: KicadSerializeOptions = {}): string {
  const shouldPreserveSourceText = options.preserveSourceText !== false && options.format === undefined;
  if (shouldPreserveSourceText && root.sourceText !== undefined) {
    return applyTrailingNewlinePolicy(root.sourceText, options.trailingNewline ?? true);
  }

  return printSExprDocument(
    { expressions: [root] },
    {
      trailingNewline: options.trailingNewline ?? true,
      style: options.format ?? 'kicad'
    }
  );
}

function applyTrailingNewlinePolicy(source: string, trailingNewline: boolean): string {
  if (trailingNewline) {
    return source.endsWith('\n') ? source : `${source}\n`;
  }
  return source.replace(/\n+$/, '');
}
