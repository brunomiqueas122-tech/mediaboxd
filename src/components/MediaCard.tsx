import Link from "next/link";
import type { UnifiedMedia } from "@/lib/providers/types";
import { getServerLocale, getDictionary } from "@/lib/i18n";

const typeColor: Record<string, string> = {
  GAME: "bg-purple-600",
  ANIME: "bg-pink-600",
  MANGA: "bg-teal-600",
  BOOK: "bg-blue-600",
};

export async function MediaCard({ media }: { media: UnifiedMedia }) {
  const t = getDictionary(await getServerLocale());

  return (
    <Link
      href={`/media/${media.type}/${media.externalId}?source=${media.source}`}
      className="group block"
    >
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-neutral-800 border border-neutral-800 group-hover:border-orange-500 transition-colors">
        {media.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.coverUrl}
            alt={media.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs p-2 text-center">
            {media.title}
          </div>
        )}
        <span
          className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded text-white ${typeColor[media.type]}`}
        >
          {t.mediaType[media.type]}
        </span>
      </div>
      <div className="mt-1 text-xs text-neutral-300 line-clamp-2">{media.title}</div>
      {media.releaseYear && (
        <div className="text-[11px] text-neutral-500">{media.releaseYear}</div>
      )}
    </Link>
  );
}
