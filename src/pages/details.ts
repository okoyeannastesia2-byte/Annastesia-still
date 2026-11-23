/**
 * The "detail kit": small motifs that fill empty backgrounds the way printed colouring
 * books do, texture lines (wood grain, grass, ripples), and a helper that turns a square
 * page into a tall one. Build-time only.
 */
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import { circle, polar, rng, type Pt } from './geometry';
import { insideAny, pathToRings, toGeom, union } from './flatten';
import { curve, petal, polyD, rectD, smooth, star, type Layers } from './shapes';
import type { Region } from './types';

export type Motif = 'flower' | 'leaf' | 'sparkle' | 'dot' | 'swirl' | 'heart' | 'star' | 'clover';

/** One motif → its pieces (each becomes a colourable area). */
export function motif(kind: Motif, x: number, y: number, s: number, rot: number): string[] {
  switch (kind) {
    case 'flower': {
      const petals = Array.from({ length: 5 }, (_, i) => petal(x, y, rot + (i * 2 * Math.PI) / 5, s * 0.28, s, s * 0.42, 0.9));
      return [union(...petals), circle(x, y, s * 0.3)];
    }
    case 'clover': {
      const leaves = Array.from({ length: 4 }, (_, i) => circle(...polar(x, y, s * 0.42, rot + (i * Math.PI) / 2), s * 0.42));
      return [union(...leaves), circle(x, y, s * 0.18)];
    }
    case 'leaf':
      return [petal(x, y, rot, 0, s * 1.6, s * 0.45, 0.5), petal(x, y, rot + 0.9, 0, s * 1.1, s * 0.32, 0.5)];
    case 'sparkle': {
      const pts: Pt[] = [];
      for (let i = 0; i < 8; i++) pts.push(polar(x, y, i % 2 ? s * 0.22 : s, rot + (i * Math.PI) / 4));
      return [smooth(pts, 0.35)];
    }
    case 'star':
      return [star(x, y, s, s * 0.45, 5, rot - Math.PI / 2)];
    case 'heart': {
      const k = s;
      const c = Math.cos(rot * 0.3);
      const sn = Math.sin(rot * 0.3);
      const R = (p: Pt): Pt => [x + (p[0] * c - p[1] * sn) * k, y + (p[0] * sn + p[1] * c) * k];
      return [smooth([[0, 0.9], [-0.95, 0], [-0.75, -0.6], [-0.3, -0.65], [0, -0.25], [0.3, -0.65], [0.75, -0.6], [0.95, 0]].map((p) => R(p as Pt)), 0.8)];
    }
    case 'swirl': {
      const pts: Pt[] = [];
      for (let i = 0; i <= 40; i++) pts.push(polar(x, y, s * 0.15 + (s * 0.85 * i) / 40, rot + i * 0.27));
      const L: Pt[] = [];
      const R: Pt[] = [];
      pts.forEach((p, i) => {
        const q = pts[Math.min(i + 1, pts.length - 1)];
        const o = pts[Math.max(i - 1, 0)];
        const dx = q[0] - o[0];
        const dy = q[1] - o[1];
        const l = Math.hypot(dx, dy) || 1;
        const w = s * (0.06 + (0.1 * i) / 40);
        L.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
        R.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
      });
      return [polyD([...L, ...R.reverse()])];
    }
    default:
      return [circle(x, y, s * 0.45)];
  }
}

interface ScatterOpts {
  /** where motifs may go (path) */
  within: string;
  /** shapes to keep clear of */
  avoid: string[];
  motifs: Motif[];
  spacing: number;
  size: [number, number];
  /** clearance around avoided shapes */
  margin?: number;
  seed?: number;
  group?: string;
  /** put motifs right after this region (so later shapes still sit on top) */
  after?: string;
}

/** Sprinkle little motifs over an empty area, on a jittered grid, never touching the drawing. */
export function scatter(L: Layers, o: ScatterOpts) {
  const r = rng(o.seed ?? 11);
  // motifs big enough to enjoy colouring, with room to breathe
  o = { ...o, size: [o.size[0] * 1.5, o.size[1] * 1.5], spacing: o.spacing * 1.3 };
  const within = toGeom(o.within);
  const avoid: MultiPolygon = o.avoid.length ? polygonClipping.union(...(o.avoid.map(toGeom) as [MultiPolygon, ...MultiPolygon[]])) : [];
  const [b0, b1] = boundsOf(within);
  const out: Region[] = [];
  const margin = o.margin ?? 14;
  let n = 0;
  for (let y = b0[1] + o.spacing / 2; y < b1[1]; y += o.spacing * 0.87) {
    const row = Math.round((y - b0[1]) / (o.spacing * 0.87));
    for (let x = b0[0] + (row % 2 ? o.spacing / 2 : 0) + o.spacing / 4; x < b1[0]; x += o.spacing) {
      const s = o.size[0] + r() * (o.size[1] - o.size[0]);
      const px = x + (r() - 0.5) * o.spacing * 0.45;
      const py = y + (r() - 0.5) * o.spacing * 0.45;
      const kind = o.motifs[Math.floor(r() * o.motifs.length)];
      const rot = r() * Math.PI * 2;
      const reach = (kind === 'leaf' ? 1.6 : 1) * s + margin;
      const probes: Pt[] = [[px, py], ...Array.from({ length: 12 }, (_, i) => polar(px, py, reach, (i * Math.PI) / 6))];
      if (!probes.every((p) => insideAny(within, p) && !insideAny(avoid, p))) continue;
      motif(kind, px, py, s, rot).forEach((d, k) => out.push({ id: `${o.group ?? 'm'}${n}_${k}`, d, c: [px, py], g: `${o.group ?? 'motif'}${k ? 'C' : ''}` }));
      n++;
    }
  }
  const at = o.after ? L.regions.findIndex((x) => x.id === o.after) + 1 : L.regions.length;
  L.regions.splice(at > 0 ? at : L.regions.length, 0, ...out);
  return out.length;
}

