"use client";

import { signOut } from "next-auth/react";
import { useDictionary } from "./LocaleProvider";

export function SignOutButton() {
  const t = useDictionary();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="hover:text-white text-neutral-300"
    >
      {t.nav.signOut}
    </button>
  );
}
