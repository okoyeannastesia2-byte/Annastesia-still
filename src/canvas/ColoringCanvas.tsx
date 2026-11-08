import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Page, Region } from '../pages/types';
import { useStore } from '../state/store';
import type { Doc } from '../storage/db';
import { eraseStrokes, pencilOpacity, strokeOutline, strokePath, type Stroke } from './brush';
import { groupStrokes, INK, LINE_W, PAPER } from './render';

type Pt = [number, number];
interface PointerInfo {
  x: number;
  y: number;
  x0: number;
  y0: number;
  t0: number;
  type: string;
}
type Action =
  | { kind: 'stroke'; id: number; pts: number[]; region?: string; pen: boolean; color: string; size: number; marker: boolean }
  | { kind: 'erase'; id: number; before: Doc; last: Pt; moved: boolean; x0: number; y0: number }
  | { kind: 'tapfill'; id: number };

const NO_STROKES: Stroke[] = [];
let strokeCounter = 0;

export function ColoringCanvas({ page }: { page: Page }) {
  const doc = useStore((s) => s.doc);
  const fitNonce = useStore((s) => s.fitNonce);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const liveRef = useRef<SVGPathElement | null>(null);
  const view = useRef({ x: 0, y: 0, k: 1 });
  const fitK = useRef(1);
  const pointers = useRef(new Map<number, PointerInfo>());
  const action = useRef<Action | null>(null);
  const gesture = useRef<{ ids: number[]; v0: { x: number; y: number; k: number }; mid0: Pt; dist0: number } | null>(null);
  const tapCandidate = useRef<number | null>(null);
  const raf = useRef(0);
  // undefined: no live stroke; null: free live stroke; string: live stroke inside that region
  const [live, setLive] = useState<{ region: string | null; color: string } | undefined>(undefined);

  const applyView = useCallback(() => {
    const v = view.current;
    gRef.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
  }, []);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    // leave room for the floating toolbar at the top
    const top = useStore.getState().focus ? 16 : 84;
    const w = el.clientWidth;
    const h = el.clientHeight - top - 16;
    const k = Math.min((w - 32) / page.w, h / page.h);
    fitK.current = k;
    view.current = { k, x: (w - page.w * k) / 2, y: top + (h - page.h * k) / 2 };
    applyView();
  }, [page, applyView]);

  useEffect(() => {
    fit();
    const el = wrapRef.current;
    if (!el) return;
    let last = `${el.clientWidth}x${el.clientHeight}`;
    const ro = new ResizeObserver(() => {
      const now = `${el.clientWidth}x${el.clientHeight}`;
      if (now !== last) {
        last = now;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, fitNonce]);

  // ---- helpers ----
  const local = (clientX: number, clientY: number): Pt => {
    const r = wrapRef.current!.getBoundingClientRect();
    return [clientX - r.left, clientY - r.top];
  };
  const toPage = (clientX: number, clientY: number): Pt => {
    const [x, y] = local(clientX, clientY);
    const v = view.current;
    return [(x - v.x) / v.k, (y - v.y) / v.k];
  };
  const regionAt = (clientX: number, clientY: number): string | undefined => {
    const el = document.elementFromPoint(clientX, clientY);
    return el?.closest?.('[data-region]')?.getAttribute('data-region') ?? undefined;
  };

  const fillAt = (clientX: number, clientY: number) => {
    const region = regionAt(clientX, clientY);
    if (!region) return;
    const st = useStore.getState();
    if (st.doc.fills[region] === st.color) return;
    st.commit({ ...st.doc, fills: { ...st.doc.fills, [region]: st.color } });
    st.useColor(st.color);
  };

  const drawLive = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const a = action.current;
      const el = liveRef.current;
      if (!a || a.kind !== 'stroke' || !el) return;
      el.setAttribute('d', strokeOutline(a.pts, a.size, a.pen, false));
      el.setAttribute('fill-opacity', String(pencilOpacity(a.pts, a.pen, a.marker)));
    });
  };

  const pressureOf = (ev: PointerEvent) => (ev.pointerType === 'pen' ? Math.max(0.05, ev.pressure || 0.5) : 0.5);

  const startAction = (e: React.PointerEvent, immediate: boolean) => {
    const st = useStore.getState();
    if (st.tool === 'fill') {
      if (immediate) fillAt(e.clientX, e.clientY);
      else action.current = { kind: 'tapfill', id: e.pointerId };
      return;
    }
    const p = toPage(e.clientX, e.clientY);
    if (st.tool === 'brush') {
      const region = st.stayInside ? regionAt(e.clientX, e.clientY) : undefined;
      const pen = e.pointerType === 'pen';
      action.current = {
        kind: 'stroke',
        id: e.pointerId,
        pts: [p[0], p[1], pressureOf(e.nativeEvent)],
        region,
        pen,
        color: st.color,
        size: st.brushSize,
        marker: st.brushKind === 'marker',
      };
      setLive({ region: region ?? null, color: st.color });
      drawLive();
      return;
    }
    // eraser
    action.current = { kind: 'erase', id: e.pointerId, before: st.doc, last: p, moved: false, x0: e.clientX, y0: e.clientY };
    eraseTo(p);
  };

  const eraseTo = (p: Pt) => {
    const a = action.current;
    if (!a || a.kind !== 'erase') return;
    const st = useStore.getState();
    const next = eraseStrokes(st.doc.strokes, a.last, p, st.eraserSize / 2);
    if (next !== st.doc.strokes) st.setLive({ ...st.doc, strokes: next });
    a.last = p;
  };

  const cancelAction = () => {
    const a = action.current;
    action.current = null;
    if (!a) return;
    if (a.kind === 'stroke') setLive(undefined);
    if (a.kind === 'erase') useStore.getState().setLive(a.before);
  };

  const finishAction = (e: React.PointerEvent) => {
    const a = action.current;
    action.current = null;
    if (!a) return;
    const st = useStore.getState();
    if (a.kind === 'tapfill') {
      const p = pointers.current.get(e.pointerId);
      if (!p || Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 14) fillAt(e.clientX, e.clientY);
      return;
    }
    if (a.kind === 'stroke') {
      const pts = a.pts.length === 3 ? [...a.pts, a.pts[0] + 0.3, a.pts[1] + 0.3, a.pts[2]] : a.pts;
      const s: Stroke = {
        id: `s${Date.now().toString(36)}${(strokeCounter++).toString(36)}`,
        color: a.color,
        size: a.size,
        opacity: pencilOpacity(pts, a.pen, a.marker),
        pts: pts.map((v) => Math.round(v * 10) / 10),
        region: a.region,
        pen: a.pen,
      };
      st.commit({ ...st.doc, strokes: [...st.doc.strokes, s] });
      st.useColor(a.color);
      setLive(undefined);
      return;
    }
    // erase
    if (!a.moved) {
      // a tap with the eraser clears the colour of that area
      const region = regionAt(e.clientX, e.clientY);
      if (st.doc === a.before && region && st.doc.fills[region]) {
        const fills = { ...st.doc.fills };
        delete fills[region];
        st.commit({ ...st.doc, fills });
        return;
      }
    }
    if (st.doc !== a.before) st.commit(st.doc, a.before);
  };

  // ---- gestures (pan / pinch) ----
  const startGesture = (ids: number[]) => {
    const pts = ids.map((id) => pointers.current.get(id)!).filter(Boolean);
    if (!pts.length) {
      gesture.current = null;
      return;
    }
    const mid: Pt = [pts.reduce((s, p) => s + p.x, 0) / pts.length, pts.reduce((s, p) => s + p.y, 0) / pts.length];
    const dist0 = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { ids, v0: { ...view.current }, mid0: mid, dist0 };
  };
  const updateGesture = () => {
    const g = gesture.current;
    if (!g) return;
    const pts = g.ids.map((id) => pointers.current.get(id)).filter(Boolean) as PointerInfo[];
    if (!pts.length) return;
    const mid: Pt = [pts.reduce((s, p) => s + p.x, 0) / pts.length, pts.reduce((s, p) => s + p.y, 0) / pts.length];
    let k = g.v0.k;
    if (pts.length > 1 && g.dist0 > 0) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      k = Math.min(fitK.current * 14, Math.max(fitK.current * 0.6, (g.v0.k * d) / g.dist0));
    }
    const px = (g.mid0[0] - g.v0.x) / g.v0.k;
    const py = (g.mid0[1] - g.v0.y) / g.v0.k;
    view.current = { k, x: mid[0] - px * k, y: mid[1] - py * k };
    applyView();
  };
  const touchIds = () => [...pointers.current.entries()].filter(([, p]) => p.type === 'touch').map(([id]) => id);

  // ---- pointer handlers ----
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      wrapRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const st = useStore.getState();
    if (e.pointerType === 'pen' && !st.penSeen) st.set({ penSeen: true });
    const penMode = st.penSeen || e.pointerType === 'pen';
    const [x, y] = local(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, { x, y, x0: e.clientX, y0: e.clientY, t0: performance.now(), type: e.pointerType });

    if (e.pointerType === 'touch') {
      const touches = touchIds();
      if (penMode) {
        // Apple Pencil in use: fingers only move and zoom (palm rejection).
        tapCandidate.current =
          touches.length === 1 && st.tool === 'fill' && st.settings.fingerFill && !action.current ? e.pointerId : null;
        startGesture(touches);
        return;
      }
      if (touches.length === 1) {
        startAction(e, false);
      } else {
        cancelAction();
        startGesture(touches);
      }
      return;
    }
    if (action.current) return;
    startAction(e, true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const info = pointers.current.get(e.pointerId);
    if (!info) return;
    const [x, y] = local(e.clientX, e.clientY);
    info.x = x;
    info.y = y;
    if (gesture.current?.ids.includes(e.pointerId)) {
      if (tapCandidate.current === e.pointerId && Math.hypot(e.clientX - info.x0, e.clientY - info.y0) > 12) {
        tapCandidate.current = null;
      }
      updateGesture();
      return;
    }
    const a = action.current;
    if (!a || a.id !== e.pointerId) return;
    const native = e.nativeEvent;
    const list = native.getCoalescedEvents?.();
    const evs = list && list.length ? list : [native];
    if (a.kind === 'stroke') {
      for (const ev of evs) {
        const p = toPage(ev.clientX, ev.clientY);
        a.pts.push(p[0], p[1], pressureOf(ev));
      }
      drawLive();
    } else if (a.kind === 'erase') {
      if (Math.hypot(e.clientX - a.x0, e.clientY - a.y0) > 5) a.moved = true;
      for (const ev of evs) eraseTo(toPage(ev.clientX, ev.clientY));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const info = pointers.current.get(e.pointerId);
    if (tapCandidate.current === e.pointerId) {
      tapCandidate.current = null;
      if (info && performance.now() - info.t0 < 350 && Math.hypot(e.clientX - info.x0, e.clientY - info.y0) < 12 && touchIds().length === 1) {
        fillAt(e.clientX, e.clientY);
      }
    }
    if (action.current?.id === e.pointerId) finishAction(e);
    pointers.current.delete(e.pointerId);
    if (gesture.current?.ids.includes(e.pointerId)) {
      const rest = touchIds();
      if (rest.length) startGesture(rest);
      else gesture.current = null;
    }
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (action.current?.id === e.pointerId) {
      // a cancelled pencil stroke is still kept; cancelled finger actions are dropped
      if (action.current.kind === 'stroke' && action.current.pen) finishAction(e);
      else cancelAction();
    }
    if (tapCandidate.current === e.pointerId) tapCandidate.current = null;
    pointers.current.delete(e.pointerId);
    if (gesture.current?.ids.includes(e.pointerId)) {
      const rest = touchIds();
      if (rest.length) startGesture(rest);
      else gesture.current = null;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const [mx, my] = local(e.clientX, e.clientY);
    const v = view.current;
    if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const k = Math.min(fitK.current * 14, Math.max(fitK.current * 0.6, v.k * Math.exp(-e.deltaY * 0.0025)));
      const px = (mx - v.x) / v.k;
      const py = (my - v.y) / v.k;
      view.current = { k, x: mx - px * k, y: my - py * k };
    } else {
      view.current = { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
    }
    applyView();
  };

  // ---- render ----
  const grouped = useMemo(() => groupStrokes(doc.strokes), [doc.strokes]);
  const setLiveEl = useCallback((el: SVGPathElement | null) => {
    liveRef.current = el;
    if (el) drawLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      className="canvas-wrap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="canvas-svg" width="100%" height="100%">
        <defs>
          <clipPath id="pageclip">
            <rect width={page.w} height={page.h} />
          </clipPath>
          <filter id="paper-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="#5a4632" floodOpacity="0.16" />
          </filter>
        </defs>
        <g ref={gRef}>
          <rect width={page.w} height={page.h} fill={PAPER} filter="url(#paper-shadow)" rx={6} />
          <g clipPath="url(#pageclip)">
            {page.regions.map((r) => (
              <RegionItem
                key={r.id}
                region={r}
                fill={doc.fills[r.id]}
                strokes={grouped.byRegion[r.id] ?? NO_STROKES}
                liveColor={live && live.region === r.id ? live.color : undefined}
                liveRef={setLiveEl}
              />
            ))}
            <g pointerEvents="none">
              {grouped.free.map((s) => (
                <StrokeEl key={s.id} s={s} />
              ))}
              {live && live.region === null && <path ref={setLiveEl} fill={live.color} />}
            </g>
          </g>
          <Outlines page={page} />
        </g>
      </svg>
    </div>
  );
}

const RegionItem = memo(function RegionItem({
  region,
  fill,
  strokes,
  liveColor,
  liveRef,
}: {
  region: Region;
  fill: string | undefined;
  strokes: Stroke[];
  liveColor: string | undefined;
  liveRef: (el: SVGPathElement | null) => void;
}) {
  const hasStrokes = strokes.length > 0 || liveColor !== undefined;
  return (
    <>
      <path data-region={region.id} d={region.d} fill={fill ?? PAPER} fillRule="evenodd" className="region" />
      {hasStrokes && (
        <>
          <clipPath id={`c_${region.id}`}>
            <path d={region.d} clipRule="evenodd" />
          </clipPath>
          <g clipPath={`url(#c_${region.id})`} pointerEvents="none">
            {strokes.map((s) => (
              <StrokeEl key={s.id} s={s} />
            ))}
            {liveColor !== undefined && <path ref={liveRef} fill={liveColor} />}
          </g>
        </>
      )}
    </>
  );
});

const StrokeEl = memo(function StrokeEl({ s }: { s: Stroke }) {
  return <path d={strokePath(s)} fill={s.color} fillOpacity={s.opacity} />;
});

const Outlines = memo(function Outlines({ page }: { page: Page }) {
  return (
    <g fill="none" stroke={INK} strokeWidth={LINE_W} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none">
      {page.regions.map((r) => (
        <path key={r.id} d={r.d} />
      ))}
      {page.decor?.map((dec, i) => {
        const { d, clip } = typeof dec === 'string' ? { d: dec, clip: undefined } : dec;
        const reg = clip ? page.regions.find((r) => r.id === clip) : undefined;
        return (
          <g key={`d${i}`}>
            {reg && (
              <clipPath id={`dc${i}`}>
                <path d={reg.d} clipRule="evenodd" />
              </clipPath>
            )}
            <path d={d} strokeWidth={LINE_W * 0.7} clipPath={reg ? `url(#dc${i})` : undefined} />
          </g>
        );
      })}
    </g>
  );
});
