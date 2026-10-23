import { auth } from "./auth";
import { prisma } from "./prisma";

// Convenience helper: current signed-in user's full DB row, or null.
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
