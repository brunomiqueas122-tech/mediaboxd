import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";

const schema = z.object({
  targetType: z.enum(["REVIEW", "COMMENT", "LIST"]),
  targetId: z.string(),
  reason: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  const { targetType, targetId, reason } = parsed.data;

  await prisma.report.create({
    data: { reporterId: session.user.id, targetType, targetId, reason },
  });

  return NextResponse.json({ ok: true });
}
