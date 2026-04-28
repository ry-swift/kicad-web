import { parseSExprDocument, SExprParseError, type SExprList } from '../sexpr/index.js';
import {
  atomValue,
  booleanListValue,
  childLists,
  collectUnknownEntries,
  firstChildList,
  isList,
  listHead,
  numberValue,
  parseAt,
  parseFill,
  parsePinDisplayOptions,
  parsePoint,
  parsePts,
  parseStroke,
  parseTextEffects,
  withOptional
} from './cst-utils.js';
import type {
  KicadGraphicItemAst,
  KicadPinAst,
  KicadPropertyAst,
  KicadSymbolAst,
  KicadSymbolLibrary,
  KicadSymbolUnitAst,
  TextEffects
} from './types.js';

const ROOT_KNOWN = new Set(['version', 'generator', 'generator_version', 'symbol']);
const SYMBOL_KNOWN = new Set([
  'pin_names',
  'pin_numbers',
  'exclude_from_sim',
  'in_bom',
  'on_board',
  'in_pos_files',
  'duplicate_pin_numbers_are_jumpers',
  'property',
  'symbol',
  'embedded_fonts',
  'extends',
  'rectangle',
  'polyline',
  'circle',
  'arc',
  'bezier',
  'text',
  'pin'
]);
const UNIT_KNOWN = new Set(['rectangle', 'polyline', 'circle', 'arc', 'bezier', 'text', 'pin']);
const PROPERTY_KNOWN = new Set(['at', 'show_name', 'do_not_autoplace', 'hide', 'effects']);
const GRAPHIC_KNOWN = new Set(['start', 'end', 'pts', 'center', 'radius', 'mid', 'stroke', 'fill', 'at', 'effects']);
const PIN_KNOWN = new Set(['at', 'length', 'hide', 'name', 'number']);

export function parseKicadSymbolLibrary(input: string): KicadSymbolLibrary {
  const document = parseSExprDocument(input);
  if (document.expressions.length !== 1 || !isList(document.expressions[0])) {
    throw new SExprParseError('KiCad symbol library must contain one root list');
  }
  return parseKicadSymbolLibraryCst(document.expressions[0]);
}

export function parseKicadSymbolLibraryCst(root: SExprList): KicadSymbolLibrary {
  if (listHead(root) !== 'kicad_symbol_lib') {
    throw new SExprParseError('Root list must be kicad_symbol_lib', root.span.start);
  }

  const symbols: KicadSymbolAst[] = [];
  let version: number | undefined;
  let generator: string | undefined;
  let generatorVersion: string | undefined;

  for (const child of childLists(root)) {
    switch (listHead(child)) {
      case 'version':
        version = numberValue(child.items[1]);
        break;
      case 'generator':
        generator = atomValue(child.items[1]);
        break;
      case 'generator_version':
        generatorVersion = atomValue(child.items[1]);
        break;
      case 'symbol':
        symbols.push(parseSymbol(child));
        break;
    }
  }

  return withOptional({
    version,
    generator,
    generatorVersion,
    symbols,
    unknownEntries: collectUnknownEntries(root, ROOT_KNOWN),
    source: root
  });
}

function parseSymbol(list: SExprList): KicadSymbolAst {
  const name = atomValue(list.items[1]);
  if (!name) {
    throw new SExprParseError('KiCad symbol is missing a name', list.span.start);
  }

  const properties: KicadPropertyAst[] = [];
  const graphics: KicadGraphicItemAst[] = [];
  const pins: KicadPinAst[] = [];
  const units: KicadSymbolUnitAst[] = [];
  let extendsName: string | undefined;
  let pinNames: KicadSymbolAst['pinNames'];
  let pinNumbers: KicadSymbolAst['pinNumbers'];
  let excludeFromSim: boolean | undefined;
  let inBom: boolean | undefined;
  let onBoard: boolean | undefined;
  let inPosFiles: boolean | undefined;
  let duplicatePinNumbersAreJumpers: boolean | undefined;
  let embeddedFonts: boolean | undefined;

  for (const child of childLists(list)) {
    switch (listHead(child)) {
      case 'pin_names':
        pinNames = parsePinDisplayOptions(child);
        break;
      case 'pin_numbers':
        pinNumbers = parsePinDisplayOptions(child);
        break;
      case 'exclude_from_sim':
        excludeFromSim = booleanListValue(child);
        break;
      case 'in_bom':
        inBom = booleanListValue(child);
        break;
      case 'on_board':
        onBoard = booleanListValue(child);
        break;
      case 'in_pos_files':
        inPosFiles = booleanListValue(child);
        break;
      case 'duplicate_pin_numbers_are_jumpers':
        duplicatePinNumbersAreJumpers = booleanListValue(child);
        break;
      case 'property':
        properties.push(parseProperty(child));
        break;
      case 'symbol':
        units.push(parseSymbolUnit(child));
        break;
      case 'embedded_fonts':
        embeddedFonts = booleanListValue(child);
        break;
      case 'extends':
        extendsName = atomValue(child.items[1]);
        break;
      case 'rectangle':
      case 'polyline':
      case 'circle':
      case 'arc':
      case 'bezier':
      case 'text':
        graphics.push(parseGraphic(child));
        break;
      case 'pin':
        pins.push(parsePin(child));
        break;
    }
  }

  return withOptional({
    name,
    extends: extendsName,
    pinNames,
    pinNumbers,
    excludeFromSim,
    inBom,
    onBoard,
    inPosFiles,
    duplicatePinNumbersAreJumpers,
    embeddedFonts,
    properties,
    graphics,
    pins,
    units,
    unknownEntries: collectUnknownEntries(list, SYMBOL_KNOWN),
    source: list
  });
}

