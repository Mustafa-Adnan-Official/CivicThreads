"use client";

import { useState } from "react";

interface IssueSubmissionBarProps {
  onSubmit: (text: string, publicMode: "ANON" | "PUBLIC") => void;
  isSubmitting?: boolean;
}

export function IssueSubmissionBar({
  onSubmit,
  isSubmitting = false,
}: IssueSubmissionBarProps) {
  const [text, setText] = useState("");
  const [publicMode, setPublicMode] = useState<"ANON" | "PUBLIC">("ANON");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim(), publicMode);
    setText("");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200/80 dark:border-zinc-700/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)] px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 shrink-0">
          <span>Post as:</span>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="identity"
              checked={publicMode === "ANON"}
              onChange={() => setPublicMode("ANON")}
              className="rounded-full"
            />
            Anonymous
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="identity"
              checked={publicMode === "PUBLIC"}
              onChange={() => setPublicMode("PUBLIC")}
              className="rounded-full"
            />
            Public
          </label>
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe a new issue..."
          disabled={isSubmitting}
          className="flex-1 min-w-0 px-3 py-2 border border-zinc-300/80 dark:border-zinc-600/80 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-50"
        />
        <button
          type="button"
          className="p-2 border border-zinc-300/80 dark:border-zinc-600/80 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0"
          title="Add image attachment"
        >
          <span className="text-lg">+</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
