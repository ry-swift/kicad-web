import type { SExprAtom, SExprList, SExprNode } from '../sexpr/index.js';
import type {
  EditableSymbolElementPatch,
  EditableSymbolElementRef,
  GraphicItemIR,
  KicadAt,
  KicadGraphicItemAst,
  KicadPoint,
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
import { childLists, firstChildList, listHead, withOptional } from './cst-utils.js';
import { parseKicadSymbolLibraryCst } from './parser.js';

const GRAPHIC_HEADS = new Set(['rectangle', 'polyline', 'circle', 'arc', 'bezier', 'text']);

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

// 编辑命令只返回新的 IR，不触碰 PixiJS DisplayObject 或原始 AST/CST。
// 所有坐标在写入 IR 前统一规整到四位小数，避免拖拽过程中的浮点噪声进入 `.kicad_sym`。
export function translateSymbolElementIR(
  ir: SymbolLibraryIR,
  ref: EditableSymbolElementRef,
  deltaMm: KicadPoint
): SymbolLibraryIR {
  const delta = {
    x: roundCoordinate(deltaMm.x),
    y: roundCoordinate(deltaMm.y)
  };
  if (delta.x === 0 && delta.y === 0) {
    return ir;
  }

  return withOptional({
    version: ir.version,
    generator: ir.generator,
    generatorVersion: ir.generatorVersion,
    symbols: ir.symbols.map((symbol) => translateSymbolIR(symbol, ref, delta))
  });
}

// KiCad 风格的 Inspector 表单编辑同样只作用于 IR。
// pin 的 id 在当前编辑会话内保持稳定，即便 name/number 被修改，也能继续映射回导入时的源节点。
export function updateSymbolElementIR(
  ir: SymbolLibraryIR,
  ref: EditableSymbolElementRef,
  patch: EditableSymbolElementPatch
): SymbolLibraryIR {
  return withOptional({
    version: ir.version,
    generator: ir.generator,
    generatorVersion: ir.generatorVersion,
    symbols: ir.symbols.map((symbol) => updateSymbolIR(symbol, ref, patch))
  });
}

// 编辑后的 IR 需要重新物化为 KiCad AST/CST，导出时才不会被旧 sourceText 覆盖。
// 这里以导入时保留的 CST 为骨架，只同步受支持元素的坐标字段，未知字段和未编辑内容保持原样。
export function materializeKicadSymbolLibraryFromIR(
  baseLibrary: KicadSymbolLibrary,
  editedIR: SymbolLibraryIR
): KicadSymbolLibrary {
  const source = cloneListWithoutSourceText(baseLibrary.source);
  const editedSymbols = new Map(editedIR.symbols.map((symbol) => [symbol.id, symbol]));
  const symbolLists = directChildLists(source, 'symbol');

  baseLibrary.symbols.forEach((baseSymbol, index) => {
    const sourceSymbol = symbolLists[index];
    const editedSymbol = editedSymbols.get(symbolId(baseSymbol.name));
    if (sourceSymbol && editedSymbol) {
      materializeSymbolSource(sourceSymbol, baseSymbol, editedSymbol);
    }
  });

  return parseKicadSymbolLibraryCst(source);
}

function updateSymbolIR(symbol: SymbolIR, ref: EditableSymbolElementRef, patch: EditableSymbolElementPatch): SymbolIR {
  return withOptional({
    id: symbol.id,
    name: symbol.name,
    extends: symbol.extends,
    properties: symbol.properties.map((property) => updatePropertyIR(property, ref, patch)),
    units: symbol.units.map((unit) => updateUnitIR(unit, ref, patch)),
    pinNames: symbol.pinNames,
    pinNumbers: symbol.pinNumbers
  });
}

function updatePropertyIR(property: PropertyIR, ref: EditableSymbolElementRef, patch: EditableSymbolElementPatch): PropertyIR {
  if (ref.kind !== 'property' || ref.id !== property.id || patch.value === undefined) {
    return property;
  }

  return {
    ...property,
    value: patch.value
  };
}

function updateUnitIR(unit: SymbolUnitIR, ref: EditableSymbolElementRef, patch: EditableSymbolElementPatch): SymbolUnitIR {
  return {
    id: unit.id,
    name: unit.name,
    graphics: unit.graphics.map((graphic) => updateGraphicIR(graphic, ref, patch)),
    pins: unit.pins.map((pin) => updatePinIR(pin, ref, patch))
  };
}

function updateGraphicIR(graphic: GraphicItemIR, ref: EditableSymbolElementRef, patch: EditableSymbolElementPatch): GraphicItemIR {
  if (ref.kind !== 'graphic' || ref.id !== graphic.id) {
    return graphic;
  }

  return {
    ...graphic,
    ast: updateGraphicAst(graphic.ast, patch)
  };
}

function updateGraphicAst(ast: KicadGraphicItemAst, patch: EditableSymbolElementPatch): KicadGraphicItemAst {
  const stroke = updateStrokeStyle(ast.stroke, patch);
  if (ast.kind === 'text') {
    return withOptional({
      ...ast,
      value: patch.value ?? ast.value,
      stroke
    });
  }

  return withOptional({
    ...ast,
    stroke
  });
}

function updateStrokeStyle(
  stroke: KicadGraphicItemAst['stroke'],
  patch: EditableSymbolElementPatch
): KicadGraphicItemAst['stroke'] {
  if (patch.strokeWidth === undefined || !Number.isFinite(patch.strokeWidth)) {
    return stroke;
  }

  return {
    ...(stroke ?? { unknownEntries: [] }),
    width: Math.max(0, roundCoordinate(patch.strokeWidth))
  };
}

function updatePinIR(pin: PinIR, ref: EditableSymbolElementRef, patch: EditableSymbolElementPatch): PinIR {
  if (ref.kind !== 'pin' || ref.id !== pin.id) {
    return pin;
  }

  const nextLength = patch.pinLength !== undefined && Number.isFinite(patch.pinLength)
    ? Math.max(0, roundCoordinate(patch.pinLength))
    : pin.length;

  return withOptional({
    ...pin,
    electricalType: patch.electricalType ?? pin.electricalType,
    graphicStyle: patch.graphicStyle ?? pin.graphicStyle,
    length: nextLength,
    hidden: patch.hidden ?? pin.hidden,
    name: patch.pinName ?? pin.name,
    number: patch.pinNumber ?? pin.number
  });
}

function translateSymbolIR(symbol: SymbolIR, ref: EditableSymbolElementRef, delta: KicadPoint): SymbolIR {
  return withOptional({
    id: symbol.id,
    name: symbol.name,
    extends: symbol.extends,
    properties: symbol.properties.map((property) => translatePropertyIR(property, ref, delta)),
    units: symbol.units.map((unit) => translateUnitIR(unit, ref, delta)),
    pinNames: symbol.pinNames,
    pinNumbers: symbol.pinNumbers
  });
}

function translatePropertyIR(property: PropertyIR, ref: EditableSymbolElementRef, delta: KicadPoint): PropertyIR {
  if (ref.kind !== 'property' || ref.id !== property.id || !property.at) {
    return property;
  }

  return withOptional({
    ...property,
    at: translateAt(property.at, delta)
  });
}

function translateUnitIR(unit: SymbolUnitIR, ref: EditableSymbolElementRef, delta: KicadPoint): SymbolUnitIR {
  return {
    id: unit.id,
    name: unit.name,
    graphics: unit.graphics.map((graphic) => translateGraphicIR(graphic, ref, delta)),
    pins: unit.pins.map((pin) => translatePinIR(pin, ref, delta))
  };
}

function translateGraphicIR(graphic: GraphicItemIR, ref: EditableSymbolElementRef, delta: KicadPoint): GraphicItemIR {
  if (ref.kind !== 'graphic' || ref.id !== graphic.id) {
    return graphic;
  }

  return {
    ...graphic,
    ast: translateGraphicAst(graphic.ast, delta)
  };
}

function translatePinIR(pin: PinIR, ref: EditableSymbolElementRef, delta: KicadPoint): PinIR {
  if (ref.kind !== 'pin' || ref.id !== pin.id || !pin.at) {
    return pin;
  }

  return withOptional({
    ...pin,
    at: translateAt(pin.at, delta)
  });
}

function translateGraphicAst(ast: KicadGraphicItemAst, delta: KicadPoint): KicadGraphicItemAst {
  switch (ast.kind) {
    case 'rectangle':
      return withOptional({
        ...ast,
        start: translateOptionalPoint(ast.start, delta),
        end: translateOptionalPoint(ast.end, delta)
      });
    case 'polyline':
      return {
        ...ast,
        points: ast.points.map((point) => translatePoint(point, delta))
      };
    case 'circle':
      return withOptional({
        ...ast,
        center: translateOptionalPoint(ast.center, delta)
      });
    case 'arc':
      return withOptional({
        ...ast,
        start: translateOptionalPoint(ast.start, delta),
        mid: translateOptionalPoint(ast.mid, delta),
        end: translateOptionalPoint(ast.end, delta)
      });
    case 'bezier':
      return {
        ...ast,
        points: ast.points.map((point) => translatePoint(point, delta))
      };
    case 'text':
      return withOptional({
        ...ast,
        at: ast.at ? translateAt(ast.at, delta) : undefined
      });
  }
}

function translateAt(at: KicadAt, delta: KicadPoint): KicadAt {
  return {
    ...at,
    ...translatePoint(at, delta)
  };
}

function translateOptionalPoint(point: KicadPoint | undefined, delta: KicadPoint): KicadPoint | undefined {
  return point ? translatePoint(point, delta) : undefined;
}

function translatePoint(point: KicadPoint, delta: KicadPoint): KicadPoint {
  return {
    x: roundCoordinate(point.x + delta.x),
    y: roundCoordinate(point.y + delta.y)
  };
}

function materializeSymbolSource(source: SExprList, baseSymbol: KicadSymbolAst, editedSymbol: SymbolIR): void {
  const currentSymbolId = symbolId(baseSymbol.name);
  const propertyLists = directChildLists(source, 'property');
  baseSymbol.properties.forEach((baseProperty, index) => {
    const propertySource = propertyLists[index];
    const editedProperty = editedSymbol.properties.find((property) => property.id === propertyId(currentSymbolId, baseProperty.key));
    if (propertySource && editedProperty) {
      writeStringAtom(propertySource, 2, editedProperty.value);
      updatePointChild(propertySource, 'at', editedProperty.at);
    }
  });

  const topLevelUnit = editedSymbol.units.find((unit) => unit.id === unitId(currentSymbolId, baseSymbol.name));
  if (topLevelUnit) {
    materializeUnitContents(source, currentSymbolId, baseSymbol.name, baseSymbol, topLevelUnit);
  }

  const unitLists = directChildLists(source, 'symbol');
  baseSymbol.units.forEach((baseUnit, index) => {
    const unitSource = unitLists[index];
    const editedUnit = editedSymbol.units.find((unit) => unit.id === unitId(currentSymbolId, baseUnit.name));
    if (unitSource && editedUnit) {
      materializeUnitContents(unitSource, currentSymbolId, baseUnit.name, baseUnit, editedUnit);
    }
  });
}

function materializeUnitContents(
  source: SExprList,
  currentSymbolId: string,
  unitName: string,
  baseUnit: Pick<KicadSymbolUnitAst, 'graphics' | 'pins'>,
  editedUnit: SymbolUnitIR
): void {
  const currentUnitId = unitId(currentSymbolId, unitName);
  const graphicLists = childLists(source).filter((child) => {
    const head = listHead(child);
    return head !== undefined && GRAPHIC_HEADS.has(head);
  });

  baseUnit.graphics.forEach((baseGraphic, index) => {
    const graphicSource = graphicLists[index];
    const editedGraphic = editedUnit.graphics.find((graphic) => graphic.id === graphicId(currentUnitId, baseGraphic, index));
    if (graphicSource && editedGraphic) {
      updateGraphicSource(graphicSource, editedGraphic.ast);
    }
  });

  const pinLists = directChildLists(source, 'pin');
  baseUnit.pins.forEach((basePin, index) => {
    const pinSource = pinLists[index];
    const editedPin = editedUnit.pins.find((pin) => pin.id === pinId(currentUnitId, basePin));
    if (pinSource && editedPin) {
      updatePinSource(pinSource, editedPin);
    }
  });
}

function updateGraphicSource(source: SExprList, graphic: KicadGraphicItemAst): void {
  updateStrokeChild(source, graphic.stroke?.width);
  switch (graphic.kind) {
    case 'rectangle':
      updatePointChild(source, 'start', graphic.start);
      updatePointChild(source, 'end', graphic.end);
      break;
    case 'polyline':
    case 'bezier':
      updatePtsChild(source, graphic.points);
      break;
    case 'circle':
      updatePointChild(source, 'center', graphic.center);
      break;
    case 'arc':
      updatePointChild(source, 'start', graphic.start);
      updatePointChild(source, 'mid', graphic.mid);
      updatePointChild(source, 'end', graphic.end);
      break;
    case 'text':
      writeStringAtom(source, 1, graphic.value);
      updatePointChild(source, 'at', graphic.at);
      break;
  }
}

function updatePinSource(source: SExprList, pin: PinIR): void {
  writeSymbolAtom(source, 1, pin.electricalType);
  writeSymbolAtom(source, 2, pin.graphicStyle);
  updatePointChild(source, 'at', pin.at);
  updateNumberChild(source, 'length', pin.length);
  updateBooleanChild(source, 'hide', pin.hidden);
  updateTextChild(source, 'name', pin.name);
  updateTextChild(source, 'number', pin.number);
}

function updateStrokeChild(source: SExprList, width: number | undefined): void {
  if (width === undefined || !Number.isFinite(width)) {
    return;
  }

  let stroke = firstChildList(source, 'stroke');
  if (!stroke) {
    stroke = createList(source, [
      createSymbolAtom(source, 'stroke'),
      createList(source, [createSymbolAtom(source, 'width'), createNumberAtom(source, width)]),
      createList(source, [createSymbolAtom(source, 'type'), createSymbolAtom(source, 'default')])
    ]);
    source.items.push(stroke);
    return;
  }

  updateNumberChild(stroke, 'width', width);
}

function updatePtsChild(source: SExprList, points: readonly KicadPoint[]): void {
  const pts = firstChildList(source, 'pts');
  if (!pts) {
    return;
  }

  const xyLists = directChildLists(pts, 'xy');
  points.forEach((point, index) => {
    const xy = xyLists[index];
    if (xy) {
      updatePointList(xy, point);
    }
  });
}

function updateNumberChild(source: SExprList, head: string, value: number | undefined): void {
  if (value === undefined || !Number.isFinite(value)) {
    return;
  }

  const child = firstChildList(source, head);
  if (child) {
    writeNumberAtom(child, 1, value);
    return;
  }

  source.items.push(createList(source, [createSymbolAtom(source, head), createNumberAtom(source, value)]));
}

function updateBooleanChild(source: SExprList, head: string, value: boolean | undefined): void {
  if (value === undefined) {
    return;
  }

  const child = firstChildList(source, head);
  if (child) {
    writeBooleanAtom(child, 1, value);
    return;
  }

  if (value) {
    source.items.push(createList(source, [createSymbolAtom(source, head), createBooleanAtom(source, value)]));
  }
}

function updateTextChild(source: SExprList, head: string, value: string | undefined): void {
  if (value === undefined) {
    return;
  }

  const child = firstChildList(source, head);
  if (child) {
    writeStringAtom(child, 1, value);
    return;
  }

  source.items.push(createList(source, [createSymbolAtom(source, head), createStringAtom(source, value)]));
}

function updatePointChild(source: SExprList, head: string, point: KicadPoint | undefined): void {
  const pointList = firstChildList(source, head);
  if (!pointList || !point) {
    return;
  }
  updatePointList(pointList, point);
}

function updatePointList(list: SExprList, point: KicadPoint): void {
  writeNumberAtom(list, 1, point.x);
  writeNumberAtom(list, 2, point.y);
}

function writeNumberAtom(list: SExprList, index: number, value: number): void {
  list.items[index] = createNumberAtom(list, value, list.items[index]);
}

function writeStringAtom(list: SExprList, index: number, value: string): void {
  list.items[index] = createStringAtom(list, value, list.items[index]);
}

function writeSymbolAtom(list: SExprList, index: number, value: string): void {
  list.items[index] = createSymbolAtom(list, value, list.items[index]);
}

function writeBooleanAtom(list: SExprList, index: number, value: boolean): void {
  list.items[index] = createBooleanAtom(list, value, list.items[index]);
}

function createNumberAtom(list: SExprList, value: number, previous?: SExprNode): SExprAtom {
  const raw = formatCoordinate(value);
  const span = previous?.span ?? list.span;
  return {
    kind: 'atom',
    atomType: 'number',
    value: raw,
    raw,
    span
  };
}

function createStringAtom(list: SExprList, value: string, previous?: SExprNode): SExprAtom {
  return {
    kind: 'atom',
    atomType: 'string',
    value,
    raw: value,
    span: previous?.span ?? list.span
  };
}

function createSymbolAtom(list: SExprList, value: string, previous?: SExprNode): SExprAtom {
  return {
    kind: 'atom',
    atomType: 'symbol',
    value,
    raw: value,
    span: previous?.span ?? list.span
  };
}

function createBooleanAtom(list: SExprList, value: boolean, previous?: SExprNode): SExprAtom {
  return createSymbolAtom(list, value ? 'yes' : 'no', previous);
}

function createList(parent: SExprList, items: SExprNode[]): SExprList {
  return {
    kind: 'list',
    items,
    span: parent.span
  };
}

function cloneListWithoutSourceText(list: SExprList): SExprList {
  return {
    kind: 'list',
    items: list.items.map(cloneNode),
    span: list.span
  };
}

function cloneNode(node: SExprNode): SExprNode {
  if (node.kind === 'atom') {
    return { ...node };
  }
  return cloneListWithoutSourceText(node);
}

function directChildLists(list: SExprList, head: string): SExprList[] {
  return childLists(list).filter((child) => listHead(child) === head);
}

function symbolToIR(symbol: KicadSymbolAst): SymbolIR {
  const symbolId = symbolIdForName(symbol.name);
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
      id: propertyId(symbolId, property.key),
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
  const unitId = unitIdForName(symbolId, unitName);
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
    id: graphicId(unitId, graphic, index),
    kind: graphic.kind,
    ast: graphic
  };
}

