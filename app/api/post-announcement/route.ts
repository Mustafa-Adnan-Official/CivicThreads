import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented (ward rep flow TBD)" },
    { status: 501 }
  );
}
