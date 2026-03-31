type DbWithDimTemps = {
  dimTemps: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
  };
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function ensureDimTemps(db: DbWithDimTemps, date: Date): Promise<string> {
  const [id] = date.toISOString().split('T');
  if (!id) throw new Error('Invalid date');

  await db.dimTemps.upsert({
    where: { id },
    create: {
      id,
      date,
      jour: date.getDate(),
      mois: date.getMonth() + 1,
      annee: date.getFullYear(),
      trimestre: Math.ceil((date.getMonth() + 1) / 3),
      jourSemaine: date.getDay(),
      semaine: getISOWeek(date),
    },
    update: {},
  });

  return id;
}
