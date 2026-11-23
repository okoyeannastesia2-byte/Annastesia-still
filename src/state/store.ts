import { create } from 'zustand';
import type { Artwork, Doc, Op } from '../storage/db';
import { loadArtwork, loadMeta, newArtworkId, saveMeta } from '../storage/db';
import { loadPage } from '../pages/catalog';
import type { Page } from '../pages/types';
import type { Palette } from '../palettes/palettes';

export type Tool = 'fill' | 'brush' | 'eraser' | 'picker';
import type { BrushKind } from '../canvas/brush';
export type { BrushKind };
export type FillStyle = 'solid' | 'grad' | 'rad' | 'pat';

export interface Settings {
  panelSide: 'left' | 'right';
  theme: 'auto' | 'light' | 'dark';
  /** Allow a quick finger tap to fill even when the Apple Pencil is in use. */
  fingerFill: boolean;
  /** ambient sound volume 0..1 and the sound last chosen (never auto-plays) */
  volume: number;
  lastSound: 'rain' | 'ocean' | 'lofi';
  /** soft paper grain over the colours */
  paper: boolean;
  /** colour of the outlines */
  ink: 'ink' | 'brown' | 'grey';
}

const EMPTY: Doc = { fills: {}, strokes: [] };

interface State {
  screen: 'gallery' | 'color';
  pageId: string | null;
  /** the full page being coloured (loaded on open) */
  page: Page | null;
  artworkId: string | null;
  /** the artwork's details other than doc/time/status (which live below) */
  art: Artwork | null;
  doc: Doc;
  past: Doc[];
  future: Doc[];
  log: Op[];
  timeMs: number;
  status: 'in-progress' | 'finished';
  loaded: boolean;

  tool: Tool;
  color: string;
  /** second colour for gradients / pattern backgrounds (null = automatic soft tint) */
  color2: string | null;
  fillStyle: FillStyle;
  patternId: string;
  matchFill: boolean;
  mirror: boolean;
  brushSize: number;
  eraserSize: number;
  brushKind: BrushKind;
  stayInside: boolean;
  paletteId: string;
  recents: string[];
  myPalettes: Palette[];
  settings: Settings;
  showInspiration: boolean;
  penSeen: boolean;
  /** bumps when "zoom reset" is pressed */
  fitNonce: number;
  /** bumps when "find empty spots" is pressed */
  missedNonce: number;
  /** focus mode: hide everything but the canvas */
  focus: boolean;
  /** ambient sound currently playing */
  sound: 'off' | 'rain' | 'ocean' | 'lofi';
  finish: () => void;

  openArtwork: (id: string) => Promise<void>;
  newArtwork: (pageId: string, mode?: Artwork['mode']) => Promise<void>;
  /** open the most recent artwork of a page, or start one */
  openPage: (pageId: string) => Promise<void>;
  goGallery: () => void;
  /** Replace the doc and record an undo step (before = state to return to). */
  commit: (next: Doc, before?: Doc) => void;
  /** Replace the doc without recording history (used mid-gesture). */
  setLive: (next: Doc) => void;
  undo: () => void;
  redo: () => void;
  restart: () => void;
  useColor: (c: string) => void;
  set: (p: Partial<State>) => void;
  setSettings: (p: Partial<Settings>) => void;
  setArt: (p: Partial<Artwork>) => void;
  addTime: (ms: number) => void;
  saveMyPalettes: (p: Palette[]) => void;
}

/** Difference between two docs, as a time-lapse step. */
function diffOp(prev: Doc, next: Doc, t: number): Op | null {
  const op: Op = { t };
  if (prev.fills !== next.fills) {
    const f: [string, string | null][] = [];
    for (const k in next.fills) if (prev.fills[k] !== next.fills[k]) f.push([k, next.fills[k]]);
    for (const k in prev.fills) if (!(k in next.fills)) f.push([k, null]);
    if (f.length) op.f = f;
  }
  if (prev.strokes !== next.strokes) {
    const before = new Set(prev.strokes.map((s) => s.id));
    const after = new Set(next.strokes.map((s) => s.id));
    const add = next.strokes.filter((s) => !before.has(s.id));
    const del = prev.strokes.filter((s) => !after.has(s.id)).map((s) => s.id);
    if (add.length) op.add = add;
    if (del.length) op.del = del;
  }
  return op.f || op.add || op.del ? op : null;
}

