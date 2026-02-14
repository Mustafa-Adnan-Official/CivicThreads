// Data service – connects UI to backend (Firestore). Uses mock data until backend is ready.

import type { Thread, Issue, Announcement, Ward } from "./types";
import {
  MOCK_THREADS,
  MOCK_ISSUES,
  MOCK_ANNOUNCEMENTS,
  MOCK_WARDS,
} from "./mock-data";

export async function getThreads(wardId: string): Promise<Thread[]> {
  // TODO: collection(cities, cityId, wards, wardId, threads)
  return MOCK_THREADS.filter((t) => t.wardId === wardId);
}

export async function getThread(
  wardId: string,
  threadId: string
): Promise<Thread | null> {
  // TODO: getDoc(threads/{threadId})
  const thread = MOCK_THREADS.find(
    (t) => t.wardId === wardId && t.threadId === threadId
  );
  return thread ?? null;
}

export async function getIssuesByIds(issueIds: string[]): Promise<Issue[]> {
  // TODO: getDoc for each or where(documentId(), "in", chunk)
  const issues = issueIds
    .map((id) => MOCK_ISSUES.find((i) => i.issueId === id))
    .filter((i): i is Issue => i != null);
  return issues;
}

export async function getAnnouncements(
  threadId: string
): Promise<Announcement[]> {
  // TODO: collection(threads, threadId, announcements)
  return MOCK_ANNOUNCEMENTS[threadId] ?? [];
}

export async function getWards(cityId: string = "markham"): Promise<Ward[]> {
  // TODO: collection(cities, cityId, wards)
  return MOCK_WARDS;
}

export async function submitIssue(params: {
  wardId: string;
  text: string;
  imageUrl?: string;
  authorUid: string;
  publicIdentityMode: "ANON" | "PUBLIC";
  publicDisplayName: string;
}): Promise<{ issueId: string; threadIds: string[] }> {
  // TODO: Gemini match → create issue → link to thread(s)
  console.log("submitIssue (mock):", params);
  return {
    issueId: "issue-new",
    threadIds: ["thread-potholes"],
  };
}

export async function toggleThreadUpvote(
  wardId: string,
  threadId: string,
  uid: string
): Promise<{ upvoteCount: number; upvoteUids: string[] }> {
  // TODO: Firestore transaction
  const thread = MOCK_THREADS.find(
    (t) => t.wardId === wardId && t.threadId === threadId
  );
  if (!thread) throw new Error("Thread not found");
  const idx = thread.upvoteUids.indexOf(uid);
  if (idx >= 0) {
    thread.upvoteUids = thread.upvoteUids.filter((u) => u !== uid);
    thread.upvoteCount--;
  } else {
    thread.upvoteUids = [...thread.upvoteUids, uid];
    thread.upvoteCount++;
  }
  return { upvoteCount: thread.upvoteCount, upvoteUids: thread.upvoteUids };
}

export async function toggleIssueUpvote(
  issueId: string,
  uid: string
): Promise<{ upvoteCount: number; upvoteUids: string[] }> {
  // TODO: Firestore transaction
  const issue = MOCK_ISSUES.find((i) => i.issueId === issueId);
  if (!issue) throw new Error("Issue not found");
  const idx = issue.upvoteUids.indexOf(uid);
  if (idx >= 0) {
    issue.upvoteUids = issue.upvoteUids.filter((u) => u !== uid);
    issue.upvoteCount--;
  } else {
    issue.upvoteUids = [...issue.upvoteUids, uid];
    issue.upvoteCount++;
  }
  return { upvoteCount: issue.upvoteCount, upvoteUids: issue.upvoteUids };
}
