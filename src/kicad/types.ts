import type { SExprList } from '../sexpr/index.js';

export interface UnknownKiCadEntry {
  readonly head: string;
  readonly source: SExprList;
}

export interface KicadPoint {
  readonly x: number;
  readonly y: number;
}

export type EditableSymbolElementRef =
  | { readonly kind: 'graphic'; readonly id: string }
  | { readonly kind: 'pin'; readonly id: string }
  | { readonly kind: 'property'; readonly id: string };

export interface EditableSymbolElementPatch {
  readonly value?: string;
  readonly pinName?: string;
  readonly pinNumber?: string;
  readonly electricalType?: string;
  readonly graphicStyle?: string;
  readonly pinLength?: number;
  readonly strokeWidth?: number;
  readonly hidden?: boolean;
}

export interface KicadAt extends KicadPoint {
  readonly rotation: number;
}

export interface TextEffects {
  readonly font?: {
    readonly size?: KicadPoint;
    readonly bold?: boolean;
    readonly italic?: boolean;
    readonly face?: string;
  };
  readonly justify?: readonly string[];
  readonly hidden?: boolean;
  readonly unknownEntries: readonly UnknownKiCadEntry[];
}

export interface StrokeStyle {
  readonly width?: number;
  readonly type?: string;
  readonly color?: readonly number[];
  readonly unknownEntries: readonly UnknownKiCadEntry[];
}

export interface FillStyle {
  readonly type?: string;
  readonly color?: readonly number[];
  readonly unknownEntries: readonly UnknownKiCadEntry[];
}

export interface KicadPropertyAst {
  readonly key: string;
  readonly value: string;
  readonly at?: KicadAt;
  readonly showName?: boolean;
  readonly doNotAutoplace?: boolean;
  readonly hidden?: boolean;
  readonly effects?: TextEffects;
  readonly unknownEntries: readonly UnknownKiCadEntry[];
  readonly source: SExprList;
}

export type KicadGraphicKind = 'rectangle' | 'polyline' | 'circle' | 'arc' | 'bezier' | 'text';

interface BaseGraphicAst {
  readonly kind: KicadGraphicKind;
  readonly stroke?: StrokeStyle;
  readonly fill?: FillStyle;
  readonly effects?: TextEffects;
  readonly unknownEntries: readonly UnknownKiCadEntry[];
  readonly source: SExprList;
}

export interface RectangleAst extends BaseGraphicAst {
  readonly kind: 'rectangle';
  readonly start?: KicadPoint;
  readonly end?: KicadPoint;
}

export interface PolylineAst extends BaseGraphicAst {
  readonly kind: 'polyline';
  readonly points: readonly KicadPoint[];
}

export interface CircleAst extends BaseGraphicAst {
  readonly kind: 'circle';
  readonly center?: KicadPoint;
  readonly radius?: number;
}

export interface ArcAst extends BaseGraphicAst {
  readonly kind: 'arc';
  readonly start?: KicadPoint;
  readonly mid?: KicadPoint;
  readonly end?: KicadPoint;
}

export interface BezierAst extends BaseGraphicAst {
  readonly kind: 'bezier';
  readonly points: readonly KicadPoint[];
}

export interface TextAst extends BaseGraphicAst {
  readonly kind: 'text';
  readonly value: string;
  readonly at?: KicadAt;
}

export type KicadGraphicItemAst = RectangleAst | PolylineAst | CircleAst | ArcAst | BezierAst | TextAst;

export interface KicadPinAst {
  readonly electricalType: string;
  readonly graphicStyle: string;
  readonly at?: KicadAt;
  readonly length?: number;
  readonly hidden?: boolean;
  readonly name?: string;
  readonly nameEffects?: TextEffects;
  readonly number?: string;
  readonly numberEffects?: TextEffects;
  readonly unknownEntries: readonly UnknownKiCadEntry[];
  readonly source: SExprList;
}

export interface PinDisplayOptions {
  readonly hidden?: boolean;
  readonly offset?: number;
  readonly unknownEntries: readonly UnknownKiCadEntry[];
}

export interface KicadSymbolUnitAst {
  readonly name: string;
  readonly graphics: readonly KicadGraphicItemAst[];
  readonly pins: readonly KicadPinAst[];
  readonly unknownEntries: readonly UnknownKiCadEntry[];
  readonly source: SExprList;
}

export interface KicadSymbolAst {
  readonly name: string;
  readonly extends?: string;
  readonly pinNames?: PinDisplayOptions;
  readonly pinNumbers?: PinDisplayOptions;
  readonly excludeFromSim?: boolean;
  readonly inBom?: boolean;
  readonly onBoard?: boolean;
  readonly inPosFiles?: boolean;
  readonly duplicatePinNumbersAreJumpers?: boolean;
  readonly embeddedFonts?: boolean;
  readonly properties: readonly KicadPropertyAst[];
  readonly graphics: readonly KicadGraphicItemAst[];
  readonly pins: readonly KicadPinAst[];
  readonly units: readonly KicadSymbolUnitAst[];
  readonly unknownEntries: readonly UnknownKiCadEntry[];
  readonly source: SExprList;
}

export interface KicadSymbolLibrary {
  readonly version?: number;
  readonly generator?: string;
  readonly generatorVersion?: string;
  readonly symbols: readonly KicadSymbolAst[];
  readonly unknownEntries: readonly UnknownKiCadEntry[];
  readonly source: SExprList;
}

export interface SymbolLibraryIR {
  readonly version?: number;
  readonly generator?: string;
  readonly generatorVersion?: string;
  readonly symbols: readonly SymbolIR[];
}

export interface SymbolIR {
  readonly id: string;
  readonly name: string;
  readonly extends?: string;
  readonly properties: readonly PropertyIR[];
  readonly units: readonly SymbolUnitIR[];
  readonly pinNames?: PinDisplayOptions;
  readonly pinNumbers?: PinDisplayOptions;
}

export interface PropertyIR {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly at?: KicadAt;
  readonly hidden?: boolean;
  readonly effects?: TextEffects;
}

export interface SymbolUnitIR {
  readonly id: string;
  readonly name: string;
  readonly graphics: readonly GraphicItemIR[];
  readonly pins: readonly PinIR[];
}

export interface GraphicItemIR {
  readonly id: string;
  readonly kind: KicadGraphicKind;
  readonly ast: KicadGraphicItemAst;
}

export interface PinIR {
  readonly id: string;
  readonly electricalType: string;
  readonly graphicStyle: string;
  readonly at?: KicadAt;
  readonly length?: number;
  readonly hidden?: boolean;
  readonly name?: string;
  readonly number?: string;
  readonly nameEffects?: TextEffects;
  readonly numberEffects?: TextEffects;
}