// pin ID 同时包含编号和名称，能覆盖常规符号里“编号唯一”和复杂符号里“同编号多引脚”的定位需求。
function pinToIR(unitId: string, pin: KicadPinAst): PinIR {
  return withOptional({
    id: pinId(unitId, pin),
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

function symbolId(name: string): string {
  return symbolIdForName(name);
}

function symbolIdForName(name: string): string {
  return `symbol:${encodeIdSegment(name)}`;
}

function unitId(symbolId: string, unitName: string): string {
  return unitIdForName(symbolId, unitName);
}

function unitIdForName(symbolId: string, unitName: string): string {
  return `${symbolId}/unit:${encodeIdSegment(unitName)}`;
}

function propertyId(symbolId: string, key: string): string {
  return `${symbolId}/property:${encodeIdSegment(key)}`;
}

function graphicId(unitId: string, graphic: Pick<KicadGraphicItemAst, 'kind'>, index: number): string {
  return `${unitId}/graphic:${graphic.kind}:${index + 1}`;
}

function pinId(unitId: string, pin: Pick<KicadPinAst, 'number' | 'name'>): string {
  const number = pin.number ?? '<unnumbered>';
  const name = pin.name ?? '<unnamed>';
  return `${unitId}/pin:${encodeIdSegment(number)}:${encodeIdSegment(name)}`;
}

function roundCoordinate(value: number): number {
  const rounded = Number(value.toFixed(4));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatCoordinate(value: number): string {
  const rounded = roundCoordinate(value);
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function encodeIdSegment(segment: string): string {
  return segment.replaceAll('/', '%2F');
}
