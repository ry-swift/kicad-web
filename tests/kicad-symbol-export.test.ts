import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseKicadSymbolLibrary } from '../src/index.js';
import {
  createKicadSymbolExportFilename,
  createKicadSymbolExportPayload,
  sanitizeKicadSymbolExportBaseName
} from '../src/web/export/kicad-symbol-export.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tlp250Source = readFileSync(resolve(__dirname, '../tlp250.kicad_sym'), 'utf8');

describe('浏览器端 KiCad symbol 导出', () => {
  it('生成可重新解析的 .kicad_sym 下载内容', () => {
    const library = parseKicadSymbolLibrary(tlp250Source);
    const payload = createKicadSymbolExportPayload(library);
    const reparsed = parseKicadSymbolLibrary(payload.content);

    expect(payload.filename).toBe('TLP250.kicad_sym');
    expect(payload.mimeType).toContain('kicad-symbol-library');
    expect(payload.content.endsWith('\n')).toBe(true);
    expect(payload.sizeBytes).toBe(new TextEncoder().encode(payload.content).byteLength);
    expect(reparsed.symbols[0]?.name).toBe('TLP250');
    expect(reparsed.symbols[0]?.units).toHaveLength(library.symbols[0]?.units.length ?? 0);
  });

  it('清理导出文件名中的路径和非法字符', () => {
    const library = parseKicadSymbolLibrary(tlp250Source);

    expect(createKicadSymbolExportFilename(library, '../../Bad Symbol?.kicad_sym')).toBe('Bad_Symbol.kicad_sym');
    expect(sanitizeKicadSymbolExportBaseName('  <>:"|?*  ')).toBe('symbol-library');
  });
});
