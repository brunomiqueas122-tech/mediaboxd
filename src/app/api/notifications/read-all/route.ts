import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/i18n";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    const t = await getServerDictionary();
    return NextResponse.json({ error: t.api.notAuthenticated }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
