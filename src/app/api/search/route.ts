import { NextResponse } from "next/server";
import { searchMedia, searchAllMedia } from "@/lib/providers";
import type { MediaType } from "@/lib/providers/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") as MediaType | null;

  if (!q.trim()) return NextResponse.json({ results: [] });

  const results = type ? await searchMedia(type, q) : await searchAllMedia(q);
  return NextResponse.json({ results });
}
