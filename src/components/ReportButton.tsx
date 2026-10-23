"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useDictionary } from "./LocaleProvider";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "REVIEW" | "COMMENT" | "LIST";
  targetId: string;
}) {
  const { data: session } = useSession();
  const t = useDictionary();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSending(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setOpen(false);
    }
  }

  if (sent) {
    return <span className="text-[11px] text-neutral-600">{t.report.sent}</span>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-neutral-600 hover:text-red-400">
        🚩 {t.report.action}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 mt-1">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t.report.reasonPlaceholder}
        maxLength={500}
        autoFocus
        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1 text-[11px]"
      />
      <button
        type="submit"
        disabled={sending || !reason.trim()}
        className="text-[11px] bg-red-700 hover:bg-red-600 rounded-md px-2 py-1 disabled:opacity-50"
      >
        {t.report.submit}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-neutral-600 hover:text-neutral-400">
        {t.report.cancel}
      </button>
    </form>
  );
}
