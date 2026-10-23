"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { MediaType } from "@/lib/providers/types";
import { useDictionary } from "./LocaleProvider";

type Item = {
  id: string;
  mediaItemId: string;
  title: string;
  coverUrl: string | null;
  type: MediaType;
  source: string;
  externalId: string;
};

export function ListItemsEditor({ listId, items }: { listId: string; items: Item[] }) {
  const router = useRouter();
  const t = useDictionary();
  const [order, setOrder] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const previous = order;
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    setDragIndex(null);
    void persist(next, previous);
  }

  async function persist(next: Item[], previous: Item[]) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/lists/${listId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItemIds: next.map((i) => i.mediaItemId) }),
    });
    setSaving(false);

    if (!res.ok) {
      setOrder(previous);
      setError(t.listEditor.error);
      return;
    }

    router.refresh();
  }

  async function handleRemove(mediaItemId: string) {
    const previous = order;
    setOrder((prev) => prev.filter((i) => i.mediaItemId !== mediaItemId));
    setError(null);
    const res = await fetch(`/api/lists/${listId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItemId }),
    });

    if (!res.ok) {
      setOrder(previous);
      setError(t.listEditor.error);
      return;
    }

    router.refresh();
  }

  if (order.length === 0) {
    return <p className="text-neutral-500 text-sm mt-6">{t.listEditor.empty}</p>;
  }

  return (
    <div>
      {saving && <p className="text-xs text-neutral-500 mb-2">{t.listEditor.savingOrder}</p>}
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-6">
        {order.map((item, index) => (
          <div
            key={item.mediaItemId}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className="group relative cursor-grab active:cursor-grabbing"
          >
            <Link href={`/media/${item.type}/${item.externalId}?source=${item.source}`}>
              <div className="aspect-[2/3] rounded-md overflow-hidden bg-neutral-800 border border-neutral-800 group-hover:border-orange-500">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs p-2 text-center">
                    {item.title}
                  </div>
                )}
              </div>
              <div className="mt-1 text-xs text-neutral-300 line-clamp-2">{item.title}</div>
            </Link>
            <button
              onClick={() => handleRemove(item.mediaItemId)}
              className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white text-xs w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title={t.listEditor.removeFromList}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-600 mt-3">{t.listEditor.dragHint}</p>
    </div>
  );
}
