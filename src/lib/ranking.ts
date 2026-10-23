import { prisma } from "./prisma";
import type { MediaType } from "@prisma/client";

export type RankingEntry = {
  mediaItem: {
    id: string;
    type: MediaType;
    source: string;
    externalId: string;
    title: string;
    coverUrl: string | null;
  };
  avgRating: number;
  count: number;
};

export async function getTopRated({
  type,
  period,
  limit = 20,
}: {
  type?: MediaType;
  period: "all" | "weekly";
  limit?: number;
}): Promise<RankingEntry[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const groups = await prisma.review.groupBy({
    by: ["mediaItemId"],
    where: {
      rating: { not: null },
      ...(period === "weekly" ? { createdAt: { gte: sevenDaysAgo } } : {}),
      ...(type ? { mediaItem: { type } } : {}),
    },
    _avg: { rating: true },
    _count: { rating: true },
    orderBy: [{ _avg: { rating: "desc" } }, { _count: { rating: "desc" } }],
    take: limit,
  });

  if (groups.length === 0) return [];

  const mediaItems = await prisma.mediaItem.findMany({
    where: { id: { in: groups.map((g) => g.mediaItemId) } },
    select: { id: true, type: true, source: true, externalId: true, title: true, coverUrl: true },
  });
  const byId = new Map(mediaItems.map((m) => [m.id, m]));

  return groups
    .map((g) => {
      const mediaItem = byId.get(g.mediaItemId);
      if (!mediaItem) return null;
      return { mediaItem, avgRating: g._avg.rating ?? 0, count: g._count.rating };
    })
    .filter((x): x is RankingEntry => x !== null);
}
