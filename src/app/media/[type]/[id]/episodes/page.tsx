import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnimeDetail, getAnimeEpisodes } from "@/lib/providers/anime";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { EpisodeRatingWidget } from "@/components/EpisodeRatingWidget";

export default async function EpisodesPage({
  params,
  searchParams,
}: PageProps<"/media/[type]/[id]/episodes">) {
  const { type: rawType, id } = await params;
  const { source, page: rawPage } = await searchParams;
  const t = getDictionary(await getServerLocale());

  if (rawType.toUpperCase() !== "ANIME") notFound();

  const media = await getAnimeDetail(id);
  if (!media) notFound();

  const resolvedSource = typeof source === "string" ? source : "anilist";
  const currentPage = Math.max(1, Number(typeof rawPage === "string" ? rawPage : "1") || 1);

  const { episodes, hasNextPage, total } = await getAnimeEpisodes(id, currentPage);
  // This page already depends on searchParams (fully dynamic, never statically
  // cached), so reading the current time here is safe despite the lint rule.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now() / 1000;

  const currentUser = await getCurrentUser();
  const localItem = await prisma.mediaItem.findUnique({
    where: { type_source_externalId: { type: "ANIME", source: resolvedSource, externalId: id } },
  });

  const episodeNumbers = episodes.map((ep) => ep.episode);
  const [aggregates, myRatings] = localItem
    ? await Promise.all([
        prisma.episodeRating.groupBy({
          by: ["episodeNumber"],
          where: { mediaItemId: localItem.id, episodeNumber: { in: episodeNumbers } },
          _avg: { rating: true },
          _count: true,
        }),
        currentUser
          ? prisma.episodeRating.findMany({
              where: { mediaItemId: localItem.id, episodeNumber: { in: episodeNumbers }, userId: currentUser.id },
            })
          : Promise.resolve([]),
      ])
    : [[], []];

  const aggregateByEpisode = new Map(aggregates.map((a) => [a.episodeNumber, a]));
  const myRatingByEpisode = new Map(myRatings.map((r) => [r.episodeNumber, r.rating]));

  return (
    <div className="max-w-xl mx-auto">
      <p className="text-sm text-neutral-400 mb-1">
        <Link href={`/media/ANIME/${id}?source=${resolvedSource}`} className="hover:underline">
          ← {media.title}
        </Link>
      </p>
      <h1 className="text-2xl font-bold mb-1">
        {t.mediaDetail.episodes} {total > 0 && <span className="text-neutral-500 text-lg">({total})</span>}
      </h1>
      <p className="text-xs text-neutral-600 mb-6">{t.mediaDetail.noExternalEpisodeRatings}</p>

      {episodes.length === 0 && <p className="text-neutral-500 text-sm">{t.mediaDetail.noEpisodes}</p>}

      <div className="flex flex-col gap-2">
        {episodes.map((ep) => {
          const aired = ep.airingAt <= now;
          const date = new Date(ep.airingAt * 1000);
          const agg = aggregateByEpisode.get(ep.episode);
          return (
            <div
              key={ep.episode}
              className={`flex flex-col gap-1.5 border rounded-md px-3 py-2 text-sm ${
                aired ? "border-neutral-800" : "border-orange-900/50 bg-orange-950/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.mediaDetail.episode} {ep.episode}</span>
                <span className={aired ? "text-neutral-500" : "text-orange-400"}>
                  {date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                  {!aired && ` · ${t.mediaDetail.upcoming}`}
                </span>
              </div>
              {aired && (
                <EpisodeRatingWidget
                  type="ANIME"
                  source={resolvedSource}
                  externalId={id}
                  episodeNumber={ep.episode}
                  initialMyRating={myRatingByEpisode.get(ep.episode) ?? null}
                  initialAverage={agg?._avg.rating ?? null}
                  initialCount={agg?._count ?? 0}
                />
              )}
            </div>
          );
        })}
      </div>

      {(currentPage > 1 || hasNextPage) && (
        <div className="flex justify-center gap-3 mt-8">
          {currentPage > 1 && (
            <Link
              href={`/media/ANIME/${id}/episodes?source=${resolvedSource}&page=${currentPage - 1}`}
              className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
            >
              {t.search.prev}
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-neutral-500">{t.search.page} {currentPage}</span>
          {hasNextPage && (
            <Link
              href={`/media/ANIME/${id}/episodes?source=${resolvedSource}&page=${currentPage + 1}`}
              className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
            >
              {t.search.next}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
