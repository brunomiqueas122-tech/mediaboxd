import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { SearchBar } from "./SearchBar";
import { NotificationBell } from "./NotificationBell";
import { InstallAppButton } from "./InstallAppButton";
import { MobileMenu } from "./MobileMenu";
import { getServerLocale, getDictionary } from "@/lib/i18n";

export async function Navbar({
  user,
}: {
  user: { username: string; name: string | null; isAdmin: boolean } | null;
}) {
  const t = getDictionary(await getServerLocale());

  const categoryLinks = (
    <>
      <Link href="/search?type=GAME" className="hover:text-white">{t.nav.games}</Link>
      <Link href="/search?type=ANIME" className="hover:text-white">{t.nav.anime}</Link>
      <Link href="/search?type=MANGA" className="hover:text-white">{t.nav.manga}</Link>
      <Link href="/search?type=BOOK" className="hover:text-white">{t.nav.books}</Link>
      <Link href="/ranking" className="hover:text-white">{t.nav.ranking}</Link>
    </>
  );

  const userLinks = user ? (
    <>
      <Link href="/feed" className="hover:text-white">{t.nav.feed}</Link>
      <Link href="/goals" className="hover:text-white">{t.nav.goals}</Link>
      <Link href={`/profile/${user.username}`} className="hover:text-white">
        {user.name ?? user.username}
      </Link>
      {user.isAdmin && (
        <Link href="/admin/reports" className="hover:text-white text-red-400">
          🚩 {t.admin.reportsTitle}
        </Link>
      )}
      <SignOutButton />
    </>
  ) : (
    <>
      <Link href="/login" className="hover:text-white">{t.nav.signIn}</Link>
      <Link
        href="/register"
        className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-md inline-block"
      >
        {t.nav.createAccount}
      </Link>
    </>
  );

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/95 sticky top-0 z-10 relative">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-orange-500 shrink-0">
          MediaBoxd
        </Link>

        <nav className="hidden md:flex items-center gap-4 text-sm text-neutral-300">
          {categoryLinks}
        </nav>

        <div className="hidden md:block flex-1 min-w-[180px]">
          <SearchBar />
        </div>

        <div className="hidden md:flex items-center gap-3 text-sm">
          <InstallAppButton />
          {userLinks}
        </div>

        {/* Always rendered exactly once, regardless of breakpoint, so the
            notification bell never double-mounts (which would double its
            30s polling) and stays in a predictable spot for its dropdown
            to anchor against. */}
        <div className="flex items-center gap-3 ml-auto md:ml-0">
          {user && <NotificationBell />}
          <MobileMenu>
            <nav className="flex flex-col gap-3 text-sm text-neutral-300">
              {categoryLinks}
            </nav>
            <div className="flex flex-col gap-3 text-sm text-neutral-300 pt-3 border-t border-neutral-800">
              {userLinks}
            </div>
            <div className="pt-3 border-t border-neutral-800">
              <InstallAppButton />
            </div>
          </MobileMenu>
        </div>
      </div>

      {/* Search stays outside the collapsible menu on mobile — it's its own
          always-visible row, not an item that closes/opens with the menu. */}
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  );
}
