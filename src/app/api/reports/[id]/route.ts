import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  deleteContent: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const t = await getServerDictionary();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.invalidInput }, { status: 400 });
  }

  const { id } = await ctx.params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: t.api.invalidInput }, { status: 404 });

  const { action, deleteContent } = parsed.data;

  if (deleteContent) {
    // No cascading deletes are configured on these relations, so child rows
    // must go first or the parent delete hits a foreign-key violation.
    if (report.targetType === "REVIEW") {
      await prisma.comment.deleteMany({ where: { reviewId: report.targetId } });
      await prisma.reviewLike.deleteMany({ where: { reviewId: report.targetId } });
      await prisma.review.deleteMany({ where: { id: report.targetId } });
    } else if (report.targetType === "COMMENT") {
      await prisma.comment.deleteMany({ where: { id: report.targetId } });
    } else if (report.targetType === "LIST") {
      await prisma.listItem.deleteMany({ where: { listId: report.targetId } });
      await prisma.listLike.deleteMany({ where: { listId: report.targetId } });
      await prisma.list.deleteMany({ where: { id: report.targetId } });
    }
  }

  await prisma.report.update({
    where: { id },
    data: { status: action === "resolve" ? "RESOLVED" : "DISMISSED" },
  });

  return NextResponse.json({ ok: true });
}
