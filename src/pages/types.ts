export type Category =
  | 'Mandalas & geometric'
  | 'Florals & botanicals'
  | 'African-inspired'
  | 'Cozy scenes'
  | 'Nature & landscapes'
  | 'Animals'
  | 'Night sky'
  | 'Affirmations';

export type Difficulty = 'easy' | 'medium' | 'detailed';

/** One colourable area. Must be a closed path. */
export interface Region {
  id: string;
  d: string;
  /** Rough centre, used for "started for me" half-colouring and inspiration rules. */
  c?: [number, number];
  /** A tag used by inspiration colouring (e.g. "ring3-petal"). */
  g?: string;
}

/**
 * Authoring rule: regions are painted in order. A region may sit fully INSIDE an
 * earlier region (it is drawn on top of it), or beside it (sharing an edge), but
 * regions never partially overlap. That keeps every outline visible and clean.
 */
export interface Page {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  /** Page size in page units. All pages are 1000 wide. */
  w: number;
  h: number;
  regions: Region[];
  /** Extra outline-only details (never filled), e.g. veins, whiskers. Must sit inside a region. */
  decor?: string[];
  /** Colours already applied the first time the page is opened ("started for me"). */
  preFill?: Record<string, string>;
  /** A suggested colouring shown as a small reference thumbnail. */
  inspiration: Record<string, string>;
}
