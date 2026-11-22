import { useStore, savePrefs, type Tool, type FillStyle } from '../state/store';
import { BRUSHES } from '../canvas/brush';
import { PATTERNS, fillAttr, fillDefs, makeFill, softTint } from '../canvas/fills';
import { PAGE_BY_ID } from '../pages';
import { Icon } from './Icon';

export function Toolbar({ onExport, onSettings, onSound }: { onExport: () => void; onSettings: () => void; onSound: () => void }) {
  const tool = useStore((s) => s.tool);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const showInspiration = useStore((s) => s.showInspiration);
  const sound = useStore((s) => s.sound);
  const st = useStore.getState;

  const pick = (t: Tool) => {
    st().set({ tool: t });
    savePrefs();
  };
  const Btn = ({ name, label, active, onClick, disabled }: { name: string; label: string; active?: boolean; onClick: () => void; disabled?: boolean }) => (
    <button className={`tb-btn${active ? ' active' : ''}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon name={name} />
      <span className="tb-label">{label}</span>
    </button>
  );

  return (
    <div className="toolbar-wrap">
      <div className="toolbar">
        <Btn name="gallery" label="Gallery" onClick={() => st().goGallery()} />
        <span className="tb-sep" />
        <Btn name="fill" label="Fill" active={tool === 'fill'} onClick={() => pick('fill')} />
        <Btn name="brush" label="Brush" active={tool === 'brush'} onClick={() => pick('brush')} />
        <Btn name="eraser" label="Eraser" active={tool === 'eraser'} onClick={() => pick('eraser')} />
        <Btn name="picker" label="Pick" active={tool === 'picker'} onClick={() => pick('picker')} />
        <span className="tb-sep" />
        <Btn name="undo" label="Undo" onClick={() => st().undo()} disabled={!canUndo} />
        <Btn name="redo" label="Redo" onClick={() => st().redo()} disabled={!canRedo} />
        <Btn name="fit" label="Fit" onClick={() => st().set({ fitNonce: st().fitNonce + 1 })} />
        <span className="tb-sep" />
        <Btn name="bulb" label="Idea" active={showInspiration} onClick={() => st().set({ showInspiration: !showInspiration })} />
        <Btn name="sound" label="Sounds" active={sound !== 'off'} onClick={onSound} />
        <Btn name="focus" label="Focus" onClick={() => st().set({ focus: true })} />
        <Btn name="export" label="Save" onClick={onExport} />
        <Btn name="settings" label="More" onClick={onSettings} />
      </div>
      <ToolOptions />
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`toggle${on ? ' on' : ''}`} onClick={onClick}>
      <span className="knob" /> {label}
    </button>
  );
}

function ToolOptions() {
  const s = useStore();
  const page = s.pageId ? PAGE_BY_ID[s.pageId] : null;
  const symmetric = !!page?.symmetry;
  const set = (p: Parameters<typeof s.set>[0]) => {
    s.set(p);
    savePrefs();
  };
  const mirror = symmetric && (
    <Toggle on={s.mirror} label={page?.symmetry?.flip ? 'Mirror' : `Mirror ×${page?.symmetry?.n}`} onClick={() => s.set({ mirror: !s.mirror })} />
  );

  if (s.tool === 'picker') {
    return (
      <div className="tool-options">
        <span className="hint">Tap any coloured area to pick up its colour</span>
      </div>
    );
  }

  if (s.tool === 'fill') {
    const second = s.color2 ?? softTint(s.color);
    const styles: [FillStyle, string][] = [
      ['solid', 'Solid'],
      ['grad', 'Gradient'],
      ['rad', 'Glow'],
      ['pat', 'Pattern'],
    ];
    const preview = makeFill(s.fillStyle, s.color, s.color2, s.patternId);
    return (
      <div className="tool-options">
        <div className="seg">
          {styles.map(([k, label]) => (
            <button key={k} className={s.fillStyle === k ? 'on' : ''} onClick={() => set({ fillStyle: k })}>
              {label}
            </button>
          ))}
        </div>
        {s.fillStyle !== 'solid' && (
          <>
            <svg className="fill-preview" viewBox="0 0 40 40" aria-hidden>
              <defs dangerouslySetInnerHTML={{ __html: fillDefs([preview]) }} />
              <rect width="40" height="40" rx="10" fill={fillAttr(preview)} />
            </svg>
            <label className="second-colour" title="Second colour">
              <span style={{ background: second }} />
              with
              <input type="color" value={second} onChange={(e) => set({ color2: e.target.value })} />
            </label>
            {s.color2 && (
              <button className="link-btn" onClick={() => set({ color2: null })}>
                auto
              </button>
            )}
          </>
        )}
        {s.fillStyle === 'pat' && (
          <div className="pattern-row">
            {PATTERNS.map((p) => {
              const v = `pat:${p.id}:${s.color}:${second}`;
              return (
                <button key={p.id} className={`pattern-chip${s.patternId === p.id ? ' on' : ''}`} onClick={() => set({ patternId: p.id })} title={p.name}>
                  <svg viewBox="0 0 30 30">
                    <defs dangerouslySetInnerHTML={{ __html: fillDefs([v]) }} />
                    <rect width="30" height="30" rx="8" fill={fillAttr(v)} />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
        <Toggle on={s.matchFill} label="Fill matching shapes" onClick={() => set({ matchFill: !s.matchFill })} />
        {mirror}
        <button className="link-btn" onClick={() => s.set({ missedNonce: s.missedNonce + 1 })}>
          ✨ Show empty spots
        </button>
      </div>
    );
  }

  const size = s.tool === 'brush' ? s.brushSize : s.eraserSize;
  return (
    <div className="tool-options">
      {s.tool === 'brush' && (
        <div className="seg brushes">
          {BRUSHES.map((b) => (
            <button key={b.id} className={s.brushKind === b.id ? 'on' : ''} onClick={() => set({ brushKind: b.id })} title={b.hint}>
              {b.name}
            </button>
          ))}
        </div>
      )}
      <label className="size">
        <span className="size-dot" style={{ width: Math.max(6, size / 1.6), height: Math.max(6, size / 1.6), background: s.tool === 'brush' ? s.color : 'transparent' }} />
        <input
          type="range"
          min={2}
          max={s.tool === 'brush' ? 48 : 80}
          value={size}
          onChange={(e) => set(s.tool === 'brush' ? { brushSize: +e.target.value } : { eraserSize: +e.target.value })}
          aria-label="Size"
        />
      </label>
      {s.tool === 'brush' && (
        <>
          <Toggle on={s.stayInside} label="Stay inside the lines" onClick={() => set({ stayInside: !s.stayInside })} />
          {mirror}
        </>
      )}
      {s.tool === 'eraser' && <span className="hint">Tap an area to clear its fill · drag to erase brush strokes</span>}
    </div>
  );
}
