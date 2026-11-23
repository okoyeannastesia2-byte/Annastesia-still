// Builds every page once, ahead of time:
//   src/pages/generated/manifest.json   light catalogue for the gallery
//   src/pages/generated/pages/<id>.json full page (regions, outlines, colour idea), loaded on open
//   public/thumbs/<id>.svg              gallery thumbnail
// so the iPad never runs the heavy geometry and only loads the page you open.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { PAGES } from '../src/pages/all';
import { lighten, makeContours, wobble } from '../src/pages/finish';
import { pageSVG } from '../src/canvas/render';
import type { Page, PageMeta } from '../src/pages/types';

const only = process.argv[2]?.split(',');
rmSync('src/pages/generated/pages', { recursive: true, force: !only });
mkdirSync('src/pages/generated/pages', { recursive: true });
mkdirSync('public/thumbs', { recursive: true });

const manifest: PageMeta[] = [];
for (const p of PAGES) {
  const t0 = performance.now();
  if (only && !only.includes(p.id)) {
    manifest.push(metaOf(p));
    continue;
  }
  let page: Page = { ...p, regions: p.regions, decor: p.decor, inspiration: p.inspiration, preFill: p.preFill };
  page.contours = p.contours ?? makeContours(page);
  if (!p.crisp) page = { ...page, ...wobble(page) };
  const data = {
    id: page.id, title: page.title, category: page.category, difficulty: page.difficulty, w: page.w, h: page.h,
    symmetry: page.symmetry, regions: page.regions, decor: page.decor, contours: page.contours, inspiration: page.inspiration, preFill: page.preFill,
  };
  writeFileSync(`src/pages/generated/pages/${page.id}.json`, JSON.stringify(data));
  writeFileSync(`public/thumbs/${page.id}.svg`, pageSVG(lighten(page), { fills: { ...(page.preFill ?? {}) }, strokes: [] }, 360, { textures: false, lineW: 3.2 }));
  manifest.push(metaOf(page));
  console.log(`${page.id.padEnd(22)} ${String(page.regions.length).padStart(4)} regions  ${Math.round(performance.now() - t0)} ms`);
}
writeFileSync('src/pages/generated/manifest.json', JSON.stringify(manifest, null, 1));

function metaOf(p: Page): PageMeta {
  return {
    id: p.id, title: p.title, category: p.category, difficulty: p.difficulty, w: p.w, h: p.h, symmetry: p.symmetry,
    started: !!p.preFill && Object.keys(p.preFill).length > 0, regionCount: p.regions.length,
  };
}
