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
