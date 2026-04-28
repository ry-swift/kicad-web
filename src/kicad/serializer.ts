import { printSExprDocument, type SExprList } from '../sexpr/index.js';
import type { KicadSymbolLibrary } from './types.js';

export interface KicadSerializeOptions {
  readonly trailingNewline?: boolean;
}

export function serializeKicadSymbolLibrary(
  library: KicadSymbolLibrary,
  options: KicadSerializeOptions = {}
): string {
  return serializeKicadSymbolLibraryCst(library.source, options);
}

export function serializeKicadSymbolLibraryCst(root: SExprList, options: KicadSerializeOptions = {}): string {
  return printSExprDocument(
    { expressions: [root] },
    {
      trailingNewline: options.trailingNewline ?? true
    }
  );
}
