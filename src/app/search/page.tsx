import { searchMedia, searchAllMedia, getTrendingMedia, getTrendingAllMedia } from "@/lib/providers";
import type { MediaType } from "@/lib/providers/types";
import { MediaCard } from "@/components/MediaCard";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import Link from "next/link";

const PAGE_SIZE = 20;

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const type = (typeof params.type === "string" ? params.type : null) as MediaType | null;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);
  const t = getDictionary(await getServerLocale());

  const tabs: { type: MediaType | null; label: string }[] = [
    { type: null, label: t.search.all },
    { type: "GAME", label: t.nav.games },
    { type: "ANIME", label: t.nav.anime },
    { type: "MANGA", label: t.nav.manga },
    { type: "BOOK", label: t.nav.books },
  ];

  const results = q
    ? type
      ? await searchMedia(type, q, page)
      : await searchAllMedia(q, page)
    : type
      ? await getTrendingMedia(type, page)
      : await getTrendingAllMedia(page);

  // Single-type pages report a full page when there's more to fetch. The
  // combined "Tudo" view mixes 4 sources with no single reliable page size,
  // so we just keep offering "next" as long as the current page has content.
  const hasNextPage = type !== null ? results.length === PAGE_SIZE : results.length > 0;

  function pageHref(p: number) {
    return `/search?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(type ? { type } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    }).toString()}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t.search.title}</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={`/search?${new URLSearchParams({ ...(q ? { q } : {}), ...(tab.type ? { type: tab.type } : {}) }).toString()}`}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              type === tab.type
                ? "bg-orange-600 border-orange-600 text-white"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {!q && (
        <h2 className="text-sm font-medium text-neutral-400 mb-3">
          {t.search.trending}{type ? ` — ${tabs.find((tab) => tab.type === type)?.label}` : ""}
        </h2>
      )}

      {q && results.length === 0 && (
        <p className="text-neutral-400">{t.search.noResults} &quot;{q}&quot;.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {results.map((m) => (
          <MediaCard key={`${m.type}-${m.source}-${m.externalId}`} media={m} />
        ))}
      </div>

      {(page > 1 || hasNextPage) && (
        <div className="flex justify-center gap-3 mt-8">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500">
              {t.search.prev}
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-neutral-500">{t.search.page} {page}</span>
          {hasNextPage && (
            <Link href={pageHref(page + 1)} className="px-3 py-1.5 rounded-md text-sm border border-neutral-700 hover:border-neutral-500">
              {t.search.next}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
