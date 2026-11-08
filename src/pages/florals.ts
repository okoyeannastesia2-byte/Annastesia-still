import { circle, ellipse, leaf, rect, ribbon, sectorRing, type Pt } from './geometry';
import { layeredPage } from './define';
import { Layers, petal, polyD, roundRect, triangleRow, curve } from './shapes';
import { intersect } from './flatten';
import type { Region } from './types';

const addRegions = (L: Layers, rs: Region[]) => rs.forEach((r) => L.regions.push(r));

/** Leaf halves plus a few vein lines clipped inside each half. */
function veinedLeaf(L: Layers, id: string, base: Pt, tip: Pt, width: number, bend = 0, g = 'leaf') {
  const rs = leaf(id, base, tip, width, bend, g);
  addRegions(L, rs);
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const mid = (t: number): Pt => [base[0] + dx * t + nx * bend * Math.sin(Math.PI * t) * len, base[1] + dy * t + ny * bend * Math.sin(Math.PI * t) * len];
  for (const t of [0.25, 0.42, 0.59, 0.76]) {
    const p = mid(t);
    const q = mid(t + 0.12);
    for (const side of [1, -1]) {
      const e: Pt = [q[0] + nx * side * width * 0.45, q[1] + ny * side * width * 0.45];
      L.line(curve([p, [(p[0] + e[0]) / 2 + (q[0] - p[0]) * 0.2, (p[1] + e[1]) / 2 + (q[1] - p[1]) * 0.2], e]), side > 0 ? `${id}a` : `${id}b`);
    }
  }
}

export const sunflower = layeredPage({ id: 'sunflower', title: 'Sunflower Morning', category: 'Florals & botanicals', difficulty: 'medium' }, () => {
  const L = new Layers();
  const cx = 500;
  const cy = 380;
  L.add('bg', rect(0, 0, 1000, 1000), [30, 30]);
  for (const [x, y, r] of [[90, 90, 26], [910, 120, 20], [100, 560, 16], [905, 560, 22], [880, 880, 18], [130, 900, 24]]) L.dot('dot', x, y, r);
  L.add('stem', ribbon((t) => [cx + 18 * Math.sin(t * 2), 640 + 360 * t], () => 26, 30));
  veinedLeaf(L, 'lfL', [cx + 4, 830], [170, 690], 150, 0.05);
  veinedLeaf(L, 'lfR', [cx + 30, 900], [850, 760], 140, -0.05);
  const n = 16;
  for (let i = 0; i < n; i++) L.add('petalB', petal(cx, cy, -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n, 90, 320, 40, 0.4));
  for (let i = 0; i < n; i++) L.add('petalF', petal(cx, cy, -Math.PI / 2 + (i * 2 * Math.PI) / n, 90, 275, 36, 0.4));
  L.add('disk', circle(cx, cy, 112), [cx, cy - 100]);
  addRegions(L, sectorRing({ id: 'sd2', cx, cy, r1: 80, r2: 112, n: 20 }));
  addRegions(L, sectorRing({ id: 'sd1', cx, cy, r1: 46, r2: 80, n: 12, a0: 0.2 }));
  L.add('core', circle(cx, cy, 46), [cx, cy]);
  return {
    layers: L,
    inspiration: {
      bg: '#E0F7FA', dot: '#FFF3B0', stem: '#606C38', leaf: '#8A9A5B', leaf2: '#588157',
      petalB: '#F6AE2D', petalF: '#FFC857', disk: '#7F5539', sd2a: '#9C4221', sd2b: '#7F5539', sd1a: '#B08968', sd1b: '#8D5524', core: '#5B2A1F',
    },
  };
});

export const tropicalLeaves = layeredPage({ id: 'tropical-leaves', title: 'Tropical Leaves', category: 'Florals & botanicals', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [20, 20]);
  const root: Pt = [500, 1010];
  const leaves: [Pt, Pt, number, number][] = [
    [[480, 600], [520, 70], 190, 0.03],
    [[450, 640], [250, 140], 170, 0.06],
    [[540, 640], [760, 150], 170, -0.06],
    [[420, 720], [90, 360], 170, 0.05],
    [[580, 720], [920, 380], 170, -0.05],
    [[440, 820], [130, 700], 140, 0.04],
    [[560, 820], [880, 690], 140, -0.04],
  ];
  leaves.forEach(([base, tip, w, bend], i) => {
    L.add('stem', ribbon((t) => [root[0] + (base[0] - root[0]) * t, root[1] + (base[1] - root[1]) * t - 30 * Math.sin(Math.PI * t)], (t) => 16 - 6 * t, 20));
    veinedLeaf(L, `lf${i}`, base, tip, w, bend, i % 2 ? 'leaf' : 'leafD');
  });
  // berries
  for (const [x, y] of [[500, 860], [470, 890], [530, 892]]) L.dot('berry', x, y, 17);
  return {
    layers: L,
    inspiration: { bg: '#FAEDCD', stem: '#3A5A40', leaf: '#A3B18A', leaf2: '#588157', leafD: '#588157', leafD2: '#3A5A40', berry: '#E07A5F' },
  };
});

export const pottedPlant = layeredPage({ id: 'potted-plant', title: 'Potted Plant', category: 'Florals & botanicals', difficulty: 'easy' }, () => {
  const L = new Layers();
  L.add('wall', rect(0, 0, 1000, 840), [30, 30]);
  L.add('table', rect(0, 840, 1000, 160), [30, 960]);
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 6; i++) {
      const x = 90 + i * 164 + (j % 2) * 82;
      const y = 90 + j * 170;
      if (x > 980) continue;
      L.add('diamond', polyD([[x, y - 22], [x + 16, y], [x, y + 22], [x - 16, y]]), [x, y]);
    }
  // snake-plant blades
  const base: Pt = [500, 640];
  const blades: [number, number, number][] = [
    [-2.05, 380, 46], [-1.75, 520, 52], [-1.45, 560, 50], [-1.2, 470, 48], [-2.4, 300, 40], [-0.85, 330, 42], [-1.6, 360, 40],
  ];
  blades.forEach(([a, len, w]) => {
    L.add('blade', petal(base[0], base[1], a, 0, len, w, 0.25));
    L.add('stripe', petal(base[0], base[1], a, 40, len * 0.82, w * 0.38, 0.25));
  });
  L.add('saucer', ellipse(500, 905, 230, 34), [500, 925]);
  const pot = polyD([[330, 640], [670, 640], [625, 900], [375, 900]]);
  L.add('pot', pot, [500, 860]);
  triangleRow(300, 700, 700, 770, 8).forEach((t) => L.add('tri', intersect(t, pot)));
  L.add('band', intersect(rect(300, 790, 400, 26), pot), [500, 803]);
  L.add('rim', roundRect(305, 600, 390, 64, 16), [500, 632]);
  return {
    layers: L,
    inspiration: {
      wall: '#F6E7CB', table: '#B08968', diamond: '#E6CCB2', blade: '#588157', stripe: '#A3B18A',
      saucer: '#BC6C25', pot: '#E07A5F', tri: ['#FAEDCD', '#9E2A2B'], band: '#FAEDCD', rim: '#C8553D',
    },
  };
});

