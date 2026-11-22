import { useEffect, useMemo, useState } from 'react';
import { DIFFICULTY_LABEL, PAGES, PAGE_BY_ID } from '../pages';
import type { Page } from '../pages/types';
import { deleteArtwork, loadAllArtworks, loadMeta, saveArtwork, saveMeta, type Album, type Artwork } from '../storage/db';
import { thumbnail } from '../canvas/render';
import { useStore } from '../state/store';
import { Sheet } from './Sheets';
import { Icon } from './Icon';

type Tab = 'pages' | 'mine';
type PageFilter = 'all' | 'started';
type MineFilter = 'all' | 'progress' | 'finished' | 'fav' | `album:${string}`;

const blankThumbs = new Map<string, string>();
const blankThumb = (p: Page) => {
  if (!blankThumbs.has(p.id)) blankThumbs.set(p.id, thumbnail(p, { fills: { ...(p.preFill ?? {}) }, strokes: [] }));
  return blankThumbs.get(p.id)!;
};
const titleOf = (a: Artwork) => a.title || PAGE_BY_ID[a.pageId]?.title || 'Untitled';

export function Gallery() {
  const [arts, setArts] = useState<Artwork[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tab, setTab] = useState<Tab>('pages');
  const [pageFilter, setPageFilter] = useState<PageFilter>('all');
  const [mineFilter, setMineFilter] = useState<MineFilter>('all');
  const [versionsOf, setVersionsOf] = useState<string | null>(null);
  const [details, setDetails] = useState<Artwork | null>(null);

  const reload = () => {
    loadAllArtworks().then(setArts);
    loadMeta<Album[]>('albums').then((a) => setAlbums(a ?? []));
  };
  useEffect(reload, []);

  const byPage = useMemo(() => {
    const m: Record<string, Artwork[]> = {};
    for (const a of arts) (m[a.pageId] ??= []).push(a);
    return m;
  }, [arts]);

  const openPageCard = (p: Page) => {
    if (byPage[p.id]?.length) setVersionsOf(p.id);
    else useStore.getState().newArtwork(p.id);
  };
  const saveArt = (a: Artwork) => {
    // update the screen straight away, then store
    setArts((xs) => xs.map((x) => (x.id === a.id ? a : x)));
    setDetails((d) => (d?.id === a.id ? a : d));
    saveArtwork(a);
  };
  const saveAlbums = (a: Album[]) => {
    setAlbums(a);
    saveMeta('albums', a);
  };

  const pages = PAGES.filter((p) => pageFilter === 'all' || (p.preFill && Object.keys(p.preFill).length > 0));
  const categories = [...new Set(pages.map((p) => p.category))];
  const mine = arts.filter((a) => {
    if (mineFilter === 'progress') return a.status === 'in-progress';
    if (mineFilter === 'finished') return a.status === 'finished';
    if (mineFilter === 'fav') return a.favourite;
    if (mineFilter.startsWith('album:')) return a.albums.includes(mineFilter.slice(6));
    return true;
  });

  return (
    <div className="gallery">
      <header className="gallery-head">
        <div>
          <h1>Still</h1>
          <p className="sub">{PAGES.length} pages to colour. Pick any one — there's no rush.</p>
        </div>
        <div className="seg big">
          <button className={tab === 'pages' ? 'on' : ''} onClick={() => setTab('pages')}>
            Pages
          </button>
          <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
            My art{arts.length ? ` · ${arts.length}` : ''}
          </button>
        </div>
      </header>

      {tab === 'pages' && (
        <>
          <div className="chips">
            <button className={`chip${pageFilter === 'all' ? ' on' : ''}`} onClick={() => setPageFilter('all')}>
              All pages
            </button>
            <button className={`chip${pageFilter === 'started' ? ' on' : ''}`} onClick={() => setPageFilter('started')}>
              Started for you
            </button>
          </div>
          {categories.map((cat) => (
            <section key={cat}>
              <h2>{cat}</h2>
              <div className="cards">
                {pages
                  .filter((p) => p.category === cat)
                  .map((p) => {
                    const versions = byPage[p.id] ?? [];
                    const latest = versions[0];
                    return (
                      <button key={p.id} className="card" onClick={() => openPageCard(p)}>
                        <img src={latest?.thumb ?? blankThumb(p)} alt="" loading="lazy" />
                        <div className="card-meta">
                          <div className="card-title">{p.title}</div>
                          <div className="card-sub">{DIFFICULTY_LABEL[p.difficulty]}</div>
                          <div className="badges">
                            {p.preFill && Object.keys(p.preFill).length > 0 && !versions.length && <span className="badge warm">Started for you</span>}
                            {versions.length === 1 && <span className={`badge${latest.status === 'finished' ? ' green' : ''}`}>{latest.status === 'finished' ? 'Finished' : 'In progress'}</span>}
                            {versions.length > 1 && <span className="badge">{versions.length} versions</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </>
      )}

      {tab === 'mine' && (
        <>
          <div className="chips">
            {(
              [
                ['all', 'Everything'],
                ['progress', 'In progress'],
                ['finished', 'Finished'],
                ['fav', '♥ Favourites'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} className={`chip${mineFilter === k ? ' on' : ''}`} onClick={() => setMineFilter(k)}>
                {label}
              </button>
            ))}
            {albums.map((al) => (
              <button key={al.id} className={`chip album${mineFilter === `album:${al.id}` ? ' on' : ''}`} onClick={() => setMineFilter(`album:${al.id}`)}>
                {al.name}
              </button>
            ))}
            <button
              className="chip add"
              onClick={() => {
                const name = prompt('Name your new album', 'Evening pages');
                if (name?.trim()) saveAlbums([...albums, { id: Date.now().toString(36), name: name.trim() }]);
              }}
            >
              + New album
            </button>
          </div>
          {mine.length === 0 && (
            <p className="empty">
              {mineFilter === 'finished'
                ? 'Pages you finish will rest here. 🌿'
                : mineFilter === 'fav'
                  ? 'Tap the heart on any artwork to keep it here.'
                  : mineFilter.startsWith('album:')
                    ? 'This album is empty. Open an artwork’s ⋯ menu to add it.'
                    : 'Nothing here yet — start any page and it will appear.'}
            </p>
          )}
          <div className="cards">
            {mine.map((a) => (
              <div key={a.id} className="card art-card">
                <button className="card-open" onClick={() => useStore.getState().openArtwork(a.id)}>
                  <img src={a.thumb ?? blankThumb(PAGE_BY_ID[a.pageId])} alt="" loading="lazy" />
                </button>
                <div className="card-meta">
                  <div className="card-title">{titleOf(a)}</div>
                  <div className="card-sub">
                    {a.status === 'finished' ? 'Finished' : 'In progress'}
                    {a.journal?.mood ? ` · felt ${a.journal.mood}` : ''}
                  </div>
                  <div className="card-actions">
                    <button className={`icon-mini${a.favourite ? ' fav' : ''}`} onClick={() => saveArt({ ...a, favourite: !a.favourite })} aria-label="Favourite">
                      <Icon name="heart" size={18} />
                    </button>
                    <button className="icon-mini" onClick={() => setDetails(a)} aria-label="More">
                      <Icon name="settings" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {versionsOf && (
        <Sheet title={PAGE_BY_ID[versionsOf].title} onClose={() => setVersionsOf(null)}>
          <p className="muted small">Carry on with a version, or start this page again with fresh colours.</p>
          <div className="versions">
            {(byPage[versionsOf] ?? []).map((a) => (
              <button key={a.id} className="version" onClick={() => useStore.getState().openArtwork(a.id)}>
                <img src={a.thumb ?? blankThumb(PAGE_BY_ID[a.pageId])} alt="" />
                <span>{a.status === 'finished' ? 'Finished' : 'In progress'}</span>
              </button>
            ))}
            <button className="version new" onClick={() => useStore.getState().newArtwork(versionsOf)}>
              <span className="plus">
                <Icon name="plus" size={30} />
              </span>
              <span>Colour it again</span>
            </button>
          </div>
        </Sheet>
      )}

      {details && (
        <Sheet title={titleOf(details)} onClose={() => setDetails(null)}>
          <div className="art-details">
            <img src={details.thumb ?? blankThumb(PAGE_BY_ID[details.pageId])} alt="" />
            <div className="row-btns">
              <button className="soft-btn primary" onClick={() => useStore.getState().openArtwork(details.id)}>
                Open
              </button>
              <button className="soft-btn" onClick={() => useStore.getState().newArtwork(details.pageId)}>
                Colour it again
              </button>
              <button
                className="soft-btn"
                onClick={() => {
                  const t = prompt('Give this artwork a name', titleOf(details));
                  if (t !== null) saveArt({ ...details, title: t.trim() || undefined });
                }}
              >
                Rename
              </button>
            </div>
            {details.journal && (details.journal.mood || details.journal.note) && (
              <div className="journal-view">
                {details.journal.mood && <strong>Felt {details.journal.mood}</strong>}
                {details.journal.note && <p>“{details.journal.note}”</p>}
              </div>
            )}
            <div className="panel-label">Albums</div>
            {albums.length === 0 && <p className="muted small">No albums yet — make one with “+ New album”.</p>}
            {albums.map((al) => {
              const inIt = details.albums.includes(al.id);
              return (
                <label key={al.id} className="row">
                  <span>{al.name}</span>
                  <input
                    type="checkbox"
                    checked={inIt}
                    onChange={() => saveArt({ ...details, albums: inIt ? details.albums.filter((x) => x !== al.id) : [...details.albums, al.id] })}
                  />
                </label>
              );
            })}
            <hr />
            <button
              className="soft-btn danger"
              onClick={async () => {
                if (!confirm('Delete this artwork? This cannot be undone.')) return;
                await deleteArtwork(details.id);
                setDetails(null);
                reload();
              }}
            >
              Delete this artwork…
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
