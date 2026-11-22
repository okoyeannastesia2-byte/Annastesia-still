import { hexToHsl, hslToHex } from '../canvas/fills';

/** Colours that sit nicely with the current one — gentle, not too loud. */
export function harmonies(hex: string): { name: string; colors: string[] }[] {
  const [h, s, l] = hexToHsl(hex);
  const soft = (hh: number, ss = s, ll = l) => hslToHex(hh, Math.min(ss, 0.75), Math.max(0.18, Math.min(0.9, ll)));
  return [
    { name: 'Lighter & deeper', colors: [soft(h, s, l + 0.28), soft(h, s, l + 0.14), soft(h, s, l - 0.14), soft(h, s, l - 0.26)] },
    { name: 'Neighbours', colors: [soft(h - 30), soft(h - 15), soft(h + 15), soft(h + 30)] },
    { name: 'Opposites', colors: [soft(h + 180, s * 0.8, l + 0.15), soft(h + 180), soft(h + 150), soft(h + 210)] },
    { name: 'Triad', colors: [soft(h + 120), soft(h + 120, s, l + 0.2), soft(h + 240), soft(h + 240, s, l + 0.2)] },
  ];
}

/** Pick ~n representative colours from a photo (small k-means in RGB). */
export async function paletteFromImage(file: File, n = 10): Promise<string[]> {
  const bmp = await createImageBitmap(file);
  const W = 96;
  const H = Math.max(1, Math.round((bmp.height / bmp.width) * W));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const px: number[][] = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) px.push([data[i], data[i + 1], data[i + 2]]);
  if (!px.length) return [];
  // spread initial centres through the sorted-by-brightness pixels
  const sorted = [...px].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centres = Array.from({ length: n }, (_, i) => [...sorted[Math.floor(((i + 0.5) / n) * sorted.length)]]);
  for (let it = 0; it < 10; it++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let best = 0;
      let bd = Infinity;
      centres.forEach((c2, j) => {
        const d = (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2;
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      const s = sums[best];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    }
    centres = centres.map((c2, j) => (sums[j][3] ? [sums[j][0] / sums[j][3], sums[j][1] / sums[j][3], sums[j][2] / sums[j][3]] : c2));
  }
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  // drop centres that are nearly the same colour
  const kept: number[][] = [];
  for (const c2 of centres) if (kept.every((k) => (k[0] - c2[0]) ** 2 + (k[1] - c2[1]) ** 2 + (k[2] - c2[2]) ** 2 > 18 ** 2)) kept.push(c2);
  return kept.map((c2) => `#${hex(c2[0])}${hex(c2[1])}${hex(c2[2])}`).sort((a, b) => hexToHsl(b)[2] - hexToHsl(a)[2]);
}
