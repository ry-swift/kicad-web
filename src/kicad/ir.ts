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

// KiCad AST -> Symbol IR：
// AST 负责忠实表达文件格式，IR 负责提供 Web 端稳定、renderer 无关的业务模型。
// SVG、PixiJS、选中态、编辑命令和测试断言都应引用 IR，而不是直接依赖 CST 或 Pixi DisplayObject。
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
  // KiCad 允许部分图元/pin 直接挂在顶层 symbol 上；IR 统一把它们提升为一个虚拟 unit，
  // 这样 renderer 只需要遍历 `symbol.units`，不用为顶层和嵌套 unit 分两套逻辑。
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

// unit 是 renderer 的主要遍历边界：一个 unit 下包含一组图元和引脚。
// ID 中带上 symbol/unit 名称，便于后续跨 SVG、PixiJS、编辑器命令和测试快照稳定定位同一对象。
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

// 图形 IR 暂时保留原始 AST 引用，确保当前阶段不丢 KiCad 语义。
// 后续如果引入可编辑几何模型，应从 IR 命令显式更新，再派生回 KiCad AST/CST。
function graphicToIR(unitId: string, graphic: KicadGraphicItemAst, index: number): GraphicItemIR {
  return {
    id: `${unitId}/graphic:${graphic.kind}:${index + 1}`,
    kind: graphic.kind,
    ast: graphic
  };
}

// pin ID 同时包含编号和名称，能覆盖常规符号里“编号唯一”和复杂符号里“同编号多引脚”的定位需求。
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
