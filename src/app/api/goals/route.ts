import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";

const schema = z.object({
  type: z.enum(["GAME", "ANIME", "MANGA", "BOOK"]).nullable(),
  year: z.number().int().min(2000).max(2100),
  targetCount: z.number().int().min(1).max(10000),
});

export async function GET() {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: "desc" }, { type: "asc" }],
  });

  return NextResponse.json({ goals });
}

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

  const { type, year, targetCount } = parsed.data;
  const userId = session.user.id;

  // Postgres treats NULL as distinct in unique indexes, so the (userId, type,
  // year) constraint can't dedupe "all types combined" goals (type = null) —
  // look it up and branch manually instead of relying on prisma.upsert.
  const existing = await prisma.goal.findFirst({ where: { userId, type, year } });

  const goal = existing
    ? await prisma.goal.update({ where: { id: existing.id }, data: { targetCount } })
    : await prisma.goal.create({ data: { userId, type, year, targetCount } });

  return NextResponse.json({ goal });
}

const deleteSchema = z.object({ id: z.string() });

export async function DELETE(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  await prisma.goal.deleteMany({ where: { id: parsed.data.id, userId: session.user.id } });

  return NextResponse.json({ ok: true });
}
