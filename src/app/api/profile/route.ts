import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";
import { isFlaggedContent } from "@/lib/moderation";

const schema = z.object({
  name: z.string().max(60).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    const t = await getServerDictionary();
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true, bio: true, avatarUrl: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  const { name, bio, avatarUrl } = parsed.data;

  const textToCheck = [name, bio].filter(Boolean).join("\n");
  if (await isFlaggedContent(textToCheck)) {
    return NextResponse.json({ error: t.api.contentFlagged }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    },
  });

  return NextResponse.json({ username: user.username });
}
