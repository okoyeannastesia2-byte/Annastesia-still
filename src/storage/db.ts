import { createStore, get, set, del, entries } from 'idb-keyval';
import type { Stroke } from '../canvas/brush';

export interface Doc {
  fills: Record<string, string>;
  strokes: Stroke[];
}

export interface Progress {
  pageId: string;
  doc: Doc;
  timeMs: number;
  status: 'in-progress' | 'finished';
  updatedAt: number;
  /** small SVG data URL for the gallery */
  thumb?: string;
}

const progressStore = createStore('still-coloring', 'progress');
const metaStore = createStore('still-coloring-meta', 'meta');

export const loadProgress = (id: string) => get<Progress>(id, progressStore);
export const saveProgress = (p: Progress) => set(p.pageId, p, progressStore);
export const deleteProgress = (id: string) => del(id, progressStore);
export async function loadAllProgress(): Promise<Record<string, Progress>> {
  const all = await entries<string, Progress>(progressStore);
  return Object.fromEntries(all);
}

export const loadMeta = <T>(key: string) => get<T>(key, metaStore);
export const saveMeta = <T>(key: string, value: T) => set(key, value, metaStore);

/** Ask the browser to keep our data even when storage is tight. */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}
