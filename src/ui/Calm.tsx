import { useMemo, useRef, useState } from 'react';
import { useStore, savePrefs, type Tool } from '../state/store';
import { PALETTES } from '../palettes/palettes';
import { PAGE_BY_ID } from '../pages';
import { playAmbience, setAmbienceVolume, type Ambience } from '../audio/ambient';
import { thumbnail } from '../canvas/render';
import { Sheet } from './Sheets';
import { Icon } from './Icon';

const SOUNDS: [Ambience | 'off', string, string][] = [
  ['off', 'Silence', '🤍'],
  ['rain', 'Gentle rain', '🌧️'],
  ['ocean', 'Ocean waves', '🌊'],
  ['lofi', 'Soft lo-fi', '🎧'],
];

export function SoundSheet({ onClose }: { onClose: () => void }) {
  const sound = useStore((s) => s.sound);
  const volume = useStore((s) => s.settings.volume);
  const choose = (k: Ambience | 'off') => {
    playAmbience(k, volume);
    useStore.getState().set({ sound: k });
    if (k !== 'off') useStore.getState().setSettings({ lastSound: k });
  };
  return (
    <Sheet title="Sounds" onClose={onClose}>
      <div className="sound-grid">
        {SOUNDS.map(([k, label, emoji]) => (
          <button key={k} className={`sound-chip${sound === k ? ' on' : ''}`} onClick={() => choose(k)}>
            <span className="emoji">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
      <label className="row">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => {
            useStore.getState().setSettings({ volume: +e.target.value });
            setAmbienceVolume(+e.target.value);
          }}
        />
      </label>
      <p className="muted small">Sounds are made live on your iPad, so they work offline too. They fade in softly and pause when you leave the app.</p>
    </Sheet>
  );
}

/** Focus mode: only the page and a small floating colour dot. */
export function FocusDot() {
  const color = useStore((s) => s.color);
  const tool = useStore((s) => s.tool);
  const paletteId = useStore((s) => s.paletteId);
  const side = useStore((s) => s.settings.panelSide);
  const [open, setOpen] = useState(false);
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  const set = useStore((s) => s.set);
  const pickTool = (t: Tool) => {
    set({ tool: t });
    savePrefs();
  };
  return (
    <div className={`focus-dot-wrap ${side}`}>
      {open && (
        <div className="focus-pop">
          <div className="focus-swatches">
            {palette.colors.map((c) => (
              <button
                key={c}
                className={`swatch${c.toLowerCase() === color.toLowerCase() ? ' sel' : ''}`}
                style={{ background: c }}
                onClick={() => {
                  set({ color: c, ...(tool === 'eraser' ? { tool: 'fill' as const } : {}) });
                  savePrefs();
                }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="focus-tools">
            {(['fill', 'brush', 'eraser'] as const).map((t) => (
              <button key={t} className={`tb-btn${tool === t ? ' active' : ''}`} onClick={() => pickTool(t)} aria-label={t}>
                <Icon name={t} />
              </button>
            ))}
            <button className="tb-btn" onClick={() => useStore.getState().undo()} aria-label="Undo">
              <Icon name="undo" />
            </button>
            <button className="soft-btn small-btn" onClick={() => set({ focus: false })}>
              Show tools
            </button>
          </div>
        </div>
      )}
      <button className="focus-dot" style={{ background: color }} onClick={() => setOpen(!open)} aria-label="Colours" />
    </div>
  );
}

export function minutesNote(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'You spent a few calm moments on this 🌿';
  if (m === 1) return 'You spent 1 calm minute on this 🌿';
  if (m < 120) return `You spent ${m} calm minutes on this 🌿`;
  const h = Math.floor(m / 60);
  return `You spent ${h} calm hours and ${m % 60} minutes on this 🌿`;
}

export function FinishedSheet({ onClose, onExport }: { onClose: () => void; onExport: () => void }) {
  const pageId = useStore((s) => s.pageId);
  const doc = useStore((s) => s.doc);
  const timeMs = useStore((s) => s.timeMs);
  const page = pageId ? PAGE_BY_ID[pageId] : null;
  const src = useMemo(() => (page ? thumbnail(page, doc) : ''), [page, doc]);
  const closing = useRef(false);
  if (!page) return null;
  return (
    <Sheet title="Finished" onClose={onClose}>
      <div className="finished">
        <img src={src} alt="" />
        <p className="finished-note">{minutesNote(timeMs)}</p>
        <p className="muted small">It now rests in your gallery under “Finished”. You can always come back and add more.</p>
        <div className="row-btns">
          <button className="soft-btn primary" onClick={onExport}>
            Save image
          </button>
          <button
            className="soft-btn"
            onClick={() => {
              if (closing.current) return;
              closing.current = true;
              onClose();
              useStore.getState().goGallery();
            }}
          >
            Back to gallery
          </button>
          <button className="soft-btn" onClick={onClose}>
            Keep colouring
          </button>
        </div>
      </div>
    </Sheet>
  );
}
