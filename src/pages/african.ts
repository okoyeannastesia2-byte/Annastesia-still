import { circle, ellipse, petalRing, rect, ribbon, sectorRing, polar, type Pt } from './geometry';
import { layeredPage } from './define';
import { Layers, curve, petal, polyD, shape, smooth, S } from './shapes';
import { intersect, subtract, union } from './flatten';
import type { Region } from './types';

const addRegions = (L: Layers, rs: Region[], g?: string) => rs.forEach((r) => L.regions.push(g ? { ...r, g } : r));
const qbez = (a: Pt, c: Pt, b: Pt, n = 40): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as Pt;
  });

// ---------------- Adire indigo squares ----------------
export const adireSquares = layeredPage({ id: 'adire-squares', title: 'Adire Indigo Squares', category: 'African-inspired', difficulty: 'detailed' }, () => {
  const L = new Layers();
  L.add('gutter', rect(0, 0, 1000, 1000), [10, 10]);
  const cell = 225;
  const gap = 10;
  const m = (1000 - 4 * cell - 3 * gap) / 2;
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 4; i++) {
      const x = m + i * (cell + gap);
      const y = m + j * (cell + gap);
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      const tile = rect(x, y, cell, cell);
      const tag = i === j ? 'P' : ''; // the diagonal comes pre-coloured
      L.add(`tile${tag}`, tile, [x + 8, y + 8]);
      const motif = (i + j * 4) % 8;
      if (motif === 0) {
        [100, 76, 52, 28].forEach((r, k) => L.add(`m${k % 2}${tag}`, circle(cx, cy, r), [cx + r - 10, cy]));
      } else if (motif === 1) {
        addRegions(L, petalRing({ id: `sun${i}${j}`, cx, cy, r1: 36, r2: 100, n: 12, shape: 'pointed' }).filter((r) => r.g!.endsWith('p')), `m0${tag}`);
        L.add(`m1${tag}`, circle(cx, cy, 36), [cx, cy]);
      } else if (motif === 2) {
        for (let k = -10; k <= 10; k += 2) {
          const o = k * 26;
          L.add(`m${(k / 2 + 10) % 2}${tag}`, intersect(polyD([[x + o - 200, y + cell + 200], [x + o + 26 - 200, y + cell + 200], [x + o + 26 + 200, y - 200], [x + o + 200, y - 200]]), tile));
        }
      } else if (motif === 3) {
        for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) L.dot(`m${(a + b) % 2}${tag}`, x + 30 + a * 55, y + 30 + b * 55, 16);
      } else if (motif === 4) {
        const sp = (t: number): Pt => polar(cx, cy, 10 + t * 88, t * Math.PI * 5.2);
        L.add(`m0${tag}`, ribbon(sp, (t) => 8 + t * 10, 120), [cx + 20, cy]);
      } else if (motif === 5) {
        const s = cell / 5;
        for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if ((a + b) % 2 === 0) L.add(`m${a % 2}${tag}`, rect(x + a * s, y + b * s, s, s));
      } else if (motif === 6) {
        for (let k = 0; k < 4; k++) L.add(`m0${tag}`, petal(cx, cy, Math.PI / 4 + (k * Math.PI) / 2, 24, 105, 30, 0.3));
        for (let k = 0; k < 4; k++) L.add(`m1${tag}`, petal(cx, cy, (k * Math.PI) / 2, 24, 80, 16, 0.3));
        L.add(`m1${tag}`, circle(cx, cy, 24), [cx, cy]);
      } else {
        for (let k = 0; k < 5; k++) {
          const y0 = y + 22 + k * 40;
          L.add(`m${k % 2}${tag}`, intersect(polyD([...Array.from({ length: 21 }, (_, q) => [x + (q * cell) / 20, y0 + 10 * Math.sin(q * 0.9)] as Pt), ...Array.from({ length: 21 }, (_, q) => [x + ((20 - q) * cell) / 20, y0 + 18 + 10 * Math.sin((20 - q) * 0.9)] as Pt)]), tile));
        }
      }
    }
  return {
    layers: L,
    inspiration: { gutter: '#F2E9E4', tile: '#22336B', tileP: '#22336B', m0: '#E0F7FA', m0P: '#E0F7FA', m1: '#5B7DB1', m1P: '#5B7DB1' },
    preFill: (regions, insp) => {
      const out: Record<string, string> = {};
      for (const r of regions) if (r.g?.endsWith('P')) out[r.id] = insp[r.id];
      return out;
    },
  };
});

