import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";

export async function POST(_req: Request, ctx: RouteContext<"/api/reviews/[id]/like">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: reviewId } = await ctx.params;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return NextResponse.json({ error: t.api.reviewNotFound }, { status: 404 });

  const existing = await prisma.reviewLike.findUnique({
    where: { reviewId_userId: { reviewId, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ liked: true });

  await prisma.reviewLike.create({ data: { reviewId, userId: session.user.id } });

  if (review.userId !== session.user.id) {
    const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
    const mediaItem = await prisma.mediaItem.findUnique({ where: { id: review.mediaItemId } });
    if (actor && mediaItem) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: "review_like",
          payload: JSON.stringify({
            username: actor.username,
            name: actor.name,
            reviewId,
            mediaTitle: mediaItem.title,
            mediaType: mediaItem.type,
            mediaSource: mediaItem.source,
            mediaExternalId: mediaItem.externalId,
          }),
        },
      });
    }
  }

  return NextResponse.json({ liked: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/reviews/[id]/like">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: reviewId } = await ctx.params;
  await prisma.reviewLike.deleteMany({ where: { reviewId, userId: session.user.id } });

  return NextResponse.json({ liked: false });
}
