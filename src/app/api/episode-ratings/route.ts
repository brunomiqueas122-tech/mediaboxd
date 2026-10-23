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
  episodeNumber: z.number().int().min(1),
  rating: z.number().min(0).max(10),
});

export async function POST(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const message = field === "rating" ? t.mediaActions.ratingOutOfRange : t.api.invalidInput;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { type, source, externalId, episodeNumber, rating } = parsed.data;
  const userId = session.user.id;

  let mediaItem;
  try {
    mediaItem = await upsertMediaItem(type as MediaType, externalId, source);
  } catch (err) {
    if (err instanceof MediaNotFoundError) {
      return NextResponse.json({ error: t.mediaActions.mediaLoadError }, { status: 502 });
    }
    throw err;
  }

  await prisma.episodeRating.upsert({
    where: { userId_mediaItemId_episodeNumber: { userId, mediaItemId: mediaItem.id, episodeNumber } },
    create: { userId, mediaItemId: mediaItem.id, episodeNumber, rating },
    update: { rating },
  });

  const agg = await prisma.episodeRating.aggregate({
    where: { mediaItemId: mediaItem.id, episodeNumber },
    _avg: { rating: true },
    _count: true,
  });

  return NextResponse.json({
    rating,
    average: agg._avg.rating,
    count: agg._count,
  });
}

const deleteSchema = z.object({
  type: z.enum(["GAME", "ANIME", "MANGA", "BOOK"]),
  source: z.string(),
  externalId: z.string(),
  episodeNumber: z.number().int().min(1),
});

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

  const { type, source, externalId, episodeNumber } = parsed.data;

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { type_source_externalId: { type, source, externalId } },
  });
  if (!mediaItem) return NextResponse.json({ ok: true });

  await prisma.episodeRating.deleteMany({
    where: { userId: session.user.id, mediaItemId: mediaItem.id, episodeNumber },
  });

  const agg = await prisma.episodeRating.aggregate({
    where: { mediaItemId: mediaItem.id, episodeNumber },
    _avg: { rating: true },
    _count: true,
  });

  return NextResponse.json({ average: agg._avg.rating, count: agg._count });
}
