import { Container, Graphics } from 'pixi.js';
import { NEWSTROKE_GLYPHS } from './newstroke-glyphs.js';

const STROKE_FONT_SCALE = 1 / 21;
const FONT_OFFSET = -8;

// KiCad NewStroke BASIC LATIN (U+0020-U+007F). 该编码来自 KiCad 官方
// newstroke_font.cpp，Web 端按同一解码规则绘制，避免浏览器字体差异。
const BASIC_LATIN = [
  'JZ',
  'MWRYSZR[QZRYR[ RRSQGRFSGRSRF',
  'JZNFNJ RVFVJ',
  'H]LM[M RRDL_ RYVJV RS_YD',
  'H\\LZO[T[VZWYXWXUWSVRTQPPNOMNLLLJMHNGPFUFXG RRCR^',
  'F^J[ZF RMFOGPIOKMLKKJIKGMF RYZZXYVWUUVTXUZW[YZ',
  'E_[[Z[XZUWPQNNMKMINGPFQFSGTITJSLRMLQKRJTJWKYLZN[Q[SZTYWUXRXP',
  'MWSFQJ',
  'KYVcUbS_R]QZPUPQQLRISGUDVC',
  'KYNcObQ_R]SZTUTQSLRIQGODNC',
  'JZRFRK RMIRKWI ROORKUO',
  'E_JSZS RR[RK',
  'MWSZS[R]Q^',
  'E_JSZS',
  'MWRYSZR[QZRYR[',
  'G][EI`',
  'H\\QFSFUGVHWJXNXSWWVYUZS[Q[OZNYMWLSLNMJNHOGQF',
  'H\\X[L[ RR[RFPINKLL',
  'H\\LHMGOFTFVGWHXJXLWOK[X[',
  'H\\KFXFQNTNVOWPXRXWWYVZT[N[LZKY',
  'H\\VMV[ RQELTYT',
  'H\\WFMFLPMOONTNVOWPXRXWWYVZT[O[MZLY',
  'H\\VFRFPGOHMKLOLWMYNZP[T[VZWYXWXRWPVOTNPNNOMPLR',
  'H\\KFYFP[',
  'H\\PONNMMLKLJMHNGPFTFVGWHXJXKWMVNTOPONPMQLSLWMYNZP[T[VZWYXWXSWQVPTO',
  'H\\N[R[TZUYWVXRXJWHVGTFPFNGMHLJLOMQNRPSTSVRWQXO',
  'MWRYSZR[QZRYR[ RRNSORPQORNRP',
  'MWSZS[R]Q^ RRNSORPQORNRP',
  'E_ZMJSZY',
  'E_JPZP RZVJV',
  'E_JMZSJY',
  'I[QYRZQ[PZQYQ[ RMGOFTFVGWIWKVMUNSORPQRQS',
  'D_VQUPSOQOOPNQMSMUNWOXQYSYUXVW RVOVWWXXXZW[U[PYMVKRJNKKMIPHTIXK[N]R^V]Y[',
  'I[MUWU RK[RFY[',
  'G\\SPVQWRXTXWWYVZT[L[LFSFUGVHWJWLVNUOSPLP',
  'F[WYVZS[Q[NZLXKVJRJOKKLINGQFSFVGWH',
  'G\\L[LFQFTGVIWKXOXRWVVXTZQ[L[',
  'H[MPTP RW[M[MFWF',
  'HZTPMP RM[MFWF',
  'F[VGTFQFNGLIKKJOJRKVLXNZQ[S[VZWYWRSR',
  'G]L[LF RLPXP RX[XF',
  'MWR[RF',
  'JZUFUUTXRZO[M[',
  'G\\L[LF RX[OO RXFLR',
  'HYW[M[MF',
  'F^K[KFRUYFY[',
  'G]L[LFX[XF',
  'G]PFTFVGXIYMYTXXVZT[P[NZLXKTKMLINGPF',
  'G\\L[LFTFVGWHXJXMWOVPTQLQ',
  'G]Z]X\\VZSWQVOV RP[NZLXKTKMLINGPFTFVGXIYMYTXXVZT[P[',
  'G\\X[QQ RL[LFTFVGWHXJXMWOVPTQLQ',
  'H\\LZO[T[VZWYXWXUWSVRTQPPNOMNLLLJMHNGPFUFXG',
  'JZLFXF RR[RF',
  'G]LFLWMYNZP[T[VZWYXWXF',
  'I[KFR[YF',
  'F^IFN[RLV[[F',
  'H\\KFY[ RYFK[',
  'I[RQR[ RKFRQYF',
  'H\\KFYFK[Y[',
  'KYVbQbQDVD',
  'KYID[_',
  'KYNbSbSDND',
  'LXNHREVH',
  'JZJ]Z]',
  'NVPESH',
  'I\\W[WPVNTMPMNN RWZU[P[NZMXMVNTPSUSWR',
  'H[M[MF RMNOMSMUNVOWQWWVYUZS[O[MZ',
  'HZVZT[P[NZMYLWLQMONNPMTMVN',
  'I\\W[WF RWZU[Q[OZNYMWMQNOONQMUMWN',
  'I[VZT[P[NZMXMPNNPMTMVNWPWRMT',
  'MYOMWM RR[RISGUFWF',
  'I\\WMW^V`UaSbPbNa RWZU[Q[OZNYMWMQNOONQMUMWN',
  'H[M[MF RV[VPUNSMPMNNMO',
  'MWR[RM RRFQGRHSGRFRH',
  'MWRMR_QaObNb RRFQGRHSGRFRH',
  'IZN[NF RPSV[ RVMNU',
  'MXU[SZRXRF',
  'D`I[IM RIOJNLMOMQNRPR[ RRPSNUMXMZN[P[[',
  'I\\NMN[ RNOONQMTMVNWPW[',
  'H[P[NZMYLWLQMONNPMSMUNVOWQWWVYUZS[P[',
  'H[MMMb RMNOMSMUNVOWQWWVYUZS[O[MZ',
  'I\\WMWb RWZU[Q[OZNYMWMQNOONQMUMWN',
  'KXP[PM RPQQORNTMVM',
  'J[NZP[T[VZWXWWVUTTQTOSNQNPONQMTMVN',
  'MYOMWM RRFRXSZU[W[',
  'H[VMV[ RMMMXNZP[S[UZVY',
  'JZMMR[WM',
  'G]JMN[RQV[ZM',
  'IZL[WM RLMW[',
  'JZMMR[ RWMR[P`OaMb',
  'IZLMWML[W[',
  'KYVcUcSbR`RVQTOSQRRPRFSDUCVC',
  'H\\RbRD',
  'KYNcOcQbR`RVSTUSSRRPRFQDOCNC',
  'KZMSNRPQTSVRWQ',
  'F^K[KFYFY[K['
] as const;

