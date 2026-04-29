import { Application, Container, Graphics } from 'pixi.js';
import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import type { KicadGraphicItemAst, KicadPoint, PinIR, PropertyIR, SymbolLibraryIR } from '../../kicad/index.js';
import { createSymbolLayout, pinEndPoint, pinNumberPlacement, rectangleCorners } from '../render/symbol-layout.js';
import { drawStrokeText } from './newstroke-font.js';

const MAX_MM_TO_PX = 46;
const CANVAS_BACKGROUND = '#f4f3ed';
const GRID_COLOR = 0xc3c6c5;
const AXIS_COLOR = 0x3944c9;
const BODY_FILL = 0xffffc2;
const KICAD_RED = 0x840000;
const KICAD_PIN_TEXT = 0xa90000;
const KICAD_GREEN = 0x006464;
const HIDDEN_GREY = 0xb8b8b8;
const TWO_PI = Math.PI * 2;

export type SymbolCanvasMode = 'kicad-svg' | 'editor';

export const SymbolCanvas = defineComponent({
  name: 'SymbolCanvas',
  props: {
    ir: {
      type: Object as PropType<SymbolLibraryIR>,
      required: true
    },
    mode: {
      type: String as PropType<SymbolCanvasMode>,
      default: 'kicad-svg'
    }
  },
  setup(props) {
    const host = ref<HTMLDivElement | null>(null);
    let app: Application | undefined;
    let resizeObserver: ResizeObserver | undefined;

    // PixiJS 只在组件挂载后创建真实 canvas。
    // 初始化完成后立即按当前 IR 渲染一次，后续尺寸变化或模式变化都重新从 IR 投影，避免持久化依赖舞台对象。
    onMounted(async () => {
      if (!host.value) {
        return;
      }

      app = new Application();
      await app.init({
        antialias: true,
        autoDensity: true,
        background: CANVAS_BACKGROUND,
        resolution: window.devicePixelRatio || 1,
        resizeTo: host.value
      });

      host.value.appendChild(app.canvas);
      renderScene(app, props.ir, props.mode);
      resizeObserver = new ResizeObserver(() => {
        if (app) {
          renderScene(app, props.ir, props.mode);
        }
      });
      resizeObserver.observe(host.value);
    });

    watch(
      () => [props.ir, props.mode] as const,
      () => {
        if (app) {
          renderScene(app, props.ir, props.mode);
        }
      }
    );

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      app?.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
      app = undefined;
    });

    return () => h('div', { ref: host, class: 'symbol-canvas', 'aria-label': 'PixiJS KiCad symbol preview' });
  }
});

interface RenderOptions {
  readonly mode: SymbolCanvasMode;
  readonly showGrid: boolean;
  readonly showHiddenProperties: boolean;
  readonly showElectricalLabels: boolean;
  readonly showPinEndpointCircles: boolean;
  readonly hiddenPinsGrey: boolean;
  readonly referenceSuffix: boolean;
}

// Symbol IR -> layout -> PixiJS scene：
// 这里是 Web 端当前的最终投影层。它先清空旧舞台，再从 IR 重新生成 layout、计算缩放和坐标变换，
// 最后按图元、pin、属性的绘制顺序创建 PixiJS Graphics/Container。业务真相仍然只在 IR 中。
function renderScene(app: Application, ir: SymbolLibraryIR, mode: SymbolCanvasMode): void {
  app.stage.removeChildren();

  const options = renderOptions(mode);
  const layout = createSymbolLayout(ir);
  const world = new Container();
  const padding = 72;
  const width = app.screen.width;
  const height = app.screen.height;
  const boundsWidth = Math.max(layout.bounds.maxX - layout.bounds.minX, 1);
  const boundsHeight = Math.max(layout.bounds.maxY - layout.bounds.minY, 1);
  const scale = Math.min((width - padding * 2) / boundsWidth, (height - padding * 2) / boundsHeight, MAX_MM_TO_PX);
  const centerX = (layout.bounds.minX + layout.bounds.maxX) / 2;
  const centerY = (layout.bounds.minY + layout.bounds.maxY) / 2;
  // KiCad 使用 mm 世界坐标，Canvas/PixiJS 使用屏幕像素坐标：
  // X 轴保持向右，Y 轴在屏幕空间翻转，并按 bounds 居中后统一缩放。
  const transform = (point: { x: number; y: number }) => ({
    x: width / 2 + (point.x - centerX) * scale,
    y: height / 2 - (point.y - centerY) * scale
  });

  if (options.showGrid) {
    drawGrid(world, width, height, transform({ x: 0, y: 0 }), scale);
  }
  for (const graphic of layout.graphics) {
    drawGraphic(world, graphic, transform, scale);
  }
  if (options.showHiddenProperties) {
    for (const label of layout.labels.filter((item) => item.hidden)) {
      drawLabel(world, label, transform, scale, options);
    }
  }
  for (const pin of layout.pins) {
    drawPin(world, pin, transform, scale, options);
  }
  for (const label of layout.labels.filter((item) => !item.hidden)) {
    drawLabel(world, label, transform, scale, options);
  }

  app.stage.addChild(world);
}

