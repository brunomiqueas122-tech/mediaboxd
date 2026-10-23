"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDictionary } from "./LocaleProvider";

export function SearchBar() {
  const router = useRouter();
  const t = useDictionary();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.nav.searchPlaceholder}
        className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500"
      />
    </form>
  );
}
