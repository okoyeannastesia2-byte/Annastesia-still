import { createStore, get, set, del, entries, setMany } from 'idb-keyval';
import type { Stroke } from '../canvas/brush';

export interface Doc {
  /** region id → fill value: "#hex", "grad:#a:#b", "rad:#a:#b" or "pat:<id>:#fg:#bg" */
  fills: Record<string, string>;
  strokes: Stroke[];
}

/** One step of colouring, kept so a finished page can be replayed as a time-lapse. */
export interface Op {
  /** ms since the artwork was started */
  t: number;
  f?: [string, string | null][];
  add?: Stroke[];
  del?: string[];
}

export interface Journal {
  mood?: string;
  note?: string;
  at: number;
}

/** One colouring of a page. A page can be coloured many times. */
export interface Artwork {
  id: string;
  pageId: string;
  title?: string;
  doc: Doc;
  timeMs: number;
  status: 'in-progress' | 'finished';
  mode: 'free' | 'number';
  favourite: boolean;
  albums: string[];
  journal?: Journal;
  log: Op[];
  createdAt: number;
  updatedAt: number;
  /** small SVG data URL for the gallery */
  thumb?: string;
}

export interface Album {
  id: string;
  name: string;
}

const artStore = createStore('still-artworks', 'artworks');
const metaStore = createStore('still-coloring-meta', 'meta');
/** Stage 1–3 progress (one per page) — migrated into artworks once. */
const oldProgressStore = createStore('still-coloring', 'progress');

export const loadArtwork = (id: string) => get<Artwork>(id, artStore);
export const saveArtwork = (a: Artwork) => set(a.id, a, artStore);
export const deleteArtwork = (id: string) => del(id, artStore);
export async function loadAllArtworks(): Promise<Artwork[]> {
  const all = await entries<string, Artwork>(artStore);
  return all.map(([, a]) => a).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const loadMeta = <T>(key: string) => get<T>(key, metaStore);
export const saveMeta = <T>(key: string, value: T) => set(key, value, metaStore);

export const newArtworkId = () => `a${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Move pre-versions progress (keyed by page) into the artworks store, once. */
export async function migrateOldProgress() {
  if (await loadMeta<boolean>('migratedArtworks')) return;
  try {
    const old = await entries<string, { pageId: string; doc: Doc; timeMs: number; status: Artwork['status']; updatedAt: number; thumb?: string }>(oldProgressStore);
    const moved: [string, Artwork][] = old.map(([, p]) => {
      const id = `a_${p.pageId}`;
      return [
        id,
        {
          id,
          pageId: p.pageId,
          doc: p.doc,
          timeMs: p.timeMs,
          status: p.status,
          mode: 'free',
          favourite: false,
          albums: [],
          log: [],
          createdAt: p.updatedAt,
          updatedAt: p.updatedAt,
          thumb: p.thumb,
        },
      ];
    });
    if (moved.length) await setMany(moved, artStore);
  } catch {
    /* nothing to migrate */
  }
  await saveMeta('migratedArtworks', true);
}

/** Ask the browser to keep our data even when storage is tight. */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}
