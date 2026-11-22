import { useMemo, useRef, useState } from 'react';
import { PALETTES, type Palette } from '../palettes/palettes';
import { harmonies, paletteFromImage } from '../palettes/harmony';
import { useStore, savePrefs } from '../state/store';
import { PAGE_BY_ID } from '../pages';
import { Icon } from './Icon';

export function ColorPanel() {
  const color = useStore((s) => s.color);
  const paletteId = useStore((s) => s.paletteId);
  const recents = useStore((s) => s.recents);
  const myPalettes = useStore((s) => s.myPalettes);
  const pageId = useStore((s) => s.pageId);
  const set = useStore((s) => s.set);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // the page's own palette, taken from its colour idea
  const pagePalette: Palette | null = useMemo(() => {
    const page = pageId ? PAGE_BY_ID[pageId] : null;
    if (!page) return null;
    const colors = [...new Set(Object.values(page.inspiration).filter((c) => c.startsWith('#')).map((c) => c.toUpperCase()))].slice(0, 16);
    return { id: 'page', name: 'This page', colors };
  }, [pageId]);

  const all: Palette[] = [...(pagePalette ? [pagePalette] : []), ...PALETTES, ...myPalettes];
  const palette = all.find((p) => p.id === paletteId) ?? all[0];
  const isMine = palette.id.startsWith('my-');
  const suggestions = useMemo(() => harmonies(color), [color]);

  const choose = (c: string) => {
    const st = useStore.getState();
    // choosing a colour while erasing or picking switches back to filling
    set({ color: c, ...(st.tool === 'eraser' || st.tool === 'picker' ? { tool: 'fill' as const } : {}) });
    savePrefs();
  };
  const choosePalette = (id: string) => {
    set({ paletteId: id });
    setEditing(false);
    savePrefs();
  };
  const st = useStore.getState;
  const updateMine = (p: Palette) => st().saveMyPalettes(st().myPalettes.map((x) => (x.id === p.id ? p : x)));
  const addPalette = (name: string, colors: string[]) => {
    const p: Palette = { id: `my-${Date.now().toString(36)}`, name, colors };
    st().saveMyPalettes([...st().myPalettes, p]);
    choosePalette(p.id);
  };

  const sw = (c: string, small = false, onClick = () => choose(c)) => (
    <button key={c + small} className={`swatch${small ? ' small' : ''}${c.toLowerCase() === color.toLowerCase() ? ' sel' : ''}`} style={{ background: c }} onClick={onClick} aria-label={c} />
  );

  return (
    <aside className="color-panel">
      <div className="current">
        <label className="current-dot" style={{ background: color }} title="Choose any colour">
          <input type="color" value={color} onChange={(e) => choose(e.target.value)} onBlur={() => st().useColor(st().color)} />
        </label>
        <div>
          <div className="current-name">{palette.name}</div>
          <div className="current-hex">{color.toUpperCase()}</div>
        </div>
      </div>

      <div className="swatches">
        {palette.colors.map((c, i) =>
          isMine && editing ? (
            <button key={c + i} className="swatch editing" style={{ background: c }} onClick={() => updateMine({ ...palette, colors: palette.colors.filter((_, j) => j !== i) })} aria-label={`Remove ${c}`}>
              <Icon name="close" size={16} />
            </button>
          ) : (
            sw(c)
          ),
        )}
        {isMine ? (
          <button className="swatch add" onClick={() => !palette.colors.includes(color) && updateMine({ ...palette, colors: [...palette.colors, color] })} title="Add the current colour">
            <Icon name="plus" size={18} />
          </button>
        ) : (
          <label className="swatch custom" title="Custom colour">
            <input type="color" value={color} onChange={(e) => choose(e.target.value)} onBlur={() => st().useColor(st().color)} />
          </label>
        )}
      </div>
      {isMine && (
        <div className="row-mini">
          <button className="link-btn" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit colours'}
          </button>
          <button
            className="link-btn danger"
            onClick={() => {
              if (confirm(`Delete the palette “${palette.name}”?`)) {
                st().saveMyPalettes(st().myPalettes.filter((p) => p.id !== palette.id));
                choosePalette('sunset');
              }
            }}
          >
            Delete palette
          </button>
        </div>
      )}

      <div className="panel-label">Goes well with</div>
      <div className="harmonies">
        {suggestions.map((g) => (
          <div key={g.name} className="harmony-row" title={g.name}>
            {g.colors.map((c) => sw(c, true))}
          </div>
        ))}
      </div>

      <div className="panel-label">Recent</div>
      <div className="recents">
        {recents.length === 0 && <span className="muted">Colours you use will gather here</span>}
        {recents.map((c) => sw(c, true))}
      </div>

      <div className="panel-label">Palettes</div>
      <div className="palette-list">
        {all.map((p) => (
          <button key={p.id} className={`palette-chip${p.id === palette.id ? ' on' : ''}`} onClick={() => choosePalette(p.id)}>
            <span className="strip" style={{ background: `linear-gradient(90deg, ${p.colors.filter((_, i) => i % 2 === 0).join(',') || '#ddd, #eee'})` }} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <div className="panel-actions">
        <button className="soft-btn small-btn" disabled={!recents.length} onClick={() => addPalette(`My palette ${myPalettes.length + 1}`, recents.slice(0, 12))}>
          <Icon name="plus" size={16} /> Save recent colours
        </button>
        <button className="soft-btn small-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="photo" size={16} /> {busy ? 'Reading photo…' : 'Palette from a photo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true);
            try {
              const colors = await paletteFromImage(f, 10);
              if (colors.length) addPalette(`Photo palette ${myPalettes.filter((p) => p.name.startsWith('Photo')).length + 1}`, colors);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </aside>
  );
}