// ---------------- Ankara medallions ----------------
export const ankaraRhythm = layeredPage({ id: 'ankara-rhythm', title: 'Ankara Rhythm', category: 'African-inspired', difficulty: 'detailed' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [130, 500]);
  const medallion = (cx: number, cy: number, R: number, k: string) => {
    L.add('mOut', circle(cx, cy, R));
    addRegions(L, petalRing({ id: `${k}a`, cx, cy, r1: R * 0.62, r2: R, n: 12, shape: 'pointed' }).map((r) => ({ ...r, g: r.g!.endsWith('p') ? 'm4' : 'm5' })));
    addRegions(L, sectorRing({ id: `${k}b`, cx, cy, r1: R * 0.5, r2: R * 0.62, n: 16 }).map((r) => ({ ...r, g: r.g!.endsWith('a') ? 'm3' : 'm2' })));
    addRegions(L, petalRing({ id: `${k}c`, cx, cy, r1: R * 0.2, r2: R * 0.5, n: 8, shape: 'round' }).map((r) => ({ ...r, g: r.g!.endsWith('p') ? 'm1' : 'm2' })));
    L.add('m0', circle(cx, cy, R * 0.2), [cx, cy]);
  };
  const R = 170;
  [[230, 230], [770, 230], [500, 500], [230, 770], [770, 770], [0, 500], [1000, 500], [500, 0], [500, 1000]].forEach(([x, y], i) => medallion(x, y, R, `md${i}`));
  [[0, 0], [1000, 0], [0, 1000], [1000, 1000]].forEach(([x, y], i) => medallion(x, y, 120, `mc${i}`));
  for (const [x, y] of [[500, 250], [250, 500], [750, 500], [500, 750]]) {
    L.add('dia', polyD([[x, y - 62], [x + 40, y], [x, y + 62], [x - 40, y]]), [x, y - 30]);
    L.dot('diaDot', x, y, 14);
  }
  for (const [x, y] of [[360, 360], [640, 360], [360, 640], [640, 640], [130, 360], [870, 360], [130, 640], [870, 640], [360, 120], [640, 120], [360, 880], [640, 880]]) L.dot('spot', x, y, 16);
  return {
    layers: L,
    inspiration: { bg: '#F2CC8F', mOut: '#264653', m5: '#E9C46A', m4: '#2A9D8F', m3: '#E76F51', m2: '#F4A261', m1: '#9C4221', m0: '#5B2A86', dia: '#C8553D', diaDot: '#E9C46A', spot: '#264653' },
  };
});

// ---------------- Woman in a headwrap ----------------
export const headwrap = layeredPage({ id: 'headwrap', title: 'Woman in a Headwrap', category: 'African-inspired', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [40, 40]);
  [430, 360, 290].forEach((r, i) => L.add(`halo${i}`, circle(470, 470, r), [470, 470 - r + 30]));
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    L.dot('haloDot', ...polar(470, 470, 395, a), 12);
  }
  const skin = L.add(
    'skin',
    shape([
      [420, 300], [560, 318], [606, 356], [626, 406], [632, 440], [650, 482], S([684, 538]), [666, 553], S([646, 556]), [654, 577], S([662, 589]),
      S([642, 599]), S([658, 610]), [646, 628], S([632, 641]), [642, 668], [622, 700], [580, 726], [558, 744], [566, 810], [588, 890], S([604, 970]),
      S([370, 970]), [392, 860], [396, 760], [378, 640], [348, 520], [356, 400],
    ]),
    [520, 560],
  );
  L.add('ear', ellipse(478, 528, 24, 38, 0.15), [480, 540]);
  L.add('hoop', subtract(circle(480, 602, 34), circle(480, 602, 24)), [480, 570]);
  // garment and beads
  const garment = shape([[120, 1010], [180, 900], [300, 846], [420, 830], S([492, 912]), [566, 830], [690, 846], [800, 906], [880, 1010]]);
  L.add('garment', garment, [250, 960]);
  for (let k = 0; k < 8; k++) {
    const x = 160 + k * 90;
    L.add('trim', intersect(polyD([[x, 990], [x + 45, 945], [x + 90, 990]]), garment));
  }
  qbez([418, 836], [490, 940], [568, 836], 9).slice(1, -1).forEach((p) => L.dot('bead', p[0], p[1], 13));
  // the wrap
  const wrap = smooth([
    [600, 392], [624, 352], [632, 296], [604, 218], [540, 150], [460, 112], [370, 112], [290, 152], [240, 232], [228, 332], [250, 444], [300, 544], [366, 600],
    [418, 592], [448, 540], [466, 470], [516, 420], [566, 402],
  ]);
  L.add('wrap', wrap, [330, 300]);
  for (let i = 0; i < 5; i++) {
    const a = qbez([660, 250 + i * 70], [420, 330 + i * 70], [200, 40 + i * 110]);
    const b = qbez([660, 280 + i * 70], [420, 360 + i * 70], [200, 70 + i * 110]);
    L.add('fold', intersect(polyD([...a, ...b.reverse()]), wrap));
  }
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 6; k++) {
      const p = qbez([660, 300 + i * 70], [420, 380 + i * 70], [200, 90 + i * 110], 7)[k + 1];
      L.add('wrapDot', intersect(circle(p[0], p[1], 9), wrap));
    }
  // knot on top
  L.add('knot', petal(440, 140, -2.2, 0, 150, 52, 0.7));
  L.add('knot', petal(440, 140, -1.05, 0, 140, 48, 0.7));
  L.add('knotC', circle(440, 140, 32), [440, 140]);
  // face details
  L.line(curve([[584, 446], [600, 453], [618, 448]]), skin);
  L.line(curve([[592, 451], [588, 463]]), skin);
  L.line(curve([[602, 453], [600, 466]]), skin);
  L.line(curve([[611, 451], [612, 463]]), skin);
  L.line(curve([[578, 420], [600, 412], [624, 418]]), skin);
  L.line(curve([[476, 512], [470, 530], [480, 548]]));
  return {
    layers: L,
    inspiration: {
      bg: '#FAEDCD', halo0: '#F4D6CC', halo1: '#FFE29A', halo2: '#F6AE2D', haloDot: '#E07A5F', skin: '#8D5524', ear: '#7F4A1F', hoop: '#F6AE2D',
      garment: '#2A9D8F', trim: '#E9C46A', bead: ['#E76F51', '#E9C46A'], wrap: '#C8553D', fold: '#E9C46A', wrapDot: '#264653', knot: '#9E2A2B', knotC: '#E9C46A',
    },
  };
});

