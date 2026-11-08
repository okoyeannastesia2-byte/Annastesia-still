import type { Page, Region } from './types';
import { arc, circle, closed, colorByGroup, line, petalRing, poly, rect, rev, roundedPoly, sample, sectorRing, type Pt } from './geometry';

// ---- A tiny rounded block alphabet (100 units tall) ----
type Glyph = { w: number; outer: Pt[]; holes?: Pt[][] };
export const GLYPHS: Record<string, Glyph> = {
  B: {
    w: 70,
    outer: [[0, 0], [48, 0], [64, 8], [68, 25], [60, 46], [70, 60], [70, 82], [58, 98], [48, 100], [0, 100]],
    holes: [
      [[22, 19], [42, 19], [46, 28], [42, 38], [22, 38]],
      [[22, 58], [46, 58], [50, 69], [46, 81], [22, 81]],
    ],
  },
  R: {
    w: 70,
    outer: [[0, 0], [46, 0], [66, 10], [70, 30], [64, 48], [52, 56], [70, 100], [46, 100], [32, 62], [22, 62], [22, 100], [0, 100]],
    holes: [[[22, 19], [42, 19], [48, 30], [42, 42], [22, 42]]],
  },
  E: { w: 66, outer: [[0, 0], [66, 0], [66, 22], [22, 22], [22, 39], [56, 39], [56, 61], [22, 61], [22, 78], [66, 78], [66, 100], [0, 100]] },
  A: {
    w: 70,
    outer: [[0, 100], [24, 0], [46, 0], [70, 100], [48, 100], [43, 80], [27, 80], [22, 100]],
    holes: [[[27, 64], [43, 64], [35, 32]]],
  },
  T: { w: 70, outer: [[0, 0], [70, 0], [70, 22], [46, 22], [46, 100], [24, 100], [24, 22], [0, 22]] },
  H: { w: 70, outer: [[0, 0], [22, 0], [22, 39], [48, 39], [48, 0], [70, 0], [70, 100], [48, 100], [48, 61], [22, 61], [22, 100], [0, 100]] },
};

export function lettering(word: string, x: number, y: number, scale: number, idPrefix = 'L', gap = 14): Region[] {
  const out: Region[] = [];
  let cursor = x;
  [...word].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) {
      cursor += 40 * scale;
      return;
    }
    const tf = (p: Pt): Pt => [cursor + p[0] * scale, y + p[1] * scale];
    out.push({ id: `${idPrefix}${i}`, d: roundedPoly(g.outer.map(tf), 6 * scale), c: tf([g.w / 2, 50]), g: 'letter' });
    g.holes?.forEach((h, j) => {
      const pts = h.map(tf);
      const c: Pt = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
      out.push({ id: `${idPrefix}${i}h${j}`, d: roundedPoly(pts, 4 * scale), c, g: 'hole' });
    });
    cursor += (g.w + gap) * scale;
  });
  return out;
}

export function wordWidth(word: string, gap = 14) {
  return [...word].reduce((s, ch, i) => s + (GLYPHS[ch]?.w ?? 40) + (i ? gap : 0), 0);
}

// ---- Page ----
const sx = 500;
const sy = 520; // the sun sits on this horizon line
const regions: Region[] = [{ id: 'sky', d: rect(0, 0, 1000, sy), c: [60, 60], g: 'sky' }];

regions.push({
  id: 'sun',
  d: closed(arc(sx, sy, 70, Math.PI, Math.PI * 2), line([sx + 70, sy], [sx - 70, sy])),
  c: [sx, sy - 30],
  g: 'sun',
});
const half = { cx: sx, cy: sy, a0: Math.PI, a1: Math.PI * 2 };
regions.push(...petalRing({ id: 's1', ...half, r1: 70, r2: 150, n: 6, shape: 'round' }));
regions.push(...sectorRing({ id: 's2', ...half, r1: 150, r2: 178, n: 14 }));
regions.push(...petalRing({ id: 's3', ...half, r1: 178, r2: 280, n: 10, shape: 'pointed', dots: true }));
regions.push(...petalRing({ id: 's4', ...half, r1: 280, r2: 330, n: 16, shape: 'round' }));

[[100, 100, 16], [225, 270, 12], [880, 110, 18], [790, 300, 12], [110, 420, 14], [890, 430, 14], [330, 90, 9], [660, 80, 10]].forEach(
  ([x, y, r], i) => regions.push({ id: `star${i}`, d: circle(x, y, r), c: [x, y], g: 'star' }),
);

// Waves
const wave = (y0: number, amp: number, ph: number) => (x: number) => y0 + amp * Math.sin((2 * Math.PI * x) / 250 + ph);
const curves = [wave(752, 12, 0), wave(812, 15, 1.2), wave(872, 14, 2.3), wave(932, 12, 3.1)];
const curveEdge = (f: (x: number) => number) => sample((t) => [t * 1000, f(t * 1000)], 100);

// Band holding the word
regions.push({
  id: 'band',
  d: closed(poly([[0, sy], [1000, sy], [1000, curves[0](1000)]]), rev(curveEdge(curves[0])), line([0, curves[0](0)], [0, sy])),
  c: [40, 640],
  g: 'band',
});
const word = 'BREATHE';
const scale = 1.45;
const ww = wordWidth(word) * scale;
regions.push(...lettering(word, (1000 - ww) / 2, 560, scale));

for (let i = 0; i < curves.length; i++) {
  const top = curveEdge(curves[i]);
  const bottomF = curves[i + 1];
  const d = bottomF
    ? closed(top, line([1000, curves[i](1000)], [1000, bottomF(1000)]), rev(curveEdge(bottomF)), line([0, bottomF(0)], [0, curves[i](0)]))
    : closed(top, poly([[1000, curves[i](1000)], [1000, 1000], [0, 1000], [0, curves[i](0)]]));
  regions.push({ id: `wave${i}`, d, c: [500, curves[i](500) + 25], g: `wave${i}` });
  if (bottomF) {
    for (let x = 62 + (i % 2) * 62; x < 960; x += 125) {
      const yMid = (curves[i](x) + bottomF(x)) / 2;
      const gap = bottomF(x) - curves[i](x);
      regions.push({ id: `bub${i}-${x}`, d: circle(x, yMid, Math.min(9, gap * 0.22)), c: [x, yMid], g: 'bubble' });
    }
  }
}

const inspiration = colorByGroup(regions, {
  sky: '#FCE8D5',
  sun: '#F27059',
  s1p: '#F7B267',
  s1v: '#FFCDB2',
  s2a: '#F4845F',
  s2b: '#F9D5A7',
  s3p: '#E56B6F',
  s3v: '#FCE8D5',
  s3d: '#FFE29A',
  s4p: '#B56576',
  s4v: '#F9D5A7',
  star: '#F7B267',
  band: '#FAEDCD',
  letter: ['#6D597A', '#B56576', '#E56B6F', '#F4845F', '#F79D65', '#E56B6F', '#B56576'],
  hole: '#FAEDCD',
  wave0: '#83C5BE',
  wave1: '#5E9FA3',
  wave2: '#006D77',
  wave3: '#3D5A80',
  bubble: '#EDF6F9',
});

export const breathe: Page = {
  id: 'breathe',
  title: 'Breathe',
  category: 'Affirmations',
  difficulty: 'medium',
  w: 1000,
  h: 1000,
  regions,
  inspiration,
};
