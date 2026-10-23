import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { ReportActions } from "@/components/ReportActions";

async function resolveTargetPreview(targetType: "REVIEW" | "COMMENT" | "LIST", targetId: string) {
  if (targetType === "REVIEW") {
    const review = await prisma.review.findUnique({
      where: { id: targetId },
      include: { user: true, mediaItem: true },
    });
    if (!review) return null;
    return {
      author: review.user.username,
      text: review.body ?? "",
      href: `/media/${review.mediaItem.type}/${review.mediaItem.externalId}?source=${review.mediaItem.source}`,
    };
  }
  if (targetType === "COMMENT") {
    const comment = await prisma.comment.findUnique({
      where: { id: targetId },
      include: { user: true, review: { include: { mediaItem: true } } },
    });
    if (!comment) return null;
    return {
      author: comment.user.username,
      text: comment.body,
      href: `/media/${comment.review.mediaItem.type}/${comment.review.mediaItem.externalId}?source=${comment.review.mediaItem.source}`,
    };
  }
  const list = await prisma.list.findUnique({ where: { id: targetId }, include: { user: true } });
  if (!list) return null;
  return { author: list.user.username, text: list.name, href: `/lists/${list.id}` };
}

export default async function AdminReportsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (!currentUser.isAdmin) notFound();

  const t = getDictionary(await getServerLocale());

  const reports = await prisma.report.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { reporter: { select: { username: true } } },
  });

  const previews = await Promise.all(
    reports.map(async (r) => ({ report: r, preview: await resolveTargetPreview(r.targetType, r.targetId) }))
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t.admin.reportsTitle}</h1>

      {previews.length === 0 && <p className="text-neutral-500 text-sm">{t.admin.noReports}</p>}

      <div className="flex flex-col gap-3">
        {previews.map(({ report, preview }) => (
          <div key={report.id} className="border border-neutral-800 rounded-md p-4">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
              <span>{t.admin.targetType[report.targetType]}</span>
              <span>{new Date(report.createdAt).toLocaleString()}</span>
            </div>

            {preview ? (
              <div className="text-sm mb-2">
                <Link href={preview.href} className="text-orange-400 hover:underline">@{preview.author}</Link>
                <p className="text-neutral-300 mt-1 line-clamp-3">&quot;{preview.text}&quot;</p>
              </div>
            ) : (
              <p className="text-sm text-neutral-600 italic mb-2">{t.admin.contentDeleted}</p>
            )}

            <p className="text-xs text-neutral-400 mb-3">
              <span className="text-neutral-600">{t.admin.reportedBy} @{report.reporter.username}:</span> {report.reason}
            </p>

            <ReportActions reportId={report.id} hasContent={!!preview} />
          </div>
        ))}
      </div>
    </div>
  );
}
