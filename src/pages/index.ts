import type { Page } from './types';
import { mandalaLotus } from './mandalaLotus';
import { hibiscus } from './hibiscus';
import { breathe } from './breathe';

export const PAGES: Page[] = [mandalaLotus, hibiscus, breathe];
export const PAGE_BY_ID: Record<string, Page> = Object.fromEntries(PAGES.map((p) => [p.id, p]));

export const DIFFICULTY_LABEL: Record<Page['difficulty'], string> = {
  easy: 'Easy · about 10 min',
  medium: 'Gentle · 20–40 min',
  detailed: 'Detailed · an hour or more',
};
