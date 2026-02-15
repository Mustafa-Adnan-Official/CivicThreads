"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Thread } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Heat color – dynamic thresholds based on actual data               */
/* ------------------------------------------------------------------ */

function getHeatColor(score: number): string {
  if (score < 0.2) return "bg-emerald-400/80 dark:bg-emerald-600/80";
  if (score < 0.4) return "bg-lime-400/80 dark:bg-lime-500/80";
  if (score < 0.6) return "bg-yellow-400/80 dark:bg-yellow-500/80";
  if (score < 0.8) return "bg-orange-400/80 dark:bg-orange-500/80";
  return "bg-red-500/80 dark:bg-red-600/80";
}

function computeHeatScore(thread: Thread, maxUp: number, maxIssues: number): number {
  const upNorm = maxUp > 0 ? thread.upvoteCount / maxUp : 0;
  const issueNorm = maxIssues > 0 ? thread.issueCount / maxIssues : 0;
  return upNorm * 0.55 + issueNorm * 0.45;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const HEATMAP_ZOOM = { MIN: 0.5, MAX: 2, STEP: 0.25 };
const BOTTOM_AXIS_SPACE = 80;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Simple stable hash for deterministic offsets
function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Spread N items around a base point in a spiral-ish ring pattern.
 * Deterministic: uses index + threadId hash to keep layout stable across renders.
 */
function offsetForIndex(i: number, threadId: string, step: number) {
  // Golden angle (radians) for nice distribution
  const golden = 2.399963229728653;
  const h = hashString(threadId) % 360;
  const angle = i * golden + (h * Math.PI) / 180;
  const radius = step * (1 + Math.floor(i / 6)); // grows every ~6 items
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface HeatmapProps {
  threads: Thread[];
  wardId: string;
  maxUpvotes: number;
  maxIssueCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function Heatmap({ threads, wardId, maxUpvotes, maxIssueCount, zoom, onZoomChange }: HeatmapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 800, height: 600 };
      setViewportSize({
        width: Math.max(200, width),
        height: Math.max(200, height),
      });
    });
    observer.observe(el);
    setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const contentWidth = Math.max(viewportSize.width, 1200);
  const contentHeight = Math.max(viewportSize.height + BOTTOM_AXIS_SPACE, 1000);

  const padding = 48;
  const chartWidth = contentWidth - padding * 2;
  const chartHeight = contentHeight - padding * 2 - BOTTOM_AXIS_SPACE;

  const boxMin = 80;
  const boxSize = Math.max(boxMin, Math.min(140, chartWidth / 8, chartHeight / 6));

  const scaleX = (v: number) => (v / Math.max(maxUpvotes, 1)) * (chartWidth - boxSize);
  const scaleY = (v: number) =>
    chartHeight - boxSize - (v / Math.max(maxIssueCount, 1)) * (chartHeight - boxSize);

  /* -- Heat scores (memoised) -- */
  const heatScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of threads) {
      map.set(t.threadId, computeHeatScore(t, maxUpvotes, maxIssueCount));
    }
    return map;
  }, [threads, maxUpvotes, maxIssueCount]);

  /* -- Panning handlers -- */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    e.preventDefault();
    setIsPanning(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning) return;
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => handleMouseMove(e);
    const onUp = () => handleMouseUp();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onUp);
    };
  }, [isPanning, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -HEATMAP_ZOOM.STEP : HEATMAP_ZOOM.STEP;
      const newZoom = Math.min(HEATMAP_ZOOM.MAX, Math.max(HEATMAP_ZOOM.MIN, zoom + delta));
      if (newZoom === zoom) return;

      const rect = viewportRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        setPan({
          x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
          y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
        });
      }
      onZoomChange(newZoom);
    },
    [zoom, pan, onZoomChange]
  );

  /* -- Tick marks for axes -- */
  const xTicks = useMemo(() => {
    const count = Math.min(5, maxUpvotes);
    if (count === 0) return [];
    const step = maxUpvotes / count;
    return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i));
  }, [maxUpvotes]);

  const yTicks = useMemo(() => {
    const count = Math.min(5, maxIssueCount);
    if (count === 0) return [];
    const step = maxIssueCount / count;
    return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i));
  }, [maxIssueCount]);

  /**
   * ✅ Overlap fix:
   * - bucket threads by "almost same pixel" base point
   * - spread within bucket
   */
  const placedThreads = useMemo(() => {
    // bucket size/tolerance: around 35% of a box so "same spot" gets grouped
    const cell = Math.max(18, Math.floor(boxSize * 0.35));

    type Placed = Thread & { px: number; py: number };
    const buckets = new Map<string, Thread[]>();

    for (const t of threads) {
      const baseX = scaleX(t.upvoteCount);
      const baseY = scaleY(t.issueCount);
      const key = `${Math.round(baseX / cell)}:${Math.round(baseY / cell)}`;
      const arr = buckets.get(key) ?? [];
      arr.push(t);
      buckets.set(key, arr);
    }

    const out: Placed[] = [];
    // spacing between items in same bucket
    const step = Math.max(10, boxSize * 0.42);

    for (const [, bucket] of buckets) {
      // stable order so positions don't shuffle
      const stable = [...bucket].sort((a, b) => a.threadId.localeCompare(b.threadId));
      for (let i = 0; i < stable.length; i++) {
        const t = stable[i];
        const baseX = scaleX(t.upvoteCount);
        const baseY = scaleY(t.issueCount);

        let x = baseX;
        let y = baseY;

        if (stable.length > 1) {
          const { dx, dy } = offsetForIndex(i, t.threadId, step);
          x = baseX + dx;
          y = baseY + dy;
        }

        // keep inside chart bounds
        x = clamp(x, 0, chartWidth - boxSize);
        y = clamp(y, 0, chartHeight - boxSize);

        out.push({ ...(t as Thread), px: x, py: y });
      }
    }

    return out;
  }, [threads, boxSize, chartWidth, chartHeight, maxUpvotes, maxIssueCount]);

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-full min-h-0 overflow-hidden select-none"
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{ touchAction: "none", cursor: isPanning ? "grabbing" : "grab" }}
    >
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width: contentWidth,
          height: contentHeight,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <div className="relative w-full h-full border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg bg-zinc-100/90 dark:bg-zinc-900/90">
          {/* Axis labels */}
          <div
            className="absolute left-1/2 -translate-x-1/2 text-sm text-zinc-600 dark:text-zinc-400 font-medium"
            style={{ bottom: 24 }}
          >
            Demand (upvotes) →
          </div>
          <div
            className="absolute text-sm text-zinc-600 dark:text-zinc-400 font-medium"
            style={{ left: 12, top: "50%", transform: "translateY(-50%) rotate(-90deg)" }}
          >
            ↑ Report Volume (issues)
          </div>

          {/* Chart area */}
          <div
            className="absolute"
            style={{
              left: padding,
              top: padding,
              width: chartWidth,
              height: chartHeight,
            }}
          >
            {/* X-axis ticks */}
            {xTicks.map((val) => {
              const x = scaleX(val) + boxSize / 2;
              return (
                <div
                  key={`x-${val}`}
                  className="absolute text-[9px] text-zinc-400 dark:text-zinc-500"
                  style={{ left: x, top: chartHeight + 4, transform: "translateX(-50%)" }}
                >
                  {val}
                </div>
              );
            })}

            {/* Y-axis ticks */}
            {yTicks.map((val) => {
              const y = scaleY(val) + boxSize / 2;
              return (
                <div
                  key={`y-${val}`}
                  className="absolute text-[9px] text-zinc-400 dark:text-zinc-500"
                  style={{ left: -20, top: y, transform: "translateY(-50%)" }}
                >
                  {val}
                </div>
              );
            })}

            {/* Grid lines */}
            {xTicks.map((val) => {
              const x = scaleX(val) + boxSize / 2;
              return (
                <div
                  key={`xg-${val}`}
                  className="absolute top-0 w-px bg-zinc-200/50 dark:bg-zinc-700/30"
                  style={{ left: x, height: chartHeight }}
                />
              );
            })}

            {yTicks.map((val) => {
              const y = scaleY(val) + boxSize / 2;
              return (
                <div
                  key={`yg-${val}`}
                  className="absolute left-0 h-px bg-zinc-200/50 dark:bg-zinc-700/30"
                  style={{ top: y, width: chartWidth }}
                />
              );
            })}

            {/* Thread boxes */}
            {placedThreads.map((thread) => {
              const score = heatScores.get(thread.threadId) ?? 0;
              const color = getHeatColor(score);
              return (
                <Link
                  key={thread.threadId}
                  href={`/ward/${wardId}/thread/${thread.threadId}`}
                  className={`absolute flex flex-col items-center justify-center p-1.5 rounded-lg border-2 border-white/60 dark:border-zinc-600/60 shadow-md hover:scale-105 hover:z-10 hover:shadow-lg transition-all cursor-pointer text-center ${color}`}
                  style={{
                    left: (thread as any).px,
                    top: (thread as any).py,
                    width: boxSize,
                    height: boxSize,
                  }}
                  title={`${thread.title}\n${thread.aiSummary}\n\n${thread.issueCount} issues · ${thread.upvoteCount} upvotes`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] leading-tight font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 break-words">
                    {thread.title}
                  </span>
                  <span className="text-[8px] leading-tight text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {thread.issueCount}i · {thread.upvoteCount}▲
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Heat legend */}
          <div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] text-zinc-500 dark:text-zinc-400 bg-white/60 dark:bg-zinc-800/60 rounded px-2 py-1 backdrop-blur-sm">
            <span>Low</span>
            <div className="w-3 h-3 rounded-sm bg-emerald-400/80 dark:bg-emerald-600/80" />
            <div className="w-3 h-3 rounded-sm bg-lime-400/80 dark:bg-lime-500/80" />
            <div className="w-3 h-3 rounded-sm bg-yellow-400/80 dark:bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-sm bg-orange-400/80 dark:bg-orange-500/80" />
            <div className="w-3 h-3 rounded-sm bg-red-500/80 dark:bg-red-600/80" />
            <span>High</span>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-500 dark:text-zinc-400 pointer-events-none"
        aria-hidden
      >
        Right-drag to pan · Scroll to zoom
      </div>
    </div>
  );
}
