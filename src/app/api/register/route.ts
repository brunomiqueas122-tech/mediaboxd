import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerLocale, getDictionary } from "@/lib/i18n";

const schema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  // The client always sends `name` as a string (possibly empty) since the
  // form field starts at "" — treat empty as "not provided" instead of
  // failing min(1), which would make the "optional" field mandatory.
  name: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).max(60).optional()),
});

export async function POST(req: Request) {
  const t = getDictionary(await getServerLocale());

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const fieldMessages: Record<string, string> = {
      username: t.auth.invalidUsername,
      email: t.auth.invalidEmail,
      password: t.auth.passwordTooShort,
      name: t.auth.invalidName,
    };
    const message = fieldMessages[field as string] ?? t.auth.registerError;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { username, email, password, name } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return NextResponse.json({ error: t.auth.userExists }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, name },
  });

  return NextResponse.json({ id: user.id, username: user.username });
}
