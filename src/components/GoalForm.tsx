"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDictionary } from "./LocaleProvider";
import type { MediaType } from "@/lib/providers/types";

export function GoalForm({ year }: { year: number }) {
  const t = useDictionary();
  const router = useRouter();
  const [type, setType] = useState<MediaType | "">("");
  const [targetCount, setTargetCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(targetCount);
    if (!target || target < 1) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: type || null, year, targetCount: target }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : t.goals.saveError);
      return;
    }

    setTargetCount("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border border-neutral-800 rounded-md p-4">
      <div>
        <label className="text-xs text-neutral-400 block mb-1">{t.goals.type}</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MediaType | "")}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">{t.goals.allTypes}</option>
          {(["GAME", "ANIME", "MANGA", "BOOK"] as MediaType[]).map((mt) => (
            <option key={mt} value={mt}>{t.mediaTypePlural[mt]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-neutral-400 block mb-1">{t.goals.target}</label>
        <input
          type="number"
          min={1}
          value={targetCount}
          onChange={(e) => setTargetCount(e.target.value)}
          className="w-24 bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-orange-600 hover:bg-orange-500 rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? t.goals.saving : t.goals.save}
      </button>
      {error && <p className="text-red-400 text-xs w-full">{error}</p>}
    </form>
  );
}
