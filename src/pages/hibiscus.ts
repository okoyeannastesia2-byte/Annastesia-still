import type { Page, Region } from './types';
import { circle, closed, colorByGroup, leaf, poly, polar, rect, rev, ribbon, sample, type Edge, type Pt } from './geometry';

const cx = 500;
const cy = 400;
const r0 = 36; // centre disk
const rt = 135; // throat line
const Rb = 255; // notch radius between petals
const R0 = 330; // petal tip radius
const N = 5;
const D = (Math.PI * 2) / N;
const th = (k: number) => -Math.PI / 2 - Math.PI / 5 + k * D;
const bend = (r: number) => 0.1 * Math.sin((Math.PI * (r - r0)) / (Rb - r0));
const P = (r: number, a: number): Pt => polar(cx, cy, r, a);

// Radial edge k, split at the throat radius.
const edgeA = (k: number): Edge => sample((t) => { const r = r0 + (rt - r0) * t; return P(r, th(k) + bend(r)); }, 24);
const edgeB = (k: number): Edge => sample((t) => { const r = rt + (Rb - rt) * t; return P(r, th(k) + bend(r)); }, 30);
const outer = (k: number): Edge =>
  sample((t) => {
    const r = Rb + (R0 - Rb) * Math.pow(Math.sin(Math.PI * t), 0.7) + 9 * Math.sin(6 * Math.PI * t) * Math.sin(Math.PI * t);
    return P(r, th(k) + t * D);
  }, 90);
const throat = (k: number): Edge =>
  sample((t) => P(rt + 28 * Math.sin(Math.PI * t) + 6 * Math.sin(4 * Math.PI * t), th(k) + bend(rt) + t * D), 40);
const inner = (k: number): Edge => sample((t) => P(r0, th(k) + t * D), 16);

const regions: Region[] = [{ id: 'bg', d: rect(0, 0, 1000, 1000), c: [60, 60], g: 'bg' }];

// Background sparkles (kept clear of the flower and leaves)
const dots: [number, number, number][] = [
  [110, 110, 30], [880, 140, 22], [870, 520, 20], [125, 500, 18], [150, 880, 26], [890, 900, 18], [300, 70, 12], [720, 60, 14],
];
dots.forEach(([x, y, r], i) => regions.push({ id: `dot${i}`, d: circle(x, y, r), c: [x, y], g: 'dot' }));

const TOP = 0; // the top petal carries the stamen and is not split
for (let k = 0; k < N; k++) {
  const kn = (k + 1) % N;
  if (k === TOP) {
    regions.push({
      id: `pet${k}`,
      d: closed(edgeA(k), edgeB(k), outer(k), rev(edgeB(kn)), rev(edgeA(kn)), rev(inner(k))),
      c: P(220, th(k) + D / 2),
      g: 'petal',
    });
  } else {
    regions.push({
      id: `thr${k}`,
      d: closed(edgeA(k), throat(k), rev(edgeA(kn)), rev(inner(k))),
      c: P(90, th(k) + D / 2),
      g: 'throat',
    });
    regions.push({
      id: `pet${k}`,
      d: closed(edgeB(k), outer(k), rev(edgeB(kn)), rev(throat(k))),
      c: P(220, th(k) + D / 2),
      g: 'petal',
    });
  }
}
// centre disk — exactly the inner arcs of the petals
const disk: Pt[] = [];
for (let k = 0; k < N; k++) {
  const e = inner(k);
  disk.push(e.from, ...e.segs.map((s) => s.to).slice(0, -1));
}
regions.push({ id: 'centre', d: closed(poly(disk)), c: [cx, cy], g: 'centre' });

// Stamen inside the top petal
const sa = -Math.PI / 2; // straight up
const stem = (t: number): Pt => {
  const r = r0 + 14 + (225 - r0 - 14) * t;
  return P(r, sa + 0.12 * Math.sin(Math.PI * t * 0.9));
};
regions.push({ id: 'stamen', d: ribbon(stem, (t) => 14 - 5 * t, 30), c: stem(0.5), g: 'stamen' });
const tip = stem(1);
[[-26, -18], [0, -30], [26, -16], [-14, -42], [16, -44]].forEach(([dx, dy], i) => {
  const x = tip[0] + dx;
  const y = tip[1] + dy;
  regions.push({ id: `pollen${i}`, d: circle(x, y, 9), c: [x, y], g: 'pollen' });
});

// Stem and leaves
const stalk = (t: number): Pt => [500 + 20 * Math.sin(Math.PI * t * 0.8), 400 + Rb + 8 + (985 - 400 - Rb - 8) * t];
regions.push({ id: 'stalk', d: ribbon(stalk, () => 18, 30), c: stalk(0.5), g: 'stalk' });
regions.push(...leaf('leafL', [508, 820], [225, 720], 120, 0.06));
regions.push(...leaf('leafR', [531, 900], [800, 790], 110, -0.06));

const inspiration = colorByGroup(regions, {
  bg: '#FAEDCD',
  dot: ['#FFC857', '#F4D6CC', '#E9EDC9'],
  throat: '#9E2A2B',
  petal: ['#F28F3B', '#E07A5F', '#F28F3B', '#E07A5F', '#FFB4A2'],
  centre: '#FFE29A',
  stamen: '#FFC857',
  pollen: '#F6AE2D',
  stalk: '#606C38',
  leaf: '#8A9A5B',
  leaf2: '#588157',
});

export const hibiscus: Page = {
  id: 'hibiscus',
  title: 'Hibiscus in Bloom',
  category: 'Florals & botanicals',
  difficulty: 'easy',
  w: 1000,
  h: 1000,
  regions,
  inspiration,
};
