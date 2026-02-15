"use client";

interface UpvoteButtonProps {
  count: number;
  upvoted: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label?: string;
}

export function UpvoteButton({
  count,
  upvoted,
  onToggle,
  disabled = false,
  label = "upvotes",
}: UpvoteButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
        upvoted
          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
      } disabled:opacity-50`}
      title={upvoted ? "Remove upvote" : "Upvote"}
    >
      <span>▲</span>
      <span>{count} {label}</span>
    </button>
  );
}