interface GlyphStroke {
  readonly points: readonly { x: number; y: number }[];
}

interface Glyph {
  readonly width: number;
  readonly strokes: readonly GlyphStroke[];
  readonly minY: number;
  readonly maxY: number;
}

export interface StrokeTextOptions {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color: number;
  readonly alpha?: number;
  readonly anchor?: { x: number; y: number };
  readonly rotation?: number;
  readonly lineWidth?: number;
}

const GLYPHS = BASIC_LATIN.map(decodeGlyph);
const BASIC_LATIN_START = 0x20;
const BASIC_LATIN_END = 0x7f;
const FALLBACK_GLYPH = GLYPHS[0x3f - BASIC_LATIN_START]!;
const EXTENDED_ENCODED_GLYPHS = new Map<number, string>(
  NEWSTROKE_GLYPHS.filter(([code]) => code < BASIC_LATIN_START || code > BASIC_LATIN_END)
);
const EXTENDED_DECODED_GLYPHS = new Map<number, Glyph>();

export function canRenderStrokeText(text: string): boolean {
  return [...text].every((char) => {
    const code = char.codePointAt(0);
    return code !== undefined && (isBasicLatinGlyph(code) || EXTENDED_ENCODED_GLYPHS.has(code));
  });
}

export function drawStrokeText(stage: Container, options: StrokeTextOptions): void {
  const metrics = measureStrokeText(options.text, options.size);
  const originX = -metrics.width * (options.anchor?.x ?? 0.5);
  const originY = -metrics.height * (options.anchor?.y ?? 0.5) - metrics.minY;
  const layer = new Container();
  let cursor = originX;

  for (const char of options.text) {
    const glyph = glyphFor(char);
    const graphic = new Graphics();
    for (const stroke of glyph.strokes) {
      const [first, ...rest] = stroke.points;
      if (!first) {
        continue;
      }

      graphic.moveTo(cursor + first.x * options.size, originY + first.y * options.size);
      for (const point of rest) {
        graphic.lineTo(cursor + point.x * options.size, originY + point.y * options.size);
      }
    }
    graphic.stroke({
      color: options.color,
      width: options.lineWidth ?? Math.max(1.2, options.size * 0.12),
      alpha: options.alpha ?? 1,
      cap: 'round',
      join: 'round'
    });
    layer.addChild(graphic);
    cursor += glyph.width * options.size;
  }

  layer.position.set(options.x, options.y);
  layer.rotation = options.rotation ?? 0;
  stage.addChild(layer);
}

