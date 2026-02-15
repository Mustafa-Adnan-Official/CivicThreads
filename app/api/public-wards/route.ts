import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/** Public endpoint: list wards for a city (no auth required — for signup pages) */
export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get("cityId");
  if (!cityId) return NextResponse.json({ wards: [] });
  try {
    const db = getAdminDb();
    const snap = await db.collection("cities").doc(cityId).collection("wards").get();
    const wards = snap.docs.map((d) => ({
      wardId: d.id,
      wardName: d.data().wardName ?? d.id,
    }));
    return NextResponse.json({ wards });
  } catch (e) {
    console.error("public-wards", e);
    return NextResponse.json({ wards: [] });
  }
}
