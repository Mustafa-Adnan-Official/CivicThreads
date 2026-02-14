"use client";

import type { Announcement } from "@/lib/types";

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  return (
    <div className="flex gap-4 p-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-200">
          <span className="text-sm font-semibold">REP</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 mb-1">
          <span className="font-semibold">Ward Representative</span>
          <span>·</span>
          <time dateTime={announcement.createdAt.toISOString()}>
            {new Date(announcement.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </div>
        <p className="text-zinc-900 dark:text-zinc-100">{announcement.text}</p>
      </div>
    </div>
  );
}
