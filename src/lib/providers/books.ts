import type { UnifiedMedia } from "./types";
import { fetchWithRetry } from "../fetchRetry";

// Open Library — free, no key required. https://openlibrary.org/dev/docs/api/search
const OL_BASE = "https://openlibrary.org";

export async function searchBooks(query: string, page = 1): Promise<UnifiedMedia[]> {
  const res = await fetch(
    `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=20&page=${page}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.docs ?? []) as Record<string, unknown>[]).map(normalizeWork);
}

function normalizeWork(b: Record<string, unknown>): UnifiedMedia {
  const coverId = b.cover_i as number | undefined;
  const authors = b.author_name as string[] | undefined;
  const key = (b.key as string) ?? "";

  return {
    type: "BOOK",
    source: "openlibrary",
    externalId: key.replace("/works/", ""),
    title: b.title as string,
    description: null,
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    releaseYear: (b.first_publish_year as number) ?? null,
    creators: authors?.join(", ") ?? null,
    genres: (b.subject as string[] | undefined)?.slice(0, 5).join(", ") ?? null,
    metadata: b,
  };
}

const TRENDING_PAGE_SIZE = 20;
// Open Library's trending endpoint quietly supports much larger limits than
// its own docs suggest (tested up to ~1000). 100 per period across four
// periods gives a pool of up to 400 candidates before dedup — plenty for
// deep pagination, instead of the ~20-30 we got capped at limit=20.
const TRENDING_FETCH_LIMIT = 100;

// Open Library's trending endpoint doesn't support real pagination, so we
// pool daily + weekly + monthly + yearly trending (deduped) into a larger
// list and paginate that ourselves.
export async function getTrendingBooks(page = 1): Promise<UnifiedMedia[]> {
  const [daily, weekly, monthly, yearly] = await Promise.all(
    ["daily", "weekly", "monthly", "yearly"].map((period) =>
      fetch(`${OL_BASE}/trending/${period}.json?limit=${TRENDING_FETCH_LIMIT}`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? r.json() : { works: [] }))
        .catch(() => ({ works: [] }))
    )
  );

  const seen = new Set<string>();
  const pool: Record<string, unknown>[] = [];
  for (const data of [daily, weekly, monthly, yearly]) {
    for (const b of (data.works ?? []) as Record<string, unknown>[]) {
      const key = b.key as string | undefined;
      if (!b.title || !key || seen.has(key)) continue;
      seen.add(key);
      pool.push(b);
    }
  }

  // Sort the trending pool by publish year, newest first — Open Library's
  // trending endpoints rank by current popularity, not recency, so this is
  // applied on our end.
  pool.sort((a, b) => {
    const yearA = (a as { first_publish_year?: number }).first_publish_year ?? 0;
    const yearB = (b as { first_publish_year?: number }).first_publish_year ?? 0;
    return yearB - yearA;
  });

  const start = (page - 1) * TRENDING_PAGE_SIZE;
  return pool.slice(start, start + TRENDING_PAGE_SIZE).map(normalizeWork);
}

export async function getBookDetail(externalId: string): Promise<UnifiedMedia | null> {
  const res = await fetchWithRetry(`${OL_BASE}/works/${externalId}.json`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const w = await res.json();

  const description =
    typeof w.description === "string" ? w.description : w.description?.value ?? null;
  const coverId = Array.isArray(w.covers) ? w.covers[0] : null;

  return {
    type: "BOOK",
    source: "openlibrary",
    externalId,
    title: w.title,
    description,
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    releaseYear: null,
    creators: null,
    genres: Array.isArray(w.subjects) ? w.subjects.slice(0, 5).join(", ") : null,
    metadata: w,
  };
}
