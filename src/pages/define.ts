import type { Decor, Page, Region } from './types';
import { colorByGroup } from './geometry';
import { flatten } from './flatten';
import type { Layers } from './shapes';
import generated from './generated.json';

interface Cached {
  regions: Region[];
  decor: Decor[];
  inspiration: Record<string, string>;
  preFill?: Record<string, string>;
}
/** Pages flattened ahead of time by `npm run pages` (so the iPad never has to). */
const GENERATED = generated as unknown as Record<string, Cached>;
declare global {
  // set by scripts/prerender-pages.ts so pages are computed fresh
  var __STILL_PRERENDER: boolean | undefined;
}

type Meta = Pick<Page, 'id' | 'title' | 'category' | 'difficulty'> & { w?: number; h?: number };
interface Built {
  layers: Layers;
  /** inspiration colours by group tag (an array cycles through the group) */
  inspiration: Record<string, string | string[]>;
  /** pick which inspiration colours come pre-applied ("started for me") */
  preFill?: (regions: Region[], inspiration: Record<string, string>) => Record<string, string>;
}

/**
 * A page drawn as overlapping layers (back → front). The shapes are flattened into
 * clean, separate regions the first time the page is needed.
 */
export function layeredPage(meta: Meta, build: () => Built): Page {
  const w = meta.w ?? 1000;
  const h = meta.h ?? 1000;
  let cache: Cached | null = null;
  const get = () => {
    if (!cache && !globalThis.__STILL_PRERENDER && GENERATED[meta.id]) cache = GENERATED[meta.id];
    if (!cache) {
      const b = build();
      const regions = flatten(b.layers.regions, w, h);
      const inspiration = colorByGroup(regions, b.inspiration);
      cache = { regions, decor: b.layers.decor, inspiration, preFill: b.preFill?.(regions, inspiration) };
    }
    return cache;
  };
  return {
    ...meta,
    w,
    h,
    layered: true,
    get regions() {
      return get().regions;
    },
    get decor() {
      return get().decor;
    },
    get inspiration() {
      return get().inspiration;
    },
    get preFill() {
      return get().preFill;
    },
  };
}

/** Regular (already non-overlapping) page with inspiration by group. */
export function plainPage(meta: Meta, regions: Region[], inspiration: Record<string, string | string[]>, preFill?: (r: Region[], i: Record<string, string>) => Record<string, string>, decor?: Decor[]): Page {
  const insp = colorByGroup(regions, inspiration);
  return { ...meta, w: meta.w ?? 1000, h: meta.h ?? 1000, regions, decor, inspiration: insp, preFill: preFill?.(regions, insp) };
}

export const pick = (regions: Region[], insp: Record<string, string>, test: (r: Region) => boolean) => {
  const out: Record<string, string> = {};
  for (const r of regions) if (insp[r.id] && test(r)) out[r.id] = insp[r.id];
  return out;
};
