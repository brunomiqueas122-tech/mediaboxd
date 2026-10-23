"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDictionary, useLocale } from "./LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries/pt";

type Notification = {
  id: string;
  type: string;
  payload: string;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { data: session } = useSession();
  const t = useDictionary();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;

    async function load() {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  if (!session) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={handleToggle} className="relative hover:text-white text-neutral-300">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-neutral-900 border border-neutral-700 rounded-md shadow-lg z-20 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-neutral-500 p-4">{t.notifications.empty}</p>
          ) : (
            notifications.map((n) => <NotificationItem key={n.id} notification={n} t={t} />)
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, t }: { notification: Notification; t: Dictionary }) {
  const locale = useLocale();
  const payload = JSON.parse(notification.payload) as {
    username?: string;
    name?: string;
    mediaTitle?: string;
    mediaType?: string;
    mediaSource?: string;
    mediaExternalId?: string;
    body?: string;
    listId?: string;
    listName?: string;
  };

  const wrapperClass = `block px-3 py-2 text-sm border-b border-neutral-800 last:border-0 hover:bg-neutral-800 ${
    !notification.read ? "bg-neutral-800/50" : ""
  }`;
  const timestamp = (
    <div className="text-[11px] text-neutral-600 mt-0.5">
      {new Date(notification.createdAt).toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
    </div>
  );

  if (notification.type === "follow") {
    return (
      <Link href={`/profile/${payload.username}`} className={wrapperClass}>
        <span className="font-medium">{payload.name ?? payload.username}</span>{" "}
        <span className="text-neutral-400">{t.notifications.followed}</span>
        {timestamp}
      </Link>
    );
  }

  if (notification.type === "review_like" || notification.type === "comment") {
    const mediaHref = `/media/${payload.mediaType}/${payload.mediaExternalId}?source=${payload.mediaSource}`;
    return (
      <Link href={mediaHref} className={wrapperClass}>
        <span className="font-medium">{payload.name ?? payload.username}</span>{" "}
        <span className="text-neutral-400">
          {notification.type === "review_like" ? t.notifications.liked : t.notifications.commented}
        </span>{" "}
        <span className="font-medium">{payload.mediaTitle}</span>
        {notification.type === "comment" && payload.body && (
          <div className="text-neutral-400 text-xs mt-0.5 line-clamp-2">&quot;{payload.body}&quot;</div>
        )}
        {timestamp}
      </Link>
    );
  }

  if (notification.type === "list_like") {
    return (
      <Link href={`/lists/${payload.listId}`} className={wrapperClass}>
        <span className="font-medium">{payload.name ?? payload.username}</span>{" "}
        <span className="text-neutral-400">{t.notifications.likedList}</span>{" "}
        <span className="font-medium">{payload.listName}</span>
        {timestamp}
      </Link>
    );
  }

  return null;
}
