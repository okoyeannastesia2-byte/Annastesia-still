const P: Record<string, string> = {
  fill: 'M5 11l7-7 8 8-7 7a2 2 0 01-2.8 0L5 13.8A2 2 0 015 11zM12 4L9 1M19.5 15.5s2 2.3 2 3.5a2 2 0 01-4 0c0-1.2 2-3.5 2-3.5zM5 12h14',
  brush: 'M3 21c3 0 5-1.5 5-4a2.5 2.5 0 00-5 0c0 1.5-1 2.5-1 2.5M7.5 14.5L18 4a2 2 0 013 3L10.5 17.5',
  eraser: 'M7 21h10M4.5 15.5l9-9a2 2 0 012.8 0l3.2 3.2a2 2 0 010 2.8L13 19H8.5l-4-4a2 2 0 010-2.8M9 11l5 5',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13',
  fit: 'M4 9V5a1 1 0 011-1h4M15 4h4a1 1 0 011 1v4M20 15v4a1 1 0 01-1 1h-4M9 20H5a1 1 0 01-1-1v-4',
  gallery: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  export: 'M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6',
  settings: 'M5 12h.01M12 12h.01M19 12h.01',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
};

export function Icon({ name, size = 22 }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name]} />
    </svg>
  );
}
