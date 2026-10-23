import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getMediaDetail } from "./providers";
import type { MediaType } from "./providers/types";

export class MediaNotFoundError extends Error {}

// Ensures a MediaItem row exists locally for an external (type, id) pair,
// fetching and normalizing it from the source API on first reference.
export async function upsertMediaItem(type: MediaType, externalId: string, source: string) {
  const existing = await prisma.mediaItem.findUnique({
    where: { type_source_externalId: { type, source, externalId } },
  });
  if (existing) return existing;

  const detail = await getMediaDetail(type, externalId);
  if (!detail) throw new MediaNotFoundError("Media not found at source");

  try {
    return await prisma.mediaItem.create({
      data: {
        type: detail.type,
        source: detail.source,
        externalId: detail.externalId,
        title: detail.title,
        originalTitle: detail.originalTitle ?? null,
        description: detail.description ?? null,
        coverUrl: detail.coverUrl ?? null,
        releaseYear: detail.releaseYear ?? null,
        creators: detail.creators ?? null,
        genres: detail.genres ?? null,
        metadata: detail.metadata ? JSON.stringify(detail.metadata) : null,
      },
    });
  } catch (err) {
    // Two concurrent requests (e.g. a double-click) can both pass the
    // findUnique check above before either has inserted — the loser hits a
    // unique constraint violation here instead of a real error. Recover by
    // reading back the row the winner just created.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await prisma.mediaItem.findUnique({
        where: { type_source_externalId: { type, source, externalId } },
      });
      if (winner) return winner;
    }
    throw err;
  }
}
