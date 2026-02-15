import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { DEFAULT_CITY_ID } from "@/lib/constants";

async function getUidAndEmail(
  req: NextRequest
): Promise<{ uid: string; email: string } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded.uid || !decoded.email) return null;
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const caller = await getUidAndEmail(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { cityId = DEFAULT_CITY_ID, wardId, threadId, text } = body;

    if (!wardId || typeof wardId !== "string") {
      return NextResponse.json({ error: "wardId required" }, { status: 400 });
    }
    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json({ error: "threadId required" }, { status: 400 });
    }
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const db = getAdminDb();

    // ── Ward-rep email check ──
    // Read cities/{cityId}/wards/{wardId} and compare wardRepEmail to the
    // email of whoever clicked the button.
    const wardSnap = await db
      .collection("cities")
      .doc(cityId)
      .collection("wards")
      .doc(wardId)
      .get();

    if (!wardSnap.exists) {
      return NextResponse.json({ error: "Ward not found" }, { status: 404 });
    }

    const wardRepEmail = (wardSnap.data()?.wardRepEmail as string | undefined)
      ?.toLowerCase()
      ?.trim();

    if (!wardRepEmail || wardRepEmail !== caller.email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Only the ward representative can post announcements" },
        { status: 403 }
      );
    }

    // Verify the thread exists
    const threadRef = db
      .collection("cities")
      .doc(cityId)
      .collection("wards")
      .doc(wardId)
      .collection("threads")
      .doc(threadId);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Create the announcement document
    const announcementDoc = threadRef.collection("announcements").doc();
    const now = new Date();

    await announcementDoc.set({
      repUid: caller.uid,
      text: text.trim(),
      createdAt: now,
    });

    return NextResponse.json({
      announcementId: announcementDoc.id,
      threadId,
    });
  } catch (e) {
    console.error("post-announcement", e);
    return NextResponse.json(
      { error: "Failed to post announcement" },
      { status: 500 }
    );
  }
}
