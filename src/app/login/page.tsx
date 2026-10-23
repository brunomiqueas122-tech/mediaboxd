"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useDictionary } from "@/components/LocaleProvider";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const t = useDictionary();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(t.auth.invalidCredentials);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t.auth.signIn}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
          placeholder={t.auth.password}
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
          {loading ? t.auth.signingIn : t.auth.signIn}
        </button>
      </form>

      <p className="text-sm text-neutral-400 mt-4">
        {t.auth.noAccount} <Link href="/register" className="text-orange-400 hover:underline">{t.auth.createAccount}</Link>
      </p>
    </div>
  );
}
