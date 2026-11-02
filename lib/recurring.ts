import { EntrySource, InflowType, type Prisma, type PrismaClient } from "@prisma/client";

import { dateInMonth, monthRange, periodKey } from "@/lib/dates";
import { pensionAmounts, rentAmounts } from "@/lib/inflow-math";

/**
 * Auto-posts a month's recurring entries:
 *  - one Outflow per active RecurringTemplate (Beresheet, rates, car, …)
 *  - the expected rent for each active Property with an expected rent
 *  - the expected payment for each active Pension with an amount and rate
 *
 * Safe to run any number of times (e.g. a daily cron on the 1st): every row
 * carries a unique `postingKey`, and existing keys are skipped, so amounts
 * corrected by hand are never overwritten. A *deleted* auto-posted row will be
 * re-created on the next run — to stop a charge, deactivate or end-date its
 * template instead.
 */
export async function postRecurringForMonth(
  db: PrismaClient,
  year: number,
  month: number,
): Promise<{ outflowsCreated: number; inflowsCreated: number }> {
  const { start, end } = monthRange(year, month);
  const period = periodKey(year, month);

  const [templates, properties, pensions] = await Promise.all([
    db.recurringTemplate.findMany({
      where: {
        active: true,
        startDate: { lt: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
    }),
    db.property.findMany({ where: { active: true, expectedMonthlyRentIls: { not: null } } }),
    db.pension.findMany({
      where: { active: true, expectedMonthlyGbp: { not: null }, defaultExchangeRate: { not: null } },
    }),
  ]);

  const outflows: Prisma.OutflowCreateManyInput[] = templates.map((t) => ({
    categoryId: t.categoryId,
    amountIls: t.amountIls,
    date: dateInMonth(year, month, t.dayOfMonth),
    description: t.description ?? t.name,
    source: EntrySource.RECURRING_RULE,
    recurringTemplateId: t.id,
    postingKey: `template:${t.id}:${period}`,
  }));

  const inflows: Prisma.InflowCreateManyInput[] = [
    ...properties.map((p) => ({
      type: InflowType.RENT,
      date: dateInMonth(year, month, p.rentDayOfMonth),
      source: EntrySource.RECURRING_RULE,
      propertyId: p.id,
      ...rentAmounts(p.expectedMonthlyRentIls!, p.ownershipShare),
      notes: `Expected rent — ${p.name}`,
      postingKey: `property:${p.id}:${period}`,
    })),
    ...pensions.map((p) => ({
      type: InflowType.PENSION,
      date: dateInMonth(year, month, p.paymentDayOfMonth),
      source: EntrySource.RECURRING_RULE,
      pensionId: p.id,
      ...pensionAmounts(p.expectedMonthlyGbp!, p.defaultExchangeRate!),
      notes: `Expected payment — ${p.name}`,
      postingKey: `pension:${p.id}:${period}`,
    })),
  ];

  const [o, i] = await db.$transaction([
    db.outflow.createMany({ data: outflows, skipDuplicates: true }),
    db.inflow.createMany({ data: inflows, skipDuplicates: true }),
  ]);

  return { outflowsCreated: o.count, inflowsCreated: i.count };
}
