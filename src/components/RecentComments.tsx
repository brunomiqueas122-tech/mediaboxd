import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { UserHandle } from "./UserHandle";

export async function RecentComments({ limit = 8 }: { limit?: number }) {
  const t = getDictionary(await getServerLocale());

  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { username: true, name: true } },
      review: { include: { mediaItem: { select: { type: true, source: true, externalId: true, title: true } } } },
    },
  });

  return (
    <div className="border border-neutral-800 rounded-md p-4">
      <h2 className="text-sm font-semibold text-neutral-300 mb-3">{t.recentComments.title}</h2>

      {comments.length === 0 ? (
        <p className="text-neutral-500 text-sm">{t.recentComments.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => {
            const media = c.review.mediaItem;
            return (
              <div key={c.id} className="text-xs">
                <UserHandle username={c.user.username} name={c.user.name} className="font-medium hover:underline" />{" "}
                <span className="text-neutral-500">{t.recentComments.commentedOn}</span>{" "}
                <Link
                  href={`/media/${media.type}/${media.externalId}?source=${media.source}`}
                  className="font-medium hover:underline"
                >
                  {media.title}
                </Link>
                <p className="text-neutral-400 mt-0.5 line-clamp-2">&quot;{c.body}&quot;</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
