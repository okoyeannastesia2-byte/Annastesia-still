import type { Page, Region } from './types';
import { arc, circle, closed, colorByGroup, line, petalRing, rect, sectorRing } from './geometry';

const cx = 500;
const cy = 500;

const regions: Region[] = [
  { id: 'bg', d: rect(0, 0, 1000, 1000), c: [40, 500], g: 'bg' },
  { id: 'c', d: circle(cx, cy, 30), c: [cx, cy], g: 'c' },
  ...petalRing({ id: 'r1', cx, cy, r1: 30, r2: 90, n: 8, shape: 'round' }),
  ...sectorRing({ id: 'r2', cx, cy, r1: 90, r2: 112, n: 24 }),
  ...petalRing({ id: 'r3', cx, cy, r1: 112, r2: 200, n: 12, shape: 'pointed', dots: true }),
  ...petalRing({ id: 'r4', cx, cy, r1: 200, r2: 255, n: 24, shape: 'round' }),
  ...sectorRing({ id: 'r5', cx, cy, r1: 255, r2: 285, n: 36 }),
  ...petalRing({ id: 'r6', cx, cy, r1: 285, r2: 395, n: 16, shape: 'pointed', dots: true }),
  ...petalRing({ id: 'r7', cx, cy, r1: 395, r2: 450, n: 32, shape: 'round' }),
];

// Little corner fans
const corners: [number, number, number][] = [
  [0, 0, 0],
  [1000, 0, Math.PI / 2],
  [1000, 1000, Math.PI],
  [0, 1000, (3 * Math.PI) / 2],
];
corners.forEach(([x, y, a0], i) => {
  const a1 = a0 + Math.PI / 2;
  regions.push({
    id: `k${i}c`,
    d: closed(line([x, y], [x + 50 * Math.cos(a0), y + 50 * Math.sin(a0)]), arc(x, y, 50, a0, a1)),
    c: [x + 25 * Math.cos(a0 + Math.PI / 4), y + 25 * Math.sin(a0 + Math.PI / 4)],
    g: 'kc',
  });
  regions.push(...petalRing({ id: `k${i}`, cx: x, cy: y, r1: 50, r2: 140, n: 4, a0, a1, shape: 'round' }));
});

const inspiration = colorByGroup(regions, {
  bg: '#FCE8D5',
  c: '#F27059',
  r1p: '#F7B267',
  r1v: '#FFCDB2',
  r2a: '#E56B6F',
  r2b: '#F9D5A7',
  r3p: '#F4845F',
  r3v: '#FFCDB2',
  r3d: '#6D597A',
  r4p: '#B56576',
  r4v: '#F9D5A7',
  r5a: '#355070',
  r5b: '#EAAC8B',
  r6p: '#F79D65',
  r6v: '#FCE8D5',
  r6d: '#E56B6F',
  r7p: '#6D597A',
  r7v: '#E5989B',
  kc: '#F27059',
  k0p: '#F7B267', k1p: '#F7B267', k2p: '#F7B267', k3p: '#F7B267',
  k0v: '#EAAC8B', k1v: '#EAAC8B', k2v: '#EAAC8B', k3v: '#EAAC8B',
});

// "Started for me": the right half of the mandala comes coloured.
const preFill: Record<string, string> = {};
for (const r of regions) {
  if (r.id === 'bg' || r.id === 'c' || r.id.startsWith('k')) continue;
  if (r.c && r.c[0] > cx + 1) preFill[r.id] = inspiration[r.id];
}

export const mandalaLotus: Page = {
  id: 'mandala-lotus',
  title: 'Sunset Lotus Mandala',
  category: 'Mandalas & geometric',
  difficulty: 'detailed',
  w: 1000,
  h: 1000,
  regions,
  preFill,
  inspiration,
};
