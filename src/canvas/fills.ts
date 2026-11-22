/**
 * Fill values are plain strings so saved pages stay simple:
 *   "#f4845f"                  solid
 *   "grad:#f4845f:#ffe29a"     soft linear gradient (top → bottom)
 *   "rad:#f4845f:#ffe29a"      glow (centre → edge)
 *   "pat:dots:#264653:#e9c46a" pattern, foreground on background
 */
export interface PatternDef {
  id: string;
  name: string;
  size: number;
  /** SVG for one tile; FG / BG are replaced with colours */
  tile: string;
}

export const PATTERNS: PatternDef[] = [
  { id: 'dots', name: 'Adire dots', size: 22, tile: '<circle cx="5.5" cy="5.5" r="3.2" fill="FG"/><circle cx="16.5" cy="16.5" r="3.2" fill="FG"/>' },
  { id: 'circles', name: 'Ankara rings', size: 40, tile: '<circle cx="20" cy="20" r="13" fill="none" stroke="FG" stroke-width="4"/><circle cx="20" cy="20" r="4" fill="FG"/><circle cx="0" cy="0" r="6" fill="FG"/><circle cx="40" cy="0" r="6" fill="FG"/><circle cx="0" cy="40" r="6" fill="FG"/><circle cx="40" cy="40" r="6" fill="FG"/>' },
  { id: 'stripes', name: 'Stripes', size: 20, tile: '<path d="M-5 5L5 -5M-5 25L25 -5M15 25L25 15" stroke="FG" stroke-width="5"/>' },
  { id: 'linen', name: 'Linen', size: 12, tile: '<path d="M0 3H12M0 9H12" stroke="FG" stroke-width="1.4" opacity=".55"/><path d="M3 0V12M9 0V12" stroke="FG" stroke-width="1.1" opacity=".4"/>' },
  { id: 'stars', name: 'Little stars', size: 34, tile: '<path d="M10 3l2 5 5 .4-4 3.3 1.3 5-4.3-2.8-4.3 2.8L7 11.7 3 8.4 8 8z" fill="FG"/><circle cx="26" cy="26" r="2" fill="FG"/>' },
  { id: 'waves', name: 'Waves', size: 28, tile: '<path d="M0 10q7-8 14 0t14 0M0 24q7-8 14 0t14 0" fill="none" stroke="FG" stroke-width="3"/>' },
  { id: 'checks', name: 'Checks', size: 24, tile: '<rect width="12" height="12" fill="FG"/><rect x="12" y="12" width="12" height="12" fill="FG"/>' },
  { id: 'leaves', name: 'Leaves', size: 36, tile: '<path d="M8 28C8 16 16 8 28 8 28 20 20 28 8 28Z" fill="FG"/><path d="M8 28L22 14" stroke="BG" stroke-width="1.5"/>' },
];

export type ParsedFill =
  | { kind: 'solid'; a: string }
  | { kind: 'grad' | 'rad'; a: string; b: string }
  | { kind: 'pat'; id: string; a: string; b: string };

export function parseFill(v: string): ParsedFill {
  const p = v.split(':');
  if (p[0] === 'grad' || p[0] === 'rad') return { kind: p[0], a: p[1], b: p[2] };
  if (p[0] === 'pat') return { kind: 'pat', id: p[1], a: p[2], b: p[3] };
  return { kind: 'solid', a: v };
}

export const fillId = (v: string) => 'f_' + v.replace(/[^a-z0-9]/gi, '_');

/** What to put in an SVG fill attribute for a stored fill value. */
export const fillAttr = (v: string) => (v.startsWith('#') ? v : `url(#${fillId(v)})`);

/** <defs> content for every non-solid fill in use. */
export function fillDefs(values: Iterable<string>): string {
  let out = '';
  const seen = new Set<string>();
  for (const v of values) {
    if (v.startsWith('#') || seen.has(v)) continue;
    seen.add(v);
    const f = parseFill(v);
    const id = fillId(v);
    if (f.kind === 'grad') {
      out += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.a}"/><stop offset="1" stop-color="${f.b}"/></linearGradient>`;
    } else if (f.kind === 'rad') {
      out += `<radialGradient id="${id}" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="${f.b}"/><stop offset="1" stop-color="${f.a}"/></radialGradient>`;
    } else if (f.kind === 'pat') {
      const def = PATTERNS.find((p) => p.id === f.id) ?? PATTERNS[0];
      out += `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${def.size}" height="${def.size}"><rect width="${def.size}" height="${def.size}" fill="${f.b}"/>${def.tile.replace(/FG/g, f.a).replace(/BG/g, f.b)}</pattern>`;
    }
  }
  return out;
}

// ---- colour maths (also used for colour suggestions) ----
export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** A gentle partner colour: a lighter, softer tint of the same hue. */
export function softTint(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h + 8, s * 0.75, Math.min(0.93, l + (1 - l) * 0.6));
}

/** Build the stored fill value from the current tool settings. */
export function makeFill(style: 'solid' | 'grad' | 'rad' | 'pat', a: string, b: string | null, patternId: string): string {
  const second = b ?? softTint(a);
  if (style === 'solid') return a;
  if (style === 'pat') return `pat:${patternId}:${a}:${second}`;
  return `${style}:${a}:${second}`;
}