// 两种显示模式只影响投影细节：
// `kicad-svg` 尽量接近 KiCad 导出外观，`editor` 增加网格、隐藏项和电气类型等编辑辅助信息。
function renderOptions(mode: SymbolCanvasMode): RenderOptions {
  return {
    mode,
    showGrid: mode === 'editor',
    showHiddenProperties: mode === 'editor',
    showElectricalLabels: mode === 'editor',
    showPinEndpointCircles: mode === 'editor',
    hiddenPinsGrey: mode === 'editor',
    referenceSuffix: mode === 'kicad-svg'
  };
}

function drawGrid(stage: Container, width: number, height: number, origin: { x: number; y: number }, scale: number): void {
  const grid = new Graphics();
  const step = Math.max(8, 2.54 * scale);
  for (let x = 0; x <= width; x += step) {
    for (let y = 0; y <= height; y += step) {
      grid.circle(x, y, 1).fill({ color: GRID_COLOR, alpha: 0.55 });
    }
  }
  grid.moveTo(origin.x, 0).lineTo(origin.x, height).moveTo(0, origin.y).lineTo(width, origin.y);
  grid.stroke({ color: AXIS_COLOR, width: 1.5, alpha: 0.85 });
  stage.addChild(grid);
}

// 分派不同 KiCad 图元到对应绘制函数。
// 注意这里消费的是 AST/IR 派生出的几何语义，不反向修改 symbol 数据。
function drawGraphic(
  stage: Container,
  graphic: KicadGraphicItemAst,
  transform: (point: { x: number; y: number }) => { x: number; y: number },
  scale: number
): void {
  const color = strokeColor(graphic);
  switch (graphic.kind) {
    case 'rectangle':
      drawRectangle(stage, graphic, transform, scale);
      break;
    case 'polyline':
      drawPolyline(stage, graphic.points, transform, strokeWidth(graphic.stroke?.width, scale), graphic.fill?.type === 'outline', color);
      break;
    case 'bezier':
      drawBezier(stage, graphic.points, transform, strokeWidth(graphic.stroke?.width, scale), graphic.fill?.type === 'outline', color);
      break;
    case 'circle':
      if (graphic.center && graphic.radius !== undefined) {
        const center = transform(graphic.center);
        const circle = new Graphics()
          .circle(center.x, center.y, Math.max(graphic.radius * scale, 0.5))
          .fill(fillStyle(graphic.fill?.type, graphic.fill?.color))
          .stroke(strokeStyle(color, strokeWidth(graphic.stroke?.width, scale)));
        stage.addChild(circle);
      }
      break;
    case 'arc':
      drawArc(stage, graphic, transform, strokeWidth(graphic.stroke?.width, scale), color);
      break;
    case 'text':
      drawGraphicText(stage, graphic, transform, scale);
      break;
  }
}

function drawRectangle(
  stage: Container,
  graphic: Extract<KicadGraphicItemAst, { kind: 'rectangle' }>,
  transform: (point: { x: number; y: number }) => { x: number; y: number },
  scale: number
): void {
  const rect = rectangleCorners(graphic);
  if (!rect) {
    return;
  }

  const start = transform({ x: rect.x, y: rect.y + rect.height });
  const width = rect.width * scale;
  const height = rect.height * scale;
  const lineWidth = strokeWidth(graphic.stroke?.width, scale);
  const color = strokeColor(graphic);
  const shape = new Graphics();

  if (width < 1 || height < 1) {
    const end = transform({ x: rect.x + rect.width, y: rect.y });
    shape.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke(strokeStyle(color, lineWidth));
  } else {
    shape
      .rect(start.x, start.y, width, height)
      .fill(fillStyle(graphic.fill?.type, graphic.fill?.color))
      .stroke(strokeStyle(color, lineWidth));
  }

  stage.addChild(shape);
}

