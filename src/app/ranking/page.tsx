import Link from "next/link";
import type { MediaType } from "@prisma/client";
import { getTopRated } from "@/lib/ranking";
import { getServerLocale, getDictionary } from "@/lib/i18n";

export default async function RankingPage({ searchParams }: PageProps<"/ranking">) {
  const params = await searchParams;
  const type = (typeof params.type === "string" ? params.type : null) as MediaType | null;
  const period = params.period === "weekly" ? "weekly" : "all";
  const t = getDictionary(await getServerLocale());

  const typeTabs: { type: MediaType | null; label: string }[] = [
    { type: null, label: t.search.all },
    { type: "GAME", label: t.nav.games },
    { type: "ANIME", label: t.nav.anime },
    { type: "MANGA", label: t.nav.manga },
    { type: "BOOK", label: t.nav.books },
  ];

  const entries = await getTopRated({ type: type ?? undefined, period, limit: 50 });

  function href(nextType: MediaType | null, nextPeriod: "all" | "weekly") {
    const qs = new URLSearchParams({
      ...(nextType ? { type: nextType } : {}),
      ...(nextPeriod === "weekly" ? { period: "weekly" } : {}),
    });
    const s = qs.toString();
    return `/ranking${s ? `?${s}` : ""}`;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t.ranking.title}</h1>

      <div className="flex gap-2 mb-3">
        <Link
          href={href(type, "all")}
          className={`px-3 py-1.5 rounded-md text-sm border ${
            period === "all"
              ? "bg-orange-600 border-orange-600 text-white"
              : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
          }`}
        >
          {t.ranking.allTime}
        </Link>
        <Link
          href={href(type, "weekly")}
          className={`px-3 py-1.5 rounded-md text-sm border ${
            period === "weekly"
              ? "bg-orange-600 border-orange-600 text-white"
              : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
          }`}
        >
          {t.ranking.weekly}
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {typeTabs.map((tab) => (
          <Link
            key={tab.label}
            href={href(tab.type, period)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              type === tab.type
                ? "bg-neutral-100 border-neutral-100 text-neutral-900"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {entries.length === 0 && <p className="text-neutral-500 text-sm">{t.ranking.noData}</p>}

      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <Link
            key={entry.mediaItem.id}
            href={`/media/${entry.mediaItem.type}/${entry.mediaItem.externalId}?source=${entry.mediaItem.source}`}
            className="flex items-center gap-3 border border-neutral-800 rounded-md p-2 hover:border-neutral-600"
          >
            <span className="w-6 text-center text-neutral-500 font-medium shrink-0">{i + 1}</span>
            <div className="w-10 h-14 rounded overflow-hidden bg-neutral-800 shrink-0">
              {entry.mediaItem.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.mediaItem.coverUrl} alt={entry.mediaItem.title} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.mediaItem.title}</p>
              <p className="text-xs text-neutral-500">
                {entry.count} {entry.count === 1 ? t.ranking.vote : t.ranking.votes}
              </p>
            </div>
            <span className="text-orange-400 font-medium text-sm shrink-0">
              ★ {(entry.avgRating / 2).toFixed(1).replace(/\.0$/, "")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
