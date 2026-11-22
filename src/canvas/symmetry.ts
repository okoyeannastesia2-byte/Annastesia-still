import type { Page } from '../pages/types';

type Pt = [number, number];
/** One mirror copy: how to move a point, and the same move as an SVG transform. */
export interface Xf {
  pt: (p: Pt) => Pt;
  svg: string;
}

/** The extra copies the mirror brush makes on a symmetric page (identity not included). */
export function symmetryOf(page: Page): Xf[] {
  const s = page.symmetry;
  if (!s) return [];
  const out: Xf[] = [];
  if (s.flip) {
    out.push({ pt: ([x, y]) => [2 * s.cx - x, y], svg: `matrix(-1 0 0 1 ${2 * s.cx} 0)` });
  }
  for (let k = 1; k < s.n; k++) {
    const a = (2 * Math.PI * k) / s.n;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    out.push({
      pt: ([x, y]) => [s.cx + (x - s.cx) * c - (y - s.cy) * sn, s.cy + (x - s.cx) * sn + (y - s.cy) * c],
      svg: `rotate(${(360 * k) / s.n} ${s.cx} ${s.cy})`,
    });
  }
  return out;
}
