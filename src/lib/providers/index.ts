import type { MediaType, UnifiedMedia } from "./types";
import { searchGames, getGameDetail, getTrendingGames } from "./games";
import { searchAnime, getAnimeDetail, getTrendingAnime } from "./anime";
import { searchManga, getMangaDetail, getTrendingManga } from "./manga";
import { searchBooks, getBookDetail, getTrendingBooks } from "./books";

export type { UnifiedMedia, MediaType };

export async function searchMedia(type: MediaType, query: string, page = 1): Promise<UnifiedMedia[]> {
  if (!query.trim()) return [];
  switch (type) {
    case "GAME":
      return searchGames(query, page);
    case "ANIME":
      return searchAnime(query, page);
    case "MANGA":
      return searchManga(query, page);
    case "BOOK":
      return searchBooks(query, page);
  }
}

// Caps each source to the same count and interleaves them round-robin, so a
// source that happens to return more items (e.g. games) doesn't dominate the
// "Tudo"/"All" grid — the user sees a genuine mix of all four categories.
const MIX_PER_SOURCE = 8;

function interleave(lists: UnifiedMedia[][]): UnifiedMedia[] {
  const capped = lists.map((l) => l.slice(0, MIX_PER_SOURCE));
  const result: UnifiedMedia[] = [];
  const maxLen = Math.max(0, ...capped.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of capped) {
      if (list[i]) result.push(list[i]);
    }
  }
  return result;
}

// Searches all sources at once, used on the unified home search bar.
export async function searchAllMedia(query: string, page = 1): Promise<UnifiedMedia[]> {
  if (!query.trim()) return [];
  const [games, anime, manga, books] = await Promise.all([
    searchGames(query, page),
    searchAnime(query, page),
    searchManga(query, page),
    searchBooks(query, page),
  ]);
  return interleave([games, anime, manga, books]);
}

export async function getMediaDetail(type: MediaType, externalId: string): Promise<UnifiedMedia | null> {
  switch (type) {
    case "GAME":
      return getGameDetail(externalId);
    case "ANIME":
      return getAnimeDetail(externalId);
    case "MANGA":
      return getMangaDetail(externalId);
    case "BOOK":
      return getBookDetail(externalId);
  }
}

// Default content shown per tab before the user types a search — recently
// released games, currently-airing trending anime/manga, trending books.
export async function getTrendingMedia(type: MediaType, page = 1): Promise<UnifiedMedia[]> {
  switch (type) {
    case "GAME":
      return getTrendingGames(page);
    case "ANIME":
      return getTrendingAnime(page);
    case "MANGA":
      return getTrendingManga(page);
    case "BOOK":
      return getTrendingBooks(page);
  }
}

export async function getTrendingAllMedia(page = 1): Promise<UnifiedMedia[]> {
  const [games, anime, manga, books] = await Promise.all([
    getTrendingGames(page),
    getTrendingAnime(page),
    getTrendingManga(page),
    getTrendingBooks(page),
  ]);
  return interleave([games, anime, manga, books]);
}
