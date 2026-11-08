// Flattens every layered page once and saves the result to src/pages/generated.json,
// so the app ships ready-made shapes and the iPad never does the heavy geometry.
import './prerender-flag';
import { writeFileSync } from 'node:fs';
import { PAGES } from '../src/pages/index';

const out: Record<string, unknown> = {};
for (const p of PAGES) {
  if (!p.layered) continue;
  const t0 = performance.now();
  out[p.id] = { regions: p.regions, decor: p.decor, inspiration: p.inspiration, preFill: p.preFill };
  console.log(`${p.id.padEnd(20)} ${String(p.regions.length).padStart(4)} regions  ${Math.round(performance.now() - t0)} ms`);
}
// run from the project root (npm run pages)
writeFileSync('src/pages/generated.json', JSON.stringify(out));
