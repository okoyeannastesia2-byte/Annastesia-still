import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { PAGE_BY_ID } from '../pages';
import { renderPNG, shareFile, downloadFile } from '../canvas/export';
import { Icon } from './Icon';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const penSeen = useStore((s) => s.penSeen);
  const [confirm, setConfirm] = useState(false);

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="row">
        <span>Colour panel side</span>
        <div className="seg">
          {(['left', 'right'] as const).map((s) => (
            <button key={s} className={settings.panelSide === s ? 'on' : ''} onClick={() => setSettings({ panelSide: s })}>
              {s === 'left' ? 'Left' : 'Right'}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <span>Appearance</span>
        <div className="seg">
          {(['auto', 'light', 'dark'] as const).map((t) => (
            <button key={t} className={settings.theme === t ? 'on' : ''} onClick={() => setSettings({ theme: t })}>
              {t === 'auto' ? 'Auto' : t === 'light' ? 'Light' : 'Evening'}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <span>
          Quick finger tap fills
          <small>When using Apple Pencil, a short finger tap can still fill an area</small>
        </span>
        <button className={`toggle${settings.fingerFill ? ' on' : ''}`} onClick={() => setSettings({ fingerFill: !settings.fingerFill })}>
          <span className="knob" />
        </button>
      </div>
      <p className="muted small">{penSeen ? '✏️ Apple Pencil detected — fingers now move and zoom the page.' : 'Touch the page with Apple Pencil once and fingers switch to moving and zooming.'}</p>
      <hr />
      {!confirm ? (
        <button className="soft-btn danger" onClick={() => setConfirm(true)}>
          Restart this page…
        </button>
      ) : (
        <div className="confirm">
          <p>Clear all colour on this page and begin again?</p>
          <div className="row-btns">
            <button className="soft-btn" onClick={() => setConfirm(false)}>
              Keep my colours
            </button>
            <button
              className="soft-btn danger"
              onClick={() => {
                useStore.getState().restart();
                onClose();
              }}
            >
              Yes, restart
            </button>
          </div>
          <p className="muted small">You can still undo this until you leave the page.</p>
        </div>
      )}
    </Sheet>
  );
}

export function ExportSheet({ onClose }: { onClose: () => void }) {
  const pageId = useStore((s) => s.pageId);
  const doc = useStore((s) => s.doc);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    const page = pageId ? PAGE_BY_ID[pageId] : null;
    if (!page) return;
    let url = '';
    renderPNG(page, doc)
      .then((f) => {
        setFile(f);
        url = URL.createObjectURL(f);
        setPreview(url);
      })
      .catch(() => setError('Sorry — the image could not be made. Please try again.'));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pageId, doc]);

  return (
    <Sheet title="Save your page" onClose={onClose}>
      <div className="export-preview">{preview ? <img src={preview} alt="Your coloured page" /> : <div className="loading">{error || 'Preparing a high-resolution image…'}</div>}</div>
      <div className="row-btns">
        <button className="soft-btn primary" disabled={!file} onClick={() => file && shareFile(file)}>
          Save to Photos / Share
        </button>
        <button className="soft-btn" disabled={!file} onClick={() => file && downloadFile(file)}>
          Download PNG
        </button>
      </div>
      <p className="muted small">In the share menu, choose “Save Image” to put it in your Photos.</p>
    </Sheet>
  );
}
