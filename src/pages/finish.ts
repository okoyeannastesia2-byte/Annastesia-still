/**
 * Build-time finishing for every page (run by scripts/prerender-pages.ts):
 *  - bold silhouette "contours" around foreground shapes, like an illustrator's outer line
 *  - a gentle hand-drawn wobble on figurative pages (deterministic, so shared edges stay matched)
 */
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import type { Decor, Page, Region } from './types';
import { pathToRings, simplify, simplifyClosed, toGeom, toPath } from './flatten';

type P = [number, number];

// ---------- contours ----------
function bbox(d: string) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ring of pathToRings(d, 8)) for (const [x, y] of ring) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/** A region is "background" when it reaches two or more page edges (sky, wall, sea, table…). */
function isBackground(r: Region, w: number, h: number) {
  const b = bbox(r.d);
  const e = 2;
  const edges = Number(b.x0 <= e) + Number(b.y0 <= e) + Number(b.x1 >= w - e) + Number(b.y1 >= h - e);
  return edges >= 2;
}

/** Union of all foreground regions → bold outer outlines around each cluster of shapes. */
export function makeContours(page: Page): string[] {
  // small shapes (background motifs, dots) keep only the fine line — a bold ring would swamp them
  const big = (r: Region) => {
    const b = bbox(r.d);
    return (b.x1 - b.x0) * (b.y1 - b.y0) > 3200;
  };
  const fg = page.regions.filter((r) => !isBackground(r, page.w, page.h) && big(r));
  if (!fg.length) return [];
  const geoms = fg.map((r) => toGeom(r.d)).filter((g) => g.length);
  // union in small batches (much faster than one giant union)
  let level: MultiPolygon[] = geoms;
  while (level.length > 1) {
    const next: MultiPolygon[] = [];
    for (let i = 0; i < level.length; i += 8) {
      const batch = level.slice(i, i + 8) as [MultiPolygon, ...MultiPolygon[]];
      next.push(batch.length > 1 ? polygonClipping.union(...batch) : batch[0]);
    }
    level = next;
  }
  // keep only the outer rings: inner holes are drawn by the fine region lines already
  const outer: MultiPolygon = level[0].map((poly) => [poly[0]]);
  const d = toPath(outer);
  return d ? [d] : [];
}

// ---------- hand-drawn wobble ----------
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
/** Smooth displacement field: same point → same nudge, so neighbouring shapes stay joined. */
function nudge([x, y]: P, amp: number): P {
  const s = 1 / 55;
  return [x + (noise(x * s, y * s) - 0.5) * 2 * amp, y + (noise(x * s + 37.2, y * s + 11.9) - 0.5) * 2 * amp];
}
function densify(ring: P[], closed: boolean, max = 6): P[] {
  const out: P[] = [];
  const n = closed ? ring.length : ring.length - 1;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / max));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  if (!closed) out.push(ring[ring.length - 1]);
  return out;
}
const f1 = (v: number) => Math.round(v * 10) / 10;
function wobblePath(d: string, closed: boolean, amp: number): string {
  // open decor paths: sample without closing
  const rings = closed ? pathToRings(d, 3) : openRings(d);
  return rings
    .map((ring) => {
      const moved = densify(ring, closed).map((p) => nudge(p, amp));
      const pts = closed ? simplifyClosed(moved, 0.22) : simplify(moved, 0.22);
      return 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + (closed ? 'Z' : '');
    })
    .join('');
}
/** Sample an open path (decor line) into polylines, one per M. */
function openRings(d: string): P[][] {
  return d
    .split(/(?=M)/)
    .filter((s) => s.trim())
    .map((part) => {
      const rings = pathToRings(part + 'Z', 3);
      const pts = rings[0] ?? [];
      // pathToRings closes back to the start; drop that closing point for open lines
      return pts.length > 2 ? pts : pts;
    })
    .filter((r) => r.length >= 2);
}

export function wobble(page: Page, amp = 1.1): Pick<Page, 'regions' | 'contours' | 'decor'> {
  const regions = page.regions.map((r) => ({ ...r, d: wobblePath(r.d, true, amp) }));
  const contours = page.contours?.map((d) => wobblePath(d, true, amp));
  const decor = page.decor?.map((dec): Decor => {
    if (typeof dec === 'string') return wobblePath(dec, false, amp * 0.8);
    return { ...dec, d: wobblePath(dec.d, false, amp * 0.8) };
  });
  return { regions, contours, decor };
}

/** A lighter copy of a page for small thumbnails (coarser outlines). */
export function lighten(page: Page, tol = 1.1): Page {
  const r0 = (v: number) => Math.round(v);
  const slim = (d: string, closed = true) =>
    pathToRings(d, 6)
      .map((ring) => {
        const pts = closed ? simplifyClosed(ring as P[], tol) : simplify(ring as P[], tol);
        return pts.length > 2 || !closed ? 'M' + pts.map((p) => `${r0(p[0])} ${r0(p[1])}`).join('L') + (closed ? 'Z' : '') : '';
      })
      .join('');
  return {
    ...page,
    regions: page.regions.map((r) => ({ ...r, d: slim(r.d) })),
    contours: page.contours?.map((d) => slim(d)),
    decor: [],
  };
}
