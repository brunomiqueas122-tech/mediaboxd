import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";

const schema = z.object({ mediaItemIds: z.array(z.string()) });

export async function POST(req: Request, ctx: RouteContext<"/api/lists/[id]/reorder">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: listId } = await ctx.params;
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: t.api.listNotFound }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.mediaItemIds.map((mediaItemId, index) =>
      prisma.listItem.update({
        where: { listId_mediaItemId: { listId, mediaItemId } },
        data: { position: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