export function measureStrokeText(text: string, size: number): { width: number; height: number; minY: number; maxY: number } {
  let width = 0;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const char of text) {
    const glyph = glyphFor(char);
    width += glyph.width * size;
    minY = Math.min(minY, glyph.minY);
    maxY = Math.max(maxY, glyph.maxY);
  }

  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    minY = -0.5;
    maxY = 0.5;
  }

  return {
    width,
    height: (maxY - minY) * size,
    minY: minY * size,
    maxY: maxY * size
  };
}

function glyphFor(char: string): Glyph {
  const code = char.codePointAt(0);
  if (code === undefined) {
    return FALLBACK_GLYPH;
  }

  if (isBasicLatinGlyph(code)) {
    return GLYPHS[code - BASIC_LATIN_START]!;
  }

  return extendedGlyphFor(code) ?? FALLBACK_GLYPH;
}

function isBasicLatinGlyph(code: number): boolean {
  return code >= BASIC_LATIN_START && code <= BASIC_LATIN_END;
}

function extendedGlyphFor(code: number): Glyph | undefined {
  const cached = EXTENDED_DECODED_GLYPHS.get(code);
  if (cached) {
    return cached;
  }

  const encoded = EXTENDED_ENCODED_GLYPHS.get(code);
  if (!encoded) {
    return undefined;
  }

  const glyph = decodeGlyph(encoded);
  EXTENDED_DECODED_GLYPHS.set(code, glyph);
  return glyph;
}

function decodeGlyph(encoded: string): Glyph {
  const glyphStartX = (encoded.charCodeAt(0) - 82) * STROKE_FONT_SCALE;
  const glyphEndX = (encoded.charCodeAt(1) - 82) * STROKE_FONT_SCALE;
  const strokes: { points: { x: number; y: number }[] }[] = [{ points: [] }];
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 2; index + 1 < encoded.length; index += 2) {
    const xChar = encoded[index]!;
    const yChar = encoded[index + 1]!;
    if (xChar === ' ' && yChar === 'R') {
      strokes.push({ points: [] });
      continue;
    }

    const point = {
      x: (xChar.charCodeAt(0) - 82) * STROKE_FONT_SCALE - glyphStartX,
      y: (yChar.charCodeAt(0) - 82 + FONT_OFFSET) * STROKE_FONT_SCALE
    };
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    strokes[strokes.length - 1]!.points.push(point);
  }

  return {
    width: glyphEndX - glyphStartX,
    strokes: strokes.filter((stroke) => stroke.points.length > 0),
    minY: Number.isFinite(minY) ? minY : -0.5,
    maxY: Number.isFinite(maxY) ? maxY : 0.5
  };
}
