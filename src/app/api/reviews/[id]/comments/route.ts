import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";
import { isFlaggedContent } from "@/lib/moderation";

const schema = z.object({ body: z.string().min(1).max(1000) });

export async function POST(req: Request, ctx: RouteContext<"/api/reviews/[id]/comments">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const { id: reviewId } = await ctx.params;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return NextResponse.json({ error: t.api.reviewNotFound }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.review.commentTooLong }, { status: 400 });
  }

  if (await isFlaggedContent(parsed.data.body)) {
    return NextResponse.json({ error: t.api.contentFlagged }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { reviewId, userId: session.user.id, body: parsed.data.body },
    include: { user: { select: { username: true, name: true } } },
  });

  const mediaItem = await prisma.mediaItem.findUnique({ where: { id: review.mediaItemId } });

  if (mediaItem) {
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "comment",
        payload: JSON.stringify({
          mediaItemId: mediaItem.id,
          title: mediaItem.title,
          mediaType: mediaItem.type,
          mediaSource: mediaItem.source,
          mediaExternalId: mediaItem.externalId,
          reviewId,
          body: parsed.data.body,
        }),
      },
    });

    if (review.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: "comment",
          payload: JSON.stringify({
            username: comment.user.username,
            name: comment.user.name,
            reviewId,
            body: parsed.data.body,
            mediaTitle: mediaItem.title,
            mediaType: mediaItem.type,
            mediaSource: mediaItem.source,
            mediaExternalId: mediaItem.externalId,
          }),
        },
      });
    }
  }

  return NextResponse.json(comment);
}
