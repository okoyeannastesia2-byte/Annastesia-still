import { getStroke } from 'perfect-freehand';

export interface Stroke {
  id: string;
  color: string;
  size: number;
  opacity: number;
  /** flat list: x, y, pressure, x, y, pressure … in page units */
  pts: number[];
  /** region this stroke is clipped to ("stay inside the lines"); undefined = free */
  region?: string;
  /** true if real pressure was available (Apple Pencil) */
  pen: boolean;
  /** pieces left over after erasing keep blunt ends */
  capStart?: boolean;
  capEnd?: boolean;
}

const cache = new WeakMap<Stroke, string>();

export function strokeOutline(pts: number[], size: number, pen: boolean, last = true, capStart = false, capEnd = false): string {
  const input: [number, number, number][] = [];
  for (let i = 0; i < pts.length; i += 3) input.push([pts[i], pts[i + 1], pts[i + 2]]);
  const outline = getStroke(input, {
    size,
    thinning: pen ? 0.7 : 0.35,
    smoothing: 0.55,
    streamline: 0.4,
    simulatePressure: !pen,
    last,
    start: { cap: true, taper: capStart ? 0 : size * 0.6 },
    end: { cap: true, taper: capEnd ? 0 : size * 0.6 },
  });
  return svgPathFromOutline(outline);
}

export function strokePath(s: Stroke): string {
  let d = cache.get(s);
  if (d === undefined) {
    d = strokeOutline(s.pts, s.size, s.pen, true, s.capStart, s.capEnd);
    cache.set(s, d);
  }
  return d;
}

function svgPathFromOutline(points: number[][]): string {
  const len = points.length;
  if (len < 4) {
    if (!len) return '';
    const [x, y] = points[0];
    return `M${x} ${y}h0.1Z`;
  }
  const f = (n: number) => n.toFixed(1);
  let a = points[0];
  let b = points[1];
  const c = points[2];
  let d = `M${f(a[0])},${f(a[1])} Q${f(b[0])},${f(b[1])} ${f((b[0] + c[0]) / 2)},${f((b[1] + c[1]) / 2)} T`;
  for (let i = 2; i < len - 1; i++) {
    a = points[i];
    b = points[i + 1];
    d += `${f((a[0] + b[0]) / 2)},${f((a[1] + b[1]) / 2)} `;
  }
  return d + 'Z';
}

/** Average pressure → opacity, so a light touch gives a softer, paler stroke. */
export function pencilOpacity(pts: number[], pen: boolean, marker: boolean): number {
  if (marker) return 1;
  if (!pen) return 0.85;
  let sum = 0;
  let n = 0;
  for (let i = 2; i < pts.length; i += 3) {
    sum += pts[i];
    n++;
  }
  const p = n ? sum / n : 0.5;
  return Math.min(0.95, 0.45 + p * 0.7);
}

/**
 * Erase the part of each stroke that lies within `radius` of the segment a→b.
 * Strokes that are untouched are returned as the same objects.
 */
export function eraseStrokes(strokes: Stroke[], a: [number, number], b: [number, number], radius: number): Stroke[] {
  let changed = false;
  const out: Stroke[] = [];
  const minX = Math.min(a[0], b[0]) - radius;
  const maxX = Math.max(a[0], b[0]) + radius;
  const minY = Math.min(a[1], b[1]) - radius;
  const maxY = Math.max(a[1], b[1]) + radius;
  for (const s of strokes) {
    const r = radius + s.size * 0.4;
    let hit = false;
    const keep: boolean[] = [];
    for (let i = 0; i < s.pts.length; i += 3) {
      const x = s.pts[i];
      const y = s.pts[i + 1];
      let k = true;
      if (x > minX - s.size && x < maxX + s.size && y > minY - s.size && y < maxY + s.size) {
        if (distToSeg(x, y, a, b) < r) {
          k = false;
          hit = true;
        }
      }
      keep.push(k);
    }
    if (!hit) {
      out.push(s);
      continue;
    }
    changed = true;
    let cur: number[] = [];
    let piece = 0;
    const flush = (endCut: boolean) => {
      if (cur.length >= 6) {
        out.push({ ...s, id: `${s.id}.${piece++}`, pts: cur, capStart: piece > 1 || s.capStart, capEnd: endCut || s.capEnd });
      }
      cur = [];
    };
    keep.forEach((k, idx) => {
      if (k) cur.push(s.pts[idx * 3], s.pts[idx * 3 + 1], s.pts[idx * 3 + 2]);
      else if (cur.length) flush(true);
    });
    // a piece that starts after a cut needs a blunt start
    if (cur.length) flush(false);
    // fix capStart for first piece: if the original stroke began with an erased point
    if (!keep[0]) {
      const firstPiece = out.find((p) => p.id === `${s.id}.0`);
      if (firstPiece) firstPiece.capStart = true;
    }
  }
  return changed ? out : strokes;
}

function distToSeg(x: number, y: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((x - a[0]) * dx + (y - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}
