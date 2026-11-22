/**
 * Tileable grain textures, generated once on the device (no image files).
 * Used as SVG masks (pencil / crayon / watercolour grain) and as the paper overlay.
 */
type TexKind = 'pencil' | 'crayon' | 'wash' | 'paper';

const cache: Partial<Record<TexKind, string>> = {};
export const TEX_PX = 128;
/** page units covered by one tile */
export const TEX_UNITS = 150;

function rand(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function texture(kind: TexKind): string {
  if (cache[kind]) return cache[kind]!;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = c.height = TEX_PX;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(TEX_PX, TEX_PX);
  const r = rand(kind.length * 7919);
  // value noise on a coarse grid, wrapped so the tile repeats seamlessly
  const grid = (cells: number) => {
    const g = Array.from({ length: cells * cells }, () => r());
    return (x: number, y: number) => {
      const fx = (x / TEX_PX) * cells;
      const fy = (y / TEX_PX) * cells;
      const x0 = Math.floor(fx) % cells;
      const y0 = Math.floor(fy) % cells;
      const x1 = (x0 + 1) % cells;
      const y1 = (y0 + 1) % cells;
      const tx = fx - Math.floor(fx);
      const ty = fy - Math.floor(fy);
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const a = g[y0 * cells + x0] * (1 - sx) + g[y0 * cells + x1] * sx;
      const b = g[y1 * cells + x0] * (1 - sx) + g[y1 * cells + x1] * sx;
      return a * (1 - sy) + b * sy;
    };
  };
  const coarse = grid(8);
  const mid = grid(32);
  for (let y = 0; y < TEX_PX; y++)
    for (let x = 0; x < TEX_PX; x++) {
      const fine = r();
      // paper tooth: mostly fine grain with a little slanted fibre
      const fibre = Math.sin((x + y * 0.35) * 0.9) * 0.5 + 0.5;
      let v: number;
      if (kind === 'pencil') v = 0.62 + 0.38 * (0.55 * fine + 0.3 * mid(x, y) + 0.15 * fibre);
      else if (kind === 'crayon') v = Math.min(1, Math.max(0, (0.6 * mid(x, y) + 0.4 * fine - 0.22) * 2.2));
      else if (kind === 'wash') v = 0.55 + 0.45 * (0.6 * coarse(x, y) + 0.4 * mid(x, y));
      else v = 0.962 + 0.038 * (0.6 * fine + 0.25 * mid(x, y) + 0.15 * fibre);
      const i = (y * TEX_PX + x) * 4;
      const g = Math.round(v * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return (cache[kind] = c.toDataURL('image/png'));
}

/** SVG <defs> markup for brush masks, the soft-brush blur and the paper overlay pattern. */
export function textureDefs(w: number, h: number): string {
  const tile = (kind: TexKind) =>
    `<pattern id="tex_${kind}" patternUnits="userSpaceOnUse" width="${TEX_UNITS}" height="${TEX_UNITS}"><image href="${texture(kind)}" width="${TEX_UNITS}" height="${TEX_UNITS}"/></pattern>`;
  const mask = (kind: TexKind) =>
    // the mask area follows each stroke's own box, so only a small buffer is drawn per stroke
    `<mask id="m_${kind}" x="-0.1" y="-0.1" width="1.2" height="1.2"><rect x="-50" y="-50" width="${w + 100}" height="${h + 100}" fill="url(#tex_${kind})"/></mask>`;
  return (
    tile('pencil') + tile('crayon') + tile('wash') + tile('paper') +
    mask('pencil') + mask('crayon') + mask('wash') +
    `<filter id="f_soft" filterUnits="userSpaceOnUse" x="-50" y="-50" width="${w + 100}" height="${h + 100}"><feGaussianBlur stdDeviation="6"/></filter>`
  );
}
