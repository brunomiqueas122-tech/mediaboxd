import type { MetadataRoute } from "next";
import { getServerLocale, getDictionary } from "@/lib/i18n";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = getDictionary(await getServerLocale());

  return {
    name: t.meta.title,
    short_name: t.meta.title,
    description: t.meta.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
