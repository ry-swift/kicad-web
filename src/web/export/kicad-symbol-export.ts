import {
  parseKicadSymbolLibrary,
  serializeKicadSymbolLibrary,
  type KicadSymbolLibrary
} from '../../kicad/index.js';

export const KICAD_SYMBOL_EXPORT_MIME_TYPE = 'application/x-kicad-symbol-library;charset=utf-8';

export interface KicadSymbolExportOptions {
  readonly filename?: string;
}

export interface KicadSymbolExportPayload {
  readonly filename: string;
  readonly content: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

// Web 下载前统一生成 payload：这里复用 KiCad serializer，并立即重新解析输出，
// 防止浏览器把不可被 KiCad 语义层读取的内容交给用户下载。
export function createKicadSymbolExportPayload(
  library: KicadSymbolLibrary,
  options: KicadSymbolExportOptions = {}
): KicadSymbolExportPayload {
  const content = serializeKicadSymbolLibrary(library, { trailingNewline: true });
  parseKicadSymbolLibrary(content);

  return {
    filename: createKicadSymbolExportFilename(library, options.filename),
    content,
    mimeType: KICAD_SYMBOL_EXPORT_MIME_TYPE,
    sizeBytes: new TextEncoder().encode(content).byteLength
  };
}

export function createKicadSymbolExportFilename(
  library: KicadSymbolLibrary,
  requestedFilename?: string
): string {
  const baseName = requestedFilename ?? library.symbols[0]?.name ?? 'symbol-library';
  return `${sanitizeKicadSymbolExportBaseName(baseName)}.kicad_sym`;
}

export function sanitizeKicadSymbolExportBaseName(input: string): string {
  const lastPathSegment = input.trim().split(/[\\/]/).filter(Boolean).at(-1) ?? '';
  const withoutExtension = lastPathSegment.replace(/\.kicad_sym$/i, '');
  const cleaned = withoutExtension
    .normalize('NFKC')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '');

  return cleaned || 'symbol-library';
}

export function downloadKicadSymbolLibrary(
  library: KicadSymbolLibrary,
  options: KicadSymbolExportOptions = {}
): KicadSymbolExportPayload {
  const payload = createKicadSymbolExportPayload(library, options);
  const blob = new Blob([payload.content], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.filename;
  link.rel = 'noopener';
  link.style.display = 'none';

  try {
    const parent = document.body ?? document.documentElement;
    parent.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }

  return payload;
}
