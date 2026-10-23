"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDictionary } from "@/components/LocaleProvider";

export default function EditProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const t = useDictionary();

  const [form, setForm] = useState({ name: "", bio: "", avatarUrl: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? "",
          bio: data.bio ?? "",
          avatarUrl: data.avatarUrl ?? "",
        });
        setLoading(false);
      });
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : t.editProfile.error);
      return;
    }

    const data = await res.json();
    router.push(`/profile/${data.username}`);
    router.refresh();
  }

  if (loading) return <p className="text-neutral-500 text-sm">{t.editProfile.loading}</p>;

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t.editProfile.title}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-neutral-400 block mb-1">{t.editProfile.name}</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400 block mb-1">{t.editProfile.bio}</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            maxLength={280}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400 block mb-1">{t.editProfile.avatarUrl}</label>
          <input
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-500 rounded-md py-2 font-medium disabled:opacity-50"
        >
          {saving ? t.editProfile.saving : t.editProfile.save}
        </button>
      </form>
    </div>
  );
}
