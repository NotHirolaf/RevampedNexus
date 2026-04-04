import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Canvas LMS proxy — coming soon" }, { status: 501 });
}
