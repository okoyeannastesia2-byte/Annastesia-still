import type { Region } from './types';
import { circle, petalRing, rect, sectorRing, polar, closed, arc, line } from './geometry';
import { plainPage, pick } from './define';
import { union } from './flatten';

const cx = 500;
const cy = 500;

// ---- Simple Bloom: big, easy shapes ----
const bloomRegions: Region[] = [
  { id: 'bg', d: rect(0, 0, 1000, 1000), c: [40, 40], g: 'bg' },
  { id: 'c', d: circle(cx, cy, 70), c: [cx, cy], g: 'c' },
  ...petalRing({ id: 'a', cx, cy, r1: 70, r2: 220, n: 6, shape: 'round' }),
  ...petalRing({ id: 'b', cx, cy, r1: 220, r2: 380, n: 12, shape: 'pointed' }),
  ...petalRing({ id: 'd', cx, cy, r1: 380, r2: 450, n: 12, shape: 'round' }),
];
export const mandalaBloom = plainPage(
  { id: 'mandala-bloom', title: 'Simple Bloom', category: 'Mandalas & geometric', difficulty: 'easy' },
  bloomRegions,
  { bg: '#E2F0CB', c: '#FFEFCF', ap: '#FFD6E0', av: '#C7CEEA', bp: '#B5EAD7', bv: '#FFDAC1', dp: '#F3C4D6', dv: '#FCE1E4' },
);

// ---- Ocean Star: detailed, top half already coloured ----
const oceanRegions: Region[] = [
  { id: 'bg', d: rect(0, 0, 1000, 1000), c: [40, 40], g: 'bg' },
  { id: 'c', d: circle(cx, cy, 25), c: [cx, cy], g: 'c' },
  ...petalRing({ id: 'r1', cx, cy, r1: 25, r2: 70, n: 6, shape: 'round' }),
  ...sectorRing({ id: 'r2', cx, cy, r1: 70, r2: 92, n: 18, dots: false }),
  ...petalRing({ id: 'r3', cx, cy, r1: 92, r2: 170, n: 9, shape: 'pointed', dots: true }),
  ...petalRing({ id: 'r4', cx, cy, r1: 170, r2: 228, n: 18, shape: 'round' }),
  ...sectorRing({ id: 'r5', cx, cy, r1: 228, r2: 250, n: 36 }),
  ...petalRing({ id: 'r6', cx, cy, r1: 250, r2: 340, n: 18, shape: 'pointed', dots: true }),
  ...petalRing({ id: 'r7', cx, cy, r1: 340, r2: 382, n: 36, shape: 'round' }),
  ...petalRing({ id: 'r8', cx, cy, r1: 382, r2: 462, n: 18, shape: 'pointed', a0: -Math.PI / 2 + Math.PI / 18 }),
];
// small stars in the corners
for (const [x, y] of [[70, 70], [930, 70], [70, 930], [930, 930]]) {
  const pts = Array.from({ length: 8 }, (_, i) => polar(x, y, i % 2 ? 18 : 48, -Math.PI / 2 + (i * Math.PI) / 4));
  oceanRegions.push({ id: `st${x}${y}`, d: 'M' + pts.map((p) => p.join(' ')).join('L') + 'Z', c: [x, y], g: 'star' });
}
export const mandalaOcean = plainPage(
  { id: 'mandala-ocean', title: 'Ocean Star Mandala', category: 'Mandalas & geometric', difficulty: 'detailed' },
  oceanRegions,
  {
    bg: '#EDF6F9', c: '#006D77', r1p: '#83C5BE', r1v: '#E0F7FA', r2a: '#3D5A80', r2b: '#98C1D9', r3p: '#4DD0E1', r3v: '#CDE7E3', r3d: '#293241',
    r4p: '#26A69A', r4v: '#B2EBF2', r5a: '#006D77', r5b: '#E0F7FA', r6p: '#5E9FA3', r6v: '#EDF6F9', r6d: '#80DEEA',
    r7p: '#3D5A80', r7v: '#98C1D9', r8p: '#83C5BE', r8v: '#CDE7E3', star: '#4DD0E1',
  },
  (regions, insp) => pick(regions, insp, (r) => r.id !== 'bg' && !r.id.startsWith('st') && !!r.c && r.c[1] < cy - 1),
);

