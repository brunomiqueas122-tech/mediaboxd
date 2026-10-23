"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/components/LocaleProvider";

export default function NewListPage() {
  const router = useRouter();
  const t = useDictionary();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, isPublic }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : t.lists.createError);
      return;
    }

    const list = await res.json();
    router.push(`/lists/${list.id}`);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t.lists.newList}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder={t.lists.listName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
        />
        <textarea
          placeholder={t.lists.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          {t.lists.public}
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-500 rounded-md py-2 font-medium disabled:opacity-50"
        >
          {loading ? t.lists.creating : t.lists.create}
        </button>
      </form>
    </div>
  );
}
