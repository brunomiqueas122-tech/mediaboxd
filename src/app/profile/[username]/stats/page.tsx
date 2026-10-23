import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { MediaType } from "@prisma/client";
import { getServerLocale, getDictionary } from "@/lib/i18n";

const typeColor: Record<MediaType, string> = {
  GAME: "bg-purple-600",
  ANIME: "bg-pink-600",
  MANGA: "bg-teal-600",
  BOOK: "bg-blue-600",
};

export default async function ProfileStatsPage({ params }: PageProps<"/profile/[username]/stats">) {
  const { username } = await params;
  const t = getDictionary(await getServerLocale());

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const [entries, reviews] = await Promise.all([
    prisma.listEntry.findMany({
      where: { userId: user.id },
      include: { mediaItem: { select: { type: true, genres: true } } },
    }),
    prisma.review.findMany({
      where: { userId: user.id, rating: { not: null } },
      select: { rating: true },
    }),
  ]);

  const byType: Record<MediaType, number> = { GAME: 0, ANIME: 0, MANGA: 0, BOOK: 0 };
  for (const e of entries) byType[e.mediaItem.type]++;
  const maxByType = Math.max(1, ...Object.values(byType));

  const ratingBuckets: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) ratingBuckets[i] = 0;
  for (const r of reviews) {
    if (r.rating === null) continue;
    const bucket = Math.max(1, Math.round(r.rating));
    ratingBuckets[bucket] = (ratingBuckets[bucket] ?? 0) + 1;
  }
  const maxRatingCount = Math.max(1, ...Object.values(ratingBuckets));

  const now = new Date();
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({
      key,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      count: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const e of entries) {
    if (e.status !== "COMPLETED" || !e.finishedAt) continue;
    const d = new Date(e.finishedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx].count++;
  }
  const maxMonthCount = Math.max(1, ...months.map((m) => m.count));

  const genreCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.mediaItem.genres) continue;
    for (const g of e.mediaItem.genres.split(",").map((s) => s.trim()).filter(Boolean)) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const completedCount = entries.filter((e) => e.status === "COMPLETED").length;

  return (
    <div>
      <p className="text-sm text-neutral-400 mb-1">
        <Link href={`/profile/${username}`} className="hover:underline">@{username}</Link>
      </p>
      <h1 className="text-2xl font-bold mb-6">{t.stats.title}</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-neutral-800 rounded-md p-4 text-center">
          <div className="text-2xl font-bold text-white">{entries.length}</div>
          <div className="text-xs text-neutral-500">{t.profile.items}</div>
        </div>
        <div className="border border-neutral-800 rounded-md p-4 text-center">
          <div className="text-2xl font-bold text-white">{completedCount}</div>
          <div className="text-xs text-neutral-500">{t.profile.completed}</div>
        </div>
        <div className="border border-neutral-800 rounded-md p-4 text-center">
          <div className="text-2xl font-bold text-white">{reviews.length}</div>
          <div className="text-xs text-neutral-500">{t.stats.reviewsWritten}</div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">{t.stats.itemsByType}</h2>
        <div className="flex flex-col gap-2">
          {(["GAME", "ANIME", "MANGA", "BOOK"] as MediaType[]).map((type) => (
            <div key={type} className="flex items-center gap-3 text-sm">
              <span className="w-16 text-neutral-400 shrink-0">{t.mediaTypePlural[type]}</span>
              <div className="flex-1 bg-neutral-900 rounded h-4 overflow-hidden">
                <div
                  className={`h-full ${typeColor[type]}`}
                  style={{ width: `${(byType[type] / maxByType) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-neutral-500 shrink-0">{byType[type]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">{t.stats.ratingDistribution}</h2>
        <div className="flex items-end gap-1 h-32">
          {Object.entries(ratingBuckets).map(([bucket, count]) => (
            <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-orange-600 rounded-t"
                style={{ height: `${(count / maxRatingCount) * 100}%`, minHeight: count > 0 ? "2px" : "0" }}
              />
              <span className="text-[10px] text-neutral-500">{Number(bucket) / 2}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">{t.stats.completionsPerMonth}</h2>
        <div className="flex items-end gap-1 h-32">
          {months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-teal-600 rounded-t"
                style={{ height: `${(m.count / maxMonthCount) * 100}%`, minHeight: m.count > 0 ? "2px" : "0" }}
              />
              <span className="text-[10px] text-neutral-500">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {topGenres.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">{t.stats.topGenres}</h2>
          <div className="flex flex-wrap gap-2">
            {topGenres.map(([genre, count]) => (
              <span key={genre} className="text-xs border border-neutral-800 rounded-full px-3 py-1 text-neutral-300">
                {genre} <span className="text-neutral-500">({count})</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
