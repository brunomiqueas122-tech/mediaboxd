"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDictionary } from "./LocaleProvider";

export function FollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const t = useDictionary();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/follow", {
      method: following ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setLoading(false);

    if (!res.ok) {
      setError(t.follow.error);
      return;
    }

    setFollowing(!following);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 ${
          following
            ? "border border-neutral-700 text-neutral-300 hover:border-red-500 hover:text-red-400"
            : "bg-orange-600 hover:bg-orange-500 text-white"
        }`}
      >
        {following ? t.follow.following : t.follow.follow}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
