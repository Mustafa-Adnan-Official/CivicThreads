import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { DEFAULT_CITY_ID, DEFAULT_WARD_ID } from "@/lib/constants";
import { FieldValue } from "firebase-admin/firestore";

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
      targetType,
      cityId = DEFAULT_CITY_ID,
      wardId = DEFAULT_WARD_ID,
      threadId,
      issueId,
    } = body;

    if (targetType !== "thread" && targetType !== "issue") {
      return NextResponse.json({ error: "targetType must be thread or issue" }, { status: 400 });
    }

    const db = getAdminDb();
    const baseRef = db.collection("cities").doc(cityId).collection("wards").doc(wardId);

    const result = await db.runTransaction(async (tx) => {
      if (targetType === "thread") {
        if (!threadId) return { error: "threadId required", status: 400 };
        const ref = baseRef.collection("threads").doc(threadId);
        const snap = await tx.get(ref);
        if (!snap.exists) return { error: "Thread not found", status: 404 };
        const data = snap.data()!;
        const upvoteUids: string[] = data.upvoteUids ?? [];
        const has = upvoteUids.includes(uid);
        const nextUids = has ? upvoteUids.filter((id) => id !== uid) : [...upvoteUids, uid];
        const nextCount = nextUids.length;
        tx.update(ref, { upvoteUids: nextUids, upvoteCount: nextCount });
        return { upvoteCount: nextCount, upvoted: !has };
      } else {
        if (!issueId) return { error: "issueId required", status: 400 };
        const ref = baseRef.collection("issues").doc(issueId);
        const snap = await tx.get(ref);
        if (!snap.exists) return { error: "Issue not found", status: 404 };
        const data = snap.data()!;
        const upvoteUids: string[] = data.upvoteUids ?? [];
        const has = upvoteUids.includes(uid);
        const nextUids = has ? upvoteUids.filter((id) => id !== uid) : [...upvoteUids, uid];
        const nextCount = nextUids.length;
        tx.update(ref, { upvoteUids: nextUids, upvoteCount: nextCount });
        return { upvoteCount: nextCount, upvoted: !has };
      }
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status as number });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("toggle-upvote", e);
    return NextResponse.json({ error: "Upvote failed" }, { status: 500 });
  }
}
