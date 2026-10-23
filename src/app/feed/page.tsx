import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { UserHandle } from "@/components/UserHandle";
import { NowFollowing } from "@/components/NowFollowing";

export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getServerLocale();
  const t = getDictionary(locale);

  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const ids = [user.id, ...following.map((f) => f.followingId)];

  const activities = await prisma.activity.findMany({
    where: { userId: { in: ids } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t.feed.title}</h1>

      <div className="mb-6">
        <NowFollowing userId={user.id} />
      </div>

      {activities.length === 0 && (
        <p className="text-neutral-500 text-sm">{t.feed.empty}</p>
      )}

      <div className="flex flex-col gap-3">
        {activities.map((a) => {
          const payload = JSON.parse(a.payload) as {
            title?: string;
            name?: string;
            status?: keyof (typeof t.mediaActions.statusLabels)[keyof typeof t.mediaActions.statusLabels];
            rating?: number;
            listId?: string;
            mediaItemId?: string;
            body?: string;
            mediaType?: keyof typeof t.mediaActions.statusLabels;
            mediaSource?: string;
            mediaExternalId?: string;
          };

          const verb = t.feed.verbs[a.type as keyof typeof t.feed.verbs] ?? a.type;
          const mediaHref =
            payload.mediaType && payload.mediaSource && payload.mediaExternalId
              ? `/media/${payload.mediaType}/${payload.mediaExternalId}?source=${payload.mediaSource}`
              : null;
          const titleNode = payload.title ?? payload.name;

          return (
            <div key={a.id} className="border border-neutral-800 rounded-md p-3 text-sm">
              <UserHandle username={a.user.username} name={a.user.name} />{" "}
              <span className="text-neutral-400">{verb}</span>{" "}
              {mediaHref ? (
                <Link href={mediaHref} className="font-medium hover:underline">{titleNode}</Link>
              ) : (
                <span className="font-medium">{titleNode}</span>
              )}
              {payload.status && payload.mediaType && (
                <span className="text-neutral-500"> · {t.mediaActions.statusLabels[payload.mediaType][payload.status]}</span>
              )}
              {payload.rating !== undefined && (
                <span className="text-orange-400"> · ★ {(payload.rating / 2).toFixed(1).replace(/\.0$/, "")}</span>
              )}
              {a.type === "comment" && payload.body && (
                <p className="text-neutral-300 text-xs mt-1 line-clamp-2">&quot;{payload.body}&quot;</p>
              )}
              <div className="text-neutral-600 text-xs mt-1">
                {new Date(a.createdAt).toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
