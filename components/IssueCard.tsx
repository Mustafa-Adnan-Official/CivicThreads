"use client";

import type { Issue } from "@/lib/types";

interface IssueCardProps {
  issue: Issue;
  currentUid: string;
  onUpvote: (issueId: string) => void;
}

export function IssueCard({ issue, currentUid, onUpvote }: IssueCardProps) {
  const hasUpvoted = issue.upvoteUids.includes(currentUid);

  return (
    <div className="flex gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          {issue.publicIdentityMode === "ANON" ? (
            <span className="text-lg" title="Anonymous">👤</span>
          ) : (
            <span className="text-sm font-medium">
              {issue.publicDisplayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-1">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {issue.publicDisplayName}
          </span>
          <span>·</span>
          <time dateTime={issue.createdAt.toISOString()}>
            {new Date(issue.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </div>
        <p className="text-zinc-900 dark:text-zinc-100 mb-2">{issue.text}</p>
        {issue.imageUrl && (
          <div className="mt-2 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 max-w-xs">
            <img
              src={issue.imageUrl}
              alt="Issue attachment"
              className="w-full h-auto object-cover"
            />
          </div>
        )}
      </div>
      <button
        onClick={() => onUpvote(issue.issueId)}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors ${
          hasUpvoted
            ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
        }`}
        title={hasUpvoted ? "Remove upvote" : "Upvote"}
      >
        <span className="text-lg">▲</span>
        <span className="text-sm font-medium">{issue.upvoteCount}</span>
      </button>
    </div>
  );
}