function drawPolyline(
  stage: Container,
  points: readonly { x: number; y: number }[],
  transform: (point: { x: number; y: number }) => { x: number; y: number },
  width: number,
  closedFill: boolean,
  color = KICAD_RED
): void {
  if (points.length < 2) {
    return;
  }

  const line = new Graphics();
  const [first, ...rest] = points;
  if (!first) {
    return;
  }
  const start = transform(first);
  line.moveTo(start.x, start.y);
  for (const point of rest) {
    const next = transform(point);
    line.lineTo(next.x, next.y);
  }
  if (closedFill && points.length >= 3) {
    line.closePath();
    line.fill({ color, alpha: 1 });
  }
  line.stroke(strokeStyle(color, width));
  stage.addChild(line);
}

function drawBezier(
  stage: Container,
  points: readonly KicadPoint[],
  transform: (point: KicadPoint) => { x: number; y: number },
  width: number,
  closedFill: boolean,
  color = KICAD_RED
): void {
  if (points.length < 4) {
    drawPolyline(stage, points, transform, width, closedFill, color);
    return;
  }

  const curve = new Graphics();
  const start = transform(points[0]!);
  curve.moveTo(start.x, start.y);
  for (let index = 1; index + 2 < points.length; index += 3) {
    const control1 = transform(points[index]!);
    const control2 = transform(points[index + 1]!);
    const end = transform(points[index + 2]!);
    curve.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
  }

  if (closedFill) {
    curve.closePath();
    curve.fill({ color, alpha: 1 });
  }
  curve.stroke(strokeStyle(color, width));
  stage.addChild(curve);
}

// KiCad arc 用 start/mid/end 三点表达；PixiJS arc 需要圆心、半径和起止角。
// 三点共线时无法稳定求圆，降级为折线以保证画面可解释且不中断渲染。
function drawArc(
  stage: Container,
  graphic: Extract<KicadGraphicItemAst, { kind: 'arc' }>,
  transform: (point: KicadPoint) => { x: number; y: number },
  width: number,
  color: number
): void {
  if (!graphic.start || !graphic.mid || !graphic.end) {
    return;
  }

  const start = transform(graphic.start);
  const mid = transform(graphic.mid);
  const end = transform(graphic.end);
  const circle = circleFromThreePoints(start, mid, end);
  if (!circle) {
    drawPolyline(stage, [graphic.start, graphic.mid, graphic.end], transform, width, false, color);
    return;
  }

  const startAngle = Math.atan2(start.y - circle.y, start.x - circle.x);
  const midAngle = Math.atan2(mid.y - circle.y, mid.x - circle.x);
  const endAngle = Math.atan2(end.y - circle.y, end.x - circle.x);
  const counterclockwise = angleBetweenCounterclockwise(startAngle, midAngle, endAngle);
  const arc = new Graphics()
    .moveTo(start.x, start.y)
    .arc(circle.x, circle.y, circle.radius, startAngle, endAngle, counterclockwise)
    .stroke(strokeStyle(color, width));
  stage.addChild(arc);
}

function drawGraphicText(
  stage: Container,
  graphic: Extract<KicadGraphicItemAst, { kind: 'text' }>,
  transform: (point: KicadPoint) => { x: number; y: number },
  scale: number
): void {
  if (!graphic.at || graphic.effects?.hidden) {
    return;
  }

  const point = transform(graphic.at);
  const fontSize = kicadTextPx(graphic.effects?.font?.size?.y, scale);
  drawStrokeText(stage, {
    text: graphic.value,
    x: point.x,
    y: point.y,
    size: fontSize,
    color: KICAD_GREEN,
    anchor: { x: 0.5, y: 0.5 },
    rotation: (-graphic.at.rotation * Math.PI) / 180,
    lineWidth: strokeTextWidth(fontSize, scale)
  });
}

