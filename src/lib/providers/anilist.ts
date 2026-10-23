import type { MediaType, UnifiedMedia } from "./types";
import { fetchWithRetry } from "../fetchRetry";

// AniList — free public GraphQL API, no key required, covers both anime and
// manga. Used instead of Jikan/MAL because MAL's own servers are frequently
// unreachable, which made Jikan (a proxy in front of MAL) unreliable.
const ANILIST_URL = "https://graphql.anilist.co";

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  coverImage { large }
  startDate { year }
  genres
  studios(isMain: true) { nodes { name } }
  staff(perPage: 3, sort: RELEVANCE) { nodes { name { full } } }
  status
  episodes
  chapters
  volumes
  nextAiringEpisode { episode airingAt }
  isAdult
`;

type AniListMedia = {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null;
  coverImage: { large: string | null } | null;
  startDate: { year: number | null } | null;
  genres: string[] | null;
  studios: { nodes: { name: string }[] } | null;
  staff: { nodes: { name: { full: string } }[] } | null;
  isAdult: boolean;
};

function normalize(m: AniListMedia, type: MediaType): UnifiedMedia {
  const creators =
    type === "ANIME"
      ? m.studios?.nodes.map((s) => s.name).join(", ") ?? null
      : m.staff?.nodes.map((s) => s.name.full).join(", ") ?? null;

  return {
    type,
    source: "anilist",
    externalId: String(m.id),
    title: m.title.english ?? m.title.romaji ?? m.title.native ?? "Sem título",
    originalTitle: m.title.native ?? null,
    description: m.description,
    coverUrl: m.coverImage?.large ?? null,
    releaseYear: m.startDate?.year ?? null,
    creators,
    genres: m.genres?.join(", ") ?? null,
    metadata: m as unknown as Record<string, unknown>,
  };
}

async function graphql(query: string, variables: Record<string, unknown>) {
  const res = await fetchWithRetry(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.errors) return null;
  return json.data;
}

export async function searchAniList(
  mediaType: "ANIME" | "MANGA",
  query: string,
  page = 1
): Promise<UnifiedMedia[]> {
  const data = await graphql(
    `query($search: String, $type: MediaType, $page: Int) {
      Page(page: $page, perPage: 20) {
        media(search: $search, type: $type, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }`,
    { search: query, type: mediaType, page }
  );
  if (!data) return [];
  // Belt-and-suspenders: filter client-side too, in case the query-level
  // isAdult filter ever misses an edge case on AniList's end.
  return (data.Page.media as AniListMedia[]).filter((m) => !m.isAdult).map((m) => normalize(m, mediaType));
}

const TRENDING_PAGE_SIZE = 20;
// AniList's own pagination for status=RELEASING + a popularity floor runs dry
// after ~2 pages (only ~30 titles clear a floor of 3000). To get real depth
// we pool several pages sorted by popularity (a much lower floor, just enough
// to exclude noise) and paginate that pool ourselves — same approach as the
// Open Library trending pool in books.ts.
const TRENDING_POOL_PAGES = 5;
const TRENDING_POOL_PAGE_SIZE = 50;

export async function getTrendingAniList(mediaType: "ANIME" | "MANGA", page = 1): Promise<UnifiedMedia[]> {
  const pages = await Promise.all(
    Array.from({ length: TRENDING_POOL_PAGES }, (_, i) =>
      graphql(
        `query($type: MediaType, $page: Int) {
          Page(page: $page, perPage: ${TRENDING_POOL_PAGE_SIZE}) {
            media(type: $type, status: RELEASING, sort: POPULARITY_DESC, popularity_greater: 100, isAdult: false) { ${MEDIA_FIELDS} }
          }
        }`,
        { type: mediaType, page: i + 1 }
      )
    )
  );

  const seen = new Set<number>();
  const pool: AniListMedia[] = [];
  for (const data of pages) {
    for (const m of (data?.Page?.media ?? []) as AniListMedia[]) {
      if (m.isAdult || seen.has(m.id)) continue;
      seen.add(m.id);
      pool.push(m);
    }
  }

  // Sort the pooled results by release year, newest first, since the pool
  // itself was fetched ranked by popularity, not recency.
  pool.sort((a, b) => (b.startDate?.year ?? 0) - (a.startDate?.year ?? 0));

  const start = (page - 1) * TRENDING_PAGE_SIZE;
  return pool.slice(start, start + TRENDING_PAGE_SIZE).map((m) => normalize(m, mediaType));
}

export type AiringScheduleEntry = { episode: number; airingAt: number };
export type AiringScheduleResult = { episodes: AiringScheduleEntry[]; hasNextPage: boolean; total: number };

const EPISODES_PAGE_SIZE = 25;

// Full episode-by-episode air-date history for an anime. AniList's
// airingSchedule connection only supports ascending order (oldest first) and
// caps at 25 items per page with no sort option, so to show "most recent
// first" we look up the total once, then walk backwards from the last page.
export async function getAiringSchedule(animeId: string, page = 1): Promise<AiringScheduleResult> {
  const totalData = await graphql(
    `query($id: Int) {
      Media(id: $id, type: ANIME) {
        airingSchedule(page: 1, perPage: 1) { pageInfo { total } }
      }
    }`,
    { id: Number(animeId) }
  );
  const total: number = totalData?.Media?.airingSchedule?.pageInfo?.total ?? 0;
  if (total === 0) return { episodes: [], hasNextPage: false, total: 0 };

  const scheduleQuery = `query($id: Int, $page: Int) {
    Media(id: $id, type: ANIME) {
      airingSchedule(page: $page, perPage: ${EPISODES_PAGE_SIZE}) {
        nodes { episode airingAt }
      }
    }
  }`;

  // AniList's reported total rounds up and can overshoot the true last page
  // by one — if that happens the "last" page comes back empty, so step back
  // until we land on real data.
  let aniListPage = Math.max(1, Math.ceil(total / EPISODES_PAGE_SIZE) - (page - 1));
  let nodes: AiringScheduleEntry[] = [];
  while (aniListPage >= 1) {
    const data = await graphql(scheduleQuery, { id: Number(animeId), page: aniListPage });
    nodes = (data?.Media?.airingSchedule?.nodes ?? []) as AiringScheduleEntry[];
    if (nodes.length > 0 || aniListPage === 1) break;
    aniListPage--;
  }

  return {
    episodes: [...nodes].reverse(),
    hasNextPage: aniListPage > 1,
    total,
  };
}

export async function getAniListDetail(
  mediaType: "ANIME" | "MANGA",
  externalId: string
): Promise<UnifiedMedia | null> {
  const data = await graphql(
    `query($id: Int, $type: MediaType) {
      Media(id: $id, type: $type) { ${MEDIA_FIELDS} }
    }`,
    { id: Number(externalId), type: mediaType }
  );
  if (!data?.Media) return null;
  return normalize(data.Media as AniListMedia, mediaType);
}
