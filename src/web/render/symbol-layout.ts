import type {
  CircleAst,
  KicadAt,
  KicadGraphicItemAst,
  KicadPoint,
  PinIR,
  PropertyIR,
  RectangleAst,
  SymbolIR,
  SymbolLibraryIR
} from '../../kicad/index.js';

export interface SymbolRenderLayout {
  readonly symbol: SymbolIR;
  readonly graphics: readonly KicadGraphicItemAst[];
  readonly pins: readonly PinIR[];
  readonly labels: readonly PropertyIR[];
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

export interface PinNumberPlacement {
  readonly x: number;
  readonly y: number;
  readonly anchor: {
    readonly x: number;
    readonly y: number;
  };
}

const PIN_NUMBER_LINE_CLEARANCE_MM = 0.45;

// IR -> renderer layout：
// 这一层只整理渲染输入，把当前 symbol 的 unit 图元、pin 和可显示属性汇总出来，
// 并计算后续 viewport 变换所需的 KiCad 世界坐标边界；它不修改 IR，也不创建 PixiJS 对象。
export function createSymbolLayout(library: SymbolLibraryIR): SymbolRenderLayout {
  const symbol = library.symbols[0];
  if (!symbol) {
    throw new Error('Symbol IR library is empty');
  }

  const graphics = symbol.units.flatMap((unit) => unit.graphics.map((item) => item.ast));
  const pins = symbol.units.flatMap((unit) => unit.pins);
  const labels = symbol.properties;
  const bounds = collectBounds(graphics, pins, labels);

  return {
    symbol,
    graphics,
    pins,
    labels,
    bounds
  };
}

// bounds 仍然使用 KiCad 的 mm 世界坐标。
// PixiJS/SVG 渲染器可以基于同一份 bounds 分别做 mm -> px、Y 轴翻转和居中缩放。
function collectBounds(
  graphics: readonly KicadGraphicItemAst[],
  pins: readonly PinIR[],
  labels: readonly PropertyIR[]
): SymbolRenderLayout['bounds'] {
  const points: KicadPoint[] = [];

  for (const item of graphics) {
    switch (item.kind) {
      case 'rectangle':
        addPoint(points, item.start);
        addPoint(points, item.end);
        break;
      case 'polyline':
      case 'bezier':
        points.push(...item.points);
        break;
      case 'circle':
        collectCircleBounds(points, item);
        break;
      case 'arc':
        addPoint(points, item.start);
        addPoint(points, item.mid);
        addPoint(points, item.end);
        break;
      case 'text':
        addPoint(points, item.at);
        break;
    }
  }

  for (const pin of pins) {
    addPoint(points, pin.at);
    if (pin.at && pin.length !== undefined) {
      addPoint(points, pinEndPoint(pin.at, pin.length));
    }
  }

  for (const label of labels) {
    addPoint(points, label.at);
  }

  if (points.length === 0) {
    return { minX: -10, minY: -10, maxX: 10, maxY: 10 };
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y))
  };
}

// KiCad pin 的 `at` 是连接点，`length` 沿旋转方向延伸；这里统一计算 pin 的另一端，
// 避免各个 renderer 自己重复实现而产生细微差异。
export function pinEndPoint(at: KicadAt, length: number): KicadPoint {
  const radians = (at.rotation * Math.PI) / 180;
  return {
    x: at.x + Math.cos(radians) * length,
    y: at.y + Math.sin(radians) * length
  };
}

export function pinNumberPlacement(
  start: KicadPoint,
  end: KicadPoint,
  scale: number
): PinNumberPlacement {
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };

  const horizontalPin = Math.abs(start.x - end.x) >= Math.abs(start.y - end.y);
  if (horizontalPin) {
    return {
      x: midpoint.x,
      y: midpoint.y - PIN_NUMBER_LINE_CLEARANCE_MM * scale,
      anchor: { x: 0.5, y: 1 }
    };
  }

  const rightSide = end.x >= start.x;
  return {
    x: midpoint.x + (rightSide ? -PIN_NUMBER_LINE_CLEARANCE_MM : PIN_NUMBER_LINE_CLEARANCE_MM) * scale,
    y: midpoint.y,
    anchor: { x: rightSide ? 1 : 0, y: 0.5 }
  };
}

function collectCircleBounds(points: KicadPoint[], circle: CircleAst): void {
  if (!circle.center || circle.radius === undefined) {
    return;
  }
  points.push(
    { x: circle.center.x - circle.radius, y: circle.center.y - circle.radius },
    { x: circle.center.x + circle.radius, y: circle.center.y + circle.radius }
  );
}

function addPoint(points: KicadPoint[], point: KicadPoint | undefined): void {
  if (point) {
    points.push(point);
  }
}

export function rectangleCorners(rectangle: RectangleAst): { x: number; y: number; width: number; height: number } | undefined {
  if (!rectangle.start || !rectangle.end) {
    return undefined;
  }

  const x = Math.min(rectangle.start.x, rectangle.end.x);
  const y = Math.min(rectangle.start.y, rectangle.end.y);
  return {
    x,
    y,
    width: Math.abs(rectangle.end.x - rectangle.start.x),
    height: Math.abs(rectangle.end.y - rectangle.start.y)
  };
}
