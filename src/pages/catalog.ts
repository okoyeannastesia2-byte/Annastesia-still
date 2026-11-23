/** What the app ships: a light catalogue, and each full page loaded only when opened. */
import type { Page, PageMeta } from './types';
import manifest from './generated/manifest.json';

export const PAGES: PageMeta[] = manifest as PageMeta[];
export const META_BY_ID: Record<string, PageMeta> = Object.fromEntries(PAGES.map((p) => [p.id, p]));

export const DIFFICULTY_LABEL: Record<PageMeta['difficulty'], string> = {
  easy: 'Easy · about 10 min',
  medium: 'Gentle · 20–40 min',
  detailed: 'Detailed · an hour or more',
};

const files = import.meta.glob<Page>('./generated/pages/*.json', { import: 'default' });
const cache = new Map<string, Promise<Page>>();

export function loadPage(id: string): Promise<Page> {
  if (!cache.has(id)) {
    const load = files[`./generated/pages/${id}.json`];
    if (!load) return Promise.reject(new Error(`No page ${id}`));
    cache.set(id, load());
  }
  return cache.get(id)!;
}

export const thumbUrl = (id: string) => `${import.meta.env.BASE_URL}thumbs/${id}.svg`;

if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__loadPage = loadPage;
