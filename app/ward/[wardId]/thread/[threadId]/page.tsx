"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { IssueCard } from "@/components/IssueCard";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { IssueSubmissionBar } from "@/components/IssueSubmissionBar";
import {
  getThread,
  getIssuesByIds,
  getAnnouncements,
  getWards,
  toggleThreadUpvote,
  toggleIssueUpvote,
  submitIssue,
} from "@/lib/data-service";
import type { Thread, Issue, Announcement } from "@/lib/types";

type Tab = "issues" | "announcements";

export default function ThreadPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const wardId = params.wardId as string;
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [wards, setWards] = useState<{ wardId: string; wardName: string }[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("issues");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/signin");
      return;
    }
    getWards().then((w) =>
      setWards(w.map((ward) => ({ wardId: ward.wardId, wardName: ward.wardName })))
    );
  }, [user, router]);

  useEffect(() => {
    if (!wardId || !threadId) return;
    getThread(wardId, threadId).then(setThread);
    getAnnouncements(threadId).then(setAnnouncements);
  }, [wardId, threadId]);

  useEffect(() => {
    if (!thread?.issueIds?.length) {
      setIssues([]);
      return;
    }
    getIssuesByIds(thread.issueIds).then((list) => {
      const sorted = [...list].sort((a, b) => {
        if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setIssues(sorted);
    });
  }, [thread?.issueIds]);

  const filteredIssues = searchQuery.trim()
    ? issues.filter(
        (i) =>
          i.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.publicDisplayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : issues;

  const topIssues = filteredIssues.slice(0, 5);
  const remainingIssues = filteredIssues.slice(5).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const displayIssues = [...topIssues, ...remainingIssues];

  async function handleThreadUpvote() {
    if (!user || !thread) return;
    try {
      const result = await toggleThreadUpvote(wardId, threadId, user.uid);
      setThread((prev) =>
        prev ? { ...prev, upvoteCount: result.upvoteCount, upvoteUids: result.upvoteUids } : null
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleIssueUpvote(issueId: string) {
    if (!user) return;
    try {
      const result = await toggleIssueUpvote(issueId, user.uid);
      setIssues((prev) =>
        prev.map((i) =>
          i.issueId === issueId
            ? { ...i, upvoteCount: result.upvoteCount, upvoteUids: result.upvoteUids }
            : i
        )
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmitIssue(text: string, publicMode: "ANON" | "PUBLIC") {
    if (!user || !thread) return;
    setIsSubmitting(true);
    try {
      await submitIssue({
        wardId,
        text,
        authorUid: user.uid,
        publicIdentityMode: publicMode,
        publicDisplayName:
          publicMode === "PUBLIC" ? user.accountName : "Anonymous Samaritan",
      });
      const updated = await getThread(wardId, threadId);
      if (updated) setThread(updated);
      const freshIssues = updated?.issueIds
        ? await getIssuesByIds(updated.issueIds)
        : [];
      const sorted = [...freshIssues].sort((a, b) => {
        if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setIssues(sorted);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) return null;
  if (!thread) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading thread…</p>
      </div>
    );
  }

  const hasThreadUpvoted = thread.upvoteUids.includes(user.uid);

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <Header
        searchPlaceholder="Search Issues"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        wardOptions={wards}
        selectedWardId={wardId}
        onWardChange={() => router.push("/")}
        showWardSelector={true}
        user={user}
        onSignOut={() => {
          signOut();
          router.replace("/signin");
        }}
        transparent={true}
      />
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full pt-14">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {thread.title}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            {thread.aiSummary}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={handleThreadUpvote}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                hasThreadUpvoted
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <span>▲</span>
              <span>{thread.upvoteCount} upvotes</span>
            </button>
            <span className="text-zinc-500 dark:text-zinc-500">
              {thread.issueCount} issues
            </span>
            <span className="text-zinc-500 dark:text-zinc-500">
              Last activity:{" "}
              {new Date(thread.lastActivityAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("issues")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "issues"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Issues
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "announcements"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Announcements
          </button>
        </div>

        {activeTab === "issues" ? (
          <div className="space-y-4">
            {displayIssues.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400 py-8">
                No issues yet. Be the first to submit one.
              </p>
            ) : (
              displayIssues.map((issue) => (
                <IssueCard
                  key={issue.issueId}
                  issue={issue}
                  currentUid={user.uid}
                  onUpvote={handleIssueUpvote}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400 py-8">
                No announcements yet from the Ward Representative.
              </p>
            ) : (
              [...announcements]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((ann) => (
                  <AnnouncementCard key={ann.announcementId} announcement={ann} />
                ))
            )}
          </div>
        )}
      </main>
      <IssueSubmissionBar
        onSubmit={handleSubmitIssue}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
