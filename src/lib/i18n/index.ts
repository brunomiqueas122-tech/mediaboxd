import { cookies } from "next/headers";
import pt from "./dictionaries/pt";
import en from "./dictionaries/en";
import type { Dictionary } from "./dictionaries/pt";

export type Locale = "pt" | "en";

const dictionaries: Record<Locale, Dictionary> = { pt, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

// Server-only: reads the locale cookie set by proxy.ts (geo/Accept-Language detection).
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("locale")?.value;
  return value === "en" ? "en" : "pt";
}

// Convenience for route handlers: resolves the visitor's locale and dictionary in one call.
export async function getServerDictionary(): Promise<Dictionary> {
  return getDictionary(await getServerLocale());
}