// pin 从连接点画到 pinEndPoint。不同模式下可以额外显示端点圆、电气类型和隐藏 pin 灰显，
// 但这些都只是编辑器可视化辅助，不会写回 IR。
function drawPin(
  stage: Container,
  pin: PinIR,
  transform: (point: { x: number; y: number }) => { x: number; y: number },
  scale: number,
  options: RenderOptions
): void {
  if (!pin.at || pin.length === undefined) {
    return;
  }

  const start = transform(pin.at);
  const end = transform(pinEndPoint(pin.at, pin.length));
  const pinColor = options.hiddenPinsGrey && pin.hidden ? HIDDEN_GREY : KICAD_RED;
  const pinAlpha = options.hiddenPinsGrey && pin.hidden ? 0.72 : 1;
  const line = new Graphics()
    .moveTo(start.x, start.y)
    .lineTo(end.x, end.y)
    .stroke(strokeStyle(pinColor, strokeWidth(0, scale), pinAlpha));
  stage.addChild(line);

  if (pin.electricalType === 'no_connect') {
    drawNoConnectMarker(stage, start, scale, pinColor, pinAlpha);
  } else if (options.showPinEndpointCircles && !pin.hidden) {
    const endpoint = new Graphics()
      .circle(start.x, start.y, Math.max(5, 0.254 * scale))
      .fill({ color: CANVAS_BACKGROUND, alpha: 1 })
      .stroke(strokeStyle(KICAD_RED, strokeWidth(0, scale)));
    stage.addChild(endpoint);
  }

  drawPinNumber(stage, pin, start, end, scale, options);
  if (options.showElectricalLabels) {
    drawPinTypeLabel(stage, pin, start, scale);
  }
}

function drawNoConnectMarker(stage: Container, point: { x: number; y: number }, scale: number, color: number, alpha: number): void {
  const markerSize = Math.max(8, Math.min(20, 0.381 * scale));
  const marker = new Graphics()
    .moveTo(point.x - markerSize, point.y - markerSize)
    .lineTo(point.x + markerSize, point.y + markerSize)
    .moveTo(point.x + markerSize, point.y - markerSize)
    .lineTo(point.x - markerSize, point.y + markerSize)
    .stroke(strokeStyle(color, strokeWidth(0, scale), alpha));
  stage.addChild(marker);
}

function drawPinNumber(
  stage: Container,
  pin: PinIR,
  start: { x: number; y: number },
  end: { x: number; y: number },
  scale: number,
  options: RenderOptions
): void {
  if (!pin.number) {
    return;
  }

  const textColor = options.hiddenPinsGrey && pin.hidden ? HIDDEN_GREY : KICAD_PIN_TEXT;
  const fontSize = kicadTextPx(pin.numberEffects?.font?.size?.y, scale);
  const alpha = options.hiddenPinsGrey && pin.hidden ? 0.78 : 1;
  const placement = pinNumberPlacement(start, end, scale);
  drawStrokeText(stage, {
    text: pin.number,
    x: placement.x,
    y: placement.y,
    size: fontSize,
    color: textColor,
    alpha,
    anchor: placement.anchor,
    lineWidth: strokeTextWidth(fontSize, scale)
  });
}

function drawPinTypeLabel(stage: Container, pin: PinIR, start: { x: number; y: number }, scale: number): void {
  const leftFacing = pin.at?.rotation === 180;
  const value = electricalTypeLabel(pin.electricalType);
  const fontSize = kicadTextPx(pin.nameEffects?.font?.size?.y, scale);
  const color = pin.hidden ? HIDDEN_GREY : 0x3f50ff;
  const alpha = pin.hidden ? 0.78 : 1;
  const x = leftFacing ? start.x + 0.635 * scale : start.x - 0.635 * scale;

  drawStrokeText(stage, {
    text: value,
    x,
    y: start.y,
    size: fontSize,
    color,
    alpha,
    anchor: { x: leftFacing ? 0 : 1, y: 0.5 },
    lineWidth: strokeTextWidth(fontSize, scale)
  });
}

