import { PALETTES } from '../palettes/palettes';
import { useStore, savePrefs } from '../state/store';

export function ColorPanel() {
  const color = useStore((s) => s.color);
  const paletteId = useStore((s) => s.paletteId);
  const recents = useStore((s) => s.recents);
  const set = useStore((s) => s.set);
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];

  const choose = (c: string) => {
    const st = useStore.getState();
    // choosing a colour while erasing switches back to the last colouring tool
    set({ color: c, ...(st.tool === 'eraser' ? { tool: 'fill' as const } : {}) });
    savePrefs();
  };

  return (
    <aside className="color-panel">
      <div className="current">
        <span className="current-dot" style={{ background: color }} />
        <div>
          <div className="current-name">{palette.name}</div>
          <div className="current-hex">{color.toUpperCase()}</div>
        </div>
      </div>

      <div className="swatches">
        {palette.colors.map((c) => (
          <button
            key={c}
            className={`swatch${c.toLowerCase() === color.toLowerCase() ? ' sel' : ''}`}
            style={{ background: c }}
            onClick={() => choose(c)}
            aria-label={c}
          />
        ))}
        <label className="swatch custom" title="Custom colour">
          <input
            type="color"
            value={color}
            onChange={(e) => choose(e.target.value)}
            onBlur={() => useStore.getState().useColor(useStore.getState().color)}
          />
        </label>
      </div>

      <div className="panel-label">Recent</div>
      <div className="recents">
        {recents.length === 0 && <span className="muted">Colours you use will gather here</span>}
        {recents.map((c) => (
          <button key={c} className={`swatch small${c.toLowerCase() === color.toLowerCase() ? ' sel' : ''}`} style={{ background: c }} onClick={() => choose(c)} aria-label={c} />
        ))}
      </div>

      <div className="panel-label">Palettes</div>
      <div className="palette-list">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            className={`palette-chip${p.id === paletteId ? ' on' : ''}`}
            onClick={() => {
              set({ paletteId: p.id });
              savePrefs();
            }}
          >
            <span className="strip" style={{ background: `linear-gradient(90deg, ${p.colors.filter((_, i) => i % 2 === 0).join(',')})` }} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
