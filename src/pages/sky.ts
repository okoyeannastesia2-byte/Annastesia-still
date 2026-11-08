import { circle, ellipse, leaf, petalRing, rect, ribbon, polar, type Pt } from './geometry';
import { layeredPage } from './define';
import { Layers, curve, hband, petal, polyD, shape, smooth, S, star } from './shapes';
import { intersect, subtract, union } from './flatten';
import { centred } from './letters';
import type { Region } from './types';

const sparkle = (x: number, y: number, r: number) => {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) pts.push(polar(x, y, i % 2 ? r * 0.22 : r, -Math.PI / 2 + (i * Math.PI) / 4));
  return smooth(pts, 0.35);
};
const cloudBand = (y: number, seed: number) => union(...Array.from({ length: 9 }, (_, i) => circle(i * 130 - 20 + (seed % 3) * 30, y + 26 * Math.sin(i * 1.7 + seed), 90 + 20 * Math.sin(i + seed))), rect(-40, y, 1080, 400));

// ---------------- Celestial night ----------------
export const celestial = layeredPage({ id: 'celestial', title: 'Moon, Stars & Planets', category: 'Night sky', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('sky', rect(0, 0, 1000, 1000), [500, 30]);
  // constellation
  const con: Pt[] = [[640, 120], [720, 170], [800, 140], [870, 210], [840, 300]];
  L.line(curve(con.slice(0, 2)) + curve(con.slice(1, 3)) + curve(con.slice(2, 4)) + curve(con.slice(3, 5)), 'sky1');
  con.forEach(([x, y]) => L.dot('conStar', x, y, 9));
  const stars: [number, number, number][] = [[120, 90, 26], [560, 60, 18], [930, 80, 16], [60, 520, 20], [580, 500, 24], [380, 620, 16], [940, 470, 14], [620, 330, 14], [260, 700, 12]];
  stars.forEach(([x, y, r], i) => L.add(i % 2 ? 'star' : 'star2', i % 3 ? star(x, y, r, r * 0.45) : sparkle(x, y, r * 1.3), [x, y]));
  // crescent moon with craters
  const moon = subtract(circle(330, 330, 230), circle(430, 270, 200));
  L.add('moon', moon, [160, 380]);
  for (const [x, y, r] of [[170, 380, 22], [210, 470, 14], [270, 530, 18], [150, 300, 12]]) L.add('crater', intersect(circle(x, y, r), moon));
  // ringed planet
  const pc: Pt = [740, 620];
  const tilt = -0.3;
  const ring = subtract(ellipse(pc[0], pc[1], 210, 48, tilt), ellipse(pc[0], pc[1], 140, 26, tilt));
  const below = polyD([polar(pc[0], pc[1], 400, tilt), polar(pc[0], pc[1], 400, tilt + Math.PI), [pc[0] - 400, 1100], [pc[0] + 400, 1100]]);
  L.add('ringBack', ring, [pc[0] + 170, pc[1] - 50]);
  const planet = circle(pc[0], pc[1], 112);
  L.add('planet', planet, [pc[0], pc[1] - 80]);
  for (const dy of [-50, 0, 46]) L.add('pBand', intersect(hband((x) => pc[1] + dy + (x - pc[0]) * Math.tan(tilt), (x) => pc[1] + dy + 22 + (x - pc[0]) * Math.tan(tilt), 600, 880), planet));
  L.add('ringFront', intersect(ring, below), [pc[0] - 170, pc[1] + 50]);
  // small planet
  L.add('planet2', circle(170, 690, 56), [170, 660]);
  for (const [x, y, r] of [[150, 675, 12], [190, 710, 9]]) L.add('crater2', circle(x, y, r), [x, y]);
  // clouds at the bottom
  L.add('cloudB', cloudBand(880, 1), [500, 980]);
  L.add('cloudF', cloudBand(950, 4), [500, 995]);
  return {
    layers: L,
    inspiration: {
      sky: '#1C2541', conStar: '#F7F3E3', star: '#FFD166', star2: '#C3BEF7', moon: '#F7F3E3', crater: '#F2E9E4', ringBack: '#C3BEF7', planet: '#7A6C9D', pBand: '#5BC0BE',
      ringFront: '#C3BEF7', planet2: '#F28F3B', crater2: '#E07A5F', cloudB: '#4B3F72', cloudF: '#3A506B',
    },
  };
});

