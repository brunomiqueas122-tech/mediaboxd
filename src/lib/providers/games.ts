import type { UnifiedMedia } from "./types";
import { fetchWithRetry } from "../fetchRetry";

// IGDB (via Twitch's developer platform) — the same database IGN/Steam-like
// sites draw from. Covers every platform (Steam, consoles, mobile, LoL-style
// live-service games that aren't sold anywhere), unlike a Steam-only search.
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_URL = "https://api.igdb.com/v4";
const PAGE_SIZE = 20;

const GAME_FIELDS =
  "name,summary,cover.url,first_release_date,genres.name,involved_companies.company.name,involved_companies.developer,game_type,total_rating_count";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(
    `${TOKEN_URL}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" }
  );
  if (!res.ok) return null;
  const data = await res.json();

  // Twitch app tokens last ~60 days; cache in memory for this function
  // instance's lifetime and refresh a minute before real expiry.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

type IgdbGame = {
  id: number;
  name?: string;
  summary?: string;
  cover?: { url: string } | null;
  first_release_date?: number;
  genres?: { name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean }[];
  game_type?: number;
  total_rating_count?: number;
};

// 0 = main_game in IGDB's game_type enum — prefer these over ports, DLC,
// season passes, regional variants, etc. when a title is otherwise tied.
const MAIN_GAME_TYPE = 0;

async function igdbQuery(body: string): Promise<IgdbGame[]> {
  const token = await getAccessToken();
  const clientId = process.env.IGDB_CLIENT_ID;
  if (!token || !clientId) return [];

  const res = await fetchWithRetry(`${IGDB_URL}/games`, {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
    body,
  });
  if (!res.ok) return [];
  return res.json();
}

function coverUrl(cover: IgdbGame["cover"], size: "cover_big" | "1080p" = "cover_big"): string | null {
  if (!cover?.url) return null;
  return `https:${cover.url.replace("t_thumb", `t_${size}`)}`;
}

function normalize(g: IgdbGame, size?: "cover_big" | "1080p"): UnifiedMedia {
  const companies = g.involved_companies ?? [];
  const developers = companies.filter((c) => c.developer).map((c) => c.company.name);

  return {
    type: "GAME",
    source: "igdb",
    externalId: String(g.id),
    title: g.name ?? "",
    description: g.summary ?? null,
    coverUrl: coverUrl(g.cover, size),
    releaseYear: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    creators: (developers.length ? developers : companies.map((c) => c.company.name)).join(", ") || null,
    genres: g.genres?.map((x) => x.name).join(", ") ?? null,
    metadata: g,
  };
}

function escapeIgdbString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// IGDB's search endpoint is pure text-similarity with no popularity signal,
// so an obscure game can outrank the one everyone means (e.g. "Grit & Valor:
// 1949" beating "Valorant" for the query "Valorant"). Re-rank by how closely
// the title matches the query before falling back to IGDB's own ordering.
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-:'".,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchScore(title: string, query: string): number {
  const t = normalizeTitle(title);
  const q = normalizeTitle(query);
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)) return 2;
  return 3;
}

export async function searchGames(query: string, page = 1): Promise<UnifiedMedia[]> {
  const offset = (page - 1) * PAGE_SIZE;
  const escaped = escapeIgdbString(query);

  // IGDB's fuzzy `search` ranks by pure text similarity, so a live-service
  // game with hundreds of "Genshin Impact: <version title>" spin-off/update
  // entries can bury the base game entirely off the first page. A parallel
  // exact-ish, main-games-only lookup guarantees it still surfaces on page 1.
  const [searchResults, exactMainGame] = await Promise.all([
    igdbQuery(`search "${escaped}"; fields ${GAME_FIELDS}; limit ${PAGE_SIZE}; offset ${offset};`),
    page === 1
      ? igdbQuery(
          `fields ${GAME_FIELDS}; where name ~ *"${escaped}"* & game_type = ${MAIN_GAME_TYPE}; sort total_rating_count desc; limit 3;`
        )
      : Promise.resolve([]),
  ]);

  const seen = new Set<number>();
  const merged: IgdbGame[] = [];
  for (const g of [...exactMainGame, ...searchResults]) {
    if (!g.name || seen.has(g.id)) continue;
    seen.add(g.id);
    merged.push(g);
  }

  const ranked = merged
    .map((g, index) => ({ g, index, score: matchScore(g.name!, query) }))
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(b.g.game_type === MAIN_GAME_TYPE) - Number(a.g.game_type === MAIN_GAME_TYPE) ||
        (b.g.total_rating_count ?? 0) - (a.g.total_rating_count ?? 0) ||
        a.index - b.index
    )
    .map((x) => x.g);
  return ranked.slice(0, PAGE_SIZE).map((g) => normalize(g));
}

export async function getGameDetail(externalId: string): Promise<UnifiedMedia | null> {
  const body = `fields ${GAME_FIELDS}; where id = ${Number(externalId)};`;
  const games = await igdbQuery(body);
  if (games.length === 0 || !games[0].name) return null;
  return normalize(games[0], "1080p");
}

// "Trending" here means well-known, currently-buzzing games (recent releases
// and hyped upcoming ones) — IGDB has no Steam-style "new releases" storefront
// concept, so we approximate it with recency + community hype/anticipation.
export async function getTrendingGames(page = 1): Promise<UnifiedMedia[]> {
  const offset = (page - 1) * PAGE_SIZE;
  const now = Math.floor(Date.now() / 1000);
  const oneYearAgo = now - 60 * 60 * 24 * 365;
  const body = `fields ${GAME_FIELDS}; where first_release_date <= ${now} & first_release_date >= ${oneYearAgo} & game_type = ${MAIN_GAME_TYPE} & cover != null & total_rating_count > 3; sort first_release_date desc; limit ${PAGE_SIZE}; offset ${offset};`;
  const games = await igdbQuery(body);
  return games.filter((g) => g.name).map((g) => normalize(g));
}
