import { circle, ellipse, leaf, rect, ribbon, polar, type Pt } from './geometry';
import { layeredPage, pick } from './define';
import { Layers, curve, petal, polyD, shape, smooth, S, star } from './shapes';
import { intersect, subtract } from './flatten';

const mirror = (pts: Pt[], cx = 500): Pt[] => pts.map(([x, y]) => [2 * cx - x, y]);
const toward = (pts: Pt[], c: Pt, k: number): Pt[] => pts.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);

function flower5(L: Layers, x: number, y: number, r: number) {
  for (let k = 0; k < 5; k++) L.add('fPetal', petal(x, y, -Math.PI / 2 + (k * 2 * Math.PI) / 5, r * 0.3, r, r * 0.42, 0.9));
  L.dot('fCentre', x, y, r * 0.3);
}

// ---------------- Butterfly ----------------
export const butterfly = layeredPage({ id: 'butterfly', title: 'Garden Butterfly', category: 'Animals', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [30, 30]);
  flower5(L, 130, 880, 80);
  flower5(L, 880, 860, 64);
  flower5(L, 110, 130, 50);
  flower5(L, 890, 120, 56);
  const up: Pt[] = [[512, 430], [560, 300], [660, 190], [800, 150], [892, 190], [902, 290], [842, 382], [720, 452], [560, 470]];
  const low: Pt[] = [[518, 486], [640, 482], [764, 545], [822, 650], [792, 760], [700, 802], [600, 760], [540, 650]];
  for (const side of ['R', 'L'] as const) {
    const U = side === 'R' ? up : mirror(up);
    const W = side === 'R' ? low : mirror(low);
    const sx = (x: number) => (side === 'R' ? x : 1000 - x);
    const upD = smooth(U);
    const lowD = smooth(W);
    L.add(`wingL${side}`, lowD, [sx(720), 700]);
    L.add(`lowIn${side}`, intersect(smooth(toward(W, [sx(520), 500], 0.55)), lowD), [sx(600), 580]);
    L.add(`spot${side}`, circle(sx(712), 694, 36), [sx(712), 694]);
    L.add(`spotIn${side}`, circle(sx(712), 694, 16), [sx(712), 694]);
    L.add(`wingU${side}`, upD, [sx(820), 220]);
    L.add(`upIn${side}`, intersect(smooth(toward(U, [sx(512), 445], 0.6)), upD), [sx(620), 380]);
    L.add(`eye${side}`, circle(sx(770), 250, 52), [sx(770), 220]);
    L.add(`eyeIn${side}`, circle(sx(770), 250, 24), [sx(770), 250]);
    for (const [x, y] of [[880, 230], [870, 300], [820, 370], [770, 760], [700, 785]] as Pt[]) L.add(`edge${side}`, intersect(circle(sx(x), y, 14), side === 'R' ? (y > 470 ? lowD : upD) : y > 470 ? lowD : upD), [sx(x), y]);
  }
  L.add('body', ellipse(500, 520, 22, 150), [500, 560]);
  L.add('head', circle(500, 352, 30), [500, 352]);
  L.line(curve([[490, 330], [470, 270], [430, 220]]));
  L.line(curve([[510, 330], [530, 270], [570, 220]]));
  L.dot('tip', 428, 216, 10);
  L.dot('tip', 572, 216, 10);
  const wingCols = (s: string) => ({ [`wingU${s}`]: '#F79D65', [`upIn${s}`]: '#FFCDB2', [`eye${s}`]: '#6D597A', [`eyeIn${s}`]: '#FFE29A', [`wingL${s}`]: '#E56B6F', [`lowIn${s}`]: '#F9D5A7', [`spot${s}`]: '#355070', [`spotIn${s}`]: '#E5989B', [`edge${s}`]: '#FCE8D5' });
  return {
    layers: L,
    inspiration: { bg: '#E2F0CB', fPetal: '#FFD6E0', fCentre: '#FFC857', ...wingCols('R'), ...wingCols('L'), body: '#3D405B', head: '#3D405B', tip: '#3D405B' },
    // the left wings come coloured — you finish the right side
    preFill: (regions, insp) => pick(regions, insp, (r) => !!r.g && /L$/.test(r.g) && r.g !== 'bg'),
  };
});

