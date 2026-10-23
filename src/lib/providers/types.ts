export type MediaType = "GAME" | "ANIME" | "MANGA" | "BOOK";

// Shape every provider normalizes its external API response into,
// so search/detail pages can render games, anime and books identically.
export type UnifiedMedia = {
  type: MediaType;
  source: string;
  externalId: string;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  releaseYear?: number | null;
  creators?: string | null;
  genres?: string | null;
  metadata?: Record<string, unknown> | null;
};
