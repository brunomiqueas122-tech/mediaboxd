import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";

const schema = z.object({ username: z.string() });

export async function POST(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!target) return NextResponse.json({ error: t.api.userNotFound }, { status: 404 });
  if (target.id === session.user.id) {
    return NextResponse.json({ error: t.api.cannotFollowSelf }, { status: 400 });
  }

  const alreadyFollowing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
  });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
    create: { followerId: session.user.id, followingId: target.id },
    update: {},
  });

  if (!alreadyFollowing) {
    const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (actor) {
      await prisma.notification.create({
        data: {
          userId: target.id,
          type: "follow",
          payload: JSON.stringify({ username: actor.username, name: actor.name }),
        },
      });
    }
  }

  return NextResponse.json({ following: true });
}

export async function DELETE(req: Request) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!target) return NextResponse.json({ error: t.api.userNotFound }, { status: 404 });

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: target.id },
  });

  return NextResponse.json({ following: false });
}
