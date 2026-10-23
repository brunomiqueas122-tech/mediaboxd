import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { MediaType } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import { getServerLocale, getDictionary } from "@/lib/i18n";
import { GoalForm } from "@/components/GoalForm";
import { DeleteGoalButton } from "@/components/DeleteGoalButton";

export default async function GoalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = getDictionary(await getServerLocale());

  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const goals = await prisma.goal.findMany({
    where: { userId: user.id, year },
    orderBy: { type: "asc" },
  });

  const completedEntries = await prisma.listEntry.findMany({
    where: {
      userId: user.id,
      status: "COMPLETED",
      finishedAt: { gte: yearStart, lt: yearEnd },
    },
    include: { mediaItem: { select: { type: true } } },
  });

  const progressByType: Record<string, number> = { ALL: completedEntries.length };
  for (const type of ["GAME", "ANIME", "MANGA", "BOOK"] as MediaType[]) {
    progressByType[type] = completedEntries.filter((e) => e.mediaItem.type === type).length;
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{t.goals.title} {year}</h1>
      <p className="text-sm text-neutral-400 mb-6">{t.goals.subtitle}</p>

      <div className="flex flex-col gap-3 mb-6">
        {goals.length === 0 && <p className="text-neutral-500 text-sm">{t.goals.empty}</p>}
        {goals.map((g) => {
          const current = progressByType[g.type ?? "ALL"] ?? 0;
          const pct = Math.min(100, Math.round((current / g.targetCount) * 100));
          return (
            <div key={g.id} className="border border-neutral-800 rounded-md p-4">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium">{g.type ? t.mediaTypePlural[g.type] : t.goals.allTypes}</span>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-400">{current} / {g.targetCount}</span>
                  <DeleteGoalButton id={g.id} />
                </div>
              </div>
              <div className="bg-neutral-900 rounded h-2 overflow-hidden">
                <div
                  className={`h-full ${pct >= 100 ? "bg-green-600" : "bg-orange-600"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <GoalForm year={year} />
    </div>
  );
}
