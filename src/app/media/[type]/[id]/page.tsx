import { notFound } from "next/navigation";
import { getMediaDetail } from "@/lib/providers";
import type { MediaType } from "@/lib/providers/types";
import { MediaActions } from "@/components/MediaActions";
import { AddToListButton } from "@/components/AddToListButton";
import { ReviewCard } from "@/components/ReviewCard";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { translateText } from "@/lib/translate";
import { translateGenres } from "@/lib/genreTranslations";
import Link from "next/link";

const ANILIST_STATUS_KEY = {
  RELEASING: "ongoing",
  FINISHED: "finished",
  NOT_YET_RELEASED: "notYetReleased",
  CANCELLED: "cancelled",
  HIATUS: "onHiatus",
} as const;

const VALID_TYPES: MediaType[] = ["GAME", "ANIME", "MANGA", "BOOK"];
const defaultSource: Record<MediaType, string> = {
  GAME: "igdb",
  ANIME: "anilist",
  MANGA: "anilist",
  BOOK: "openlibrary",
};

export default async function MediaDetailPage({
  params,
  searchParams,
}: PageProps<"/media/[type]/[id]">) {
  const { type: rawType, id } = await params;
  const { source } = await searchParams;

  const type = rawType.toUpperCase() as MediaType;
  if (!VALID_TYPES.includes(type)) notFound();

  const media = await getMediaDetail(type, id);
  if (!media) notFound();

  const resolvedSource = typeof source === "string" ? source : defaultSource[type];
  const locale = await getServerLocale();

  const plainDescription = media.description?.replace(/<[^>]+>/g, "") ?? null;
  const rawGenres = media.genres ?? null;
  const [description, genres] = await Promise.all([
    locale === "pt" && plainDescription ? translateText(plainDescription, "pt") : Promise.resolve(plainDescription),
    Promise.resolve(locale === "pt" ? translateGenres(rawGenres) : rawGenres),
  ]);

  const reviews = await prisma.review.findMany({
    where: {
      mediaItem: { type, source: resolvedSource, externalId: id },
    },
    include: {
      user: true,
      likes: true,
      comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const t = getDictionary(locale);

  const anilistMeta = media.metadata as
    | {
        status?: keyof typeof ANILIST_STATUS_KEY;
        chapters?: number | null;
        volumes?: number | null;
        nextAiringEpisode?: { episode: number; airingAt: number } | null;
      }
    | null
    | undefined;
  const statusLabel = anilistMeta?.status ? t.mediaDetail[ANILIST_STATUS_KEY[anilistMeta.status]] : null;

  const currentUser = await getCurrentUser();
  const localItem = currentUser
    ? await prisma.mediaItem.findUnique({
        where: { type_source_externalId: { type, source: resolvedSource, externalId: id } },
      })
    : null;

  const [myEntry, myReview] =
    currentUser && localItem
      ? await Promise.all([
          prisma.listEntry.findUnique({
            where: { userId_mediaItemId: { userId: currentUser.id, mediaItemId: localItem.id } },
          }),
          prisma.review.findUnique({
            where: { userId_mediaItemId: { userId: currentUser.id, mediaItemId: localItem.id } },
          }),
        ])
      : [null, null];

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-8">
      <div>
        <div className="aspect-[2/3] rounded-md overflow-hidden bg-neutral-800 border border-neutral-800">
          {media.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.coverUrl} alt={media.title} className="w-full h-full object-cover" />
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <MediaActions
            type={type}
            source={resolvedSource}
            externalId={id}
            initialStatus={myEntry?.status ?? ""}
            initialRating={myReview?.rating ?? ""}
            initialReviewBody={myReview?.body ?? ""}
            initialContainsSpoilers={myReview?.containsSpoilers ?? false}
            initialRewatch={myReview?.rewatch ?? false}
            hasExisting={!!myEntry || !!myReview}
          />
          <AddToListButton type={type} source={resolvedSource} externalId={id} />
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{media.title}</h1>
        {media.originalTitle && (
          <p className="text-neutral-400 text-sm">{media.originalTitle}</p>
        )}
        <p className="text-neutral-400 text-sm mt-1">
          {media.releaseYear ?? ""} {media.creators ? `· ${media.creators}` : ""}
        </p>
        {genres && (
          <p className="text-xs text-neutral-500 mt-2">{genres}</p>
        )}

        {description && (
          <p className="mt-4 text-neutral-200 leading-relaxed whitespace-pre-line">
            {description}
          </p>
        )}

        {type === "ANIME" && (
          <div className="mt-4 border border-neutral-800 rounded-md p-3 flex items-center justify-between text-sm">
            <div>
              {statusLabel && <span className="text-neutral-400">{statusLabel}</span>}
              {anilistMeta?.nextAiringEpisode && (
                <p className="text-orange-400 text-xs mt-1">
                  {t.mediaDetail.episode} {anilistMeta.nextAiringEpisode.episode} · {t.mediaDetail.upcoming}{" "}
                  {new Date(anilistMeta.nextAiringEpisode.airingAt * 1000).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              )}
            </div>
            <Link
              href={`/media/ANIME/${id}/episodes?source=${resolvedSource}`}
              className="text-orange-400 hover:underline whitespace-nowrap"
            >
              {t.mediaDetail.viewEpisodes}
            </Link>
          </div>
        )}

        {type === "MANGA" && (
          <div className="mt-4 border border-neutral-800 rounded-md p-3 text-sm">
            <div className="flex items-center gap-4">
              {statusLabel && <span className="text-neutral-300">{statusLabel}</span>}
              {typeof anilistMeta?.chapters === "number" && (
                <span className="text-neutral-400">{anilistMeta.chapters} {t.mediaDetail.chapters}</span>
              )}
              {typeof anilistMeta?.volumes === "number" && (
                <span className="text-neutral-400">{anilistMeta.volumes} {t.mediaDetail.volumes}</span>
              )}
            </div>
            <p className="text-neutral-600 text-xs mt-2">{t.mediaDetail.chapterDataUnavailable}</p>
          </div>
        )}

        <h2 className="text-xl font-semibold mt-8 mb-3">{t.mediaDetail.reviews}</h2>
        {reviews.length === 0 && (
          <p className="text-neutral-500 text-sm">{t.mediaDetail.noReviews}</p>
        )}
        <div className="flex flex-col gap-4">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              reviewId={r.id}
              author={{ username: r.user.username, name: r.user.name }}
              rating={r.rating}
              body={r.body}
              containsSpoilers={r.containsSpoilers}
              rewatch={r.rewatch}
              initialLikeCount={r.likes.length}
              initialLiked={!!currentUser && r.likes.some((l) => l.userId === currentUser.id)}
              initialComments={r.comments.map((c) => ({
                id: c.id,
                body: c.body,
                createdAt: c.createdAt.toISOString(),
                user: { username: c.user.username, name: c.user.name },
              }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
