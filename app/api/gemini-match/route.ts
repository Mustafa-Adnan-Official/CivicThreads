import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { matchIssueToThreads } from "@/lib/gemini";
import { DEFAULT_CITY_ID, DEFAULT_WARD_ID } from "@/lib/constants";

const CANDIDATE_LIMIT = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cityId = DEFAULT_CITY_ID, wardId = DEFAULT_WARD_ID, text } = body;
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const threadsRef = db
      .collection("cities")
      .doc(cityId)
      .collection("wards")
      .doc(wardId)
      .collection("threads");
    const snapshot = await threadsRef
      .orderBy("lastActivityAt", "desc")
      .limit(CANDIDATE_LIMIT)
      .get();

    const candidates = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        threadId: d.id,
        title: (data.title as string) ?? "",
        aiSummary: (data.aiSummary as string) ?? "",
      };
    });

    const result = await matchIssueToThreads(text.trim(), candidates);
    return NextResponse.json(result);
  } catch (e) {
    console.error("gemini-match", e);
    return NextResponse.json(
      { error: "Match failed" },
      { status: 500 }
    );
  }
}
