"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDictionary } from "./LocaleProvider";

export function ReportActions({ reportId, hasContent }: { reportId: string; hasContent: boolean }) {
  const t = useDictionary();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "resolve" | "dismiss", deleteContent: boolean) {
    setLoading(true);
    await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, deleteContent }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {hasContent && (
        <button
          onClick={() => act("resolve", true)}
          disabled={loading}
          className="text-xs bg-red-700 hover:bg-red-600 rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          {t.admin.removeContent}
        </button>
      )}
      <button
        onClick={() => act("dismiss", false)}
        disabled={loading}
        className="text-xs border border-neutral-700 text-neutral-300 hover:border-neutral-500 rounded-md px-3 py-1.5 disabled:opacity-50"
      >
        {t.admin.dismiss}
      </button>
    </div>
  );
}
