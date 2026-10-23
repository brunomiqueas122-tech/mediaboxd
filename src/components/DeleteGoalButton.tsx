"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDictionary } from "./LocaleProvider";

export function DeleteGoalButton({ id }: { id: string }) {
  const t = useDictionary();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(false);
    const res = await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(false);

    if (!res.ok) {
      setError(true);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs text-neutral-500 hover:text-red-400 disabled:opacity-50"
      >
        {t.mediaActions.remove}
      </button>
      {error && <p className="text-red-400 text-[10px]">{t.goals.deleteError}</p>}
    </div>
  );
}
