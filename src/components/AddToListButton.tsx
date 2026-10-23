"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { MediaType } from "@/lib/providers/types";
import { useDictionary } from "./LocaleProvider";

export function AddToListButton({
  type,
  source,
  externalId,
}: {
  type: MediaType;
  source: string;
  externalId: string;
}) {
  const { data: session } = useSession();
  const t = useDictionary();
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!session) return;
    fetch("/api/my-lists")
      .then((r) => r.json())
      .then((data) => setLists(data.lists ?? []));
  }, [session]);

  if (!session) return null;

  async function handleAdd() {
    if (!selected) return;
    setStatus("saving");
    const res = await fetch(`/api/lists/${selected}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, source, externalId }),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  if (lists.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        <Link href="/lists/new" className="text-orange-400 hover:underline">{t.addToList.createListPrompt}</Link>{" "}
        {t.addToList.createListSuffix}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <select
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setStatus("idle"); }}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">{t.addToList.selectPlaceholder}</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!selected || status === "saving"}
          className="text-sm border border-neutral-700 rounded-md px-2 py-1.5 hover:border-orange-500 disabled:opacity-50"
        >
          {status === "saved" ? "✓" : "+"}
        </button>
      </div>
      {status === "error" && <p className="text-red-400 text-xs">{t.addToList.error}</p>}
    </div>
  );
}