function parseSymbolUnit(list: SExprList): KicadSymbolUnitAst {
  const name = atomValue(list.items[1]);
  if (!name) {
    throw new SExprParseError('KiCad nested symbol is missing a name', list.span.start);
  }

  const graphics: KicadGraphicItemAst[] = [];
  const pins: KicadPinAst[] = [];

  for (const child of childLists(list)) {
    switch (listHead(child)) {
      case 'rectangle':
      case 'polyline':
      case 'circle':
      case 'arc':
      case 'bezier':
      case 'text':
        graphics.push(parseGraphic(child));
        break;
      case 'pin':
        pins.push(parsePin(child));
        break;
    }
  }

  return {
    name,
    graphics,
    pins,
    unknownEntries: collectUnknownEntries(list, UNIT_KNOWN),
    source: list
  };
}

function parseProperty(list: SExprList): KicadPropertyAst {
  const key = atomValue(list.items[1]);
  const value = atomValue(list.items[2]);
  if (key === undefined || value === undefined) {
    throw new SExprParseError('KiCad property requires key and value', list.span.start);
  }

  const at = firstChildList(list, 'at');
  const effects = firstChildList(list, 'effects');

  return withOptional({
    key,
    value,
    at: at ? parseAt(at) : undefined,
    showName: optionalBooleanChild(list, 'show_name'),
    doNotAutoplace: optionalBooleanChild(list, 'do_not_autoplace'),
    hidden: optionalBooleanChild(list, 'hide'),
    effects: effects ? parseTextEffects(effects) : undefined,
    unknownEntries: collectUnknownEntries(list, PROPERTY_KNOWN),
    source: list
  });
}

function parseGraphic(list: SExprList): KicadGraphicItemAst {
  const kind = listHead(list);
  const strokeList = firstChildList(list, 'stroke');
  const fillList = firstChildList(list, 'fill');
  const effectsList = firstChildList(list, 'effects');
  const common = {
    stroke: strokeList ? parseStroke(strokeList) : undefined,
    fill: fillList ? parseFill(fillList) : undefined,
    effects: effectsList ? parseTextEffects(effectsList) : undefined,
    unknownEntries: collectUnknownEntries(list, GRAPHIC_KNOWN),
    source: list
  };

  switch (kind) {
    case 'rectangle':
      return withOptional({
        kind,
        start: maybePointChild(list, 'start'),
        end: maybePointChild(list, 'end'),
        ...common
      });
    case 'polyline':
      return withOptional({
        kind,
        points: firstChildList(list, 'pts') ? parsePts(firstChildList(list, 'pts')!) : [],
        ...common
      });
    case 'circle':
      return withOptional({
        kind,
        center: maybePointChild(list, 'center'),
        radius: firstChildList(list, 'radius') ? numberValue(firstChildList(list, 'radius')!.items[1]) : undefined,
        ...common
      });
    case 'arc':
      return withOptional({
        kind,
        start: maybePointChild(list, 'start'),
        mid: maybePointChild(list, 'mid'),
        end: maybePointChild(list, 'end'),
        ...common
      });
    case 'bezier':
      return withOptional({
        kind,
        points: firstChildList(list, 'pts') ? parsePts(firstChildList(list, 'pts')!) : [],
        ...common
      });
    case 'text': {
      const at = firstChildList(list, 'at');
      return withOptional({
        kind,
        value: atomValue(list.items[1]) ?? '',
        at: at ? parseAt(at) : undefined,
        ...common
      });
    }
    default:
      throw new SExprParseError(`Unsupported graphic item ${kind ?? '<unknown>'}`, list.span.start);
  }
}

function parsePin(list: SExprList): KicadPinAst {
  const electricalType = atomValue(list.items[1]);
  const graphicStyle = atomValue(list.items[2]);
  if (!electricalType || !graphicStyle) {
    throw new SExprParseError('KiCad pin requires electrical type and graphical style', list.span.start);
  }

  const at = firstChildList(list, 'at');
  const length = firstChildList(list, 'length');
  const name = parsePinText(firstChildList(list, 'name'));
  const number = parsePinText(firstChildList(list, 'number'));

  return withOptional({
    electricalType,
    graphicStyle,
    at: at ? parseAt(at) : undefined,
    length: length ? numberValue(length.items[1]) : undefined,
    hidden: optionalBooleanChild(list, 'hide'),
    name: name?.value,
    nameEffects: name?.effects,
    number: number?.value,
    numberEffects: number?.effects,
    unknownEntries: collectUnknownEntries(list, PIN_KNOWN),
    source: list
  });
}

function parsePinText(list: SExprList | undefined): { value: string; effects?: TextEffects } | undefined {
  if (!list) {
    return undefined;
  }
  const effects = firstChildList(list, 'effects');
  return withOptional({
    value: atomValue(list.items[1]) ?? '',
    effects: effects ? parseTextEffects(effects) : undefined
  });
}

function optionalBooleanChild(list: SExprList, head: string): boolean | undefined {
  const child = firstChildList(list, head);
  return child ? booleanListValue(child) : undefined;
}

function maybePointChild(list: SExprList, head: string) {
  const child = firstChildList(list, head);
  return child ? parsePoint(child) : undefined;
}
