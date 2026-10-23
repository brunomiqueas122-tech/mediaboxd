import Link from "next/link";
import { getServerLocale, getDictionary } from "@/lib/i18n";

export default async function NotFound() {
  const t = getDictionary(await getServerLocale());

  return (
    <div className="flex flex-col items-center text-center gap-4 py-24">
      <h1 className="text-6xl font-bold text-orange-500">{t.notFound.title}</h1>
      <p className="text-neutral-300">{t.notFound.message}</p>
      <Link href="/" className="text-orange-400 hover:underline text-sm">
        {t.notFound.backHome}
      </Link>
    </div>
  );
}
