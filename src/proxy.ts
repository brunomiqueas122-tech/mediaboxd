import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PORTUGUESE_COUNTRIES = new Set(["BR", "PT"]);

function detectLocale(request: NextRequest): "pt" | "en" {
  // Vercel injects this header at the edge; absent in local dev.
  const country = request.headers.get("x-vercel-ip-country");
  if (country) return PORTUGUESE_COUNTRIES.has(country) ? "pt" : "en";

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  return acceptLanguage.toLowerCase().startsWith("pt") ? "pt" : "en";
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.has("locale")) {
    const locale = detectLocale(request);
    response.cookies.set("locale", locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js|offline.html).*)"],
};
