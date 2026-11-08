import type { Region } from './types';

export type Pt = [number, number];
type Seg =
  | { t: 'L'; to: Pt }
  | { t: 'C'; c1: Pt; c2: Pt; to: Pt }
  | { t: 'A'; r: number; large: 0 | 1; sweep: 0 | 1; to: Pt };

/** An open path piece. Regions are built by chaining edges end-to-start. */
export interface Edge {
  from: Pt;
  segs: Seg[];
}

const TAU = Math.PI * 2;
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const pt = (p: Pt) => `${n2(p[0])} ${n2(p[1])}`;

export const polar = (cx: number, cy: number, r: number, a: number): Pt => [
  cx + r * Math.cos(a),
  cy + r * Math.sin(a),
];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const end = (e: Edge): Pt => (e.segs.length ? e.segs[e.segs.length - 1].to : e.from);

export function line(a: Pt, b: Pt): Edge {
  return { from: a, segs: [{ t: 'L', to: b }] };
}

export function poly(pts: Pt[]): Edge {
  return { from: pts[0], segs: pts.slice(1).map((to) => ({ t: 'L' as const, to })) };
}

export function cubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt): Edge {
  return { from: p0, segs: [{ t: 'C', c1, c2, to: p3 }] };
}

/** Circular arc from angle a0 to a1 (radians, either direction). */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number): Edge {
  const span = a1 - a0;
  const sweep: 0 | 1 = span > 0 ? 1 : 0;
  const pieces = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI * 0.95)));
  const segs: Seg[] = [];
  for (let i = 1; i <= pieces; i++) {
    segs.push({ t: 'A', r, large: 0, sweep, to: polar(cx, cy, r, a0 + (span * i) / pieces) });
  }
  return { from: polar(cx, cy, r, a0), segs };
}

export function rev(e: Edge): Edge {
  const pts: Pt[] = [e.from, ...e.segs.map((s) => s.to)];
  const segs: Seg[] = [];
  for (let i = e.segs.length - 1; i >= 0; i--) {
    const s = e.segs[i];
    const to = pts[i];
    if (s.t === 'L') segs.push({ t: 'L', to });
    else if (s.t === 'C') segs.push({ t: 'C', c1: s.c2, c2: s.c1, to });
    else segs.push({ t: 'A', r: s.r, large: s.large, sweep: s.sweep ? 0 : 1, to });
  }
  return { from: pts[pts.length - 1], segs };
}

/** Closed path d-string from a chain of edges. */
export function closed(...edges: Edge[]): string {
  let d = `M${pt(edges[0].from)}`;
  for (const e of edges) {
    for (const s of e.segs) {
      if (s.t === 'L') d += `L${pt(s.to)}`;
      else if (s.t === 'C') d += `C${pt(s.c1)} ${pt(s.c2)} ${pt(s.to)}`;
      else d += `A${n2(s.r)} ${n2(s.r)} 0 ${s.large} ${s.sweep} ${pt(s.to)}`;
    }
  }
  return d + 'Z';
}

export function circle(cx: number, cy: number, r: number): string {
  return `M${n2(cx - r)} ${n2(cy)}A${n2(r)} ${n2(r)} 0 1 0 ${n2(cx + r)} ${n2(cy)}A${n2(r)} ${n2(r)} 0 1 0 ${n2(cx - r)} ${n2(cy)}Z`;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return closed(poly(pts));
}

export function rect(x: number, y: number, w: number, h: number): string {
  return closed(poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]));
}

/** Sample a function t∈[0,1] → point into a polyline edge. */
export function sample(fn: (t: number) => Pt, n = 60): Edge {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push(fn(i / n));
  return poly(pts);
}

