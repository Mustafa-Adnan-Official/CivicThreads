import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { matchIssueToThreads } from "@/lib/gemini";
import type { ThreadSummaryUpdate } from "@/lib/gemini";
import { DEFAULT_CITY_ID, DEFAULT_WARD_ID } from "@/lib/constants";
import { FieldValue } from "firebase-admin/firestore";

const CANDIDATE_LIMIT = 30;

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  POST /api/submit-issue                                             */
/* ------------------------------------------------------------------ */

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

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const db = getAdminDb();
    const wardRef = db
      .collection("cities")
      .doc(cityId)
      .collection("wards")
      .doc(wardId);
    const threadsRef = wardRef.collection("threads");
    const issuesRef = wardRef.collection("issues");

    /* ---- Resolve public display name ---- */
    let publicDisplayName = "Anonymous Samaritan";
    if (publicIdentityMode === "PUBLIC") {
      const userSnap = await db.collection("users").doc(uid).get();
      publicDisplayName = userSnap.exists
        ? (userSnap.data()?.accountName ?? "Resident")
        : "Resident";
    }

    /* ---- Fetch candidate threads for Gemini ---- */
    const threadsSnap = await threadsRef
      .orderBy("lastActivityAt", "desc")
      .limit(CANDIDATE_LIMIT)
      .get();

    const candidates = threadsSnap.docs.map((d) => {
      const data = d.data();
      return {
        threadId: d.id,
        title: (data.title as string) ?? "",
        aiSummary: (data.aiSummary as string) ?? "",
      };
    });

    /* ---- Call Gemini for thread matching ---- */
    const match = await matchIssueToThreads(text.trim(), candidates);

    const now = new Date();

    // Collect all thread IDs this issue will belong to
    const allThreadIds: string[] = [];
    let newThreadId: string | null = null;

    /* ---- Handle CREATE action ---- */
    if (match.action === "CREATE") {
      const newThreadRef = threadsRef.doc();
      newThreadId = newThreadRef.id;
      allThreadIds.push(newThreadId);

      // Also include any existing threads the issue partially matches
      if (match.alsoMatchedThreadIds && match.alsoMatchedThreadIds.length > 0) {
        allThreadIds.push(...match.alsoMatchedThreadIds);
      }
    }

    /* ---- Handle MATCH action ---- */
    if (match.action === "MATCH" && match.matchedThreadIds) {
      allThreadIds.push(...match.matchedThreadIds);
    }

    // Deduplicate
    const uniqueThreadIds = [...new Set(allThreadIds)];

    /* ---- Create the issue document ---- */
    const issueRef = issuesRef.doc();
    const issueId = issueRef.id;

    await issueRef.set({
      text: text.trim(),
      imageUrl: imageUrl ?? null,
      createdAt: now,
      authorUid: uid,
      publicIdentityMode:
        publicIdentityMode === "PUBLIC" ? "PUBLIC" : "ANON",
      publicDisplayName,
      threadIds: uniqueThreadIds,
      upvoteCount: 0,
      upvoteUids: [],
    });

    /* ---- Create the new thread if CREATE ---- */
    if (match.action === "CREATE" && newThreadId) {
      const newThreadRef = threadsRef.doc(newThreadId);
      await newThreadRef.set({
        title: match.newThreadTitle ?? "New civic issue",
        aiSummary: match.newThreadSummary ?? "",
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
        issueCount: 1,
        upvoteCount: 0,
        upvoteUids: [],
        issueIds: [issueId],
      });
    }

    /* ---- Update all matched existing threads ---- */
    // Build a map of summary updates keyed by threadId for quick lookup
    const summaryUpdateMap = new Map<string, ThreadSummaryUpdate>();
    if (match.updatedSummaries) {
      for (const u of match.updatedSummaries) {
        summaryUpdateMap.set(u.threadId, u);
      }
    }

    // Determine which threads to update (all uniqueThreadIds except the
    // brand-new thread, which was already created with the issue included)
    const threadsToUpdate = uniqueThreadIds.filter(
      (id) => id !== newThreadId
    );

    // Batch-update existing threads
    if (threadsToUpdate.length > 0) {
      const batch = db.batch();
      for (const threadId of threadsToUpdate) {
        const threadRef = threadsRef.doc(threadId);
        const updateData: Record<string, unknown> = {
          issueIds: FieldValue.arrayUnion(issueId),
          issueCount: FieldValue.increment(1),
          lastActivityAt: now,
        };

        // Apply summary refinement if Gemini provided one
        const summaryUpdate = summaryUpdateMap.get(threadId);
        if (summaryUpdate) {
          updateData.aiSummary = summaryUpdate.updatedSummary;
          updateData.updatedAt = now;
          if (summaryUpdate.updatedTitle) {
            updateData.title = summaryUpdate.updatedTitle;
          }
        }

        batch.update(threadRef, updateData);
      }
      await batch.commit();
    }

    return NextResponse.json({
      issueId,
      threadIds: uniqueThreadIds,
      action: match.action,
      newThreadId,
    });
  } catch (e) {
    console.error("submit-issue", e);
    return NextResponse.json(
      { error: "Submit failed" },
      { status: 500 }
    );
  }
}