// ---- Quiet Tiles: flowing quarter-circle (Truchet) ribbons ----
// Each tile is cut by two quarter circles; pieces that meet across tile edges are
// merged, so the pattern reads as long, calm ribbons instead of a grid.
function tilePieces(x: number, y: number, s: number, flip: boolean) {
  const r = s / 2;
  const H = (yy: number, xa: number) => `h${yy},${xa}`;
  const V = (xx: number, ya: number) => `v${xx},${ya}`;
  if (!flip)
    return [
      { d: closed(line([x, y], [x + r, y]), arc(x, y, r, 0, Math.PI / 2)), keys: [H(y, x), V(x, y)], dot: [x + r * 0.32, y + r * 0.32] },
      { d: closed(line([x + s, y + s], [x + s - r, y + s]), arc(x + s, y + s, r, Math.PI, Math.PI * 1.5)), keys: [H(y + s, x + r), V(x + s, y + r)], dot: [x + s - r * 0.32, y + s - r * 0.32] },
      {
        d: closed(line([x + r, y], [x + s, y]), line([x + s, y], [x + s, y + s - r]), arc(x + s, y + s, r, -Math.PI / 2, -Math.PI), line([x + s - r, y + s], [x, y + s]), line([x, y + s], [x, y + r]), arc(x, y, r, Math.PI / 2, 0)),
        keys: [H(y, x + r), V(x + s, y), H(y + s, x), V(x, y + r)],
      },
    ];
  return [
    { d: closed(line([x + s, y], [x + s, y + r]), arc(x + s, y, r, Math.PI / 2, Math.PI)), keys: [H(y, x + r), V(x + s, y)], dot: [x + s - r * 0.32, y + r * 0.32] },
    { d: closed(line([x, y + s], [x, y + s - r]), arc(x, y + s, r, -Math.PI / 2, 0)), keys: [V(x, y + r), H(y + s, x)], dot: [x + r * 0.32, y + s - r * 0.32] },
    {
      d: closed(line([x, y], [x + s - r, y]), arc(x + s, y, r, Math.PI, Math.PI / 2), line([x + s, y + r], [x + s, y + s]), line([x + s, y + s], [x + r, y + s]), arc(x, y + s, r, 0, -Math.PI / 2), line([x, y + s - r], [x, y])),
      keys: [H(y, x), V(x, y), V(x + s, y + r), H(y + s, x + r)],
    },
  ];
}
const tileRegions: Region[] = [{ id: 'frame', d: rect(0, 0, 1000, 1000), c: [20, 20], g: 'frame' }];
{
  const s = 150;
  const x0 = 50;
  let seed = 7;
  const pieces: { d: string; keys: string[]; dot?: number[] }[] = [];
  for (let j = 0; j < 6; j++)
    for (let i = 0; i < 6; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      pieces.push(...tilePieces(x0 + i * s, x0 + j * s, s, ((seed >> 8) & 1) === 1));
    }
  // union-find over shared half-edges
  const parent = pieces.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner: Record<string, number> = {};
  pieces.forEach((p, i) =>
    p.keys.forEach((k) => {
      if (owner[k] === undefined) owner[k] = i;
      else parent[find(i)] = find(owner[k]);
    }),
  );
  const groups: Record<number, string[]> = {};
  pieces.forEach((p, i) => (groups[find(i)] ??= []).push(p.d));
  Object.values(groups).forEach((ds, n) => tileRegions.push({ id: `rb${n}`, d: ds.length > 1 ? union(...ds) : ds[0], g: 'ribbon' }));
  pieces.forEach((p, n) => p.dot && tileRegions.push({ id: `dt${n}`, d: circle(p.dot[0], p.dot[1], 10), c: p.dot as [number, number], g: 'dot' }));
}
export const quietTiles = plainPage(
  { id: 'quiet-tiles', title: 'Quiet Ribbons', category: 'Mandalas & geometric', difficulty: 'medium' },
  tileRegions,
  { frame: '#F6E7CB', ribbon: ['#A3B18A', '#FAEDCD', '#DDB892', '#E9EDC9', '#588157', '#E6CCB2', '#CCD5AE'], dot: '#BC6C25' },
);
