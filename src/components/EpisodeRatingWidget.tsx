"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { StarRating } from "./StarRating";
import { useDictionary } from "./LocaleProvider";
import type { MediaType } from "@/lib/providers/types";

export function EpisodeRatingWidget({
  type,
  source,
  externalId,
  episodeNumber,
  initialMyRating,
  initialAverage,
  initialCount,
}: {
  type: MediaType;
  source: string;
  externalId: string;
  episodeNumber: number;
  initialMyRating: number | null;
  initialAverage: number | null;
  initialCount: number;
}) {
  const { data: session } = useSession();
  const t = useDictionary();
  const [myRating, setMyRating] = useState<number | "">(initialMyRating ?? "");
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [saving, setSaving] = useState(false);

  async function handleChange(value: number | "") {
    if (!session || saving) return;
    setSaving(true);

    if (value === "") {
      const res = await fetch("/api/episode-ratings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, source, externalId, episodeNumber }),
      });
      if (res.ok) {
        const data = await res.json();
        setAverage(data.average);
        setCount(data.count);
        setMyRating("");
      }
    } else {
      const res = await fetch("/api/episode-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, source, externalId, episodeNumber, rating: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setAverage(data.average);
        setCount(data.count);
        setMyRating(value);
      }
    }

    setSaving(false);
  }

  return (
    <div className="flex items-center gap-3">
      {average !== null && count > 0 && (
        <span className="text-orange-400 text-xs shrink-0">
          ★ {(average / 2).toFixed(1).replace(/\.0$/, "")} ({count})
        </span>
      )}
      {session ? (
        <StarRating value={myRating} onChange={handleChange} size="sm" disabled={saving} />
      ) : (
        <Link href="/login" className="text-xs text-neutral-600 hover:text-orange-400">
          {t.mediaDetail.rateEpisode}
        </Link>
      )}
    </div>
  );
}
