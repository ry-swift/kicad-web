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

export function pinEndPoint(at: KicadAt, length: number): KicadPoint {
  const radians = (at.rotation * Math.PI) / 180;
  return {
    x: at.x + Math.cos(radians) * length,
    y: at.y + Math.sin(radians) * length
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
