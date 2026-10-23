import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getCurrentUser } from "@/lib/session";
import { getServerLocale, getDictionary } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getDictionary(locale);

  return {
    title: t.meta.title,
    description: t.meta.description,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: t.meta.title,
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, locale] = await Promise.all([getCurrentUser(), getServerLocale()]);
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale === "pt" ? "pt-BR" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <LocaleProvider locale={locale} dictionary={dictionary}>
          <Providers>
            <ServiceWorkerRegister />
            <Navbar user={user ? { username: user.username, name: user.name, isAdmin: user.isAdmin } : null} />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
          </Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}
