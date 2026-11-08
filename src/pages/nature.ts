import { circle, ellipse, leaf, rect, ribbon, polar, type Pt } from './geometry';
import { layeredPage } from './define';
import { Layers, curve, hband, polyD, star } from './shapes';
import { intersect, union } from './flatten';

const bird = (x: number, y: number, s: number) => curve([[x - s, y - s * 0.4], [x - s * 0.45, y - s * 0.55], [x, y]]) + curve([[x, y], [x + s * 0.45, y - s * 0.55], [x + s, y - s * 0.4]]).replace('M', 'M');
const cloud = (x: number, y: number, s: number) => union(circle(x - s * 0.6, y, s * 0.45), circle(x, y - s * 0.25, s * 0.6), circle(x + s * 0.6, y, s * 0.42), ellipse(x, y + s * 0.1, s * 1.05, s * 0.32));

function pine(L: Layers, x: number, base: number, h: number) {
  L.add('trunk', rect(x - h * 0.05, base - h * 0.18, h * 0.1, h * 0.2), [x, base - h * 0.08]);
  for (let k = 0; k < 3; k++) {
    const top = base - h * (0.45 + k * 0.27);
    const bot = base - h * (0.12 + k * 0.27);
    const w = h * (0.34 - k * 0.07);
    L.add('pine', polyD([[x, top - h * 0.12], [x + w, bot], [x - w, bot]]), [x, bot - 10]);
  }
}

// ---------------- Mountains at sunset ----------------
export const mountainSunset = layeredPage({ id: 'mountain-sunset', title: 'Mountains at Sunset', category: 'Nature & landscapes', difficulty: 'medium' }, () => {
  const L = new Layers();
  const ys = [0, 110, 210, 300, 380, 760];
  for (let i = 0; i < ys.length - 1; i++) {
    const a = ys[i];
    const b = ys[i + 1];
    L.add(`sky${i}`, hband((x) => (i ? a + 14 * Math.sin(x / 160 + i) : -10), (x) => (i < ys.length - 2 ? b + 14 * Math.sin(x / 160 + i + 1) : b)), [40, (a + b) / 2]);
  }
  L.add('sun', circle(640, 440, 120), [640, 360]);
  L.add('sunIn', circle(640, 440, 82), [640, 420]);
  L.line(bird(200, 170, 22));
  L.line(bird(260, 200, 16));
  L.line(bird(320, 150, 18));
  const ridge = (pts: Pt[], base: number) => polyD([[-10, base], ...pts, [1010, base]]);
  const far: Pt[] = [[-10, 470], [120, 360], [210, 420], [330, 280], [450, 400], [560, 330], [700, 450], [820, 300], [930, 380], [1010, 340]];
  const farD = ridge(far, 1000);
  L.add('mtFar', farD, [60, 560]);
  for (const [px, py] of [[330, 280], [820, 300], [120, 360]]) {
    const cap = polyD([[px - 80, py + 64], [px - 40, py + 52], [px - 14, py + 72], [px + 16, py + 50], [px + 50, py + 70], [px + 90, py + 60], [px, py - 20]]);
    L.add('snow', intersect(cap, farD));
  }
  L.add('mtMid', ridge([[-10, 560], [160, 470], [300, 540], [460, 450], [620, 560], [780, 480], [1010, 570]], 1000), [400, 640]);
  L.add('hills', hband((x) => 650 - 40 * Math.sin(x / 180), () => 1010), [500, 700]);
  L.add('lake', hband((x) => 760 + 8 * Math.sin(x / 120), () => 900), [500, 830]);
  for (const [x, y, w] of [[380, 790, 120], [560, 812, 160], [470, 846, 90], [700, 790, 80]]) L.add('glint', ellipse(x, y, w / 2, 6), [x, y]);
  L.add('shore', hband((x) => 890 - 25 * Math.sin(x / 140 + 1), () => 1010), [500, 960]);
  pine(L, 90, 900, 260);
  pine(L, 190, 920, 200);
  pine(L, 880, 905, 240);
  pine(L, 790, 930, 170);
  return {
    layers: L,
    inspiration: {
      sky0: '#355070', sky1: '#6D597A', sky2: '#B56576', sky3: '#E56B6F', sky4: '#EAAC8B', sun: '#F7B267', sunIn: '#FFE29A',
      mtFar: '#6D597A', snow: '#FCE8D5', mtMid: '#B56576', hills: '#355070', lake: '#E5989B', glint: '#FFCDB2', shore: '#2B2D42', trunk: '#3D405B', pine: '#22223B',
    },
  };
});

