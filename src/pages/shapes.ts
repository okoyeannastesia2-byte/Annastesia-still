/** Drawing helpers for figurative ("layered") pages. Everything returns a closed path string. */
import type { Region } from './types';
import { circle, polar, type Pt } from './geometry';

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const pt = (p: Pt) => `${n2(p[0])} ${n2(p[1])}`;

/** Smooth closed curve through points (Catmull-Rom → cubic Béziers). */
export function smooth(pts: Pt[], tension = 1): string {
  const n = pts.length;
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const t = tension / 6;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + 'Z';
}

/** Like smooth, but points prefixed with '!' (passed as {sharp:true}) stay as corners. */
export function shape(pts: (Pt | { p: Pt; sharp: true })[], tension = 1): string {
  const P = pts.map((q) => (Array.isArray(q) ? q : q.p));
  const sharp = pts.map((q) => !Array.isArray(q));
  const n = P.length;
  let d = `M${pt(P[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n];
    const p1 = P[i];
    const p2 = P[(i + 1) % n];
    const p3 = P[(i + 2) % n];
    const t = tension / 6;
    const c1: Pt = sharp[i] ? p1 : [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: Pt = sharp[(i + 1) % n] ? p2 : [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + 'Z';
}
export const S = (p: Pt) => ({ p, sharp: true as const });

/** Smooth open polyline (for decor lines). */
export function curve(pts: Pt[]): string {
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

export const polyD = (pts: Pt[]) => 'M' + pts.map(pt).join('L') + 'Z';

export function star(cx: number, cy: number, ro: number, ri: number, n = 5, rot = -Math.PI / 2): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) pts.push(polar(cx, cy, i % 2 ? ri : ro, rot + (i * Math.PI) / n));
  return polyD(pts);
}

/** Pointed petal / leaf blade from radius r1 to r2 at angle a, max half-width w. */
export function petal(cx: number, cy: number, a: number, r1: number, r2: number, w: number, roundness = 0.5): string {
  const b = polar(cx, cy, r1, a);
  const t = polar(cx, cy, r2, a);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const m1 = polar(cx, cy, r1 + (r2 - r1) * 0.35, a);
  const m2 = polar(cx, cy, r1 + (r2 - r1) * (0.75 + roundness * 0.2), a);
  const k = 1.3;
  return `M${pt(b)}C${pt([m1[0] + nx * w * k, m1[1] + ny * w * k])} ${pt([m2[0] + nx * w * k * roundness, m2[1] + ny * w * k * roundness])} ${pt(t)}C${pt([m2[0] - nx * w * k * roundness, m2[1] - ny * w * k * roundness])} ${pt([m1[0] - nx * w * k, m1[1] - ny * w * k])} ${pt(b)}Z`;
}

/** Teardrop with the point at (x, y-h) — rain drops. */
export function drop(x: number, y: number, r: number, h = r * 2.2): string {
  return `M${pt([x, y - h])}C${pt([x + r * 0.6, y - h * 0.5])} ${pt([x + r * 1.33, y - r * 0.2])} ${pt([x, y + r])}C${pt([x - r * 1.33, y - r * 0.2])} ${pt([x - r * 0.6, y - h * 0.5])} ${pt([x, y - h])}Z`;
}

/** Band between two horizontal curves y = top(x) and y = bot(x), x0..x1. */
export function hband(top: (x: number) => number, bot: (x: number) => number, x0 = -10, x1 = 1010, n = 80): string {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push([x, top(x)]);
  }
  for (let i = n; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push([x, bot(x)]);
  }
  return polyD(pts);
}

export const rectD = (x: number, y: number, w: number, h: number) => polyD([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

export function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return `M${n2(x + r)} ${n2(y)}H${n2(x + w - r)}Q${n2(x + w)} ${n2(y)} ${n2(x + w)} ${n2(y + r)}V${n2(y + h - r)}Q${n2(x + w)} ${n2(y + h)} ${n2(x + w - r)} ${n2(y + h)}H${n2(x + r)}Q${n2(x)} ${n2(y + h)} ${n2(x)} ${n2(y + h - r)}V${n2(y + r)}Q${n2(x)} ${n2(y)} ${n2(x + r)} ${n2(y)}Z`;
}

/** Zig-zag band of triangles between y0 and y1 — a classic textile border. Returns pieces. */
export function triangleRow(x0: number, x1: number, y0: number, y1: number, n: number): string[] {
  const w = (x1 - x0) / n;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w;
    out.push(polyD([[a, y1], [a + w / 2, y0], [a + w, y1]]));
  }
  return out;
}

/** Collects layered regions in back-to-front order. */
export class Layers {
  regions: Region[] = [];
  decor: { d: string; clip?: string }[] = [];
  private counts: Record<string, number> = {};
  add(g: string, d: string, c?: Pt): string {
    const n = (this.counts[g] = (this.counts[g] ?? 0) + 1);
    const id = `${g}${n}`;
    this.regions.push({ id, d, g, c });
    return id;
  }
  addAll(g: string, ds: string[]) {
    return ds.map((d) => this.add(g, d));
  }
  dot(g: string, x: number, y: number, r: number) {
    return this.add(g, circle(x, y, r), [x, y]);
  }
  line(d: string, clip?: string) {
    this.decor.push({ d, clip });
  }
}
