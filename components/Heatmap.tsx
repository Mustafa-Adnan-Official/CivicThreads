"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Thread } from "@/lib/types";

function getHeatColor(upvoteCount: number, issueCount: number): string {
  const maxUp = 50;
  const maxIssues = 15;
  const upNorm = Math.min(upvoteCount / maxUp, 1);
  const issueNorm = Math.min(issueCount / maxIssues, 1);
  const score = (upNorm * 0.6 + issueNorm * 0.4);
  if (score < 0.25) return "bg-emerald-400 dark:bg-emerald-600";
  if (score < 0.5) return "bg-yellow-400 dark:bg-yellow-600";
  if (score < 0.75) return "bg-orange-400 dark:bg-orange-600";
  return "bg-red-400 dark:bg-red-600";
}

export const HEATMAP_ZOOM = { MIN: 0.5, MAX: 2, STEP: 0.25 };
const BOTTOM_AXIS_SPACE = 80;

interface HeatmapProps {
  threads: Thread[];
  wardId: string;
  maxUpvotes: number;
  maxIssueCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function Heatmap({
  threads,
  wardId,
  maxUpvotes,
  maxIssueCount,
  zoom,
  onZoomChange,
}: HeatmapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 800, height: 600 };
      setViewportSize({ width: Math.max(200, width), height: Math.max(200, height) });
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

  const scaleX = (v: number) =>
    (v / Math.max(maxUpvotes, 1)) * (chartWidth - boxSize);
  const scaleY = (v: number) =>
    chartHeight - boxSize - (v / Math.max(maxIssueCount, 1)) * (chartHeight - boxSize);

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
      setPan((p) => ({
        x: p.x + e.movementX,
        y: p.y + e.movementY,
      }));
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
      const newZoom = Math.min(
        HEATMAP_ZOOM.MAX,
        Math.max(HEATMAP_ZOOM.MIN, zoom + delta)
      );
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
          <div
            className="absolute left-1/2 -translate-x-1/2 text-sm text-zinc-600 dark:text-zinc-400 font-medium"
            style={{ bottom: 24 }}
          >
            Demand (upvotes) →
          </div>
          <div
            className="absolute text-sm text-zinc-600 dark:text-zinc-400 font-medium"
            style={{
              left: 12,
              top: "50%",
              transform: "translateY(-50%) rotate(-90deg)",
            }}
          >
            ↑ Report Volume (issues)
          </div>
          <div
            className="absolute"
            style={{
              left: padding,
              top: padding,
              width: chartWidth,
              height: chartHeight,
            }}
          >
            {threads.map((thread) => {
              const x = scaleX(thread.upvoteCount);
              const y = scaleY(thread.issueCount);
              const color = getHeatColor(thread.upvoteCount, thread.issueCount);
              return (
                <Link
                  key={thread.threadId}
                  href={`/thread/${thread.threadId}?ward=${wardId}`}
                  className={`absolute flex items-center justify-center p-1.5 rounded border-2 border-white/60 dark:border-zinc-600/60 shadow-md hover:scale-105 hover:z-10 hover:shadow-lg transition-all cursor-pointer text-center ${color}`}
                  style={{
                    left: x,
                    top: y,
                    width: boxSize,
                    height: boxSize,
                  }}
                  title={thread.aiSummary}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] leading-tight font-medium text-zinc-900 dark:text-zinc-100 line-clamp-3 break-words">
                    {thread.title}
                  </span>
                </Link>
              );
            })}
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
