import type { Page } from '../pages/types';
import type { Doc } from '../storage/db';
import { strokePath, type Stroke } from './brush';

export const INK = '#2f2925';
export const PAPER = '#ffffff';
export const LINE_W = 3.2;

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

/** Standalone SVG markup for thumbnails, the inspiration card and PNG export. */
export function pageSVG(page: Page, doc: Doc, width: number, opts: { strokes?: boolean; lineW?: number } = {}): string {
  const height = (width * page.h) / page.w;
  const { byRegion, free } = opts.strokes === false ? { byRegion: {}, free: [] } : groupStrokes(doc.strokes);
  const strokeEl = (s: Stroke) => `<path d="${strokePath(s)}" fill="${esc(s.color)}" fill-opacity="${s.opacity}"/>`;
  let defs = '';
  let body = '';
  for (const r of page.regions) {
    body += `<path d="${r.d}" fill-rule="evenodd" fill="${esc(doc.fills[r.id] ?? PAPER)}"/>`;
    const st = (byRegion as Record<string, Stroke[]>)[r.id];
    if (st?.length) {
      defs += `<clipPath id="c_${r.id}"><path d="${r.d}" clip-rule="evenodd"/></clipPath>`;
      body += `<g clip-path="url(#c_${r.id})">${st.map(strokeEl).join('')}</g>`;
    }
  }
  body += (free as Stroke[]).map(strokeEl).join('');
  let outlines = page.regions.map((r) => `<path d="${r.d}"/>`).join('');
  page.decor?.forEach((dec, i) => {
    const { d, clip } = typeof dec === 'string' ? { d: dec, clip: undefined } : dec;
    const reg = clip ? page.regions.find((r) => r.id === clip) : undefined;
    if (!reg) {
      outlines += `<path d="${d}" stroke-width="${(opts.lineW ?? LINE_W) * 0.7}"/>`;
      return;
    }
    defs += `<clipPath id="dc${i}"><path d="${reg.d}" clip-rule="evenodd"/></clipPath>`;
    outlines += `<path d="${d}" stroke-width="${(opts.lineW ?? LINE_W) * 0.7}" clip-path="url(#dc${i})"/>`;
  });
  body += `<g fill="none" stroke="${INK}" stroke-width="${opts.lineW ?? LINE_W}" stroke-linejoin="round" stroke-linecap="round">${outlines}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${page.w} ${page.h}"><defs>${defs}</defs>${body}</svg>`;
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function thumbnail(page: Page, doc: Doc) {
  return svgDataUrl(pageSVG(page, doc, 360, { lineW: 4 }));
}

(window as unknown as Record<string, unknown>).__pageSVG = pageSVG;
