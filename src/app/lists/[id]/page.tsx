import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { MediaCard } from "@/components/MediaCard";
import { ListItemsEditor } from "@/components/ListItemsEditor";
import { ListLikeButton } from "@/components/ListLikeButton";
import { ReportButton } from "@/components/ReportButton";
import type { UnifiedMedia } from "@/lib/providers/types";
import { getServerLocale, getDictionary } from "@/lib/i18n";

export default async function ListPage({ params }: PageProps<"/lists/[id]">) {
  const { id } = await params;
  const t = getDictionary(await getServerLocale());

  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      user: true,
      items: { include: { mediaItem: true }, orderBy: { position: "asc" } },
      likes: true,
    },
  });
  if (!list) notFound();

  const currentUser = await getCurrentUser();
  if (!list.isPublic && currentUser?.id !== list.userId) notFound();

  const isOwner = currentUser?.id === list.userId;

  return (
    <div>
      <h1 className="text-2xl font-bold">{list.name}</h1>
      <div className="flex items-center gap-3 mt-1">
        <p className="text-sm text-neutral-400">
          {t.lists.by} <Link href={`/profile/${list.user.username}`} className="hover:underline">@{list.user.username}</Link>
          {!list.isPublic && ` ${t.lists.privateSuffix}`}
        </p>
        <ListLikeButton
          listId={list.id}
          initialLikeCount={list.likes.length}
          initialLiked={!!currentUser && list.likes.some((l) => l.userId === currentUser.id)}
        />
        {!isOwner && <ReportButton targetType="LIST" targetId={list.id} />}
      </div>
      {list.description && <p className="text-neutral-300 mt-3">{list.description}</p>}

      {isOwner ? (
        <ListItemsEditor
          listId={list.id}
          items={list.items.map((item) => ({
            id: item.id,
            mediaItemId: item.mediaItemId,
            title: item.mediaItem.title,
            coverUrl: item.mediaItem.coverUrl,
            type: item.mediaItem.type,
            source: item.mediaItem.source,
            externalId: item.mediaItem.externalId,
          }))}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-6">
            {list.items.map((item) => {
              const m: UnifiedMedia = {
                type: item.mediaItem.type,
                source: item.mediaItem.source,
                externalId: item.mediaItem.externalId,
                title: item.mediaItem.title,
                coverUrl: item.mediaItem.coverUrl,
                releaseYear: item.mediaItem.releaseYear,
              };
              return <MediaCard key={item.id} media={m} />;
            })}
          </div>

          {list.items.length === 0 && (
            <p className="text-neutral-500 text-sm mt-6">{t.listEditor.empty}</p>
          )}
        </>
      )}
    </div>
  );
}
