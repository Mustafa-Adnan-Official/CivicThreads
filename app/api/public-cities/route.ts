import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/** Public endpoint: list cities (no auth required — for signup pages) */
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("cities").get();
    const cities = snap.docs.map((d) => ({
      cityId: d.id,
      cityName: d.data().cityName ?? d.id,
    }));
    return NextResponse.json({ cities });
  } catch (e) {
    console.error("public-cities", e);
    return NextResponse.json({ cities: [] });
  }
}
