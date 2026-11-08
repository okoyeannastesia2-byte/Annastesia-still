# Still — a calm colouring book

A personal, offline colouring app for iPad + Apple Pencil, built as a Progressive Web App (Vite + React + TypeScript).

- **Install on iPad:** see [HOW-TO-INSTALL.md](HOW-TO-INSTALL.md)
- **Run locally:** `npm install` then `npm run dev`
- **Build:** `npm run build` (output in `dist/`)

## How it works
- Every page is SVG. Each colourable area is its own closed path (`src/pages/*`), generated with small geometry helpers (`src/pages/geometry.ts`). Regions either sit beside each other or fully inside an earlier one — never partly overlapping — so outlines stay clean.
- Layers: fills → brush strokes (optionally clipped to the region you started in) → outlines on top, so lines can never be painted over.
- Brush strokes use Pointer Events + Apple Pencil pressure, shaped by `perfect-freehand`, stored as vectors (sharp at any zoom and in export).
- Progress auto-saves to IndexedDB (`src/storage/db.ts`). Works offline via a Workbox service worker (`vite-plugin-pwa`).
