import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { MediaType } from "@prisma/client";
import { MediaMini } from "../page";
import { getServerLocale, getDictionary } from "@/lib/i18n";

const VALID_TYPES: MediaType[] = ["GAME", "ANIME", "MANGA", "BOOK"];
const PAGE_SIZE = 24;

export default async function ProfileTypePage({
  params,
  searchParams,
}: PageProps<"/profile/[username]/[type]">) {
  const { username, type: rawType } = await params;
  const { page: rawPage } = await searchParams;
  const t = getDictionary(await getServerLocale());

  const type = rawType.toUpperCase() as MediaType;
  if (!VALID_TYPES.includes(type)) notFound();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const page = Math.max(1, Number(typeof rawPage === "string" ? rawPage : "1") || 1);

  const [entries, total] = await Promise.all([
    prisma.listEntry.findMany({
      where: { userId: user.id, mediaItem: { type } },
      include: { mediaItem: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.listEntry.count({ where: { userId: user.id, mediaItem: { type } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <p className="text-sm text-neutral-400 mb-1">
        <Link href={`/profile/${username}`} className="hover:underline">@{username}</Link>
      </p>
      <h1 className="text-2xl font-bold mb-6">{t.mediaTypePlural[type]} <span className="text-neutral-500 text-lg">({total})</span></h1>

      {entries.length === 0 ? (
        <p className="text-neutral-500 text-sm">{t.profile.nothingYet}</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {entries.map((e) => (
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-8">
          {page > 1 && (
            <Link
              href={`/profile/${username}/${rawType}?page=${page - 1}`}
              className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500"
            >
              {t.search.prev}
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-neutral-500">{t.search.page} {page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/profile/${username}/${rawType}?page=${page + 1}`}
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