// ---------------- Peacock feather ----------------
export const peacockFeather = layeredPage({ id: 'peacock-feather', title: 'Peacock Feather', category: 'Animals', difficulty: 'detailed' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [30, 30]);
  for (const [x, y, r] of [[130, 150, 18], [860, 180, 24], [150, 520, 14], [880, 560, 16], [200, 860, 20], [820, 880, 14]]) L.dot('bgDot', x, y, r);
  const shaft = (t: number): Pt => [500 + 30 * Math.sin(t * 2.4), 980 - 760 * t];
  // barbs along the shaft (back to front so they overlap softly)
  for (let k = 0; k < 13; k++) {
    const t = 0.05 + k * 0.042;
    const b = shaft(t);
    for (const side of [-1, 1]) {
      const len = 150 + k * 12;
      const tip: Pt = [b[0] + side * len * 0.9, b[1] - len * 0.55];
      for (const r of leaf(`bb${k}${side > 0 ? 'r' : 'l'}`, b, tip, 46, side * 0.06, k % 2 ? 'barb' : 'barb2')) L.regions.push(r);
    }
  }
  L.add('shaft', ribbon(shaft, (t) => 14 - 9 * t, 40), shaft(0.1));
  // fringe around the eye
  const ec: Pt = [500, 300];
  for (let k = 0; k < 22; k++) {
    const a = -Math.PI / 2 + ((k - 10.5) / 22) * Math.PI * 2 * 0.92;
    L.add('fringe', petal(ec[0], ec[1] + 20, a, 140, 300, 34, 0.6));
  }
  L.add('vane', ellipse(500, 300, 200, 245), [500, 90]);
  L.add('ring1', ellipse(500, 318, 148, 186), [500, 150]);
  L.add('ring2', ellipse(500, 330, 104, 136), [500, 210]);
  L.add('heart', shape([S([500, 452]), [432, 360], [440, 280], [480, 252], S([500, 270]), [520, 252], [560, 280], [568, 360]]), [500, 320]);
  L.add('core', ellipse(500, 345, 32, 46), [500, 345]);
  return {
    layers: L,
    inspiration: {
      bg: '#F7F3E3', bgDot: '#C3BEF7', barb: '#5BC0BE', barb2: '#2A9D8F', barb22: '#1F7A8C', barb2x: '#1F7A8C', fringe: '#81B29A', vane: '#9DBE6A',
      ring1: '#D9A441', ring2: '#8D5524', heart: '#1F7A8C', core: '#0B132B', shaft: '#B08968', leaf: '#5BC0BE', leaf2: '#1F7A8C',
    },
  };
});

// ---------------- Sleeping cat ----------------
export const sleepingCat = layeredPage({ id: 'sleeping-cat', title: 'Sleeping Cat', category: 'Animals', difficulty: 'easy' }, () => {
  const L = new Layers();
  L.add('bg', rect(0, 0, 1000, 1000), [30, 30]);
  for (const [x, y, r] of [[120, 140, 34], [880, 160, 26], [180, 380, 18], [860, 400, 20], [500, 120, 22]]) L.add('bgStar', star(x, y, r, r * 0.45), [x, y]);
  L.add('cushion', ellipse(500, 720, 400, 180), [140, 760]);
  L.add('cushionTop', ellipse(500, 690, 330, 125), [260, 690]);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    L.dot('cushionDot', 500 + 365 * Math.cos(a), 712 + 152 * Math.sin(a), 13);
  }
  const body = smooth([[300, 640], [312, 540], [382, 470], [500, 440], [626, 456], [706, 516], [726, 596], [696, 670], [600, 712], [470, 720], [360, 700]]);
  L.add('cat', body, [600, 560]);
  for (let k = 0; k < 4; k++) {
    const x = 520 + k * 50;
    L.add('stripe', intersect(polyD([[x, 430], [x + 28, 430], [x + 6, 740], [x - 22, 740]].map(([a, b]) => [a + (b - 430) * 0.25, b] as Pt)), body));
  }
  const tailFn = (t: number): Pt => [684 - 294 * t, 660 + 70 * Math.sin(t * Math.PI) - 10 * t];
  const tail = ribbon(tailFn, (t) => 50 - 22 * t, 40);
  L.add('tail', tail, [600, 720]);
  L.add('tailTip', intersect(tail, circle(...tailFn(0.86), 46)));
  L.add('ear', shape([S([300, 532]), S([316, 440]), S([372, 500])]), [320, 490]);
  L.add('ear', shape([S([388, 486]), S([440, 420]), S([452, 506])]), [430, 470]);
  L.add('earIn', shape([S([314, 518]), S([324, 466]), S([352, 500])]), [328, 500]);
  L.add('earIn', shape([S([402, 490]), S([434, 450]), S([440, 500])]), [428, 485]);
  const head = smooth([[268, 600], [290, 520], [370, 486], [452, 500], [490, 570], [470, 650], [380, 680], [296, 660]]);
  L.add('head', head, [330, 560]);
  L.add('nose', shape([S([368, 612]), S([392, 612]), S([380, 626])]), [380, 617]);
  const headId = 'head1';
  L.line(curve([[318, 572], [334, 584], [352, 576]]), headId);
  L.line(curve([[408, 572], [424, 584], [442, 576]]), headId);
  L.line(curve([[380, 626], [380, 640], [366, 648]]), headId);
  L.line(curve([[380, 640], [394, 648]]), headId);
  for (const [a, b] of [[[300, 620], [240, 606]], [[300, 634], [236, 640]], [[460, 620], [520, 606]], [[460, 634], [524, 640]]] as [Pt, Pt][]) L.line(`M${a.join(' ')}L${b.join(' ')}`);
  return {
    layers: L,
    inspiration: {
      bg: '#E8D3FF', bgStar: '#FFEFCF', cushion: '#B5EAD7', cushionTop: '#E2F0CB', cushionDot: '#FFD6E0', cat: '#F4A261', stripe: '#E76F51', ear: '#F4A261', earIn: '#FFD6E0',
      head: '#F4A261', nose: '#E5989B', tail: '#F4A261', tailTip: '#FAEDCD',
    },
  };
});