function boundsOf(g: MultiPolygon): [Pt, Pt] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of g) for (const [x, y] of poly[0]) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [[x0, y0], [x1, y1]];
}

/** Wood-grain lines (decor) across a board, clipped to its region. */
export function woodGrain(L: Layers, clip: string, x0: number, y0: number, x1: number, y1: number, seed = 3) {
  const r = rng(seed);
  for (let y = y0 + 18; y < y1 - 6; y += 22 + r() * 16) {
    const pts: Pt[] = [];
    for (let x = x0 - 10; x <= x1 + 10; x += 60) pts.push([x, y + (r() - 0.5) * 8]);
    L.line(curve(pts), clip);
    if (r() < 0.5) {
      const kx = x0 + r() * (x1 - x0);
      L.line(`M${kx - 22} ${y + 9}C${kx - 10} ${y + 2} ${kx + 10} ${y + 2} ${kx + 22} ${y + 9}`, clip);
    }
  }
}

/** Little grass tufts along a ground line (decor). */
export function grassTufts(L: Layers, clip: string, y: (x: number) => number, x0: number, x1: number, seed = 5) {
  const r = rng(seed);
  for (let x = x0 + 20; x < x1; x += 40 + r() * 60) {
    const by = y(x) + 18 + r() * 30;
    for (const dx of [-8, 0, 8]) L.line(`M${x + dx} ${by}Q${x + dx * 1.6} ${by - 14} ${x + dx * 2.2} ${by - 22 - r() * 8}`, clip);
  }
}

/** Gentle ripple marks on water (decor). */
export function ripples(L: Layers, clip: string, x0: number, y0: number, x1: number, y1: number, seed = 9) {
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const w = 20 + r() * 40;
    L.line(`M${x - w} ${y}Q${x - w / 2} ${y - 6} ${x} ${y}T${x + w} ${y}`, clip);
  }
}

/**
 * Make a square page tall: everything moves down by `dy` (edge 'top') or stays (edge 'bottom'),
 * and shapes that touched that page edge are stretched to reach the new edge.
 */
export function extendPage(L: Layers, edge: 'top' | 'bottom', dy: number, h = 1000) {
  const shiftD = (d: string) =>
    pathToRings(d, 3)
      .map((ring) => 'M' + ring.map(([x, y]) => `${x.toFixed(1)} ${(y + dy).toFixed(1)}`).join('L') + 'Z')
      .join('');
  for (const r of L.regions) {
    const rings = pathToRings(r.d, 4);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const ring of rings) for (const [x, y] of ring) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    // only wide shapes (walls, sea, sand, cloth) stretch to the new edge; a trunk or rope that
    // happens to touch the edge keeps its length
    const wide = x1 - x0 > 300;
    if (edge === 'top') {
      r.d = shiftD(r.d);
      if (r.c) r.c = [r.c[0], r.c[1] + dy];
      if (y0 <= 2 && (wide || r.g === 'rope')) r.d = union(r.d, rectD(x0, -2, x1 - x0, y0 + dy + 4));
    } else if (y1 >= h - 2 && wide) {
      r.d = union(r.d, rectD(x0, y1 - 4, x1 - x0, dy + 6));
    }
  }
  if (edge === 'top') {
    L.decor = L.decor.map((dec) => ({ ...dec, d: shiftDecor(dec.d, dy) }));
  }
}
function shiftDecor(d: string, dy: number) {
  // decor uses M/L/C/Q/T/A with absolute coordinates; shift every y value
  return d.replace(/([MLCQTA])([^MLCQTAZ]*)/g, (_, cmd: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === 'A') {
      for (let i = 6; i < n.length; i += 7) n[i] += dy;
    } else for (let i = 1; i < n.length; i += 2) n[i] += dy;
    return cmd + n.join(' ');
  });
}

/** Every region's outline except the listed ones — what background motifs must keep clear of. */
export const othersThan = (L: Layers, ...ids: string[]) => L.regions.filter((r) => !ids.includes(r.id)).map((r) => r.d);
/** The path of a region by id. */
export const regionD = (L: Layers, id: string) => L.regions.find((r) => r.id === id)!.d;

/** A garland of little flags hanging along a gentle curve. */
export function bunting(L: Layers, x0: number, x1: number, y: number, sag: number, n: number, g = 'flag') {
  const at = (t: number): Pt => [x0 + (x1 - x0) * t, y + sag * Math.sin(Math.PI * t)];
  L.add('string', polyD([...Array.from({ length: 41 }, (_, i) => at(i / 40)), ...Array.from({ length: 41 }, (_, i) => { const p = at(1 - i / 40); return [p[0], p[1] + 4] as Pt; })]));
  for (let i = 0; i < n; i++) {
    const a = at((i + 0.15) / n);
    const b = at((i + 0.85) / n);
    const m = at((i + 0.5) / n);
    L.add(g, polyD([[a[0], a[1] + 3], [b[0], b[1] + 3], [m[0], m[1] + 58]]), [m[0], m[1] + 22]);
  }
}