/** Polygon with softly rounded corners. A point may carry its own radius as a 3rd value. */
export function roundedPoly(pts: (Pt | [number, number, number])[], radius: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const want = p.length > 2 ? (p as number[])[2] : radius;
    const r = Math.min(want, la * 0.48, lb * 0.48);
    const p1: Pt = [p[0] + ((a[0] - p[0]) / la) * r, p[1] + ((a[1] - p[1]) / la) * r];
    const p2: Pt = [p[0] + ((b[0] - p[0]) / lb) * r, p[1] + ((b[1] - p[1]) / lb) * r];
    d += `${i === 0 ? 'M' : 'L'}${pt(p1)}Q${pt([p[0], p[1]])} ${pt(p2)}`;
  }
  return d + 'Z';
}

/** A thick ribbon along a centre line (e.g. a stem). Width can vary along t. */
export function ribbon(center: (t: number) => Pt, width: (t: number) => number, n = 40): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = center(t);
    const q = center(Math.min(1, t + 0.001));
    const o = center(Math.max(0, t - 0.001));
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = width(t) / 2;
    left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  }
  return closed(poly([...left, ...right.reverse()]));
}

/** A leaf from base to tip, split along its midrib into two halves. */
export function leaf(id: string, base: Pt, tip: Pt, width: number, bend = 0, g = 'leaf'): Region[] {
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const at = (t: number, off: number): Pt => [
    base[0] + dx * t + nx * (off + bend * Math.sin(Math.PI * t) * len),
    base[1] + dy * t + ny * (off + bend * Math.sin(Math.PI * t) * len),
  ];
  const sideW = (t: number) => width * 0.5 * Math.pow(Math.sin(Math.PI * t), 0.8) * (1 - 0.25 * t);
  const mid = sample((t) => at(t, 0), 30);
  const left = sample((t) => at(t, sideW(t)), 30);
  const right = sample((t) => at(t, -sideW(t)), 30);
  const c1 = at(0.5, sideW(0.5) / 2);
  const c2 = at(0.5, -sideW(0.5) / 2);
  return [
    { id: `${id}a`, d: closed(left, rev(mid)), c: c1, g },
    { id: `${id}b`, d: closed(mid, rev(right)), c: c2, g: g + '2' },
  ];
}

interface RingOpts {
  id: string;
  cx: number;
  cy: number;
  r1: number;
  r2: number;
  n: number;
  /** Start / end angle. Omit a1 for a full ring. */
  a0?: number;
  a1?: number;
  shape?: 'round' | 'pointed';
  /** Nest a small dot in each petal. */
  dots?: boolean;
}

/**
 * A ring of petals that exactly fills the band r1..r2: petals plus the
 * "valley" pieces between them, all sharing edges.
 */