// ---------------- Ocean waves ----------------
export const oceanWaves = layeredPage({ id: 'ocean-waves', title: 'Ocean Waves', category: 'Nature & landscapes', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('sky', rect(0, 0, 1000, 460), [40, 40]);
  L.add('sun', circle(760, 200, 90), [760, 160]);
  L.add('sunIn', circle(760, 200, 58), [760, 200]);
  L.add('cloud', cloud(250, 170, 110), [250, 170]);
  L.add('cloud', cloud(560, 110, 70), [560, 110]);
  L.line(bird(430, 250, 20));
  L.line(bird(480, 280, 14));
  L.add('sea', rect(0, 400, 1000, 600), [500, 430]);
  // a little sailboat on the horizon
  L.add('hull', polyD([[600, 420], [700, 420], [685, 440], [615, 440]]), [650, 430]);
  L.add('sail', polyD([[648, 412], [648, 320], [700, 412]]), [665, 390]);
  L.add('sail2', polyD([[642, 412], [642, 336], [606, 412]]), [632, 395]);
  const waves = [500, 610, 730, 860];
  waves.forEach((base, i) => {
    const amp = 26 + i * 6;
    const ph = i * 1.7;
    const lam = 150 + i * 20;
    const top = (x: number) => base - amp * Math.abs(Math.sin(x / lam + ph));
    const wave = hband(top, () => 1010);
    L.add(`wave${i}`, wave, [40, base + 50]);
    // foam scallops along the crest
    for (let x = -20; x < 1020; x += 38 + i * 6) L.add('foam', intersect(circle(x, top(x) + 4, 13 + i * 2), wave));
    // swirls inside the wave
    for (let x = 140 + i * 70; x < 1000; x += 330) {
      const cx = x;
      const cy = base + 45 + i * 4;
      L.add(`swirl`, intersect(ribbon((t) => polar(cx, cy, 6 + t * 30, t * Math.PI * 3.4 + i), (t) => 4 + t * 6, 50), wave));
    }
  });
  return {
    layers: L,
    inspiration: {
      sky: '#FCE8D5', sun: '#F7B267', sunIn: '#FFE29A', cloud: '#FFFFFF', sea: '#98C1D9', hull: '#7F5539', sail: '#FFFFFF', sail2: '#F2CC8F',
      wave0: '#83C5BE', wave1: '#4DD0E1', wave2: '#00897B', wave3: '#006D77', foam: '#E0F7FA', swirl: '#E0F7FA',
    },
  };
});

// ---------------- Palm-lined beach ----------------
function palm(L: Layers, base: Pt, top: Pt, lean: number) {
  const trunk = (t: number): Pt => [base[0] + (top[0] - base[0]) * t + lean * Math.sin(Math.PI * t), base[1] + (top[1] - base[1]) * t];
  const n = 9;
  for (let k = 0; k < n; k++) {
    const t0 = k / n;
    const t1 = (k + 1) / n;
    L.add('trunk', ribbon((t) => trunk(t0 + (t1 - t0) * t), (t) => (34 - 14 * (t0 + (t1 - t0) * t)) * (1 - 0.15 * Math.abs(t - 0.5)), 6));
  }
  const crown = trunk(1);
  const fronds: [number, number][] = [[-170, 0.1], [-130, 0.08], [-60, -0.04], [-20, -0.1], [30, -0.12], [-95, 0.0], [160, -0.1], [200, 0.1]];
  fronds.forEach(([deg, bend], i) => {
    const a = (deg * Math.PI) / 180;
    const len = 230 - (i % 3) * 25;
    const tip: Pt = [crown[0] + Math.cos(a) * len, crown[1] + Math.sin(a) * len * 0.75 + 70];
    for (const r of leaf(`fr${L.regions.length}`, crown, tip, 70, bend, 'frond')) L.regions.push(r);
  });
  for (const [dx, dy] of [[-16, 18], [16, 20], [0, 34]]) L.dot('coconut', crown[0] + dx, crown[1] + dy, 15);
}

export const palmBeach = layeredPage({ id: 'palm-beach', title: 'Palm Beach', category: 'Nature & landscapes', difficulty: 'medium' }, () => {
  const L = new Layers();
  L.add('sky', rect(0, 0, 1000, 560), [500, 40]);
  L.add('sun', circle(500, 470, 130), [500, 400]);
  L.add('cloud', cloud(780, 160, 90), [780, 160]);
  L.add('cloud', cloud(300, 110, 60), [300, 110]);
  L.add('sea', hband(() => 460, (x) => 650 + 10 * Math.sin(x / 90)), [700, 500]);
  for (let k = 0; k < 4; k++) {
    const y = 500 + k * 36;
    L.add('ripple', hband((x) => y + 4 * Math.sin(x / 50 + k), (x) => y + 10 + 4 * Math.sin(x / 50 + k), 80 + k * 40, 920 - k * 40));
  }
  L.add('foamLine', hband((x) => 650 + 10 * Math.sin(x / 90), (x) => 680 + 12 * Math.sin(x / 70)), [500, 668]);
  L.add('sand', hband((x) => 680 + 12 * Math.sin(x / 70), () => 1010), [500, 900]);
  L.add('star', star(700, 880, 46, 20, 5, -1.2), [700, 880]);
  L.add('shell', union(ellipse(840, 800, 34, 24), circle(840, 820, 12)), [840, 800]);
  L.add('shell', ellipse(560, 930, 26, 18), [560, 930]);
  palm(L, [170, 980], [300, 330], 60);
  palm(L, [910, 1000], [790, 420], -50);
  return {
    layers: L,
    inspiration: {
      sky: '#FFE29A', sun: '#F28F3B', cloud: '#FFF3B0', sea: '#26A69A', ripple: '#80DEEA', foamLine: '#E0F7FA', sand: '#F2CC8F', star: '#E07A5F', shell: '#FFB4A2',
      trunk: ['#B08968', '#7F5539'], frond: '#588157', frond2: '#3A5A40', coconut: '#6B3E2E',
    },
  };
});
