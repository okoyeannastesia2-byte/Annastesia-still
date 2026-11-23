import type { Page } from '../pages/types';
import type { Doc } from '../storage/db';
import { strokeLook, strokePath, type Stroke } from './brush';
import { fillAttr, fillDefs } from './fills';
import { textureDefs } from './textures';

export const INK = '#2f2925';
export const PAPER = '#ffffff';
export const LINE_W = 3.2;
/** fine inner lines and bold outer contours on pages that have contours */
export const FINE_W = 2.2;
export const BOLD_W = 4.6;
export const INKS = { ink: '#2f2925', brown: '#5b4636', grey: '#8a8580' } as const;

export function groupStrokes(strokes: Stroke[]) {
  const byRegion: Record<string, Stroke[]> = {};
  const free: Stroke[] = [];
  for (const s of strokes) {
    if (s.region) (byRegion[s.region] ??= []).push(s);
    else free.push(s);
  }
  return { byRegion, free };
}

const esc = (s: string) => s.replace(/"/g, '&quot;');
const attrs = (a: Record<string, string | number>) =>
  Object.entries(a)
    .map(([k, v]) => `${k}="${esc(String(v))}"`)
    .join(' ');

export interface RenderOpts {
  strokes?: boolean;
  lineW?: number;
  /** brush grain + paper texture (off for small thumbnails) */
  textures?: boolean;
  paper?: boolean;
  ink?: string;
}

/** Standalone SVG markup for thumbnails, the inspiration card and PNG export. */
export function pageSVG(page: Page, doc: Doc, width: number, opts: RenderOpts = {}): string {
  const height = (width * page.h) / page.w;
  const tex = opts.textures !== false;
  const { byRegion, free } = opts.strokes === false ? { byRegion: {} as Record<string, Stroke[]>, free: [] as Stroke[] } : groupStrokes(doc.strokes);
  const strokeEl = (s: Stroke) => {
    const look = strokeLook(s);
    if (!tex) {
      delete look.mask;
      delete look.filter;
    }
    return `<path d="${strokePath(s)}" ${attrs(look)}/>`;
  };
  let defs = (tex ? textureDefs(page.w, page.h) : '') + fillDefs(Object.values(doc.fills));
  let body = '';
  for (const r of page.regions) {
    body += `<path d="${r.d}" fill-rule="evenodd" fill="${esc(fillAttr(doc.fills[r.id] ?? PAPER))}"/>`;
    const st = byRegion[r.id];
    if (st?.length) {
      defs += `<clipPath id="c_${r.id}"><path d="${r.d}" clip-rule="evenodd"/></clipPath>`;
      body += `<g clip-path="url(#c_${r.id})">${st.map(strokeEl).join('')}</g>`;
    }
  }
  body += free.map(strokeEl).join('');
  if (tex && opts.paper !== false) body += `<rect width="${page.w}" height="${page.h}" fill="url(#tex_paper)" style="mix-blend-mode:multiply"/>`;
  const hasContours = !!page.contours?.length;
  const scale = (opts.lineW ?? LINE_W) / LINE_W;
  const lw = (hasContours ? FINE_W : LINE_W) * scale;
  let outlines = page.regions.map((r) => `<path d="${r.d}"/>`).join('');
  page.decor?.forEach((dec, i) => {
    const { d, clip } = typeof dec === 'string' ? { d: dec, clip: undefined } : dec;
    const reg = clip ? page.regions.find((r) => r.id === clip) : undefined;
    if (!reg) {
      outlines += `<path d="${d}" stroke-width="${lw * 0.7}"/>`;
      return;
    }
    defs += `<clipPath id="dc${i}"><path d="${reg.d}" clip-rule="evenodd"/></clipPath>`;
    outlines += `<path d="${d}" stroke-width="${lw * 0.7}" clip-path="url(#dc${i})"/>`;
  });
  if (hasContours) outlines += page.contours!.map((d) => `<path d="${d}" stroke-width="${BOLD_W * scale}"/>`).join('');
  body += `<g fill="none" stroke="${opts.ink ?? INK}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round">${outlines}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${page.w} ${page.h}"><defs>${defs}</defs><rect width="${page.w}" height="${page.h}" fill="${PAPER}"/>${body}</svg>`;
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function thumbnail(page: Page, doc: Doc) {
  return svgDataUrl(pageSVG(page, doc, 360, { lineW: 4, textures: false }));
}

if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__pageSVG = pageSVG;
