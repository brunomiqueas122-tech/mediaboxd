import type { UnifiedMedia } from "./types";
import { searchAniList, getAniListDetail, getTrendingAniList, getAiringSchedule } from "./anilist";
import type { AiringScheduleResult } from "./anilist";

export type { AiringScheduleResult };

export async function searchAnime(query: string, page = 1): Promise<UnifiedMedia[]> {
  return searchAniList("ANIME", query, page);
}

export async function getAnimeDetail(externalId: string): Promise<UnifiedMedia | null> {
  return getAniListDetail("ANIME", externalId);
}

export async function getTrendingAnime(page = 1): Promise<UnifiedMedia[]> {
  return getTrendingAniList("ANIME", page);
}

export async function getAnimeEpisodes(externalId: string, page = 1): Promise<AiringScheduleResult> {
  return getAiringSchedule(externalId, page);
}
