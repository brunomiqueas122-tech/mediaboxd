// External detail APIs (Steam, AniList, Open Library) occasionally hiccup on
// a single request. One quick retry avoids surfacing a transient blip as a
// hard "media not found" failure to the user.
export async function fetchWithRetry(url: string, init?: RequestInit, retries = 1): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || attempt === retries) return res;
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw err;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw lastError;
}
