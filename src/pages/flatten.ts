import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping';
import type { Region } from './types';

type P = [number, number];

/** Sample an (absolute-command) SVG path into closed polygon rings. */
export function pathToRings(d: string, step = 4): P[][] {
  const tokens = d.match(/[MLHVCQAZmlhvcqaz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const rings: P[][] = [];
  let ring: P[] = [];
  let cur: P = [0, 0];
  let start: P = [0, 0];
  let i = 0;
  let cmd = '';
  const num = () => parseFloat(tokens[i++]);
  const push = (p: P) => {
    ring.push(p);
    cur = p;
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M': {
        if (ring.length > 2) rings.push(ring);
        ring = [];
        const p: P = [num(), num()];
        start = p;
        push(p);
        cmd = 'L';
        break;
      }
      case 'L':
        push([num(), num()]);
        break;
      case 'H':
        push([num(), cur[1]]);
        break;
      case 'V':
        push([cur[0], num()]);
        break;
      case 'C': {
        const p0 = cur;
        const c1: P = [num(), num()];
        const c2: P = [num(), num()];
        const p3: P = [num(), num()];
        const len = dist(p0, c1) + dist(c1, c2) + dist(c2, p3);
        const n = Math.max(3, Math.ceil(len / step));
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          const u = 1 - t;
          push([
            u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
          ]);
        }
        break;
      }
      case 'Q': {
        const p0 = cur;
        const c: P = [num(), num()];
        const p2: P = [num(), num()];
        const n = Math.max(2, Math.ceil((dist(p0, c) + dist(c, p2)) / step));
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          const u = 1 - t;
          push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]]);
        }
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rot = num();
        const large = num();
        const sweep = num();
        const p: P = [num(), num()];
        arcPoints(cur, p, rx, ry, rot, large, sweep, step).forEach(push);
        break;
      }
      case 'Z':
      case 'z':
        if (ring.length > 2) rings.push(ring);
        ring = [];
        cur = start;
        break;
      default:
        i++; // unsupported, skip
    }
  }
  if (ring.length > 2) rings.push(ring);
  return rings;
}

const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function arcPoints(p0: P, p1: P, rx: number, ry: number, rotDeg: number, large: number, sweep: number, step: number): P[] {
  // SVG spec F.6.5 endpoint → centre parameterisation
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2;
  const dy = (p0[1] - p1[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cxp = (co * rx * y1) / ry;
  const cyp = (-co * ry * x1) / rx;
  const cx = cos * cxp - sin * cyp + (p0[0] + p1[0]) / 2;
  const cy = sin * cxp + cos * cyp + (p0[1] + p1[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(2, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / step));
  const out: P[] = [];
  for (let k = 1; k <= n; k++) {
    const t = t1 + (dt * k) / n;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    out.push([cos * x - sin * y + cx, sin * x + cos * y + cy]);
  }
  out[out.length - 1] = p1;
  return out;
}

const closeRing = (r: P[]): Ring => {
  const a = r[0];
  const b = r[r.length - 1];
  return (a[0] === b[0] && a[1] === b[1] ? r : [...r, a]) as Ring;
};

/** A path (even-odd) as a polygon geometry. */
export function toGeom(d: string): MultiPolygon {
  const rings = pathToRings(d).map(closeRing);
  if (!rings.length) return [];
  if (rings.length === 1) return polygonClipping.union([rings[0]] as Polygon);
  return polygonClipping.xor(...(rings.map((r) => [r]) as [Polygon, ...Polygon[]]));
}

const r2 = (v: number) => Math.round(v * 10) / 10;
function simplify(pts: P[], tol = 0.25): P[] {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1;
    let bestD = tol;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
export function toPath(g: MultiPolygon): string {
  let d = '';
  for (const poly of g) {
    for (const ring of poly) {
      const pts = simplify(ring.slice(0, -1) as P[]);
      if (pts.length < 3) continue;
      d += 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';
    }
  }
  return d;
}

export function area(g: MultiPolygon) {
  let a = 0;
  for (const poly of g) {
    poly.forEach((ring, i) => {
      let s = 0;
      for (let k = 0; k < ring.length - 1; k++) s += ring[k][0] * ring[k + 1][1] - ring[k + 1][0] * ring[k][1];
      a += (i === 0 ? 1 : -1) * Math.abs(s / 2);
    });
  }
  return a;
}

function centroid(g: MultiPolygon): [number, number] | undefined {
  let best: Ring | null = null;
  let bestA = 0;
  for (const poly of g) {
    let s = 0;
    const r = poly[0];
    for (let k = 0; k < r.length - 1; k++) s += r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1];
    if (Math.abs(s) > bestA) {
      bestA = Math.abs(s);
      best = r;
    }
  }
  if (!best) return undefined;
  let x = 0;
  let y = 0;
  for (const p of best) {
    x += p[0];
    y += p[1];
  }
  return [x / best.length, y / best.length];
}

/** Drop slivers produced by numerical noise. */
function clean(g: MultiPolygon, min = 6): MultiPolygon {
  return g.filter((poly) => area([poly]) > min);
}

// ---- boolean helpers for authors (inputs and outputs are path strings) ----
export const union = (...ds: string[]) => toPath(polygonClipping.union(...(ds.map(toGeom) as [MultiPolygon, ...MultiPolygon[]])));
export const subtract = (a: string, ...b: string[]) => toPath(polygonClipping.difference(toGeom(a), ...b.map(toGeom)));
export const intersect = (a: string, b: string) => toPath(polygonClipping.intersection(toGeom(a), toGeom(b)));

/**
 * Turn painter-ordered, freely overlapping shapes (back → front) into a clean set of
 * non-overlapping regions, each clipped to the page. What you see is what you fill.
 */
export function flatten(regions: Region[], w: number, h: number): Region[] {
  const page: MultiPolygon = [[[[0, 0], [w, 0], [w, h], [0, h], [0, 0]]]];
  const geoms = regions.map((r) => polygonClipping.intersection(toGeom(r.d), page));
  const boxes = geoms.map(bbox);
  const out: Region[] = [];
  for (let i = 0; i < regions.length; i++) {
    const full = geoms[i];
    if (!full.length) continue;
    // only shapes drawn later AND overlapping this one's box can hide part of it
    const over: MultiPolygon[] = [];
    for (let j = i + 1; j < regions.length; j++) if (geoms[j].length && boxesOverlap(boxes[i], boxes[j])) over.push(geoms[j]);
    const vis = clean(over.length ? polygonClipping.difference(full, ...over) : full);
    if (!vis.length) continue;
    const r = regions[i];
    out.push({ ...r, d: toPath(vis), c: r.c && insideAny(vis, r.c) ? r.c : centroid(vis) });
  }
  return out;
}

type Box = [number, number, number, number];
function bbox(g: MultiPolygon): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of g) for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
const boxesOverlap = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

function insideAny(g: MultiPolygon, p: [number, number]) {
  for (const poly of g) {
    let inside = false;
    poly.forEach((ring) => {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
      }
    });
    if (inside) return true;
  }
  return false;
}
