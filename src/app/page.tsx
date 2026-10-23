import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { getTopRated } from "@/lib/ranking";
import { RecentComments } from "@/components/RecentComments";

export default async function Home() {
  const [user, locale] = await Promise.all([getCurrentUser(), getServerLocale()]);
  const t = getDictionary(locale);
  const topRated = await getTopRated({ period: "all", limit: 5 });

  return (
    <div>
      <div className="flex flex-col items-center text-center gap-6 py-16">
        <h1 className="text-4xl font-bold text-orange-500">MediaBoxd</h1>
        <p className="text-neutral-300 max-w-xl">{t.home.tagline}</p>

        <div className="flex gap-3">
          <Link href="/search?type=GAME" className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500">
            {t.home.exploreGames}
          </Link>
          <Link href="/search?type=ANIME" className="px-4 py-2 rounded-md bg-pink-600 hover:bg-pink-500">
            {t.home.exploreAnime}
          </Link>
          <Link href="/search?type=BOOK" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500">
            {t.home.exploreBooks}
          </Link>
        </div>

        {!user && (
          <p className="text-sm text-neutral-400">
            <Link href="/register" className="text-orange-400 hover:underline">{t.home.createAccountPrompt}</Link>{" "}
            {t.home.createAccountSuffix}
          </p>
        )}

        {user && (
          <Link href={`/profile/${user.username}`} className="text-sm text-orange-400 hover:underline">
            {t.home.goToProfile}
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 pb-8">
        <div className="border border-neutral-800 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-300">{t.ranking.title}</h2>
            <Link href="/ranking" className="text-xs text-orange-400 hover:underline">
              {t.ranking.viewFullRanking}
            </Link>
          </div>

          {topRated.length === 0 ? (
            <p className="text-neutral-500 text-sm">{t.ranking.noData}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topRated.map((entry, i) => (
                <Link
                  key={entry.mediaItem.id}
                  href={`/media/${entry.mediaItem.type}/${entry.mediaItem.externalId}?source=${entry.mediaItem.source}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span className="w-4 text-neutral-500 shrink-0">{i + 1}</span>
                  <span className="flex-1 truncate">{entry.mediaItem.title}</span>
                  <span className="text-orange-400 shrink-0">
                    ★ {(entry.avgRating / 2).toFixed(1).replace(/\.0$/, "")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <RecentComments limit={5} />
      </div>
    </div>
  );
}
