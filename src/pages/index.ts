import type { Page } from './types';
import { mandalaLotus } from './mandalaLotus';
import { hibiscus } from './hibiscus';
import { breathe } from './breathe';
import { mandalaBloom, mandalaOcean, quietTiles } from './mandalas';
import { sunflower, tropicalLeaves, pottedPlant } from './florals';
import { adireSquares, ankaraRhythm, headwrap, calabash } from './african';
import { cafeMorning, rainyWindow, readingNook } from './cozy';
import { mountainSunset, oceanWaves, palmBeach } from './nature';
import { butterfly, peacockFeather, sleepingCat, koiPond, moonOwl } from './animals';
import { celestial, peace, slowDown, becoming } from './sky';

export const PAGES: Page[] = [
  mandalaBloom, mandalaLotus, mandalaOcean, quietTiles,
  hibiscus, sunflower, tropicalLeaves, pottedPlant,
  adireSquares, ankaraRhythm, headwrap, calabash,
  cafeMorning, rainyWindow, readingNook,
  mountainSunset, oceanWaves, palmBeach,
  butterfly, peacockFeather, sleepingCat, koiPond, moonOwl,
  celestial,
  breathe, peace, slowDown, becoming,
];
export const PAGE_BY_ID: Record<string, Page> = Object.fromEntries(PAGES.map((p) => [p.id, p]));

export const DIFFICULTY_LABEL: Record<Page['difficulty'], string> = {
  easy: 'Easy · about 10 min',
  medium: 'Gentle · 20–40 min',
  detailed: 'Detailed · an hour or more',
};

// for testing in the browser console
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__pages = PAGES;