// ---------------- Affirmations ----------------
const addR = (L: Layers, rs: Region[]) => rs.forEach((r) => L.regions.push(r));

export const peace = layeredPage({ id: 'peace', title: 'Peace', category: 'Affirmations', difficulty: 'easy' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [20, 20]);
  for (const [x, y, a0] of [[0, 0, 0], [1000, 0, Math.PI / 2], [1000, 1000, Math.PI], [0, 1000, 1.5 * Math.PI]] as [number, number, number][])
    addR(L, petalRing({ id: `cr${x}${y}`, cx: x, cy: y, r1: 40, r2: 150, n: 4, a0, a1: a0 + Math.PI / 2, shape: 'round' }).map((r) => ({ ...r, g: r.g!.endsWith('p') ? 'cornerP' : 'cornerV' })));
  L.add('oval', ellipse(500, 500, 400, 270), [500, 260]);
  // a wreath of leaves around the oval
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    const p: Pt = [500 + 400 * Math.cos(a), 500 + 270 * Math.sin(a)];
    const out = Math.atan2(Math.sin(a) / 270, Math.cos(a) / 400);
    L.add('leafW', petal(p[0], p[1], out + (k % 2 ? 0.6 : -0.6), 0, 70, 22, 0.5));
  }
  for (const a of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
    const p: Pt = [500 + 400 * Math.cos(a), 500 + 270 * Math.sin(a)];
    for (let k = 0; k < 6; k++) L.add('flower', petal(p[0], p[1], (k * Math.PI) / 3, 10, 50, 20, 0.9));
    L.dot('flowerC', p[0], p[1], 14);
  }
  addR(L, centred('PEACE', 420, 1.6, 'pe'));
  for (const [x, y] of [[330, 340], [500, 320], [670, 340], [330, 640], [500, 660], [670, 640]]) L.add('spark', sparkle(x, y, 22), [x, y]);
  return {
    layers: L,
    inspiration: {
      bg: '#E2F0CB', cornerP: '#B5EAD7', cornerV: '#FFEFCF', oval: '#FFEFCF', leafW: '#81B29A', flower: '#FFD6E0', flowerC: '#FFC857', letter: ['#C7CEEA', '#B5EAD7', '#FFD6E0', '#FFDAC1', '#E8D3FF'], hole: '#FFEFCF', spark: '#F6AE2D',
    },
  };
});

export const slowDown = layeredPage({ id: 'slow-down', title: 'Slow Down', category: 'Affirmations', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('sky', rect(0, 0, 1000, 1000), [500, 30]);
  addR(L, petalRing({ id: 'sun', cx: 0, cy: 0, r1: 90, r2: 220, n: 6, a0: 0, a1: Math.PI / 2, shape: 'pointed' }).map((r) => ({ ...r, g: r.g!.endsWith('p') ? 'ray' : 'rayV' })));
  L.add('sunC', polyD([[0, 0], ...Array.from({ length: 13 }, (_, i) => polar(0, 0, 90, (i / 12) * (Math.PI / 2)))]), [30, 30]);
  L.add('cloud', union(circle(760, 140, 50), circle(820, 120, 62), circle(880, 150, 46), ellipse(820, 165, 100, 26)), [820, 140]);
  addR(L, centred('SLOW', 250, 1.5, 'sl'));
  addR(L, centred('DOWN', 450, 1.5, 'dn'));
  const ys = [720, 790, 860, 930];
  ys.forEach((y, i) => L.add(`hill${i}`, hband((x) => y - 30 * Math.sin(x / (170 + i * 30) + i), () => 1010), [80, y + 30]));
  // a little snail taking its time
  const sx = 640;
  const sy = 760;
  L.add('snailBody', smooth([[sx - 160, sy + 50], [sx - 150, sy + 20], [sx + 40, sy + 10], [sx + 120, sy - 40], [sx + 150, sy - 30], [sx + 140, sy + 20], [sx + 90, sy + 56]]), [sx + 120, sy]);
  L.line(curve([[sx + 130, sy - 40], [sx + 140, sy - 80], [sx + 130, sy - 100]]));
  L.line(curve([[sx + 145, sy - 36], [sx + 168, sy - 74], [sx + 175, sy - 96]]));
  L.dot('snailTip', sx + 130, sy - 104, 8);
  L.dot('snailTip', sx + 176, sy - 100, 8);
  L.add('shell', circle(sx - 30, sy - 40, 86), [sx - 30, sy - 110]);
  L.add('shellSpiral', intersect(ribbon((t) => polar(sx - 30, sy - 40, 8 + t * 66, t * Math.PI * 4.4), (t) => 6 + t * 14, 90), circle(sx - 30, sy - 40, 86)));
  for (const [x, y] of [[150, 760], [260, 830], [380, 880], [880, 900]]) {
    for (let k = 0; k < 5; k++) L.add('daisy', petal(x, y, (k * 2 * Math.PI) / 5, 6, 30, 12, 0.9));
    L.dot('daisyC', x, y, 8);
  }
  return {
    layers: L,
    inspiration: {
      sky: '#D4F1F4', ray: '#FFC857', rayV: '#FFF3B0', sunC: '#F6AE2D', cloud: '#FFFFFF', letter: ['#355070', '#6D597A', '#B56576', '#E56B6F'], hole: '#D4F1F4',
      hill0: '#CCD5AE', hill1: '#A3B18A', hill2: '#8A9A5B', hill3: '#588157', snailBody: '#E6CCB2', snailTip: '#7F5539', shell: '#D4A373', shellSpiral: '#9C4221', daisy: '#FFFFFF', daisyC: '#FFC857',
    },
  };
});

