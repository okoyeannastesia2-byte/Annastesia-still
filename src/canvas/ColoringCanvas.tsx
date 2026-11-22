import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Page, Region } from '../pages/types';
import { useStore } from '../state/store';
import type { Doc } from '../storage/db';
import { eraseStrokes, strokeLook, strokeOpacity, strokeOutline, strokePath, type BrushKind, type Stroke } from './brush';
import { groupStrokes, INK, LINE_W, PAPER } from './render';
import { fillAttr, fillDefs, makeFill, parseFill } from './fills';
import { textureDefs } from './textures';
import { symmetryOf, type Xf } from './symmetry';

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
  | { kind: 'stroke'; id: number; pts: number[]; region?: string; pen: boolean; color: string; size: number; brush: BrushKind; mirror: Xf[] }
  | { kind: 'erase'; id: number; before: Doc; last: Pt; moved: boolean; x0: number; y0: number }
  | { kind: 'tapfill'; id: number };

const NO_STROKES: Stroke[] = [];
let strokeCounter = 0;
const newStrokeId = () => `s${Date.now().toString(36)}${(strokeCounter++).toString(36)}`;

/** React props from the shared SVG attribute set. */
const toProps = (a: Record<string, string | number>) => {
  const p: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(a)) p[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  return p;
};

