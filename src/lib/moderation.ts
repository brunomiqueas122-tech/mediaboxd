// Automated content moderation via Google/Jigsaw's Perspective API (free,
// no billing required). Scores a piece of text for toxicity/hate-speech
// signals; callers block the save when the score clears the threshold.
//
// Fails open: if PERSPECTIVE_API_KEY isn't set, or the API errors/times out,
// the text is allowed through rather than blocking every submission because
// a third-party service hiccupped. This is a first line of defense, not the
// only one — it's paired with user-driven reports (see /api/reports).
const PERSPECTIVE_URL = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

const ATTRIBUTES = ["TOXICITY", "SEVERE_TOXICITY", "IDENTITY_ATTACK", "THREAT", "INSULT"] as const;

// Deliberately conservative (closer to 1.0 = more confident the API is
// right) to keep false positives on legitimate reviews/comments rare.
const THRESHOLD = 0.85;

export async function isFlaggedContent(text: string): Promise<boolean> {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey || !text.trim()) return false;

  try {
    const res = await fetch(`${PERSPECTIVE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: { text },
        languages: ["pt", "en"],
        requestedAttributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, {}])),
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;

    const data = await res.json();
    return ATTRIBUTES.some(
      (attr) => (data.attributeScores?.[attr]?.summaryScore?.value ?? 0) >= THRESHOLD
    );
  } catch {
    return false;
  }
}