export function petalRing(o: RingOpts): Region[] {
  const { id, cx, cy, r1, r2, n, shape = 'pointed' } = o;
  const a0 = o.a0 ?? -Math.PI / 2;
  const full = o.a1 === undefined;
  const a1 = o.a1 ?? a0 + TAU;
  const s = (a1 - a0) / n;
  const h = r2 - r1;
  const base = (k: number) => a0 + k * s;
  const tipA = (k: number) => base(k) + s / 2;
  const P = (r: number, a: number) => polar(cx, cy, r, a);

  // left side of petal k: base(k)@r1 → tip
  const leftSide = (k: number): Edge => {
    const b = base(k);
    const m = tipA(k);
    return shape === 'round'
      ? cubic(P(r1, b), P(r1 + h * 0.55, b + s * 0.02), P(r2, m - s * 0.32), P(r2, m))
      : cubic(P(r1, b), P(r1 + h * 0.45, b + s * 0.08), P(r2 - h * 0.28, m - s * 0.1), P(r2, m));
  };
  // right side of petal k: base(k+1)@r1 → tip (mirror)
  const rightSide = (k: number): Edge => {
    const b = base(k + 1);
    const m = tipA(k);
    return shape === 'round'
      ? cubic(P(r1, b), P(r1 + h * 0.55, b - s * 0.02), P(r2, m + s * 0.32), P(r2, m))
      : cubic(P(r1, b), P(r1 + h * 0.45, b - s * 0.08), P(r2 - h * 0.28, m + s * 0.1), P(r2, m));
  };

  const out: Region[] = [];
  const cAt = (r: number, a: number) => P(r, a);
  for (let k = 0; k < n; k++) {
    out.push({
      id: `${id}p${k}`,
      d: closed(leftSide(k), rev(rightSide(k)), arc(cx, cy, r1, base(k + 1), base(k))),
      c: cAt(r1 + h * 0.45, tipA(k)),
      g: `${id}p`,
    });
  }
  // valleys
  for (let k = 0; k < n; k++) {
    if (full || k < n - 1) {
      out.push({
        id: `${id}v${k}`,
        d: closed(rev(rightSide(k)), leftSide((k + 1) % n), arc(cx, cy, r2, tipA(k + 1), tipA(k))),
        c: cAt(r1 + h * 0.8, base(k + 1)),
        g: `${id}v`,
      });
    }
  }
  if (!full) {
    out.push({
      id: `${id}vs`,
      d: closed(line(P(r1, a0), P(r2, a0)), arc(cx, cy, r2, a0, tipA(0)), rev(leftSide(0))),
      c: cAt(r1 + h * 0.8, a0 + s * 0.15),
      g: `${id}v`,
    });
    out.push({
      id: `${id}ve`,
      d: closed(rev(rightSide(n - 1)), line(P(r1, a1), P(r2, a1)), arc(cx, cy, r2, a1, tipA(n - 1))),
      c: cAt(r1 + h * 0.8, a1 - s * 0.15),
      g: `${id}v`,
    });
  }
  if (o.dots) {
    for (let k = 0; k < n; k++) {
      const rr = Math.min(h * 0.12, r1 * s * 0.16 + h * 0.03);
      const c = P(r1 + h * 0.42, tipA(k));
      out.push({ id: `${id}d${k}`, d: circle(c[0], c[1], rr), c, g: `${id}d` });
    }
  }
  return out;
}

/** A band r1..r2 cut into n annular sectors. */
export function sectorRing(o: Omit<RingOpts, 'shape'>): Region[] {
  const { id, cx, cy, r1, r2, n } = o;
  const a0 = o.a0 ?? -Math.PI / 2;
  const a1 = o.a1 ?? a0 + TAU;
  const s = (a1 - a0) / n;
  const out: Region[] = [];
  for (let k = 0; k < n; k++) {
    const b = a0 + k * s;
    const e = b + s;
    out.push({
      id: `${id}s${k}`,
      d: closed(
        arc(cx, cy, r1, b, e),
        line(polar(cx, cy, r1, e), polar(cx, cy, r2, e)),
        arc(cx, cy, r2, e, b),
      ),
      c: polar(cx, cy, (r1 + r2) / 2, b + s / 2),
      g: `${id}${k % 2 ? 'b' : 'a'}`,
    });
    if (o.dots) {
      const c = polar(cx, cy, (r1 + r2) / 2, b + s / 2);
      const rr = Math.min((r2 - r1) * 0.28, r1 * s * 0.28);
      out.push({ id: `${id}d${k}`, d: circle(c[0], c[1], rr), c, g: `${id}d` });
    }
  }
  return out;
}

/** Simple seeded random so generated pages are identical on every load. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Assign inspiration colours by region tag, cycling palette entries. */
export function colorByGroup(regions: Region[], map: Record<string, string | string[]>, fallback?: string) {
  const out: Record<string, string> = {};
  const counters: Record<string, number> = {};
  for (const r of regions) {
    const key = r.g ?? '';
    const v = map[key] ?? fallback;
    if (!v) continue;
    if (Array.isArray(v)) {
      const i = (counters[key] = (counters[key] ?? -1) + 1);
      out[r.id] = v[i % v.length];
    } else out[r.id] = v;
  }
  return out;
}