export function ColoringCanvas({ page }: { page: Page }) {
  const doc = useStore((s) => s.doc);
  const fitNonce = useStore((s) => s.fitNonce);
  const missedNonce = useStore((s) => s.missedNonce);
  const paper = useStore((s) => s.settings.paper);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const liveRef = useRef<SVGPathElement | null>(null);
  const copiesRef = useRef<SVGGElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const view = useRef({ x: 0, y: 0, k: 1 });
  const fitK = useRef(1);
  const pointers = useRef(new Map<number, PointerInfo>());
  const action = useRef<Action | null>(null);
  const gesture = useRef<{ ids: number[]; v0: { x: number; y: number; k: number }; mid0: Pt; dist0: number } | null>(null);
  const tapCandidate = useRef<number | null>(null);
  const raf = useRef(0);
  // undefined: no live stroke; null: free live stroke; string: live stroke inside that region
  const [live, setLive] = useState<{ region: string | null; color: string; brush: BrushKind; mirror: Xf[] } | undefined>(undefined);
  const [missed, setMissed] = useState<string[]>([]);
  const sym = useMemo(() => symmetryOf(page), [page]);
  const regionById = useMemo(() => Object.fromEntries(page.regions.map((r) => [r.id, r])), [page]);

  const applyView = useCallback(() => {
    const v = view.current;
    gRef.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
  }, []);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    // leave room for the floating toolbar at the top
    const top = useStore.getState().focus ? 16 : 140;
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

  // "find empty spots": gently pulse every area with no colour yet
  useEffect(() => {
    if (!missedNonce) return;
    const st = useStore.getState();
    const painted = new Set(st.doc.strokes.map((s) => s.region).filter(Boolean));
    setMissed(page.regions.filter((r) => !st.doc.fills[r.id] && !painted.has(r.id)).map((r) => r.id));
    const t = window.setTimeout(() => setMissed([]), 3800);
    return () => window.clearTimeout(t);
  }, [missedNonce, page]);

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
  /** Region under a page point, even if it is off screen (topmost first). */
  const regionAtPage = (p: Pt): string | undefined => {
    const els = svgRef.current?.querySelectorAll<SVGPathElement>('[data-region]');
    if (!els) return undefined;
    const pt = new DOMPoint(p[0], p[1]);
    for (let i = els.length - 1; i >= 0; i--) {
      try {
        if (els[i].isPointInFill(pt)) return els[i].getAttribute('data-region') ?? undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const fillAt = (clientX: number, clientY: number) => {
    const region = regionAt(clientX, clientY);
    if (!region) return;
    const st = useStore.getState();
    if (st.tool === 'picker') {
      const v = st.doc.fills[region];
      if (v) {
        const f = parseFill(v);
        if (f.kind === 'solid') st.set({ color: f.a, fillStyle: 'solid' });
        else if (f.kind === 'pat') st.set({ color: f.a, color2: f.b, fillStyle: 'pat', patternId: f.id });
        else st.set({ color: f.a, color2: f.b, fillStyle: f.kind });
        st.useColor(f.a);
      }
      st.set({ tool: 'fill' });
      return;
    }
    const targets = new Set<string>([region]);
    if (st.mirror && sym.length) {
      const p = toPage(clientX, clientY);
      for (const xf of sym) {
        const r = regionAtPage(xf.pt(p));
        if (r) targets.add(r);
      }
    }
    if (st.matchFill) {
      const groups = new Set([...targets].map((id) => regionById[id]?.g).filter(Boolean));
      for (const r of page.regions) if (r.g && groups.has(r.g)) targets.add(r.id);
    }
    const value = makeFill(st.fillStyle, st.color, st.color2, st.patternId);
    const changed = [...targets].filter((id) => st.doc.fills[id] !== value);
    if (!changed.length) return;
    const fills = { ...st.doc.fills };
    for (const id of changed) fills[id] = value;
    st.commit({ ...st.doc, fills });
    st.useColor(st.color);
  };

  const drawLive = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const a = action.current;
      const el = liveRef.current;
      if (!a || a.kind !== 'stroke' || !el) return;
      const d = strokeOutline(a.pts, a.size, a.pen, false, false, false, a.brush);
      const op = String(strokeOpacity(a.pts, a.pen, a.brush));
      el.setAttribute('d', d);
      el.setAttribute('fill-opacity', op);
      copiesRef.current?.querySelectorAll('path').forEach((c) => {
        c.setAttribute('d', d);
        c.setAttribute('fill-opacity', op);
      });
    });
  };

  const pressureOf = (ev: PointerEvent) => (ev.pointerType === 'pen' ? Math.max(0.05, ev.pressure || 0.5) : 0.5);

  const startAction = (e: React.PointerEvent, immediate: boolean) => {
    const st = useStore.getState();
    if (st.tool === 'fill' || st.tool === 'picker') {
      if (immediate) fillAt(e.clientX, e.clientY);
      else action.current = { kind: 'tapfill', id: e.pointerId };
      return;
    }
    const p = toPage(e.clientX, e.clientY);
    if (st.tool === 'brush') {
      const region = st.stayInside ? regionAt(e.clientX, e.clientY) : undefined;
      const mirror = st.mirror ? sym : [];
      action.current = {
        kind: 'stroke',
        id: e.pointerId,
        pts: [p[0], p[1], pressureOf(e.nativeEvent)],
        region,
        pen: e.pointerType === 'pen',
        color: st.color,
        size: st.brushSize,
        brush: st.brushKind,
        mirror,
      };
      setLive({ region: region ?? null, color: st.color, brush: st.brushKind, mirror });
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
      const pts = (a.pts.length === 3 ? [...a.pts, a.pts[0] + 0.3, a.pts[1] + 0.3, a.pts[2]] : a.pts).map((v) => Math.round(v * 10) / 10);
      const base: Stroke = {
        id: newStrokeId(),
        color: a.color,
        size: a.size,
        opacity: strokeOpacity(pts, a.pen, a.brush),
        pts,
        region: a.region,
        pen: a.pen,
        kind: a.brush,
      };
      const added = [base];
      for (const xf of a.mirror) {
        const mp: number[] = [];
        for (let i = 0; i < pts.length; i += 3) {
          const q = xf.pt([pts[i], pts[i + 1]]);
          mp.push(Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10, pts[i + 2]);
        }
        added.push({ ...base, id: newStrokeId(), pts: mp, region: a.region ? regionAtPage([mp[0], mp[1]]) ?? a.region : undefined });
      }
      st.commit({ ...st.doc, strokes: [...st.doc.strokes, ...added] });
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

  // ---- hover preview ring (Apple Pencil hover, or a mouse) ----
  const showRing = (e: React.PointerEvent) => {
    const ring = ringRef.current;
    if (!ring) return;
    const st = useStore.getState();
    if (e.pointerType === 'touch' || (st.tool !== 'brush' && st.tool !== 'eraser')) {
      ring.style.opacity = '0';
      return;
    }
    const mul = st.tool === 'eraser' ? 1 : st.brushKind === 'soft' ? 2 : st.brushKind === 'watercolour' ? 1.35 : 1;
    const d = Math.max(6, (st.tool === 'eraser' ? st.eraserSize : st.brushSize * mul) * view.current.k);
    const [x, y] = local(e.clientX, e.clientY);
    ring.style.width = ring.style.height = `${d}px`;
    ring.style.transform = `translate(${x - d / 2}px, ${y - d / 2}px)`;
    ring.style.borderColor = st.tool === 'eraser' ? 'var(--muted)' : st.color;
    ring.style.opacity = '1';
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
          touches.length === 1 && (st.tool === 'fill' || st.tool === 'picker') && st.settings.fingerFill && !action.current ? e.pointerId : null;
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
    if (e.pointerType !== 'touch') showRing(e);
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
  const texDefs = useMemo(() => textureDefs(page.w, page.h), [page]);
  const fDefs = useMemo(() => fillDefs(Object.values(doc.fills)), [doc.fills]);
  const setLiveEl = useCallback((el: SVGPathElement | null) => {
    liveRef.current = el;
    if (el) drawLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const liveLook = live ? toProps(strokeLook({ kind: live.brush, color: live.color, opacity: 0.8 })) : {};

  return (
    <div
      ref={wrapRef}
      className="canvas-wrap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={() => ringRef.current && (ringRef.current.style.opacity = '0')}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg ref={svgRef} className="canvas-svg" width="100%" height="100%">
        <defs>
          <clipPath id="pageclip">
            <rect width={page.w} height={page.h} />
          </clipPath>
          <filter id="paper-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="#5a4632" floodOpacity="0.16" />
          </filter>
        </defs>
        <defs dangerouslySetInnerHTML={{ __html: texDefs + fDefs }} />
        <g ref={gRef}>
          <rect width={page.w} height={page.h} fill={PAPER} filter="url(#paper-shadow)" rx={6} />
          <g clipPath="url(#pageclip)">
            {page.regions.map((r) => (
              <RegionItem
                key={r.id}
                region={r}
                fill={doc.fills[r.id]}
                strokes={grouped.byRegion[r.id] ?? NO_STROKES}
                live={live && live.region === r.id ? liveLook : undefined}
                liveRef={setLiveEl}
              />
            ))}
            <g pointerEvents="none">
              {grouped.free.map((s) => (
                <StrokeEl key={s.id} s={s} />
              ))}
              {live && live.region === null && <path ref={setLiveEl} {...liveLook} />}
              {live && live.mirror.length > 0 && (
                <g ref={copiesRef} opacity={0.75}>
                  {live.mirror.map((xf, i) => (
                    <path key={i} transform={xf.svg} {...liveLook} />
                  ))}
                </g>
              )}
            </g>
            {paper && <rect width={page.w} height={page.h} fill="url(#tex_paper)" pointerEvents="none" style={{ mixBlendMode: 'multiply' }} />}
          </g>
          {missed.length > 0 && (
            <g className="missed" pointerEvents="none">
              {missed.map((id) => (
                <path key={id} d={regionById[id].d} fillRule="evenodd" />
              ))}
            </g>
          )}
          <Outlines page={page} />
        </g>
      </svg>
      <div ref={ringRef} className="brush-ring" />
    </div>
  );
}

const RegionItem = memo(function RegionItem({
  region,
  fill,
  strokes,
  live,
  liveRef,
}: {
  region: Region;
  fill: string | undefined;
  strokes: Stroke[];
  live: Record<string, string | number> | undefined;
  liveRef: (el: SVGPathElement | null) => void;
}) {
  const hasStrokes = strokes.length > 0 || live !== undefined;
  return (
    <>
      <path data-region={region.id} d={region.d} fill={fill ? fillAttr(fill) : PAPER} fillRule="evenodd" className="region" />
      {hasStrokes && (
        <>
          <clipPath id={`c_${region.id}`}>
            <path d={region.d} clipRule="evenodd" />
          </clipPath>
          <g clipPath={`url(#c_${region.id})`} pointerEvents="none">
            {strokes.map((s) => (
              <StrokeEl key={s.id} s={s} />
            ))}
            {live && <path ref={liveRef} {...live} />}
          </g>
        </>
      )}
    </>
  );
});

const StrokeEl = memo(function StrokeEl({ s }: { s: Stroke }) {
  return <path d={strokePath(s)} {...toProps(strokeLook(s))} />;
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
