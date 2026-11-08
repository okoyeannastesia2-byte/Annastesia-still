import { useEffect, useMemo, useState } from 'react';
import { DIFFICULTY_LABEL, PAGES } from '../pages';
import type { Page } from '../pages/types';
import { loadAllProgress, type Progress } from '../storage/db';
import { thumbnail } from '../canvas/render';
import { useStore } from '../state/store';

type Filter = 'all' | 'started' | 'progress' | 'finished';

export function Gallery() {
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const openPage = useStore((s) => s.openPage);

  useEffect(() => {
    loadAllProgress().then(setProgress);
  }, []);

  const shown = PAGES.filter((p) => {
    const pr = progress[p.id];
    if (filter === 'progress') return pr && pr.status === 'in-progress';
    if (filter === 'finished') return pr?.status === 'finished';
    if (filter === 'started') return !!p.preFill && Object.keys(p.preFill).length > 0;
    return true;
  });
  const categories = [...new Set(shown.map((p) => p.category))];

  return (
    <div className="gallery">
      <header className="gallery-head">
        <div>
          <h1>Still</h1>
          <p className="sub">{PAGES.length} pages to colour. Pick any one — there's no rush.</p>
        </div>
        <div className="seg big">
          {(
            [
              ['all', 'All pages'],
              ['started', 'Started for you'],
              ['progress', 'In progress'],
              ['finished', 'Finished'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>
      {shown.length === 0 && (
        <p className="empty">{filter === 'finished' ? 'Pages you finish will rest here. 🌿' : 'Nothing here yet — start any page and it will appear.'}</p>
      )}
      {categories.map((cat) => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="cards">
            {shown
              .filter((p) => p.category === cat)
              .map((p) => (
                <Card key={p.id} page={p} progress={progress[p.id]} onOpen={() => openPage(p.id)} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Card({ page, progress, onOpen }: { page: Page; progress?: Progress; onOpen: () => void }) {
  const src = useMemo(
    () => progress?.thumb ?? thumbnail(page, { fills: { ...(page.preFill ?? {}) }, strokes: [] }),
    [page, progress],
  );
  return (
    <button className="card" onClick={onOpen}>
      <img src={src} alt="" loading="lazy" />
      <div className="card-meta">
        <div className="card-title">{page.title}</div>
        <div className="card-sub">{DIFFICULTY_LABEL[page.difficulty]}</div>
        <div className="badges">
          {page.preFill && Object.keys(page.preFill).length > 0 && !progress && <span className="badge warm">Started for you</span>}
          {progress?.status === 'in-progress' && <span className="badge">In progress</span>}
          {progress?.status === 'finished' && <span className="badge green">Finished</span>}
        </div>
      </div>
    </button>
  );
}