function drawLabel(
  stage: Container,
  property: PropertyIR,
  transform: (point: { x: number; y: number }) => { x: number; y: number },
  scale: number,
  options: RenderOptions
): void {
  if (!property.at) {
    return;
  }

  const point = transform(property.at);
  const hidden = property.hidden === true;
  const value = propertyText(property, options);
  const fontSize = textSize(property, scale);
  const color = hidden ? HIDDEN_GREY : KICAD_GREEN;
  const alpha = hidden ? 0.72 : 1;

  drawStrokeText(stage, {
    text: value,
    x: point.x,
    y: point.y,
    size: fontSize,
    color,
    alpha,
    anchor: { x: 0.5, y: 0.5 },
    rotation: (-property.at.rotation * Math.PI) / 180,
    lineWidth: strokeTextWidth(fontSize, scale)
  });
}

function strokeWidth(width: number | undefined, scale: number): number {
  const kicadWidth = width === undefined || width === 0 ? 0.1524 : width;
  return Math.max(kicadWidth * scale, 1.2);
}

function strokeStyle(color: number, width: number, alpha = 1) {
  return {
    color,
    width,
    alpha,
    cap: 'round' as const,
    join: 'round' as const
  };
}

function fillStyle(type: string | undefined, color: readonly number[] | undefined) {
  if (type === 'none') {
    return { color: BODY_FILL, alpha: 0 };
  }
  if (type === 'outline') {
    return { color: colorFromKiCad(color, KICAD_RED), alpha: alphaFromKiCad(color, 1) };
  }
  return { color: colorFromKiCad(color, BODY_FILL), alpha: alphaFromKiCad(color, 1) };
}

function strokeColor(graphic: KicadGraphicItemAst): number {
  return colorFromKiCad(graphic.stroke?.color, KICAD_RED);
}

function colorFromKiCad(color: readonly number[] | undefined, fallback: number): number {
  if (!color || color.length < 3 || alphaFromKiCad(color, 1) === 0) {
    return fallback;
  }
  const [red = 0, green = 0, blue = 0] = color;
  return (clampColor(red) << 16) + (clampColor(green) << 8) + clampColor(blue);
}

function alphaFromKiCad(color: readonly number[] | undefined, fallback: number): number {
  const alpha = color?.[3];
  if (alpha === undefined) {
    return fallback;
  }
  if (alpha > 1) {
    return Math.max(0, Math.min(1, alpha / 255));
  }
  return Math.max(0, Math.min(1, alpha));
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function electricalTypeLabel(type: string): string {
  switch (type) {
    case 'passive':
      return '无源';
    case 'power_in':
      return '电源输入';
    case 'output':
      return '输出';
    case 'no_connect':
      return '未连接';
    default:
      return type;
  }
}

function textSize(property: PropertyIR, scale: number): number {
  const base = property.effects?.font?.size?.y ?? 1.27;
  return kicadTextPx(base, scale);
}

function kicadTextPx(sizeMm: number | undefined, scale: number): number {
  const base = sizeMm ?? 1.27;
  return Math.max(12, Math.min(96, base * scale * (4 / 3)));
}

function strokeTextWidth(fontSize: number, scale: number): number {
  return Math.max(strokeWidth(0, scale), fontSize * 0.13);
}

function propertyText(property: PropertyIR, options: RenderOptions): string {
  if (options.referenceSuffix && property.key === 'Reference' && property.value && !property.value.endsWith('?')) {
    return `${property.value}?`;
  }
  return property.value;
}

function circleFromThreePoints(
  first: { x: number; y: number },
  second: { x: number; y: number },
  third: { x: number; y: number }
): { x: number; y: number; radius: number } | undefined {
  const determinant =
    2 *
    (first.x * (second.y - third.y) +
      second.x * (third.y - first.y) +
      third.x * (first.y - second.y));
  if (Math.abs(determinant) < 1e-6) {
    return undefined;
  }

  const firstSquare = first.x * first.x + first.y * first.y;
  const secondSquare = second.x * second.x + second.y * second.y;
  const thirdSquare = third.x * third.x + third.y * third.y;
  const x =
    (firstSquare * (second.y - third.y) +
      secondSquare * (third.y - first.y) +
      thirdSquare * (first.y - second.y)) /
    determinant;
  const y =
    (firstSquare * (third.x - second.x) +
      secondSquare * (first.x - third.x) +
      thirdSquare * (second.x - first.x)) /
    determinant;
  return {
    x,
    y,
    radius: Math.hypot(first.x - x, first.y - y)
  };
}

function angleBetweenCounterclockwise(start: number, middle: number, end: number): boolean {
  return normalizeAngle(middle - start) <= normalizeAngle(end - start);
}

function normalizeAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}
