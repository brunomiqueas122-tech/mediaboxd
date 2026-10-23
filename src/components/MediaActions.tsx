"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { MediaType } from "@/lib/providers/types";
import { useDictionary } from "./LocaleProvider";
import { StarRating } from "./StarRating";

export function MediaActions({
  type,
  source,
  externalId,
  initialStatus = "",
  initialRating = "",
  initialReviewBody = "",
  initialContainsSpoilers = false,
  initialRewatch = false,
  hasExisting = false,
}: {
  type: MediaType;
  source: string;
  externalId: string;
  initialStatus?: string;
  initialRating?: number | "";
  initialReviewBody?: string;
  initialContainsSpoilers?: boolean;
  initialRewatch?: boolean;
  hasExisting?: boolean;
}) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const t = useDictionary();

  const [status, setStatus] = useState(initialStatus);
  const [rating, setRating] = useState<number | "">(initialRating);
  const [reviewBody, setReviewBody] = useState(initialReviewBody);
  const [containsSpoilers, setContainsSpoilers] = useState(initialContainsSpoilers);
  const [rewatch, setRewatch] = useState(initialRewatch);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authStatus === "loading") return null;

  if (!session) {
    return (
      <p className="text-sm text-neutral-400 border border-neutral-800 rounded-md p-4">
        <Link href="/login" className="text-orange-400 hover:underline">{t.mediaActions.signInPrompt}</Link>{" "}
        {t.mediaActions.signInSuffix}
      </p>
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        source,
        externalId,
        ...(status ? { status } : {}),
        ...(rating !== "" ? { rating: Number(rating) } : {}),
        ...(reviewBody ? { reviewBody } : {}),
        containsSpoilers,
        rewatch,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : t.mediaActions.saveError);
      // A stale session (e.g. the account was deleted) can still look valid
      // client-side — force it to re-sync so the UI drops into the signed-out
      // state instead of showing a form that will keep failing to save.
      if (res.status === 401) await signOut({ redirect: false });
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch("/api/entries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, source, externalId }),
    });
    setStatus("");
    setRating("");
    setReviewBody("");
    setContainsSpoilers(false);
    setRewatch(false);
    setDeleting(false);
    setSaved(false);
    router.refresh();
  }

  return (
    <div className="border border-neutral-800 rounded-md p-4 flex flex-col gap-3">
      <div>
        <label className="text-xs text-neutral-400 block mb-1">{t.mediaActions.status}</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">{t.mediaActions.selectPlaceholder}</option>
          {Object.entries(t.mediaActions.statusLabels[type]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-neutral-400 block mb-1">{t.mediaActions.rating}</label>
        <StarRating value={rating} onChange={(v) => { setRating(v); setError(null); }} />
      </div>

      <div>
        <label className="text-xs text-neutral-400 block mb-1">{t.mediaActions.review}</label>
        <textarea
          value={reviewBody}
          onChange={(e) => setReviewBody(e.target.value)}
          rows={3}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-sm"
          placeholder={t.mediaActions.reviewPlaceholder}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-300">
        <input type="checkbox" checked={containsSpoilers} onChange={(e) => setContainsSpoilers(e.target.checked)} />
        {t.mediaActions.containsSpoilers}
      </label>

      <label className="flex items-center gap-2 text-xs text-neutral-300">
        <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} />
        {t.mediaActions.rewatchLabels[type]}
      </label>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-orange-600 hover:bg-orange-500 rounded-md py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? t.mediaActions.saving : saved ? t.mediaActions.saved : t.mediaActions.save}
        </button>
        {hasExisting && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="border border-neutral-700 text-neutral-300 hover:border-red-500 hover:text-red-400 rounded-md px-3 text-sm disabled:opacity-50"
          >
            {deleting ? "..." : t.mediaActions.remove}
          </button>
        )}
      </div>
    </div>
  );
}