export const becoming = layeredPage({ id: 'i-am-becoming', title: 'I Am Becoming', category: 'Affirmations', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [30, 980]);
  addR(L, petalRing({ id: 'su1', cx: 500, cy: 0, r1: 70, r2: 150, n: 8, a0: 0, a1: Math.PI, shape: 'round' }).map((r) => ({ ...r, g: r.g!.endsWith('p') ? 'sunA' : 'sunAv' })));
  addR(L, petalRing({ id: 'su2', cx: 500, cy: 0, r1: 150, r2: 230, n: 14, a0: 0, a1: Math.PI, shape: 'pointed' }).map((r) => ({ ...r, g: r.g!.endsWith('p') ? 'sunB' : 'sunBv' })));
  L.add('sunCore', polyD([[430, 0], ...Array.from({ length: 13 }, (_, i) => polar(500, 0, 70, (i / 12) * Math.PI))]), [500, 30]);
  addR(L, centred('I AM', 270, 1.0, 'ia'));
  addR(L, centred('BECOMING', 400, 1.2, 'bc', 'letter2'));
  // sprout in a little pot
  const stem = (t: number): Pt => [500 + 30 * Math.sin(t * 3.2), 900 - 300 * t];
  L.add('stem', ribbon(stem, () => 14, 30));
  const leaves: [number, Pt, number][] = [[0.3, [330, 700], 0.06], [0.45, [690, 640], -0.06], [0.7, [360, 600], 0.06], [0.85, [640, 560], -0.05]];
  leaves.forEach(([t, tip, bend], i) => leaf(`lv${i}`, stem(t), tip, 70 - i * 6, bend, 'sprout').forEach((r) => L.regions.push(r)));
  L.add('bud', shape([S(stem(1)), [stem(1)[0] + 30, stem(1)[1] - 30], [stem(1)[0], stem(1)[1] - 70], [stem(1)[0] - 30, stem(1)[1] - 30]]), [stem(1)[0], stem(1)[1] - 35]);
  L.add('pot', polyD([[400, 880], [600, 880], [570, 1000], [430, 1000]]), [500, 950]);
  L.add('potRim', rect(385, 860, 230, 36), [500, 878]);
  for (const [x, y] of [[150, 650], [850, 720], [120, 860], [880, 900], [140, 560], [870, 590]]) L.add('spark', sparkle(x, y, 26), [x, y]);
  return {
    layers: L,
    inspiration: {
      bg: '#FAEDCD', sunA: '#F6AE2D', sunAv: '#FFE29A', sunB: '#F28F3B', sunBv: '#FFF3B0', sunCore: '#E07A5F', letter: '#9E2A2B', letter2: ['#E07A5F', '#F28F3B', '#F6AE2D', '#8A9A5B', '#588157', '#2A9D8F', '#3D5A80', '#6D597A'], hole: '#FAEDCD',
      stem: '#588157', sprout: '#8A9A5B', sprout2: '#588157', bud: '#E5989B', pot: '#C8553D', potRim: '#9E2A2B', spark: '#F6AE2D',
    },
  };
});
