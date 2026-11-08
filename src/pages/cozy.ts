import { circle, ellipse, rect, ribbon, type Pt } from './geometry';
import { layeredPage } from './define';
import { Layers, curve, drop, petal, polyD, roundRect, shape, smooth, S } from './shapes';
import { intersect, subtract, union } from './flatten';

const heart = (x: number, y: number, s: number) =>
  shape([S([x, y + s * 0.9]), [x - s, y + s * 0.05], [x - s * 0.85, y - s * 0.55], [x - s * 0.35, y - s * 0.65], S([x, y - s * 0.25]), [x + s * 0.35, y - s * 0.65], [x + s * 0.85, y - s * 0.55], [x + s, y + s * 0.05]]);

/** A mug: body with rounded bottom, plus handle ring. */
function mug(L: Layers, x: number, y: number, w: number, h: number, g = 'mug') {
  const body = shape([S([x, y]), S([x + w, y]), [x + w - 4, y + h * 0.75], [x + w * 0.8, y + h], [x + w * 0.2, y + h], [x + 4, y + h * 0.75]]);
  L.add(`${g}H`, subtract(ellipse(x + w + 4, y + h * 0.42, w * 0.26, h * 0.28), ellipse(x + w + 4, y + h * 0.42, w * 0.13, h * 0.15)));
  L.add(g, body, [x + w * 0.25, y + h * 0.5]);
  return body;
}

// ---------------- Café morning ----------------
export const cafeMorning = layeredPage({ id: 'cafe-morning', title: 'Café Morning', category: 'Cozy scenes', difficulty: 'medium' }, () => {
  const L = new Layers();
  for (let i = 0; i < 20; i++) L.add(i % 2 ? 'stripeA' : 'stripeB', rect(i * 50, 0, 50, 650), [i * 50 + 25, 40]);
  L.add('mirror', circle(820, 200, 110), [820, 120]);
  L.add('mirrorIn', circle(820, 200, 80), [820, 200]);
  L.add('table', rect(0, 650, 1000, 350), [40, 980]);
  for (const y of [740, 840, 940]) L.line(`M0 ${y}L1000 ${y}`, 'table1');
  // books
  L.add('book', roundRect(110, 560, 340, 64, 8), [130, 600]);
  L.add('pages', rect(130, 576, 300, 32), [280, 592]);
  L.add('book', roundRect(140, 498, 290, 64, 8), [160, 530]);
  L.add('pages', rect(160, 514, 250, 32), [285, 530]);
  L.line('M200 576L200 608M380 576L380 608');
  // little plant in a jar
  for (const [a, len] of [[-2.2, 150], [-1.8, 190], [-1.4, 200], [-1.05, 160]] as [number, number][]) L.add('plant', petal(805, 500, a, 0, len, 34, 0.5));
  L.add('jar', roundRect(745, 480, 120, 170, 22), [805, 600]);
  L.add('jarBand', intersect(rect(745, 530, 120, 30), roundRect(745, 480, 120, 170, 22)));
  // cookie
  L.add('cookie', circle(250, 800, 62), [215, 780]);
  for (const [x, y] of [[230, 780], [270, 770], [250, 820], [290, 815], [215, 825]]) L.dot('chip', x, y, 9);
  // steam
  for (const x of [520, 565, 610]) L.add('steam', ribbon((t) => [x + 16 * Math.sin(t * 7), 580 - 200 * t], (t) => 16 * (1 - t) + 4, 30));
  // saucer, spoon, cup
  L.add('saucer', ellipse(565, 770, 200, 46), [400, 775]);
  L.add('spoon', union(ribbon((t) => [700 + 120 * t, 790 - 10 * t], () => 10, 10), ellipse(705, 790, 26, 14)), [760, 788]);
  const cupTop = ellipse(565, 600, 122, 28);
  L.add('cupH', subtract(ellipse(694, 670, 56, 50), ellipse(694, 670, 32, 30)));
  L.add('cup', union(shape([S([443, 600]), S([687, 600]), [676, 690], [620, 760], [510, 760], [454, 690]]), cupTop), [480, 690]);
  L.add('coffee', ellipse(565, 600, 108, 21), [500, 600]);
  L.add('latte', heart(565, 600, 22), [565, 600]);
  return {
    layers: L,
    inspiration: {
      stripeA: '#F4D6CC', stripeB: '#FAEDCD', mirror: '#D4A373', mirrorIn: '#DDEDEA', table: '#B08968', book: ['#6D597A', '#2A9D8F'], pages: '#FAEDCD',
      plant: '#588157', jar: '#CDE7E3', jarBand: '#E07A5F', cookie: '#DDB892', chip: '#6B3E2E', steam: '#FFFFFF', saucer: '#FFFFFF', spoon: '#A89F91',
      cupH: '#E07A5F', cup: '#E07A5F', coffee: '#7F5539', latte: '#F2E9E4',
    },
  };
});

