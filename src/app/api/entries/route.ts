import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertMediaItem, MediaNotFoundError } from "@/lib/mediaItem";
import type { MediaType } from "@/lib/providers/types";
import { getServerDictionary } from "@/lib/i18n";
import { isFlaggedContent } from "@/lib/moderation";

const schema = z.object({
  type: z.enum(["GAME", "ANIME", "MANGA", "BOOK"]),
  source: z.string(),
  externalId: z.string(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "DROPPED", "ON_HOLD"]).optional(),
  rating: z.number().min(0).max(10).optional(),
  reviewBody: z.string().optional(),
  favorite: z.boolean().optional(),
  containsSpoilers: z.boolean().optional(),
  rewatch: z.boolean().optional(),
});

export async function POST(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const message = field === "rating" ? t.mediaActions.ratingOutOfRange : t.api.invalidInput;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { type, source, externalId, status, rating, reviewBody, favorite, containsSpoilers, rewatch } = parsed.data;
  const userId = session.user.id;

  if (reviewBody && (await isFlaggedContent(reviewBody))) {
    return NextResponse.json({ error: t.api.contentFlagged }, { status: 400 });
  }

  let mediaItem;
  try {
    mediaItem = await upsertMediaItem(type as MediaType, externalId, source);
  } catch (err) {
    if (err instanceof MediaNotFoundError) {
      return NextResponse.json({ error: t.mediaActions.mediaLoadError }, { status: 502 });
    }
    throw err;
  }

  try {
    if (status !== undefined || favorite !== undefined) {
      const existingEntry = await prisma.listEntry.findUnique({
        where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
      });

      const statusChanged = status !== undefined && status !== existingEntry?.status;
      const favoriteChanged = favorite !== undefined && favorite !== existingEntry?.favorite;

      await prisma.listEntry.upsert({
        where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
        create: {
          userId,
          mediaItemId: mediaItem.id,
          status: status ?? "PLANNED",
          favorite: favorite ?? false,
          finishedAt: status === "COMPLETED" ? new Date() : null,
        },
        update: {
          ...(status !== undefined ? { status, finishedAt: status === "COMPLETED" ? new Date() : null } : {}),
          ...(favorite !== undefined ? { favorite } : {}),
        },
      });

      // Only log an activity when something actually changed — re-saving the
      // same status/favorite shouldn't spam the feed with duplicate entries.
      if (!existingEntry || statusChanged || favoriteChanged) {
        await prisma.activity.create({
          data: {
            userId,
            type: "status_change",
            payload: JSON.stringify({
              mediaItemId: mediaItem.id,
              title: mediaItem.title,
              status,
              favorite,
              mediaType: mediaItem.type,
              mediaSource: mediaItem.source,
              mediaExternalId: mediaItem.externalId,
            }),
          },
        });
      }
    }

    if (rating !== undefined || reviewBody !== undefined) {
      const existingReview = await prisma.review.findUnique({
        where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
      });

      const ratingChanged = rating !== undefined && rating !== existingReview?.rating;
      const bodyChanged = reviewBody !== undefined && reviewBody !== existingReview?.body;

      const review = await prisma.review.upsert({
        where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
        create: {
          userId,
          mediaItemId: mediaItem.id,
          rating,
          body: reviewBody,
          containsSpoilers: containsSpoilers ?? false,
          rewatch: rewatch ?? false,
        },
        update: {
          rating,
          body: reviewBody,
          ...(containsSpoilers !== undefined ? { containsSpoilers } : {}),
          ...(rewatch !== undefined ? { rewatch } : {}),
        },
      });

      if (!existingReview || ratingChanged || bodyChanged) {
        await prisma.activity.create({
          data: {
            userId,
            type: "review",
            payload: JSON.stringify({ mediaItemId: mediaItem.id, title: mediaItem.title, rating, reviewId: review.id }),
          },
        });
      }
    }
  } catch (err) {
    // Foreign key violation on userId means the session outlived the account
    // it points to (e.g. the account was deleted) — surface it as an auth
    // problem, not an opaque save failure.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
    }
    throw err;
  }

  return NextResponse.json({ mediaItemId: mediaItem.id });
}

const deleteSchema = z.object({
  type: z.enum(["GAME", "ANIME", "MANGA", "BOOK"]),
  source: z.string(),
  externalId: z.string(),
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

  const { type, source, externalId } = parsed.data;
  const userId = session.user.id;

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { type_source_externalId: { type, source, externalId } },
  });
  if (!mediaItem) return NextResponse.json({ ok: true });

  await prisma.review.deleteMany({ where: { userId, mediaItemId: mediaItem.id } });
  await prisma.listEntry.deleteMany({ where: { userId, mediaItemId: mediaItem.id } });

  return NextResponse.json({ ok: true });
}
