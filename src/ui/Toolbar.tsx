import { useStore, savePrefs, type Tool } from '../state/store';
import { Icon } from './Icon';

export function Toolbar({ onExport, onSettings }: { onExport: () => void; onSettings: () => void }) {
  const tool = useStore((s) => s.tool);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const showInspiration = useStore((s) => s.showInspiration);
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
        <span className="tb-sep" />
        <Btn name="undo" label="Undo" onClick={() => st().undo()} disabled={!canUndo} />
        <Btn name="redo" label="Redo" onClick={() => st().redo()} disabled={!canRedo} />
        <Btn name="fit" label="Fit" onClick={() => st().set({ fitNonce: st().fitNonce + 1 })} />
        <span className="tb-sep" />
        <Btn name="bulb" label="Idea" active={showInspiration} onClick={() => st().set({ showInspiration: !showInspiration })} />
        <Btn name="export" label="Save" onClick={onExport} />
        <Btn name="settings" label="More" onClick={onSettings} />
      </div>
      {tool !== 'fill' && <ToolOptions />}
    </div>
  );
}

function ToolOptions() {
  const tool = useStore((s) => s.tool);
  const brushSize = useStore((s) => s.brushSize);
  const eraserSize = useStore((s) => s.eraserSize);
  const brushKind = useStore((s) => s.brushKind);
  const stayInside = useStore((s) => s.stayInside);
  const color = useStore((s) => s.color);
  const set = useStore((s) => s.set);
  const size = tool === 'brush' ? brushSize : eraserSize;

  return (
    <div className="tool-options">
      <label className="size">
        <span className="size-dot" style={{ width: Math.max(6, size / 1.6), height: Math.max(6, size / 1.6), background: tool === 'brush' ? color : 'transparent' }} />
        <input
          type="range"
          min={2}
          max={tool === 'brush' ? 48 : 80}
          value={size}
          onChange={(e) => {
            set(tool === 'brush' ? { brushSize: +e.target.value } : { eraserSize: +e.target.value });
            savePrefs();
          }}
          aria-label="Size"
        />
      </label>
      {tool === 'brush' && (
        <>
          <div className="seg">
            {(['pencil', 'marker'] as const).map((k) => (
              <button key={k} className={brushKind === k ? 'on' : ''} onClick={() => { set({ brushKind: k }); savePrefs(); }}>
                {k === 'pencil' ? 'Soft pencil' : 'Marker'}
              </button>
            ))}
          </div>
          <button className={`toggle${stayInside ? ' on' : ''}`} onClick={() => { set({ stayInside: !stayInside }); savePrefs(); }}>
            <span className="knob" /> Stay inside the lines
          </button>
        </>
      )}
      {tool === 'eraser' && <span className="hint">Tap an area to clear its fill · drag to erase brush strokes</span>}
    </div>
  );
}
