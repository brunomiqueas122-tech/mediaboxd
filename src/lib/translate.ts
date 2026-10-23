// Unofficial (but widely used, keyless) Google Translate endpoint — used only
// to translate synopses/descriptions coming from English-language sources
// (Steam, AniList, Open Library) into the visitor's detected UI language.
const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
const MAX_CHUNK = 1800;

async function translateChunk(text: string, target: "pt" | "en"): Promise<string> {
  const url = `${TRANSLATE_URL}?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return text;
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data) || !Array.isArray(data[0])) return text;
  return (data[0] as [string, string][]).map((seg) => seg[0]).join("");
}

// Splits on sentence boundaries to stay under the endpoint's practical length
// limit, then re-joins — long synopses would otherwise get silently truncated.
export async function translateText(text: string, target: "pt" | "en"): Promise<string> {
  if (!text.trim()) return text;

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).length > MAX_CHUNK) {
      if (current) chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);

  try {
    const translated = await Promise.all(chunks.map((c) => translateChunk(c, target)));
    return translated.join(" ");
  } catch {
    return text;
  }
}