// ---------------- Rainy window ----------------
export const rainyWindow = layeredPage({ id: 'rainy-window', title: 'Rain on the Window', category: 'Cozy scenes', difficulty: 'detailed' }, () => {
  const L = new Layers();
  L.add('wall', rect(0, 0, 1000, 1000), [30, 980]);
  // the view
  const glass = rect(240, 170, 520, 560);
  L.add('sky', glass, [300, 220]);
  L.add('cloud', intersect(union(circle(330, 230, 50), circle(390, 210, 60), circle(450, 240, 45), rect(330, 230, 120, 50)), glass), [390, 230]);
  L.add('cloud', intersect(union(circle(600, 300, 40), circle(650, 285, 50), circle(700, 305, 38), rect(600, 300, 100, 40)), glass), [650, 300]);
  L.add('hillFar', intersect(polyD([...Array.from({ length: 31 }, (_, i) => [230 + i * 18, 520 - 50 * Math.sin(i / 5) - 20 * Math.sin(i / 2.3)] as Pt), [770, 740], [230, 740]]), glass), [300, 560]);
  L.add('hillNear', intersect(polyD([...Array.from({ length: 31 }, (_, i) => [230 + i * 18, 610 - 40 * Math.cos(i / 4)] as Pt), [770, 740], [230, 740]]), glass), [300, 680]);
  // little houses
  for (const [x, w] of [[300, 70], [560, 90]] as [number, number][]) {
    L.add('house', rect(x, 600, w, 70), [x + 10, 650]);
    L.add('roof', polyD([[x - 12, 602], [x + w / 2, 555], [x + w + 12, 602]]), [x + w / 2, 585]);
    L.add('houseWin', rect(x + w / 2 - 12, 620, 24, 24), [x + w / 2, 632]);
  }
  // raindrops on the glass
  const drops: [number, number, number][] = [
    [290, 300, 9], [350, 420, 12], [420, 330, 8], [470, 520, 11], [560, 220, 10], [620, 420, 13], [700, 360, 9], [680, 560, 11], [300, 640, 10], [450, 690, 9], [560, 650, 12], [720, 680, 8], [380, 200, 8], [710, 220, 10],
  ];
  drops.forEach(([x, y, r]) => L.add('drop', drop(x, y, r), [x, y]));
  for (let i = 0; i < 9; i++) {
    const x = 270 + i * 60;
    L.line(`M${x} 180L${x - 30} 260`, 'sky1');
    L.line(`M${x + 20} 300L${x - 10} 380`, 'sky1');
  }
  // frame & bars
  L.add('frame', subtract(roundRect(205, 135, 590, 630, 14), glass), [215, 400]);
  L.add('bar', rect(490, 170, 20, 560), [500, 300]);
  L.add('bar', rect(240, 440, 520, 20), [300, 450]);
  // sill and things on it
  L.add('sill', roundRect(170, 760, 660, 42, 10), [190, 780]);
  L.add('apron', rect(205, 802, 590, 40), [220, 820]);
  mug(L, 290, 662, 96, 100);
  L.add('mugHeart', heart(338, 708, 18), [338, 708]);
  L.add('steam', ribbon((t) => [338 + 12 * Math.sin(t * 7), 650 - 110 * t], (t) => 12 * (1 - t) + 3, 24));
  for (const [a, len] of [[-1.9, 90], [-1.57, 120], [-1.25, 95]] as [number, number][]) L.add('cactus', petal(660, 690, a, 0, len, 26, 0.95));
  L.add('pot', shape([S([610, 690]), S([710, 690]), S([695, 760]), S([625, 760])]), [660, 725]);
  // curtains and rod
  const left = smooth([[40, 70], [255, 70], [230, 300], [190, 490], [205, 530], [255, 720], [300, 940], [40, 940]]);
  const right = smooth([[960, 70], [745, 70], [770, 300], [810, 490], [795, 530], [745, 720], [700, 940], [960, 940]]);
  L.add('curtain', left, [80, 300]);
  L.add('curtain', right, [920, 300]);
  L.add('tie', intersect(rect(0, 490, 1000, 40), left), [150, 510]);
  L.add('tie', intersect(rect(0, 490, 1000, 40), right), [850, 510]);
  for (const x of [90, 140, 190]) L.line(curve([[x, 80], [x + 10, 300], [x + 30, 490]]), 'curtain1');
  for (const x of [910, 860, 810]) L.line(curve([[x, 80], [x - 10, 300], [x - 30, 490]]), 'curtain2');
  L.add('rod', roundRect(30, 52, 940, 22, 11), [500, 63]);
  L.dot('finial', 30, 63, 22);
  L.dot('finial', 970, 63, 22);
  return {
    layers: L,
    inspiration: {
      wall: '#E8D5C4', sky: '#98C1D9', cloud: '#EDF6F9', hillFar: '#83C5BE', hillNear: '#5E9FA3', house: ['#F2CC8F', '#E5989B'], roof: '#6D597A', houseWin: '#FFE29A',
      drop: '#E0F7FA', frame: '#FBF5EF', bar: '#FBF5EF', sill: '#D6B89C', apron: '#C9A27E', mugH: '#B56576', mug: '#B56576', mugHeart: '#FCE1E4', steam: '#FFFFFF',
      cactus: '#588157', pot: '#E07A5F', curtain: '#3D5A80', tie: '#E9C46A', rod: '#7F5539', finial: '#B08968',
    },
  };
});

