import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";

async function getUidAndRole(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const db = getAdminDb();
    const userSnap = await db.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists) return null;
    return { uid: decoded.uid, role: userSnap.data()?.role as string };
  } catch {
    return null;
  }
}

/** GET: list all wards for a city */
export async function GET(req: NextRequest) {
  const user = await getUidAndRole(req);
  if (!user || user.role !== "CITY_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cityId = req.nextUrl.searchParams.get("cityId");
  if (!cityId) return NextResponse.json({ error: "cityId required" }, { status: 400 });

  // Verify admin membership
  const db = getAdminDb();
  const adminDoc = await db.collection("cities").doc(cityId).collection("admins").doc(user.uid).get();
  if (!adminDoc.exists) {
    return NextResponse.json({ error: "Not an admin for this city" }, { status: 403 });
  }

  const wardsSnap = await db.collection("cities").doc(cityId).collection("wards").get();
  const wards = wardsSnap.docs.map((d) => ({
    wardId: d.id,
    ...d.data(),
  }));
  return NextResponse.json({ wards });
}

/** POST: add or update a ward */
export async function POST(req: NextRequest) {
  const user = await getUidAndRole(req);
  if (!user || user.role !== "CITY_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { cityId, wardId, wardName, wardRepEmail } = body;
    if (!cityId || !wardId || !wardName) {
      return NextResponse.json({ error: "cityId, wardId, wardName required" }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify admin membership
    const adminDoc = await db.collection("cities").doc(cityId).collection("admins").doc(user.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Not an admin for this city" }, { status: 403 });
    }

    const wardRef = db.collection("cities").doc(cityId).collection("wards").doc(wardId);
    const wardSnap = await wardRef.get();

    const now = new Date();
    if (wardSnap.exists) {
      // Update
      const updates: Record<string, unknown> = { wardName, updatedAt: now };
      if (wardRepEmail !== undefined) updates.wardRepEmail = wardRepEmail;
      await wardRef.update(updates);
    } else {
      // Create
      await wardRef.set({
        wardName,
        wardRepEmail: wardRepEmail ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin-wards POST", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
