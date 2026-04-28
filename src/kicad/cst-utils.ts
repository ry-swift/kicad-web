import type { SExprAtom, SExprList, SExprNode } from '../sexpr/index.js';
import type {
  FillStyle,
  KicadAt,
  KicadPoint,
  StrokeStyle,
  TextEffects,
  UnknownKiCadEntry
} from './types.js';

export function isList(node: SExprNode | undefined): node is SExprList {
  return node?.kind === 'list';
}

export function isAtom(node: SExprNode | undefined): node is SExprAtom {
  return node?.kind === 'atom';
}

export function listHead(list: SExprList): string | undefined {
  const head = list.items[0];
  return isAtom(head) ? head.value : undefined;
}

export function atomValue(node: SExprNode | undefined): string | undefined {
  return isAtom(node) ? node.value : undefined;
}

export function numberValue(node: SExprNode | undefined): number | undefined {
  const raw = atomValue(node);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function booleanAtomValue(node: SExprNode | undefined): boolean | undefined {
  const raw = atomValue(node);
  if (raw === 'yes') {
    return true;
  }
  if (raw === 'no') {
    return false;
  }
  return undefined;
}

export function booleanListValue(list: SExprList): boolean | undefined {
  return booleanAtomValue(list.items[1]);
}

export function childLists(list: SExprList): SExprList[] {
  return list.items.slice(1).filter(isList);
}

export function firstChildList(list: SExprList, head: string): SExprList | undefined {
  return childLists(list).find((child) => listHead(child) === head);
}

export function collectUnknownEntries(list: SExprList, knownHeads: ReadonlySet<string>): UnknownKiCadEntry[] {
  return childLists(list)
    .filter((child) => {
      const head = listHead(child);
      return head !== undefined && !knownHeads.has(head);
    })
    .map((source) => ({ head: listHead(source) ?? '<unknown>', source }));
}

export function parseAt(list: SExprList): KicadAt | undefined {
  return parsePointLike(list, 0);
}

export function parsePointLike(list: SExprList, defaultRotation = 0): KicadAt | undefined {
  const x = numberValue(list.items[1]);
  const y = numberValue(list.items[2]);
  if (x === undefined || y === undefined) {
    return undefined;
  }
  return {
    x,
    y,
    rotation: numberValue(list.items[3]) ?? defaultRotation
  };
}

export function parsePoint(list: SExprList): KicadPoint | undefined {
  const x = numberValue(list.items[1]);
  const y = numberValue(list.items[2]);
  if (x === undefined || y === undefined) {
    return undefined;
  }
  return { x, y };
}

export function parsePts(list: SExprList): KicadPoint[] {
  return childLists(list)
    .filter((child) => listHead(child) === 'xy')
    .map(parsePoint)
    .filter((point): point is KicadPoint => Boolean(point));
}

export function parseStroke(list: SExprList): StrokeStyle {
  let width: number | undefined;
  let type: string | undefined;
  let color: number[] | undefined;
  const known = new Set(['width', 'type', 'color']);

  for (const child of childLists(list)) {
    switch (listHead(child)) {
      case 'width':
        width = numberValue(child.items[1]);
        break;
      case 'type':
        type = atomValue(child.items[1]);
        break;
      case 'color':
        color = child.items.slice(1).map(numberValue).filter((value): value is number => value !== undefined);
        break;
    }
  }

  return withOptional({
    width,
    type,
    color,
    unknownEntries: collectUnknownEntries(list, known)
  });
}

export function parseFill(list: SExprList): FillStyle {
  let type: string | undefined;
  let color: number[] | undefined;
  const known = new Set(['type', 'color']);

  for (const child of childLists(list)) {
    switch (listHead(child)) {
      case 'type':
        type = atomValue(child.items[1]);
        break;
      case 'color':
        color = child.items.slice(1).map(numberValue).filter((value): value is number => value !== undefined);
        break;
    }
  }

  return withOptional({
    type,
    color,
    unknownEntries: collectUnknownEntries(list, known)
  });
}

export function parseTextEffects(list: SExprList): TextEffects {
  let font: TextEffects['font'];
  let justify: string[] | undefined;
  let hidden: boolean | undefined;
  const known = new Set(['font', 'justify', 'hide']);

  for (const child of childLists(list)) {
    switch (listHead(child)) {
      case 'font':
        font = parseFont(child);
        break;
      case 'justify':
        justify = child.items.slice(1).map(atomValue).filter((value): value is string => value !== undefined);
        break;
      case 'hide':
        hidden = booleanListValue(child);
        break;
    }
  }

  return withOptional({
    font,
    justify,
    hidden,
    unknownEntries: collectUnknownEntries(list, known)
  });
}

export function parsePinDisplayOptions(list: SExprList): { hidden?: boolean; offset?: number; unknownEntries: UnknownKiCadEntry[] } {
  let hidden: boolean | undefined;
  let offset: number | undefined;
  const known = new Set(['hide', 'offset']);

  for (const child of childLists(list)) {
    switch (listHead(child)) {
      case 'hide':
        hidden = booleanListValue(child);
        break;
      case 'offset':
        offset = numberValue(child.items[1]);
        break;
    }
  }

  return withOptional({
    hidden,
    offset,
    unknownEntries: collectUnknownEntries(list, known)
  });
}

function parseFont(list: SExprList): NonNullable<TextEffects['font']> {
  let size: KicadPoint | undefined;
  let bold: boolean | undefined;
  let italic: boolean | undefined;
  let face: string | undefined;

  for (const child of childLists(list)) {
    switch (listHead(child)) {
      case 'size':
        size = parsePoint(child);
        break;
      case 'bold':
        bold = booleanListValue(child);
        break;
      case 'italic':
        italic = booleanListValue(child);
        break;
      case 'face':
        face = atomValue(child.items[1]);
        break;
    }
  }

  return withOptional({ size, bold, italic, face });
}

// exactOptionalPropertyTypes 下不能把 undefined 显式写入可选字段。
export function withOptional<T extends Record<string, unknown>>(input: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}