export const useStore = create<State>((set, get) => {
  const record = (prev: Doc, next: Doc) => {
    const { art, log } = get();
    const op = diffOp(prev, next, Date.now() - (art?.createdAt ?? Date.now()));
    if (op) set({ log: [...log, op] });
  };
  return {
    screen: 'gallery',
    pageId: null,
    page: null,
    artworkId: null,
    art: null,
    doc: EMPTY,
    past: [],
    future: [],
    log: [],
    timeMs: 0,
    status: 'in-progress',
    loaded: false,

    tool: 'fill',
    color: '#F4845F',
    color2: null,
    fillStyle: 'solid',
    patternId: 'dots',
    matchFill: false,
    mirror: false,
    brushSize: 12,
    eraserSize: 22,
    brushKind: 'pencil',
    stayInside: true,
    paletteId: 'sunset',
    recents: [],
    myPalettes: [],
    settings: { panelSide: 'right', theme: 'auto', fingerFill: true, volume: 0.5, lastSound: 'rain', paper: true, ink: 'ink' },
    sound: 'off',
    showInspiration: false,
    penSeen: false,
    fitNonce: 0,
    missedNonce: 0,
    focus: false,

    async openArtwork(id) {
      set({ loaded: false, screen: 'color', past: [], future: [] });
      const a = await loadArtwork(id);
      const page = a ? await loadPage(a.pageId).catch(() => null) : null;
      if (!a || !page) {
        set({ screen: 'gallery' });
        return;
      }
      set({
        artworkId: a.id,
        pageId: a.pageId,
        page,
        art: a,
        doc: a.doc,
        log: a.log ?? [],
        timeMs: a.timeMs,
        status: a.status,
        loaded: true,
        showInspiration: false,
        mirror: false,
      });
      saveMeta('lastArtwork', id);
    },
    async newArtwork(pageId, mode = 'free') {
      set({ loaded: false, screen: 'color' });
      const page = await loadPage(pageId).catch(() => null);
      if (!page) {
        set({ screen: 'gallery' });
        return;
      }
      const now = Date.now();
      const doc: Doc = { fills: mode === 'free' ? { ...(page.preFill ?? {}) } : {}, strokes: [] };
      const art: Artwork = { id: newArtworkId(), pageId, doc, timeMs: 0, status: 'in-progress', mode, favourite: false, albums: [], log: [], createdAt: now, updatedAt: now };
      set({ screen: 'color', artworkId: art.id, pageId, page, art, doc, log: [], past: [], future: [], timeMs: 0, status: 'in-progress', loaded: true, showInspiration: false, mirror: false });
    },
    async openPage(pageId) {
      const { loadAllArtworks } = await import('../storage/db');
      const mine = (await loadAllArtworks()).filter((a) => a.pageId === pageId);
      if (mine.length) await get().openArtwork(mine[0].id);
      else await get().newArtwork(pageId);
    },
    goGallery() {
      set({ screen: 'gallery', focus: false });
    },
    commit(next, before) {
      const { doc, past } = get();
      const prev = before ?? doc;
      set({ doc: next, past: [...past, prev], future: [] });
      record(prev, next);
    },
    setLive(next) {
      set({ doc: next });
    },
    undo() {
      const { past, doc, future } = get();
      if (!past.length) return;
      const next = past[past.length - 1];
      set({ doc: next, past: past.slice(0, -1), future: [doc, ...future] });
      record(doc, next);
    },
    redo() {
      const { past, doc, future } = get();
      if (!future.length) return;
      const next = future[0];
      set({ doc: next, past: [...past, doc], future: future.slice(1) });
      record(doc, next);
    },
    restart() {
      const { page, art } = get();
      if (!page) return;
      get().commit({ fills: art?.mode === 'number' ? {} : { ...(page.preFill ?? {}) }, strokes: [] });
      set({ status: 'in-progress', timeMs: 0 });
    },
    useColor(c) {
      if (!c.startsWith('#')) return;
      const recents = [c, ...get().recents.filter((r) => r.toLowerCase() !== c.toLowerCase())].slice(0, 12);
      set({ recents });
      saveMeta('recents', recents);
    },
    set: (p) => set(p),
    setSettings(p) {
      const settings = { ...get().settings, ...p };
      set({ settings });
      saveMeta('settings', settings);
    },
    setArt(p) {
      const art = get().art;
      if (art) set({ art: { ...art, ...p } });
    },
    finish() {
      set({ status: 'finished' });
    },
    addTime(ms) {
      set({ timeMs: get().timeMs + ms });
    },
    saveMyPalettes(p) {
      set({ myPalettes: p });
      saveMeta('myPalettes', p);
    },
  };
});

export async function hydrateMeta() {
  const [settings, recents, prefs, myPalettes] = await Promise.all([
    loadMeta<Settings>('settings'),
    loadMeta<string[]>('recents'),
    loadMeta<Partial<State>>('prefs'),
    loadMeta<Palette[]>('myPalettes'),
  ]);
  useStore.setState({
    ...(settings ? { settings: { ...useStore.getState().settings, ...settings } } : {}),
    ...(recents ? { recents } : {}),
    ...(myPalettes ? { myPalettes } : {}),
    ...(prefs ?? {}),
  });
}

/** Tool preferences we remember between sessions. */
export function savePrefs() {
  const s = useStore.getState();
  saveMeta('prefs', {
    color: s.color,
    color2: s.color2,
    fillStyle: s.fillStyle,
    patternId: s.patternId,
    matchFill: s.matchFill,
    brushSize: s.brushSize,
    eraserSize: s.eraserSize,
    brushKind: s.brushKind,
    stayInside: s.stayInside,
    paletteId: s.paletteId,
    tool: s.tool === 'picker' ? 'fill' : s.tool,
  });
}

// handy for testing in the browser console
if (typeof window !== 'undefined') (window as unknown as { __still: typeof useStore }).__still = useStore;
