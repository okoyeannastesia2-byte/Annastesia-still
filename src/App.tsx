import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './state/store';
import { PAGE_BY_ID } from './pages';
import { ColoringCanvas } from './canvas/ColoringCanvas';
import { ColorPanel } from './ui/ColorPanel';
import { Toolbar } from './ui/Toolbar';
import { Gallery } from './ui/Gallery';
import { ExportSheet, SettingsSheet } from './ui/Sheets';
import { FinishedSheet, FocusDot, SoundSheet } from './ui/Calm';
import { pageSVG, svgDataUrl, thumbnail } from './canvas/render';
import { saveProgress } from './storage/db';

export default function App() {
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.settings.theme);
  useTheme(theme);
  useAutoSave();
  useCalmClock();
  useShortcuts();
  return screen === 'gallery' ? <Gallery /> : <ColoringScreen />;
}

function ColoringScreen() {
  const pageId = useStore((s) => s.pageId);
  const loaded = useStore((s) => s.loaded);
  const side = useStore((s) => s.settings.panelSide);
  const showInspiration = useStore((s) => s.showInspiration);
  const focus = useStore((s) => s.focus);
  const [sheet, setSheet] = useState<'settings' | 'export' | 'sound' | 'finished' | null>(null);
  const page = pageId ? PAGE_BY_ID[pageId] : null;
  if (!page) return null;
  return (
    <div className={`color-screen panel-${side}${focus ? ' focus' : ''}`}>
      {!focus && <ColorPanel />}
      <main className="stage">
        {loaded ? <ColoringCanvas key={page.id} page={page} /> : <div className="loading">Opening…</div>}
        {!focus && <Toolbar onExport={() => setSheet('export')} onSettings={() => setSheet('settings')} onSound={() => setSheet('sound')} />}
        {!focus && showInspiration && <Inspiration pageId={page.id} />}
        {focus && <FocusDot />}
      </main>
      {sheet === 'settings' && (
        <SettingsSheet
          onClose={() => setSheet(null)}
          onFinish={() => {
            useStore.getState().finish();
            setSheet('finished');
          }}
        />
      )}
      {sheet === 'export' && <ExportSheet onClose={() => setSheet(null)} />}
      {sheet === 'sound' && <SoundSheet onClose={() => setSheet(null)} />}
      {sheet === 'finished' && <FinishedSheet onClose={() => setSheet(null)} onExport={() => setSheet('export')} />}
    </div>
  );
}

function Inspiration({ pageId }: { pageId: string }) {
  const page = PAGE_BY_ID[pageId];
  const src = useMemo(() => svgDataUrl(pageSVG(page, { fills: page.inspiration, strokes: [] }, 400, { lineW: 4 })), [page]);
  return (
    <div className="inspiration" onClick={() => useStore.getState().set({ showInspiration: false })}>
      <img src={src} alt="A colour idea for this page" />
      <span>An idea — follow it or don't</span>
    </div>
  );
}

function useTheme(theme: 'auto' | 'light' | 'dark') {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1f1b18' : '#f6f1ea');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

/** Saves progress shortly after every change, and immediately when the app is hidden. */
function useAutoSave() {
  const timer = useRef<number>();
  const thumbCache = useRef<{ doc: unknown; url: string } | null>(null);
  useEffect(() => {
    const flush = () => {
      window.clearTimeout(timer.current);
      const s = useStore.getState();
      if (!s.pageId || !s.loaded) return;
      const page = PAGE_BY_ID[s.pageId];
      if (thumbCache.current?.doc !== s.doc) thumbCache.current = { doc: s.doc, url: thumbnail(page, s.doc) };
      saveProgress({ pageId: s.pageId, doc: s.doc, timeMs: s.timeMs, status: s.status, updatedAt: Date.now(), thumb: thumbCache.current.url });
    };
    const unsub = useStore.subscribe((s, prev) => {
      if (!s.loaded || !prev.loaded || s.pageId !== prev.pageId) return;
      if (s.doc === prev.doc && s.status === prev.status && s.timeMs === prev.timeMs) return;
      // only start saving once something was actually coloured (or progress exists)
      if (s.past.length === 0 && s.timeMs === 0 && s.doc === prev.doc && s.status === prev.status) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 700);
    });
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    // leaving a page saves too
    const unsubScreen = useStore.subscribe((s, prev) => {
      if (prev.screen === 'color' && s.screen === 'gallery' && prev.past.length) flush();
    });
    return () => {
      unsub();
      unsubScreen();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
}

/** Counts only calm, active minutes: the app is visible and you touched it in the last 90 s. */
function useCalmClock() {
  useEffect(() => {
    let last = 0;
    const touch = () => (last = Date.now());
    window.addEventListener('pointerdown', touch, true);
    const id = window.setInterval(() => {
      const s = useStore.getState();
      if (s.screen !== 'color' || !s.loaded || document.visibilityState !== 'visible') return;
      if (Date.now() - last > 90_000) return;
      if (s.past.length === 0 && s.timeMs === 0) return; // not started yet
      s.addTime(5000);
    }, 5000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pointerdown', touch, true);
    };
  }, []);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      const s = useStore.getState();
      if (e.shiftKey) s.redo();
      else s.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
