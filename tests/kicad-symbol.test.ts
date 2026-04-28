import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseKicadSymbolLibrary, serializeKicadSymbolLibrary, toSymbolLibraryIR } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tlp250Source = readFileSync(resolve(__dirname, '../tlp250.kicad_sym'), 'utf8');

describe('KiCad symbol AST and IR mapping', () => {
  it('parses TLP250 symbols, properties, graphics and pins', () => {
    const library = parseKicadSymbolLibrary(tlp250Source);

    expect(library.version).toBe(20251024);
    expect(library.generator).toBe('kicad_symbol_editor');
    expect(library.generatorVersion).toBe('10.0');
    expect(library.symbols).toHaveLength(1);

    const symbol = library.symbols[0];
    expect(symbol?.name).toBe('TLP250');
    expect(symbol?.pinNames?.hidden).toBe(true);
    expect(symbol?.embeddedFonts).toBe(false);
    expect(symbol?.properties.map((property) => property.key)).toEqual([
      'Reference',
      'Value',
      'Footprint',
      'Datasheet',
      'Description',
      'ki_keywords',
      'ki_fp_filters'
    ]);

    const graphicUnit = symbol?.units.find((unit) => unit.name === 'TLP250_0_1');
    expect(graphicUnit?.graphics.length).toBeGreaterThan(20);
    expect(graphicUnit?.graphics.some((item) => item.kind === 'rectangle')).toBe(true);
    expect(graphicUnit?.graphics.some((item) => item.kind === 'circle')).toBe(true);

    const pinUnit = symbol?.units.find((unit) => unit.name === 'TLP250_1_1');
    expect(pinUnit?.pins).toHaveLength(8);

    const vcc = pinUnit?.pins.find((pin) => pin.number === '8');
    expect(vcc).toMatchObject({
      name: 'VCC',
      electricalType: 'power_in',
      graphicStyle: 'line',
      at: { x: 10.16, y: 7.62, rotation: 180 },
      length: 2.54
    });
  });

  it('creates stable Symbol IR ids', () => {
    const first = toSymbolLibraryIR(parseKicadSymbolLibrary(tlp250Source));
    const second = toSymbolLibraryIR(parseKicadSymbolLibrary(tlp250Source));

    expect(first).toEqual(second);

    const symbol = first.symbols[0];
    expect(symbol?.id).toBe('symbol:TLP250');
    expect(symbol?.properties[0]?.id).toBe('symbol:TLP250/property:Reference');

    const pinIds = symbol?.units.flatMap((unit) => unit.pins.map((pin) => pin.id)) ?? [];
    expect(pinIds).toContain('symbol:TLP250/unit:TLP250_1_1/pin:8:VCC');
  });

  it('round-trips TLP250 without semantic count loss', () => {
    const library = parseKicadSymbolLibrary(tlp250Source);
    const roundTripped = parseKicadSymbolLibrary(serializeKicadSymbolLibrary(library));

    expect(roundTripped.version).toBe(library.version);
    expect(roundTripped.symbols).toHaveLength(library.symbols.length);

    const originalSymbol = library.symbols[0];
    const nextSymbol = roundTripped.symbols[0];
    expect(nextSymbol?.name).toBe(originalSymbol?.name);
    expect(nextSymbol?.properties).toHaveLength(originalSymbol?.properties.length ?? 0);
    expect(nextSymbol?.units).toHaveLength(originalSymbol?.units.length ?? 0);

    const originalPinCount = originalSymbol?.units.reduce((total, unit) => total + unit.pins.length, 0);
    const nextPinCount = nextSymbol?.units.reduce((total, unit) => total + unit.pins.length, 0);
    expect(nextPinCount).toBe(originalPinCount);
  });

  it('preserves unknown KiCad entries during serialization', () => {
    const sourceWithFutureToken = tlp250Source.replace(
      '(embedded_fonts no)',
      '(future_token (nested yes))\n\t\t(embedded_fonts no)'
    );
    const library = parseKicadSymbolLibrary(sourceWithFutureToken);
    const symbol = library.symbols[0];

    expect(symbol?.unknownEntries.map((entry) => entry.head)).toContain('future_token');

    const roundTripped = parseKicadSymbolLibrary(serializeKicadSymbolLibrary(library));
    expect(roundTripped.symbols[0]?.unknownEntries.map((entry) => entry.head)).toContain('future_token');
  });
});
