import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";
import { isFlaggedContent } from "@/lib/moderation";

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export async function POST(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const fieldMessages: Record<string, string> = {
      name: t.lists.nameTooLong,
      description: t.lists.descriptionTooLong,
    };
    return NextResponse.json({ error: fieldMessages[field as string] ?? t.api.invalidInput }, { status: 400 });
  }

  const textToCheck = [parsed.data.name, parsed.data.description].filter(Boolean).join("\n");
  if (await isFlaggedContent(textToCheck)) {
    return NextResponse.json({ error: t.api.contentFlagged }, { status: 400 });
  }

  const list = await prisma.list.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      isPublic: parsed.data.isPublic ?? true,
    },
  });

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      type: "list_created",
      payload: JSON.stringify({ listId: list.id, name: list.name }),
    },
  });

  return NextResponse.json(list);
}
