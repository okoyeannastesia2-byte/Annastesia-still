import { create } from 'zustand';
import type { Doc } from '../storage/db';
import { loadMeta, loadProgress, saveMeta } from '../storage/db';
import { PAGE_BY_ID } from '../pages';

export type Tool = 'fill' | 'brush' | 'eraser';
export type BrushKind = 'pencil' | 'marker';

export interface Settings {
  panelSide: 'left' | 'right';
  theme: 'auto' | 'light' | 'dark';
  /** Allow a quick finger tap to fill even when the Apple Pencil is in use. */
  fingerFill: boolean;
}

const EMPTY: Doc = { fills: {}, strokes: [] };

interface State {
  screen: 'gallery' | 'color';
  pageId: string | null;
  doc: Doc;
  past: Doc[];
  future: Doc[];
  timeMs: number;
  status: 'in-progress' | 'finished';
  loaded: boolean;

  tool: Tool;
  color: string;
  brushSize: number;
  eraserSize: number;
  brushKind: BrushKind;
  stayInside: boolean;
  paletteId: string;
  recents: string[];
  settings: Settings;
  showInspiration: boolean;
  penSeen: boolean;
  /** bumps when "zoom reset" is pressed */
  fitNonce: number;
  /** focus mode: hide everything but the canvas */
  focus: boolean;

  openPage: (id: string) => Promise<void>;
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
  addTime: (ms: number) => void;
}

export const useStore = create<State>((set, get) => ({
  screen: 'gallery',
  pageId: null,
  doc: EMPTY,
  past: [],
  future: [],
  timeMs: 0,
  status: 'in-progress',
  loaded: false,

  tool: 'fill',
  color: '#F4845F',
  brushSize: 12,
  eraserSize: 22,
  brushKind: 'pencil',
  stayInside: true,
  paletteId: 'sunset',
  recents: [],
  settings: { panelSide: 'right', theme: 'auto', fingerFill: true },
  showInspiration: false,
  penSeen: false,
  fitNonce: 0,
  focus: false,

  async openPage(id) {
    const page = PAGE_BY_ID[id];
    if (!page) return;
    set({ loaded: false, pageId: id, screen: 'color', past: [], future: [] });
    const saved = await loadProgress(id);
    const doc: Doc = saved?.doc ?? { fills: { ...(page.preFill ?? {}) }, strokes: [] };
    set({ doc, timeMs: saved?.timeMs ?? 0, status: saved?.status ?? 'in-progress', loaded: true, showInspiration: false });
    saveMeta('lastPage', id);
  },
  goGallery() {
    set({ screen: 'gallery' });
  },
  commit(next, before) {
    const { doc, past } = get();
    set({ doc: next, past: [...past, before ?? doc], future: [] });
  },
  setLive(next) {
    set({ doc: next });
  },
  undo() {
    const { past, doc, future } = get();
    if (!past.length) return;
    set({ doc: past[past.length - 1], past: past.slice(0, -1), future: [doc, ...future] });
  },
  redo() {
    const { past, doc, future } = get();
    if (!future.length) return;
    set({ doc: future[0], past: [...past, doc], future: future.slice(1) });
  },
  restart() {
    const { pageId } = get();
    const page = pageId ? PAGE_BY_ID[pageId] : null;
    if (!page) return;
    get().commit({ fills: { ...(page.preFill ?? {}) }, strokes: [] });
    set({ status: 'in-progress', timeMs: 0 });
  },
  useColor(c) {
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
  addTime(ms) {
    set({ timeMs: get().timeMs + ms });
  },
}));

export async function hydrateMeta() {
  const [settings, recents, prefs] = await Promise.all([
    loadMeta<Settings>('settings'),
    loadMeta<string[]>('recents'),
    loadMeta<Partial<State>>('prefs'),
  ]);
  useStore.setState({
    ...(settings ? { settings: { ...useStore.getState().settings, ...settings } } : {}),
    ...(recents ? { recents } : {}),
    ...(prefs ?? {}),
  });
}

/** Tool preferences we remember between sessions. */
export function savePrefs() {
  const s = useStore.getState();
  saveMeta('prefs', {
    color: s.color,
    brushSize: s.brushSize,
    eraserSize: s.eraserSize,
    brushKind: s.brushKind,
    stayInside: s.stayInside,
    paletteId: s.paletteId,
    tool: s.tool,
  });
}

// handy for testing in the browser console
(window as unknown as { __still: typeof useStore }).__still = useStore;
