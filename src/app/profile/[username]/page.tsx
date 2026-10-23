import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { MediaType } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import { FollowButton } from "@/components/FollowButton";
import { getServerLocale, getDictionary } from "@/lib/i18n";

const typeColor: Record<MediaType, string> = {
  GAME: "bg-purple-600",
  ANIME: "bg-pink-600",
  MANGA: "bg-teal-600",
  BOOK: "bg-blue-600",
};

export default async function ProfilePage({ params }: PageProps<"/profile/[username]">) {
  const { username } = await params;
  const t = getDictionary(await getServerLocale());

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const currentUser = await getCurrentUser();

  const isOwner = currentUser?.id === user.id;

  const [entries, reviews, followerCount, followingCount, viewerFollow, lists] = await Promise.all([
    prisma.listEntry.findMany({
      where: { userId: user.id },
      include: { mediaItem: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.review.findMany({
      where: { userId: user.id },
      include: { mediaItem: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    currentUser && currentUser.id !== user.id
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: currentUser.id, followingId: user.id } },
        })
      : null,
    prisma.list.findMany({
      where: isOwner ? { userId: user.id } : { userId: user.id, isPublic: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    }),
  ]);

  const byType: Record<MediaType, typeof entries> = { GAME: [], ANIME: [], MANGA: [], BOOK: [] };
  for (const e of entries) byType[e.mediaItem.type].push(e);

  const completedCount = entries.filter((e) => e.status === "COMPLETED").length;
  const favorites = entries.filter((e) => e.favorite);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-2xl font-bold text-orange-500 overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            (user.name ?? user.username)[0]?.toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.name ?? user.username}</h1>
          <p className="text-neutral-400 text-sm">@{user.username}</p>
          {user.bio && <p className="text-neutral-300 text-sm mt-1">{user.bio}</p>}
        </div>
        {isOwner && (
          <Link
            href="/profile/edit"
            className="border border-neutral-700 text-neutral-300 hover:border-neutral-500 rounded-md px-3 py-1.5 text-sm"
          >
            {t.profile.editProfile}
          </Link>
        )}
        {currentUser && currentUser.id !== user.id && (
          <FollowButton username={user.username} initialFollowing={!!viewerFollow} />
        )}
        <div className="ml-auto flex gap-6 text-sm text-neutral-300 text-center">
          <div><div className="font-bold text-white">{entries.length}</div>{t.profile.items}</div>
          <div><div className="font-bold text-white">{completedCount}</div>{t.profile.completed}</div>
          <div><div className="font-bold text-white">{followerCount}</div>{t.profile.followers}</div>
          <div><div className="font-bold text-white">{followingCount}</div>{t.profile.following}</div>
        </div>
      </div>

      <div className="mb-8 -mt-4">
        <Link href={`/profile/${user.username}/stats`} className="text-sm text-orange-400 hover:underline">
          {t.stats.viewStats}
        </Link>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t.profile.lists}</h2>
          {isOwner && (
            <Link href="/lists/new" className="text-sm text-orange-400 hover:underline">
              {t.profile.newList}
            </Link>
          )}
        </div>
        {lists.length === 0 ? (
          <p className="text-neutral-500 text-sm">{t.profile.noLists}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {lists.map((l) => (
              <Link
                key={l.id}
                href={`/lists/${l.id}`}
                className="border border-neutral-800 rounded-md px-3 py-2 text-sm hover:border-neutral-600 flex justify-between"
              >
                <span>{l.name} {!l.isPublic && <span className="text-neutral-500">{t.profile.private}</span>}</span>
                <span className="text-neutral-500">{l._count.items} {t.profile.items}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {favorites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{t.profile.favorites}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {favorites.map((e) => (
              <MediaMini key={e.id} title={e.mediaItem.title} cover={e.mediaItem.coverUrl} type={e.mediaItem.type} source={e.mediaItem.source} externalId={e.mediaItem.externalId} />
            ))}
          </div>
        </section>
      )}

      {(["GAME", "ANIME", "MANGA", "BOOK"] as MediaType[]).map((type) => {
        const DISPLAY_LIMIT = 12;
        const shown = byType[type].slice(0, DISPLAY_LIMIT);
        return (
          <section key={type} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded text-white ${typeColor[type]}`}>{t.mediaTypePlural[type]}</span>
                <span className="text-neutral-500 text-sm">{byType[type].length}</span>
              </div>
              {byType[type].length > DISPLAY_LIMIT && (
                <Link
                  href={`/profile/${user.username}/${type.toLowerCase()}`}
                  className="text-sm text-orange-400 hover:underline"
                >
                  {t.profile.viewAll}
                </Link>
              )}
            </div>

            {shown.length === 0 ? (
              <p className="text-neutral-500 text-sm">{t.profile.nothingYet}</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {shown.map((e) => (
                  <MediaMini
                    key={e.id}
                    title={e.mediaItem.title}
                    cover={e.mediaItem.coverUrl}
                    type={e.mediaItem.type}
                    source={e.mediaItem.source}
                    externalId={e.mediaItem.externalId}
                    statusLabel={t.mediaActions.statusLabels[e.mediaItem.type][e.status]}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section>
        <h2 className="text-lg font-semibold mb-3">{t.profile.recentReviews}</h2>
        {reviews.length === 0 && <p className="text-neutral-500 text-sm">{t.profile.noReviews}</p>}
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Link
              key={r.id}
              href={`/media/${r.mediaItem.type}/${r.mediaItem.externalId}?source=${r.mediaItem.source}`}
              className="border border-neutral-800 rounded-md p-3 hover:border-neutral-600"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${typeColor[r.mediaItem.type]}`}>
                  {t.mediaTypePlural[r.mediaItem.type]}
                </span>
                <span className="font-medium">{r.mediaItem.title}</span>
                {r.rating !== null && <span className="text-orange-400">★ {(r.rating / 2).toFixed(1).replace(/\.0$/, "")}</span>}
              </div>
              {r.body && <p className="text-sm text-neutral-300 mt-1">{r.body}</p>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MediaMini({
  title,
  cover,
  type,
  source,
  externalId,
  statusLabel,
}: {
  title: string;
  cover: string | null;
  type: MediaType;
  source: string;
  externalId: string;
  statusLabel?: string;
}) {
  return (
    <Link href={`/media/${type}/${externalId}?source=${source}`} className="group">
      <div className="aspect-[2/3] rounded-md overflow-hidden bg-neutral-800 border border-neutral-800 group-hover:border-orange-500">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500 text-[10px] p-1 text-center">
            {title}
          </div>
        )}
      </div>
      {statusLabel && <p className="text-[10px] text-neutral-500 mt-1 truncate">{statusLabel}</p>}
    </Link>
  );
}
