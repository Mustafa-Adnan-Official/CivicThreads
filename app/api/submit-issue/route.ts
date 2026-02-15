import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { matchIssueToThreads } from "@/lib/gemini";
import { DEFAULT_CITY_ID, DEFAULT_WARD_ID } from "@/lib/constants";
import { FieldValue } from "firebase-admin/firestore";

const CANDIDATE_LIMIT = 20;

async function getUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      cityId = DEFAULT_CITY_ID,
      wardId = DEFAULT_WARD_ID,
      text,
      publicIdentityMode = "ANON",
      imageUrl,
    } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const db = getAdminDb();
    const wardRef = db.collection("cities").doc(cityId).collection("wards").doc(wardId);
    const threadsRef = wardRef.collection("threads");
    const issuesRef = wardRef.collection("issues");

    let publicDisplayName = "Anonymous Samaritan";
    if (publicIdentityMode === "PUBLIC") {
      const userSnap = await db.collection("users").doc(uid).get();
      publicDisplayName = userSnap.exists ? (userSnap.data()?.accountName ?? "Resident") : "Resident";
    }

    const threadsSnap = await threadsRef
      .orderBy("lastActivityAt", "desc")
      .limit(CANDIDATE_LIMIT)
      .get();
    const candidates = threadsSnap.docs.map((d) => {
      const data = d.data();
      return {
        threadId: d.id,
        title: data.title ?? "",
        aiSummary: data.aiSummary ?? "",
      };
    });
    const match = await matchIssueToThreads(text.trim(), candidates);

    let threadId: string;

    if (match.action === "MATCH" && match.matchedThreadIds && match.matchedThreadIds.length > 0) {
      threadId = match.matchedThreadIds[0];
    } else {
      const newThreadRef = threadsRef.doc();
      threadId = newThreadRef.id;
      const now = new Date();
      await newThreadRef.set({
        title: match.newThreadTitle ?? "New issue",
        aiSummary: match.newThreadSummary ?? "",
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
        issueCount: 0,
        upvoteCount: 0,
        upvoteUids: [],
        issueIds: [],
      });
    }

    const issueRef = issuesRef.doc();
    const issueId = issueRef.id;
    const now = new Date();
    await issueRef.set({
      text: text.trim(),
      imageUrl: imageUrl ?? null,
      createdAt: now,
      authorUid: uid,
      publicIdentityMode: publicIdentityMode === "PUBLIC" ? "PUBLIC" : "ANON",
      publicDisplayName,
      threadIds: [threadId],
      upvoteCount: 0,
      upvoteUids: [],
    });

    const threadRef = threadsRef.doc(threadId);
    await threadRef.update({
      issueIds: FieldValue.arrayUnion(issueId),
      issueCount: FieldValue.increment(1),
      lastActivityAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ threadId, issueId });
  } catch (e) {
    console.error("submit-issue", e);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
