"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { IssueCard } from "@/components/IssueCard";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { SubmitIssueBar } from "@/components/SubmitIssueBar";
import { UpvoteButton } from "@/components/UpvoteButton";
import {
  getThread,
  getIssuesByIds,
  getAnnouncements,
  getWards,
  toggleThreadUpvote,
  toggleIssueUpvote,
  submitIssue,
} from "@/lib/data-service";
import { DEFAULT_CITY_ID, DEFAULT_WARD_ID } from "@/lib/constants";
import type { Thread, Issue, Announcement } from "@/lib/types";

type Tab = "issues" | "announcements";

export default function ThreadPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const threadId = params.threadId as string;
  const wardId = DEFAULT_WARD_ID;
  const cityId = DEFAULT_CITY_ID;

  const [thread, setThread] = useState<Thread | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [wards, setWards] = useState<{ wardId: string; wardName: string }[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("issues");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    getWards(cityId).then((w) =>
      setWards(w.map((ward) => ({ wardId: ward.wardId, wardName: ward.wardName })))
    );
  }, [user, router, cityId]);

  useEffect(() => {
    if (!threadId) return;
    getThread(wardId, threadId, cityId).then(setThread);
    getAnnouncements(threadId, wardId, cityId).then(setAnnouncements);
  }, [threadId, wardId, cityId]);

  useEffect(() => {
    if (!thread?.issueIds?.length) {
      setIssues([]);
      return;
    }
    getIssuesByIds(thread.issueIds, wardId, cityId).then((list) => {
      const sorted = [...list].sort((a, b) => {
        if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setIssues(sorted);
    });
  }, [thread?.issueIds, wardId, cityId]);

  const filteredIssues = searchQuery.trim()
    ? issues.filter(
        (i) =>
          i.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.publicDisplayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : issues;
  const displayIssues = [...filteredIssues].sort((a, b) => {
    if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function handleThreadUpvote() {
    if (!user || !thread) return;
    try {
      const result = await toggleThreadUpvote(wardId, threadId, user.uid, cityId);
      setThread((prev) =>
        prev
          ? {
              ...prev,
              upvoteCount: result.upvoteCount,
              upvoteUids: result.upvoted
                ? [...prev.upvoteUids, user.uid]
                : prev.upvoteUids.filter((id) => id !== user.uid),
            }
          : null
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleIssueUpvote(issueId: string) {
    if (!user) return;
    try {
      const result = await toggleIssueUpvote(issueId, user.uid, wardId, cityId);
      setIssues((prev) =>
        prev.map((i) =>
          i.issueId === issueId
            ? {
                ...i,
                upvoteCount: result.upvoteCount,
                upvoteUids: result.upvoted
                  ? [...i.upvoteUids, user.uid]
                  : i.upvoteUids.filter((id) => id !== user.uid),
              }
            : i
        )
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmitIssue(text: string, publicMode: "ANON" | "PUBLIC") {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await submitIssue({
        wardId,
        cityId,
        text,
        authorUid: user.uid,
        publicIdentityMode: publicMode,
        publicDisplayName:
          publicMode === "PUBLIC" ? user.accountName : "Anonymous Samaritan",
      });
      const updated = await getThread(wardId, threadId, cityId);
      if (updated) setThread(updated);
      if (updated?.issueIds?.length) {
        const freshIssues = await getIssuesByIds(updated.issueIds, wardId, cityId);
        const sorted = [...freshIssues].sort((a, b) => {
          if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setIssues(sorted);
      }
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
        onWardChange={() => router.push("/dashboard")}
        showWardSelector={true}
        user={user}
        onSignOut={() => {
          signOut();
          router.replace("/login");
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
            <UpvoteButton
              count={thread.upvoteCount}
              upvoted={hasThreadUpvoted}
              onToggle={handleThreadUpvote}
            />
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
              announcements.map((ann) => (
                <AnnouncementCard key={ann.announcementId} announcement={ann} />
              ))
            )}
          </div>
        )}
      </main>
      <SubmitIssueBar
        onSubmit={handleSubmitIssue}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