// ---------------- Reading nook ----------------
export const readingNook = layeredPage({ id: 'reading-nook', title: 'The Reading Nook', category: 'Cozy scenes', difficulty: 'detailed' }, () => {
  const L = new Layers();
  L.add('wall', rect(0, 0, 1000, 730), [30, 30]);
  L.add('floor', rect(0, 730, 1000, 270), [30, 980]);
  for (const y of [790, 860, 930]) L.line(`M0 ${y}L1000 ${y}`, 'floor1');
  // picture on the wall
  L.add('frameP', rect(330, 90, 300, 210), [345, 100]);
  L.add('art', rect(352, 112, 256, 166), [380, 130]);
  L.add('artSun', circle(540, 165, 30), [540, 165]);
  L.add('artHill', polyD([[352, 278], [430, 180], [500, 250], [560, 200], [608, 278]]), [430, 250]);
  // hanging plant
  L.add('rope', ribbon((t) => [860, 0 + 150 * t], () => 6, 4));
  const vines: [Pt, Pt, Pt][] = [[[825, 225], [790, 320], [805, 430]], [[860, 228], [880, 330], [850, 470]], [[895, 225], [930, 300], [915, 390]]];
  vines.forEach(([a, c, b], vi) => {
    const at = (t: number): Pt => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
    L.add('vine', ribbon(at, () => 6, 20));
    [0.35, 0.6, 0.85, 1].forEach((t, k) => L.add('ivy', petal(...at(t), (k + vi) % 2 ? 0.5 : 2.6, 0, 56, 18, 0.8)));
  });
  L.add('hangPot', shape([S([800, 150]), S([920, 150]), [905, 230], [815, 230]]), [860, 190]);
  // rug
  L.add('rug', ellipse(520, 880, 430, 90), [140, 880]);
  L.add('rug2', ellipse(520, 880, 330, 66), [240, 880]);
  L.add('rug3', ellipse(520, 880, 220, 42), [520, 880]);
  // floor lamp
  L.add('lampBase', ellipse(120, 860, 62, 16), [120, 860]);
  L.add('lampPole', rect(112, 300, 16, 560), [120, 600]);
  const shade = polyD([[60, 190], [180, 190], [215, 320], [25, 320]]);
  L.add('shade', shade, [120, 220]);
  L.add('shadeBand', intersect(rect(0, 280, 300, 22), shade));
  // armchair
  L.add('chairBack', smooth([[270, 420], [500, 380], [730, 420], [760, 600], [740, 760], [260, 760], [240, 600]]), [500, 450]);
  for (const x of [380, 500, 620]) L.dot('button', x, 520, 10);
  L.add('leg', rect(275, 790, 28, 60), [289, 820]);
  L.add('leg', rect(697, 790, 28, 60), [711, 820]);
  L.add('seat', roundRect(300, 640, 400, 100, 28), [500, 700]);
  L.add('arm', roundRect(200, 560, 140, 240, 50), [270, 700]);
  L.add('arm', roundRect(660, 560, 140, 240, 50), [730, 700]);
  L.add('pillow', smooth([[380, 540], [470, 520], [520, 560], [510, 650], [420, 670], [370, 620]]), [445, 600]);
  const blanket = smooth([[650, 545], [760, 535], [820, 600], [800, 760], [760, 840], [700, 820], [690, 700]]);
  L.add('blanket', blanket, [740, 640]);
  for (const y of [600, 680, 760]) L.add('blStripe', intersect(rect(600, y, 300, 22), blanket));
  // side table, books, tea
  L.add('tableTop', ellipse(880, 600, 100, 22), [880, 600]);
  L.add('tableLeg', rect(872, 620, 16, 230), [880, 740]);
  L.add('tableBase', ellipse(880, 850, 52, 12), [880, 850]);
  L.add('bookS', roundRect(820, 556, 130, 30, 6), [840, 570]);
  L.add('bookS', roundRect(830, 528, 112, 30, 6), [845, 542]);
  mug(L, 850, 470, 50, 56, 'tea');
  return {
    layers: L,
    inspiration: {
      wall: '#E2F0CB', floor: '#B08968', frameP: '#7F5539', art: '#FFEFCF', artSun: '#F6AE2D', artHill: '#81B29A', rope: '#B08968', vine: '#3A5A40', ivy: '#588157', hangPot: '#E07A5F',
      rug: '#E07A5F', rug2: '#F2CC8F', rug3: '#E07A5F', lampBase: '#3D405B', lampPole: '#3D405B', shade: '#F2CC8F', shadeBand: '#E07A5F',
      chairBack: '#2A9D8F', button: '#E9C46A', leg: '#7F5539', seat: '#2A9D8F', arm: '#1F7A8C', pillow: '#F4A261', blanket: '#FAEDCD', blStripe: '#C8553D',
      tableTop: '#8D5524', tableLeg: '#8D5524', tableBase: '#8D5524', bookS: ['#5B2A86', '#E9C46A'], teaH: '#F2E9E4', tea: '#F2E9E4',
    },
  };
});
