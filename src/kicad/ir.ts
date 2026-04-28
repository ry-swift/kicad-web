import type {
  GraphicItemIR,
  KicadGraphicItemAst,
  KicadPinAst,
  KicadSymbolAst,
  KicadSymbolLibrary,
  KicadSymbolUnitAst,
  PinIR,
  PropertyIR,
  SymbolIR,
  SymbolLibraryIR,
  SymbolUnitIR
} from './types.js';
import { withOptional } from './cst-utils.js';

export function toSymbolLibraryIR(library: KicadSymbolLibrary): SymbolLibraryIR {
  return withOptional({
    version: library.version,
    generator: library.generator,
    generatorVersion: library.generatorVersion,
    symbols: library.symbols.map(symbolToIR)
  });
}

function symbolToIR(symbol: KicadSymbolAst): SymbolIR {
  const symbolId = `symbol:${encodeIdSegment(symbol.name)}`;
  const topLevelUnits = symbol.graphics.length > 0 || symbol.pins.length > 0
    ? [unitToIR(symbolId, symbol.name, { name: symbol.name, graphics: symbol.graphics, pins: symbol.pins })]
    : [];

  return withOptional({
    id: symbolId,
    name: symbol.name,
    extends: symbol.extends,
    properties: symbol.properties.map((property): PropertyIR => withOptional({
      id: `${symbolId}/property:${encodeIdSegment(property.key)}`,
      key: property.key,
      value: property.value,
      at: property.at,
      hidden: property.hidden,
      effects: property.effects
    })),
    units: [...topLevelUnits, ...symbol.units.map((unit) => unitToIR(symbolId, unit.name, unit))],
    pinNames: symbol.pinNames,
    pinNumbers: symbol.pinNumbers
  });
}

function unitToIR(
  symbolId: string,
  unitName: string,
  unit: Pick<KicadSymbolUnitAst, 'graphics' | 'pins'> & { readonly name: string }
): SymbolUnitIR {
  const unitId = `${symbolId}/unit:${encodeIdSegment(unitName)}`;
  return {
    id: unitId,
    name: unit.name,
    graphics: unit.graphics.map((graphic, index) => graphicToIR(unitId, graphic, index)),
    pins: unit.pins.map((pin) => pinToIR(unitId, pin))
  };
}

function graphicToIR(unitId: string, graphic: KicadGraphicItemAst, index: number): GraphicItemIR {
  return {
    id: `${unitId}/graphic:${graphic.kind}:${index + 1}`,
    kind: graphic.kind,
    ast: graphic
  };
}

function pinToIR(unitId: string, pin: KicadPinAst): PinIR {
  const number = pin.number ?? '<unnumbered>';
  const name = pin.name ?? '<unnamed>';
  return withOptional({
    id: `${unitId}/pin:${encodeIdSegment(number)}:${encodeIdSegment(name)}`,
    electricalType: pin.electricalType,
    graphicStyle: pin.graphicStyle,
    at: pin.at,
    length: pin.length,
    hidden: pin.hidden,
    name: pin.name,
    number: pin.number,
    nameEffects: pin.nameEffects,
    numberEffects: pin.numberEffects
  });
}

function encodeIdSegment(segment: string): string {
  return segment.replaceAll('/', '%2F');
}
