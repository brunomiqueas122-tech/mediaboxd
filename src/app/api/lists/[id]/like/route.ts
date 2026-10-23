import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";

export async function POST(_req: Request, ctx: RouteContext<"/api/lists/[id]/like">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: listId } = await ctx.params;
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json({ error: t.api.listNotFound }, { status: 404 });

  const existing = await prisma.listLike.findUnique({
    where: { listId_userId: { listId, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ liked: true });

  await prisma.listLike.create({ data: { listId, userId: session.user.id } });

  if (list.userId !== session.user.id) {
    const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (actor) {
      await prisma.notification.create({
        data: {
          userId: list.userId,
          type: "list_like",
          payload: JSON.stringify({
            username: actor.username,
            name: actor.name,
            listId,
            listName: list.name,
          }),
        },
      });
    }
  }

  return NextResponse.json({ liked: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/lists/[id]/like">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: listId } = await ctx.params;
  await prisma.listLike.deleteMany({ where: { listId, userId: session.user.id } });

  return NextResponse.json({ liked: false });
}
