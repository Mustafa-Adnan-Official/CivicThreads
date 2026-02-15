"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  documentId,
} from "firebase/firestore";
import { db, auth } from "./firebaseClient";
import { DEFAULT_CITY_ID, DEFAULT_WARD_ID } from "./constants";
import type { Thread, Issue, Announcement, Ward } from "./types";

function toThread(id: string, wardId: string, cityId: string, data: Record<string, unknown>): Thread {
  return {
    threadId: id,
    wardId,
    cityId,
    title: (data.title as string) ?? "",
    aiSummary: (data.aiSummary as string) ?? "",
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    lastActivityAt: (data.lastActivityAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    issueCount: (data.issueCount as number) ?? 0,
    upvoteCount: (data.upvoteCount as number) ?? 0,
    upvoteUids: ((data.upvoteUids as string[]) ?? []).slice(),
    issueIds: ((data.issueIds as string[]) ?? []).slice(),
  };
}

function toIssue(id: string, data: Record<string, unknown>, wardId: string): Issue {
  return {
    issueId: id,
    wardId,
    threadIds: ((data.threadIds as string[]) ?? []).slice(),
    text: (data.text as string) ?? "",
    imageUrl: data.imageUrl as string | undefined,
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    authorUid: (data.authorUid as string) ?? "",
    publicIdentityMode: ((data.publicIdentityMode as string) ?? "ANON") as Issue["publicIdentityMode"],
    publicDisplayName: (data.publicDisplayName as string) ?? "Anonymous Samaritan",
    upvoteCount: (data.upvoteCount as number) ?? 0,
    upvoteUids: ((data.upvoteUids as string[]) ?? []).slice(),
  };
}

function toAnnouncement(id: string, data: Record<string, unknown>): Announcement {
  return {
    announcementId: id,
    repUid: (data.repUid as string) ?? "",
    text: (data.text as string) ?? "",
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function getThreads(
  wardId: string,
  cityId: string = DEFAULT_CITY_ID
): Promise<Thread[]> {
  if (!db) throw new Error("Database not ready");
  const ref = collection(db, "cities", cityId, "wards", wardId, "threads");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => toThread(d.id, wardId, cityId, d.data()));
}

export async function getThread(
  wardId: string,
  threadId: string,
  cityId: string = DEFAULT_CITY_ID
): Promise<Thread | null> {
  if (!db) throw new Error("Database not ready");
  const ref = doc(db, "cities", cityId, "wards", wardId, "threads", threadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toThread(snap.id, wardId, cityId, snap.data());
}

const IN_CHUNK = 30;
export async function getIssuesByIds(
  issueIds: string[],
  wardId: string,
  cityId: string = DEFAULT_CITY_ID
): Promise<Issue[]> {
  if (issueIds.length === 0) return [];
  if (!db) throw new Error("Database not ready");
  const issuesRef = collection(db, "cities", cityId, "wards", wardId, "issues");
  const out: Issue[] = [];
  for (let i = 0; i < issueIds.length; i += IN_CHUNK) {
    const chunk = issueIds.slice(i, i + IN_CHUNK);
    const q = query(issuesRef, where(documentId(), "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => out.push(toIssue(d.id, d.data(), wardId)));
  }
  return out;
}

export async function getAnnouncements(
  threadId: string,
  wardId: string = DEFAULT_WARD_ID,
  cityId: string = DEFAULT_CITY_ID
): Promise<Announcement[]> {
  if (!db) throw new Error("Database not ready");
  const ref = collection(
    db,
    "cities",
    cityId,
    "wards",
    wardId,
    "threads",
    threadId,
    "announcements"
  );
  const q = query(ref, orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toAnnouncement(d.id, d.data()));
}

export async function getWards(cityId: string = DEFAULT_CITY_ID): Promise<Ward[]> {
  if (!db) throw new Error("Database not ready");
  const ref = collection(db, "cities", cityId, "wards");
  const snap = await getDocs(ref);
  if (snap.empty) {
    // Fallback: return a default ward so the app doesn't break on empty city
    return [{ wardId: DEFAULT_WARD_ID, wardName: "Ward 1", createdAt: new Date(), updatedAt: new Date() }];
  }
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      wardId: d.id,
      wardName: (data.wardName as string) ?? d.id,
      repUid: data.repUid as string | undefined,
      wardRepEmail: data.wardRepEmail as string | undefined,
      createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
      updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    };
  }).sort((a, b) => a.wardName.localeCompare(b.wardName));
}

export async function getCities(): Promise<{ cityId: string; cityName: string }[]> {
  if (!db) throw new Error("Database not ready");
  const ref = collection(db, "cities");
  const snap = await getDocs(ref);
  if (snap.empty) {
    return [{ cityId: DEFAULT_CITY_ID, cityName: "Markham" }];
  }
  return snap.docs.map((d) => ({
    cityId: d.id,
    cityName: (d.data().cityName as string) ?? d.id,
  }));
}

async function getIdToken(): Promise<string> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Not signed in");
  return user.getIdToken();
}

export async function submitIssue(params: {
  cityId?: string;
  wardId: string;
  text: string;
  imageUrl?: string;
  authorUid: string;
  publicIdentityMode: "ANON" | "PUBLIC";
  publicDisplayName: string;
}): Promise<{ threadId: string; issueId: string }> {
  const token = await getIdToken();
  const res = await fetch("/api/submit-issue", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      cityId: params.cityId ?? DEFAULT_CITY_ID,
      wardId: params.wardId,
      text: params.text,
      imageUrl: params.imageUrl,
      publicIdentityMode: params.publicIdentityMode,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Submit failed");
  }
  return res.json();
}

export async function toggleThreadUpvote(
  wardId: string,
  threadId: string,
  _uid: string,
  cityId: string = DEFAULT_CITY_ID
): Promise<{ upvoteCount: number; upvoted: boolean }> {
  const token = await getIdToken();
  const res = await fetch("/api/toggle-upvote", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      targetType: "thread",
      cityId,
      wardId,
      threadId,
    }),
  });
  if (!res.ok) throw new Error("Upvote failed");
  return res.json();
}

export async function toggleIssueUpvote(
  issueId: string,
  _uid: string,
  wardId: string = DEFAULT_WARD_ID,
  cityId: string = DEFAULT_CITY_ID
): Promise<{ upvoteCount: number; upvoted: boolean }> {
  const token = await getIdToken();
  const res = await fetch("/api/toggle-upvote", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      targetType: "issue",
      cityId,
      wardId,
      issueId,
    }),
  });
  if (!res.ok) throw new Error("Upvote failed");
  return res.json();
}
