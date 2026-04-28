import { describe, expect, it } from 'vitest';
import { parseSExprDocument, printSExprDocument, SExprParseError } from '../src/index.js';

describe('S-expression CST parser/printer', () => {
  it('parses a KiCad-like document with atom metadata', () => {
    const document = parseSExprDocument('(kicad_symbol_lib (version 20251024) (generator "kicad_symbol_editor"))');

    expect(document.expressions).toHaveLength(1);
    const root = document.expressions[0];
    expect(root?.kind).toBe('list');
    if (root?.kind !== 'list') {
      throw new Error('Expected list root');
    }

    expect(root.items[0]).toMatchObject({ kind: 'atom', atomType: 'symbol', value: 'kicad_symbol_lib' });
    const version = root.items[1];
    expect(version?.kind).toBe('list');
    if (version?.kind === 'list') {
      expect(version.items[1]).toMatchObject({ kind: 'atom', atomType: 'number', value: '20251024' });
    }
  });

  it('preserves escaped string values and re-escapes them when printed', () => {
    const document = parseSExprDocument('(property "Description" "A \\"quoted\\" value with \\\\ slash")');
    const printed = printSExprDocument(document, { trailingNewline: false });

    expect(printed).toContain('\\"quoted\\"');
    expect(printed).toContain('\\\\ slash');
    expect(parseSExprDocument(printed).expressions).toHaveLength(1);
  });

  it('round-trips unknown nested lists', () => {
    const source = '(kicad_symbol_lib (version 20251024) (future_token (nested yes) (value "kept")))';
    const printed = printSExprDocument(parseSExprDocument(source), { trailingNewline: false });
    const reparsed = parseSExprDocument(printed);
    const root = reparsed.expressions[0];

    expect(root?.kind).toBe('list');
    if (root?.kind !== 'list') {
      throw new Error('Expected list root');
    }

    const heads = root.items
      .filter((item) => item.kind === 'list')
      .map((item) => (item.kind === 'list' && item.items[0]?.kind === 'atom' ? item.items[0].value : ''));
    expect(heads).toContain('future_token');
  });

  it('rejects malformed lists and strings', () => {
    expect(() => parseSExprDocument('(kicad_symbol_lib')).toThrow(SExprParseError);
    expect(() => parseSExprDocument('(kicad_symbol_lib))')).toThrow(SExprParseError);
    expect(() => parseSExprDocument('(name "unterminated)')).toThrow(SExprParseError);
  });

  it('rejects oversized input', () => {
    expect(() => parseSExprDocument('(a)', { maxInputBytes: 2 })).toThrow(SExprParseError);
  });

  it('rejects excessive nesting depth', () => {
    expect(() => parseSExprDocument('(((a)))', { maxDepth: 2 })).toThrow(SExprParseError);
  });
});
