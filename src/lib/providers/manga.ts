import type { UnifiedMedia } from "./types";
import { searchAniList, getAniListDetail, getTrendingAniList } from "./anilist";

export async function searchManga(query: string, page = 1): Promise<UnifiedMedia[]> {
  return searchAniList("MANGA", query, page);
}

export async function getMangaDetail(externalId: string): Promise<UnifiedMedia | null> {
  return getAniListDetail("MANGA", externalId);
}

export async function getTrendingManga(page = 1): Promise<UnifiedMedia[]> {
  return getTrendingAniList("MANGA", page);
}
