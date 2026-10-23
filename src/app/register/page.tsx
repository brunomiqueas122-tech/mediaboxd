"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useDictionary } from "@/components/LocaleProvider";
import { PasswordInput } from "@/components/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const t = useDictionary();
  const [form, setForm] = useState({ username: "", email: "", password: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t.auth.registerError);
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }

    router.push(`/profile/${form.username}`);
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t.auth.createAccount}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder={t.auth.username}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
        />
        <input
          placeholder={t.auth.name}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
        />
        <input
          required
          type="email"
          placeholder={t.auth.email}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
        />
        <PasswordInput
          required
          placeholder={t.auth.passwordMin}
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-500 rounded-md py-2 font-medium disabled:opacity-50"
        >
          {loading ? t.auth.creating : t.auth.createAccount}
        </button>
      </form>

      <p className="text-sm text-neutral-400 mt-4">
        {t.auth.hasAccount} <Link href="/login" className="text-orange-400 hover:underline">{t.auth.signIn}</Link>
      </p>
    </div>
  );
}
