# Still — a calm colouring book

A personal, offline colouring app for iPad + Apple Pencil, built as a Progressive Web App (Vite + React + TypeScript).

- **Install on iPad:** see [HOW-TO-INSTALL.md](HOW-TO-INSTALL.md)
- **Run locally:** `npm install` then `npm run dev`
- **Build:** `npm run build` (output in `dist/`). This first runs `npm run pages`, which flattens the layered pages into `src/pages/generated.json` — run it after editing any page.

## How it works
- Pages are either *plain* (shapes already side-by-side, e.g. mandalas) or *layered* (drawn back-to-front with overlaps, e.g. the café). Layered pages are flattened with `polygon-clipping` into clean, separate regions at build time (`src/pages/flatten.ts`, `scripts/prerender-pages.ts`).
- Every page is SVG. Each colourable area is its own closed path (`src/pages/*`), generated with small geometry helpers (`src/pages/geometry.ts`). Regions either sit beside each other or fully inside an earlier one — never partly overlapping — so outlines stay clean.
- Layers: fills → brush strokes (optionally clipped to the region you started in) → outlines on top, so lines can never be painted over.
- Brush strokes use Pointer Events + Apple Pencil pressure, shaped by `perfect-freehand`, stored as vectors (sharp at any zoom and in export).
- Progress auto-saves to IndexedDB (`src/storage/db.ts`). Works offline via a Workbox service worker (`vite-plugin-pwa`).