// ---------------- Koi ----------------
function koi(L: Layers, cx: number, cy: number, ang: number, bend: number, tag: string) {
  const T = ([x, y]: Pt): Pt => {
    const yb = y + bend * (x / 170) ** 2 * 70;
    return [cx + x * Math.cos(ang) - yb * Math.sin(ang), cy + x * Math.sin(ang) + yb * Math.cos(ang)];
  };
  const tail = smooth([[-140, 0], [-210, -40], [-262, -82], [-240, -20], [-226, 0], [-240, 20], [-262, 82], [-210, 40]].map((p) => T(p as Pt)));
  L.add(`tail${tag}`, tail, T([-215, 0]));
  for (const s of [-1, 1]) L.add(`fin${tag}`, smooth(([[70, 40], [40, 100], [0, 120], [30, 60]] as Pt[]).map(([x, y]) => T([x, y * s]))), T([35, 90 * s]));
  const body = smooth(([[172, 0], [150, -36], [70, -60], [-30, -54], [-110, -28], [-150, -8], [-150, 8], [-110, 28], [-30, 54], [70, 60], [150, 36]] as Pt[]).map(T));
  L.add(`body${tag}`, body, T([-60, 0]));
  for (const blob of [[[120, -10], [90, -45], [40, -30], [50, 10], [90, 20]], [[0, -50], [-40, -45], [-60, 0], [-20, 30], [10, 0]], [[-90, 10], [-120, 22], [-100, -20]]] as Pt[][])
    L.add(`spots${tag}`, intersect(smooth(blob.map(T)), body));
  for (const s of [-1, 1]) L.add('eye', circle(...T([128, 26 * s]), 8));
}

export const koiPond = layeredPage({ id: 'koi-pond', title: 'Koi Pond', category: 'Animals', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('water', rect(0, 0, 1000, 1000), [500, 500]);
  for (const [x, y, r] of [[500, 500, 420], [500, 500, 300]]) L.line(`M${x - r} ${y}A${r} ${r} 0 1 0 ${x + r} ${y}A${r} ${r} 0 1 0 ${x - r} ${y}`, 'water1');
  const pad = (x: number, y: number, r: number, a: number) => {
    L.add('pad', subtract(circle(x, y, r), polyD([[x, y], polar(x, y, r * 1.5, a - 0.25), polar(x, y, r * 1.5, a + 0.25)])), polar(x, y, r * 0.6, a + Math.PI));
    for (const da of [-1.2, -0.6, 0.6, 1.2, 2, -2]) L.line(`M${x} ${y}L${polar(x, y, r * 0.92, a + Math.PI + da).join(' ')}`, `pad${L.regions.filter((q) => q.g === 'pad').length}`);
  };
  pad(110, 110, 120, 0.8);
  pad(900, 880, 140, 3.9);
  pad(880, 130, 80, 2.4);
  pad(130, 880, 90, -0.8);
  // lotus on the big pad
  for (let k = 0; k < 7; k++) L.add('lotus', petal(880, 860, -Math.PI / 2 + ((k - 3) * Math.PI) / 9, 0, 90, 26, 0.5));
  L.dot('lotusC', 880, 860, 16);
  koi(L, 470, 340, Math.PI - 0.25, -0.5, 'A');
  koi(L, 530, 660, -0.25, -0.5, 'B');
  return {
    layers: L,
    inspiration: {
      water: '#5E9FA3', pad: '#81B29A', lotus: '#FFD6E0', lotusC: '#FFC857', tailA: '#FAEDCD', finA: '#FAEDCD', bodyA: '#FBF5EF', spotsA: '#F28F3B',
      tailB: '#F28F3B', finB: '#F28F3B', bodyB: '#F6AE2D', spotsB: '#FBF5EF', eye: '#0B132B',
    },
  };
});

