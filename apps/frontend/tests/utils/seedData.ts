/**
 * Reads seeded reference data from the local database (local target only).
 * Prisma is imported lazily so the integration target never needs PG_URL.
 */
export async function getSeedUserEntite(email: string): Promise<{ id: string; nomComplet: string }> {
  const { prisma } = await import('@sirena/db');
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { entite: { select: { id: true, nomComplet: true } } },
    });
    if (!user?.entite) {
      throw new Error(
        `No entity found for seeded user "${email}". Seed the local database first (\`pnpm op:seed:e2e\`).`,
      );
    }
    return user.entite;
  } finally {
    await prisma.$disconnect();
  }
}
