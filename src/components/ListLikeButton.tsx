"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export function ListLikeButton({
  listId,
  initialLikeCount,
  initialLiked,
}: {
  listId: string;
  initialLikeCount: number;
  initialLiked: boolean;
}) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  async function toggleLike() {
    if (!session) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await fetch(`/api/lists/${listId}/like`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) {
      // Revert the optimistic update — a failed request shouldn't leave the
      // UI claiming a like that was never actually saved.
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  return (
    <button
      onClick={toggleLike}
      disabled={!session}
      className={`flex items-center gap-1 text-sm hover:text-orange-400 disabled:hover:text-neutral-500 ${
        liked ? "text-orange-400" : "text-neutral-500"
      }`}
    >
      {liked ? "♥" : "♡"} {likeCount > 0 && likeCount}
    </button>
  );
}