// ---------------- Owl ----------------
export const moonOwl = layeredPage({ id: 'moon-owl', title: 'Owl Under the Moon', category: 'Animals', difficulty: 'detailed' }, () => {
  const L = new Layers();
  L.add('sky', rect(0, 0, 1000, 1000), [40, 40]);
  for (const [x, y, r] of [[90, 120, 22], [900, 90, 18], [140, 420, 14], [880, 400, 20], [80, 640, 16], [930, 650, 14]]) L.add('star', star(x, y, r, r * 0.45), [x, y]);
  L.add('moon', circle(500, 420, 340), [500, 110]);
  L.add('moonIn', circle(500, 420, 290), [500, 160]);
  // ear tufts, body, wings
  L.add('tuft', shape([S([350, 300]), S([330, 170]), S([450, 250])]), [370, 250]);
  L.add('tuft', shape([S([650, 300]), S([670, 170]), S([550, 250])]), [630, 250]);
  const body = smooth([[500, 220], [640, 260], [720, 400], [730, 560], [680, 720], [580, 800], [420, 800], [320, 720], [270, 560], [280, 400], [360, 260]]);
  L.add('owl', body, [320, 560]);
  const belly = ellipse(500, 640, 140, 150);
  L.add('belly', belly, [500, 520]);
  for (let row = 0; row < 7; row++)
    for (let k = -4; k <= 4; k++) {
      const x = 500 + k * 42 + (row % 2) * 21;
      const y = 540 + row * 34;
      L.add('scallop', intersect(circle(x, y, 22), belly));
    }
  L.add('wing', petal(312, 450, 1.42, 0, 330, 66, 0.4), [300, 640]);
  L.add('wing', petal(688, 450, Math.PI - 1.42, 0, 330, 66, 0.4), [700, 640]);
  for (const side of [-1, 1]) {
    const x = 500 + side * 92;
    L.add('disc', circle(x, 400, 88), [x, 330]);
    L.add('eye', circle(x, 400, 54), [x, 370]);
    L.add('pupil', circle(x, 400, 26), [x, 400]);
    L.add('glint', circle(x + 8, 390, 8), [x + 8, 390]);
  }
  L.add('beak', shape([S([478, 450]), S([522, 450]), S([500, 510])]), [500, 470]);
  // branch with leaves and feet
  const branch = ribbon((t) => [-20 + 1040 * t, 820 - 40 * t + 14 * Math.sin(t * 9)], (t) => 46 - 14 * t, 40);
  L.add('branch', branch, [100, 820]);
  for (const [x, y, a] of [[150, 800, -2.4], [260, 790, -0.6], [780, 770, -2.3], [880, 770, -0.7], [70, 830, 2.4], [940, 790, 0.8]] as [number, number, number][]) L.add('leaf', petal(x, y, a, 0, 110, 30, 0.5));
  for (const x of [440, 470, 530, 560]) L.add('toe', ellipse(x, 802, 16, 22), [x, 802]);
  return {
    layers: L,
    inspiration: {
      sky: '#1C2541', star: '#FFD166', moon: '#F7F3E3', moonIn: '#F2E9E4', tuft: '#7F5539', owl: '#B08968', belly: '#E6CCB2', scallop: '#DDB892',
      wing: '#7F5539', disc: '#F2E9E4', eye: '#FFD166', pupil: '#0B132B', glint: '#FFFFFF', beak: '#F6AE2D', branch: '#6B3E2E', leaf: '#588157', toe: '#F6AE2D',
    },
  };
});
