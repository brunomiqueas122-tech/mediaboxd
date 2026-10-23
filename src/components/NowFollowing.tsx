import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { UserHandle } from "./UserHandle";

export async function NowFollowing({ userId, limit = 8 }: { userId: string; limit?: number }) {
  const t = getDictionary(await getServerLocale());

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const ids = following.map((f) => f.followingId);

  const entries = ids.length
    ? await prisma.listEntry.findMany({
        where: { userId: { in: ids }, status: "IN_PROGRESS" },
        orderBy: { updatedAt: "desc" },
        take: limit,
        include: {
          user: { select: { username: true, name: true } },
          mediaItem: { select: { type: true, source: true, externalId: true, title: true } },
        },
      })
    : [];

  return (
    <div className="border border-neutral-800 rounded-md p-4">
      <h2 className="text-sm font-semibold text-neutral-300 mb-3">{t.nowFollowing.title}</h2>

      {entries.length === 0 ? (
        <p className="text-neutral-500 text-sm">{t.nowFollowing.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.id} className="text-xs">
              <UserHandle username={e.user.username} name={e.user.name} className="font-medium hover:underline" />{" "}
              <span className="text-neutral-500">{t.nowFollowing.isDoing}</span>{" "}
              <Link
                href={`/media/${e.mediaItem.type}/${e.mediaItem.externalId}?source=${e.mediaItem.source}`}
                className="font-medium hover:underline"
              >
                {e.mediaItem.title}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
