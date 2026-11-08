import type { Region } from './types';
import { roundedPoly, type Pt } from './geometry';
import { union } from './flatten';

/** A soft, rounded block alphabet on a 100-unit-tall grid. A point may carry a corner radius. */
type P3 = Pt | [number, number, number];
interface Glyph {
  w: number;
  outer: P3[];
  holes?: P3[][];
  /** an extra piece merged into the outline (e.g. the bar of a G) */
  extra?: P3[];
}

const ell = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 18): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Pt;
  });
const R = (pts: Pt[], r = 0): P3[] => pts.map((p) => [p[0], p[1], r]);

export const GLYPHS: Record<string, Glyph> = {
  A: { w: 70, outer: [[0, 100], [24, 0], [46, 0], [70, 100], [48, 100], [43, 80], [27, 80], [22, 100]], holes: [[[27, 64], [43, 64], [35, 32]]] },
  B: {
    w: 70,
    outer: [[0, 0], [48, 0], [64, 8], [68, 25], [60, 46], [70, 60], [70, 82], [58, 98], [48, 100], [0, 100]],
    holes: [[[22, 19], [42, 19], [46, 28], [42, 38], [22, 38]], [[22, 58], [46, 58], [50, 69], [46, 81], [22, 81]]],
  },
  C: { w: 72, outer: [...R(ell(36, 50, 36, 50, 42, 318, 24)), ...R(ell(36, 50, 14, 28, 318, 42, 16))] },
  D: { w: 72, outer: [[0, 0, 4], ...R(ell(34, 50, 38, 50, -90, 90)), [0, 100, 4]], holes: [[[22, 22, 2], ...R(ell(32, 50, 16, 28, -90, 90, 12)), [22, 78, 2]]] },
  E: { w: 66, outer: [[0, 0], [66, 0], [66, 22], [22, 22], [22, 39], [56, 39], [56, 61], [22, 61], [22, 78], [66, 78], [66, 100], [0, 100]] },
  G: {
    w: 74,
    outer: [...R(ell(37, 50, 37, 50, 30, 330, 26)), ...R(ell(37, 50, 15, 28, 330, 30, 16))],
    extra: [[38, 46], [74, 46], [74, 90], [54, 90], [54, 64], [38, 64]],
  },
  H: { w: 70, outer: [[0, 0], [22, 0], [22, 39], [48, 39], [48, 0], [70, 0], [70, 100], [48, 100], [48, 61], [22, 61], [22, 100], [0, 100]] },
  I: { w: 22, outer: [[0, 0], [22, 0], [22, 100], [0, 100]] },
  L: { w: 60, outer: [[0, 0], [22, 0], [22, 78], [60, 78], [60, 100], [0, 100]] },
  M: { w: 90, outer: [[0, 0], [22, 0], [45, 46], [68, 0], [90, 0], [90, 100], [68, 100], [68, 46], [53, 76], [37, 76], [22, 46], [22, 100], [0, 100]] },
  N: { w: 70, outer: [[0, 0], [22, 0], [48, 56], [48, 0], [70, 0], [70, 100], [48, 100], [22, 44], [22, 100], [0, 100]] },
  O: { w: 74, outer: R(ell(37, 50, 37, 50, 0, 360, 36).slice(0, -1)), holes: [R(ell(37, 50, 15, 28, 0, 360, 24).slice(0, -1))] },
  P: {
    w: 70,
    outer: [[0, 0], [46, 0], [66, 10], [70, 30], [66, 50], [46, 62], [22, 62], [22, 100], [0, 100]],
    holes: [[[22, 19], [42, 19], [48, 30], [42, 42], [22, 42]]],
  },
  R: {
    w: 70,
    outer: [[0, 0], [46, 0], [66, 10], [70, 30], [64, 48], [52, 56], [70, 100], [46, 100], [32, 62], [22, 62], [22, 100], [0, 100]],
    holes: [[[22, 19], [42, 19], [48, 30], [42, 42], [22, 42]]],
  },
  S: { w: 68, outer: [[0, 0, 24], [68, 0, 6], [68, 22, 4], [24, 22, 4], [24, 39, 4], [68, 39, 26], [68, 100, 24], [0, 100, 6], [0, 78, 4], [44, 78, 4], [44, 61, 4], [0, 61, 26]] },
  T: { w: 70, outer: [[0, 0], [70, 0], [70, 22], [46, 22], [46, 100], [24, 100], [24, 22], [0, 22]] },
  U: { w: 70, outer: [[0, 0], [22, 0], [22, 78, 6], [48, 78, 6], [48, 0], [70, 0], [70, 100, 28], [0, 100, 28]] },
  W: { w: 92, outer: [[0, 0], [21, 0], [29, 60], [39, 20], [53, 20], [63, 60], [71, 0], [92, 0], [76, 100], [54, 100], [46, 64], [38, 100], [16, 100]] },
};

export function wordWidth(word: string, gap = 14) {
  return [...word].reduce((s, ch, i) => s + (GLYPHS[ch]?.w ?? 34) + (i ? gap : 0), 0);
}

/** Hollow letters: one region per letter, plus separate regions for holes (counters). */
export function lettering(word: string, x: number, y: number, scale: number, idPrefix = 'L', gap = 14, g = 'letter'): Region[] {
  const out: Region[] = [];
  let cursor = x;
  [...word].forEach((ch, i) => {
    const gl = GLYPHS[ch];
    if (!gl) {
      cursor += (34 + gap) * scale;
      return;
    }
    const tf = (p: P3): P3 => (p.length > 2 ? [cursor + p[0] * scale, y + p[1] * scale, (p as number[])[2] * scale] : [cursor + p[0] * scale, y + p[1] * scale]);
    const body = roundedPoly(gl.outer.map(tf), 6 * scale);
    out.push({ id: `${idPrefix}${i}`, d: gl.extra ? union(body, roundedPoly(gl.extra.map(tf), 4 * scale)) : body, c: [cursor + (gl.w / 2) * scale, y + 50 * scale], g });
    gl.holes?.forEach((h, j) => {
      const pts = h.map(tf);
      const c: Pt = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
      out.push({ id: `${idPrefix}${i}h${j}`, d: roundedPoly(pts, 4 * scale), c, g: 'hole' });
    });
    cursor += (gl.w + gap) * scale;
  });
  return out;
}

/** Centre a word horizontally. */
export const centred = (word: string, y: number, scale: number, idPrefix: string, g = 'letter', gap = 14) =>
  lettering(word, (1000 - wordWidth(word, gap) * scale) / 2, y, scale, idPrefix, gap, g);
