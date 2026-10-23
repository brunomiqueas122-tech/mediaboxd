"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useDictionary } from "./LocaleProvider";
import { UserHandle } from "./UserHandle";
import { ReportButton } from "./ReportButton";

type CommentData = {
  id: string;
  body: string;
  createdAt: string;
  user: { username: string; name: string | null };
};

export function ReviewCard({
  reviewId,
  author,
  rating,
  body,
  containsSpoilers = false,
  rewatch = false,
  initialLikeCount,
  initialLiked,
  initialComments,
}: {
  reviewId: string;
  author: { username: string; name: string | null };
  rating: number | null;
  body: string | null;
  containsSpoilers?: boolean;
  rewatch?: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialComments: CommentData[];
}) {
  const { data: session } = useSession();
  const t = useDictionary();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [comments, setComments] = useState(initialComments);
  const [commentBody, setCommentBody] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [posting, setPosting] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function toggleLike() {
    if (!session) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await fetch(`/api/reviews/${reviewId}/like`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    setCommentError(null);
    const res = await fetch(`/api/reviews/${reviewId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
    } else {
      const data = await res.json().catch(() => null);
      setCommentError(typeof data?.error === "string" ? data.error : t.review.commentError);
    }
    setPosting(false);
  }

  return (
    <div className="border-b border-neutral-800 pb-3">
      <div className="flex items-center gap-2 text-sm">
        <UserHandle username={author.username} name={author.name} />
        {rating !== null && <span className="text-orange-400">★ {(rating / 2).toFixed(1).replace(/\.0$/, "")}</span>}
        {rewatch && <span className="text-neutral-500" title={t.review.rewatchBadge}>↻</span>}
      </div>
      {body && (
        containsSpoilers && !spoilerRevealed ? (
          <button
            onClick={() => setSpoilerRevealed(true)}
            className="text-xs text-neutral-500 border border-neutral-800 rounded-md px-2 py-1 mt-1 hover:text-neutral-300"
          >
            {t.review.spoilerWarning}
          </button>
        ) : (
          <p className="text-sm text-neutral-300 mt-1">{body}</p>
        )
      )}

      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
        <button
          onClick={toggleLike}
          disabled={!session}
          className={`flex items-center gap-1 hover:text-orange-400 disabled:hover:text-neutral-500 ${
            liked ? "text-orange-400" : ""
          }`}
        >
          {liked ? "♥" : "♡"} {likeCount > 0 && likeCount}
        </button>
        <button onClick={() => setShowComments((s) => !s)} className="hover:text-neutral-300">
          💬 {comments.length > 0 ? comments.length : t.review.commentAction}
        </button>
        <ReportButton targetType="REVIEW" targetId={reviewId} />
      </div>

      {showComments && (
        <div className="mt-3 pl-3 border-l border-neutral-800 flex flex-col gap-2">
          {comments.map((c) => (
            <div key={c.id} className="text-xs flex items-start justify-between gap-2">
              <div>
                <UserHandle username={c.user.username} name={c.user.name} className="font-medium hover:underline" />{" "}
                <span className="text-neutral-300">{c.body}</span>
              </div>
              <ReportButton targetType="COMMENT" targetId={c.id} />
            </div>
          ))}

          {session ? (
            <>
              <form onSubmit={submitComment} className="flex gap-2 mt-1">
                <input
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder={t.review.commentPlaceholder}
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1 text-xs"
                />
                <button
                  type="submit"
                  disabled={posting}
                  className="text-xs bg-orange-600 hover:bg-orange-500 rounded-md px-2 disabled:opacity-50"
                >
                  {t.review.send}
                </button>
              </form>
              {commentError && <p className="text-red-400 text-[11px]">{commentError}</p>}
            </>
          ) : (
            <p className="text-xs text-neutral-600">
              <Link href="/login" className="text-orange-400 hover:underline">{t.review.signInPrompt}</Link>{" "}
              {t.review.signInSuffix}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