// ---------------- Patterned calabash ----------------
export const calabash = layeredPage({ id: 'calabash', title: 'Patterned Calabash', category: 'African-inspired', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('wall', rect(0, 0, 1000, 700), [30, 30]);
  L.add('floor', rect(0, 700, 1000, 300), [30, 970]);
  L.add('mat', ellipse(500, 860, 440, 120), [120, 860]);
  L.add('mat2', ellipse(500, 860, 340, 92), [230, 860]);
  L.add('mat3', ellipse(500, 860, 230, 62), [330, 860]);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const at = (rx: number, ry: number) => `${500 + rx * Math.cos(a)} ${860 + ry * Math.sin(a)}`;
    L.line(`M${at(338, 91)}L${at(442, 121)}`, 'mat1');
    if (k % 2 === 0) L.line(`M${at(228, 61)}L${at(342, 93)}`, 'mat21');
  }
  const cx = 500;
  const ry = 430;
  const rimO = ellipse(cx, ry, 340, 80);
  const rimI = ellipse(cx, ry, 308, 60);
  L.add('rimBack', subtract(intersect(rimO, rect(0, 0, 1000, ry)), rimI), [cx, ry - 70]);
  L.add('inside', rimI, [cx, ry + 30]);
  L.add('fruit', circle(380, 400, 72), [360, 380]);
  L.add('fruit', circle(640, 405, 66), [660, 390]);
  L.add('fruit', circle(515, 372, 84), [515, 340]);
  L.add('leafy', petal(560, 300, -0.6, 0, 120, 30, 0.5));
  const body = subtract(union(intersect(ellipse(cx, ry, 340, 420), rect(0, ry, 1000, 600)), intersect(rimO, rect(0, ry, 1000, 600))), rimI);
  L.add('body', body, [200, 470]);
  const curveY = (base: number) => (x: number) => base + 46 * (1 - ((x - cx) / 340) ** 2);
  // zig-zag row
  const zy = curveY(540);
  for (let k = 0; k < 12; k++) {
    const x0 = 160 + k * 57;
    L.add('zig', intersect(polyD([[x0, zy(x0 + 28) + 50], [x0 + 28, zy(x0 + 28)], [x0 + 57, zy(x0 + 28) + 50]]), body));
  }
  const by = curveY(610);
  const band = polyD([...Array.from({ length: 41 }, (_, i) => [150 + i * 17.5, by(150 + i * 17.5)] as Pt), ...Array.from({ length: 41 }, (_, i) => [850 - i * 17.5, by(850 - i * 17.5) + 22] as Pt)]);
  L.add('band', intersect(band, body));
  const cy2 = curveY(668);
  for (let k = 0; k < 9; k++) {
    const x = 230 + k * 67;
    L.add('ring', intersect(circle(x, cy2(x), 22), body));
    L.add('ringC', intersect(circle(x, cy2(x), 9), body));
  }
  const ly = curveY(735);
  for (let k = 0; k < 7; k++) {
    const x = 285 + k * 72;
    L.add('lf', intersect(petal(x - 30, ly(x), 0, 0, 62, 15, 0.5), body));
  }
  return {
    layers: L,
    inspiration: {
      wall: '#FAEDCD', floor: '#D4A373', mat: '#E9C46A', mat2: '#D9A441', mat3: '#F2CC8F', rimBack: '#8D5524', inside: '#5B3A1E',
      fruit: ['#F4A261', '#E76F51', '#F6AE2D'], leafy: '#588157', body: '#D9A441', zig: '#9C4221', band: '#264653', ring: '#9C4221', ringC: '#F2CC8F', lf: '#2A9D8F',
    },
  };
});
