import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertMediaItem, MediaNotFoundError } from "@/lib/mediaItem";
import type { MediaType } from "@/lib/providers/types";
import { getServerDictionary } from "@/lib/i18n";

const schema = z.object({
  type: z.enum(["GAME", "ANIME", "MANGA", "BOOK"]),
  source: z.string(),
  externalId: z.string(),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/lists/[id]/items">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: listId } = await ctx.params;
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: t.api.listNotFound }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  const { type, source, externalId, note } = parsed.data;

  let mediaItem;
  try {
    mediaItem = await upsertMediaItem(type as MediaType, externalId, source);
  } catch (err) {
    if (err instanceof MediaNotFoundError) {
      return NextResponse.json({ error: t.mediaActions.mediaLoadError }, { status: 502 });
    }
    throw err;
  }

  const lastItem = await prisma.listItem.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
  });

  const item = await prisma.listItem.upsert({
    where: { listId_mediaItemId: { listId, mediaItemId: mediaItem.id } },
    create: { listId, mediaItemId: mediaItem.id, note, position: (lastItem?.position ?? 0) + 1 },
    update: { note },
  });

  return NextResponse.json(item);
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/lists/[id]/items">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: listId } = await ctx.params;
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: t.api.listNotFound }, { status: 404 });
  }

  const { mediaItemId } = await req.json();
  await prisma.listItem.deleteMany({ where: { listId, mediaItemId } });

  return NextResponse.json({ ok: true });
}
