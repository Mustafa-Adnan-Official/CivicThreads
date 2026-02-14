"use client";

import Link from "next/link";

interface HeaderProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  wardOptions?: { wardId: string; wardName: string }[];
  selectedWardId?: string;
  onWardChange?: (wardId: string) => void;
  showWardSelector?: boolean;
  user?: { uid: string; accountName: string } | null;
  onSignOut?: () => void;
  transparent?: boolean;
  showZoomControls?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function Header({
  searchPlaceholder = "Search Threads",
  searchValue = "",
  onSearchChange,
  wardOptions = [],
  selectedWardId,
  onWardChange,
  showWardSelector = true,
  user,
  onSignOut,
  transparent = true,
  showZoomControls = false,
  zoom = 1,
  onZoomIn,
  onZoomOut,
}: HeaderProps) {
  const logoPlaceholder = (
    <span className="w-8 h-8 flex-shrink-0 rounded bg-zinc-200 dark:bg-zinc-700" aria-hidden />
  );
  return (
    <header
      className={
        "sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 shadow-sm " +
        (transparent
          ? "bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm"
          : "border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900")
      }
    >
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50 hover:opacity-80"
        >
          {logoPlaceholder}
          CivicThreads
        </Link>
        {showWardSelector && wardOptions.length > 0 && (
          <div className="flex items-center gap-1.5">
            {logoPlaceholder}
            <select
              value={selectedWardId ?? ""}
              onChange={(e) => onWardChange?.(e.target.value)}
              className="px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100"
            >
              {wardOptions.map((w) => (
                <option key={w.wardId} value={w.wardId}>
                  {w.wardName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex-1 flex items-center justify-end gap-3 max-w-md">
        {showZoomControls && onZoomIn != null && onZoomOut != null && (
          <div className="flex items-center gap-1 rounded-md border border-zinc-300/80 dark:border-zinc-600/80 bg-white/90 dark:bg-zinc-800/90 px-1 py-0.5">
            <button
              type="button"
              onClick={onZoomOut}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
              title="Zoom out"
            >
              −
            </button>
            <span className="min-w-[2.5rem] text-center text-xs text-zinc-600 dark:text-zinc-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={onZoomIn}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
              title="Zoom in"
            >
              +
            </button>
          </div>
        )}
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className={"w-full px-3 py-1.5 text-sm border rounded-md placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 " +
            (transparent
              ? "border-zinc-300/80 dark:border-zinc-600/80 bg-white/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100"
              : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400")}
        />
        {user && onSignOut && (
          <button
            onClick={onSignOut}
            className="text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
