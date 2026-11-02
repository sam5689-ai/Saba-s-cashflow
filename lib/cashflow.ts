import "server-only";

import { CategoryTier, InflowType, Prisma, type PrismaClient } from "@prisma/client";

import { monthRange } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export type CategoryBreakdown = {
  categoryId: string;
  name: string;
  tier: CategoryTier;
  totalIls: number;
  entryCount: number;
};

export type InflowBreakdown = {
  /** Property id, pension id, or "other". */
  key: string;
  label: string;
  type: InflowType;
  totalIls: number;
  /** Pensions only: GBP received before conversion. */
  totalGbp?: number;
  entryCount: number;
};

export type MonthlyCashFlow = {
  year: number;
  month: number;
  totalInflowIls: number;
  totalFixedOutflowIls: number;
  totalVariableOutflowIls: number;
  totalOutflowIls: number;
  netSurplusIls: number;
  inflows: InflowBreakdown[];
  /** Every active category (zero if nothing was spent), fixed first. */
  categories: CategoryBreakdown[];
};

const ZERO = new Prisma.Decimal(0);
const toNumber = (d: Prisma.Decimal | null | undefined) =>
  (d ?? ZERO).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber();

/**
 * Cash flow for one calendar month, all figures in ILS.
 *
 * Inflows are summed from each row's stored `netAmountIls`, which already
 * applies the ownership share (rent) or GBP→ILS conversion (pension) — see
 * `lib/inflow-math.ts`. Totals are accumulated as exact decimals and only
 * rounded to agorot at the end.
 */
export async function getMonthlyCashFlow(
  year: number,
  month: number,
  db: PrismaClient = prisma,
): Promise<MonthlyCashFlow> {
  const { start, end } = monthRange(year, month);
  const inMonth = { date: { gte: start, lt: end } };

  const [inflowGroups, outflowGroups, categories, properties, pensions] = await Promise.all([
    db.inflow.groupBy({
      by: ["type", "propertyId", "pensionId"],
      where: inMonth,
      _sum: { netAmountIls: true, amountGbp: true },
      _count: { _all: true },
    }),
    db.outflow.groupBy({
      by: ["categoryId"],
      where: inMonth,
      _sum: { amountIls: true },
      _count: { _all: true },
    }),
    db.category.findMany({ orderBy: [{ tier: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    db.property.findMany({ select: { id: true, name: true, ownershipShare: true } }),
    db.pension.findMany({ select: { id: true, name: true } }),
  ]);

  // ── Inflows ──
  const propertyById = new Map(properties.map((p) => [p.id, p]));
  const pensionName = new Map(pensions.map((p) => [p.id, p.name]));

  let totalInflow = ZERO;
  const inflows: InflowBreakdown[] = inflowGroups.map((g) => {
    const sum = g._sum.netAmountIls ?? ZERO;
    totalInflow = totalInflow.add(sum);

    if (g.type === InflowType.RENT && g.propertyId) {
      const p = propertyById.get(g.propertyId);
      const share = p ? p.ownershipShare.mul(100).toNumber() : null;
      return {
        key: g.propertyId,
        label: p ? (share === 100 ? p.name : `${p.name} (${share}% share)`) : "Rent",
        type: g.type,
        totalIls: toNumber(sum),
        entryCount: g._count._all,
      };
    }
    if (g.type === InflowType.PENSION && g.pensionId) {
      return {
        key: g.pensionId,
        label: pensionName.get(g.pensionId) ?? "Pension",
        type: g.type,
        totalIls: toNumber(sum),
        totalGbp: toNumber(g._sum.amountGbp),
        entryCount: g._count._all,
      };
    }
    return {
      key: `other:${g.type}`,
      label: g.type === InflowType.OTHER ? "Other income" : "Unassigned",
      type: g.type,
      totalIls: toNumber(sum),
      entryCount: g._count._all,
    };
  });
  const typeOrder = { RENT: 0, PENSION: 1, OTHER: 2 } as const;
  inflows.sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.label.localeCompare(b.label));

  // ── Outflows ──
  const spentByCategory = new Map(outflowGroups.map((g) => [g.categoryId, g]));
  let totalFixed = ZERO;
  let totalVariable = ZERO;

  const breakdown: CategoryBreakdown[] = categories
    // Keep inactive categories only if they still have spending this month.
    .filter((c) => c.active || spentByCategory.has(c.id))
    .map((c) => {
      const g = spentByCategory.get(c.id);
      const sum = g?._sum.amountIls ?? ZERO;
      if (c.tier === CategoryTier.FIXED_BASELINE) totalFixed = totalFixed.add(sum);
      else totalVariable = totalVariable.add(sum);
      return {
        categoryId: c.id,
        name: c.name,
        tier: c.tier,
        totalIls: toNumber(sum),
        entryCount: g?._count._all ?? 0,
      };
    });

  const totalOutflow = totalFixed.add(totalVariable);

  return {
    year,
    month,
    totalInflowIls: toNumber(totalInflow),
    totalFixedOutflowIls: toNumber(totalFixed),
    totalVariableOutflowIls: toNumber(totalVariable),
    totalOutflowIls: toNumber(totalOutflow),
    netSurplusIls: toNumber(totalInflow.sub(totalOutflow)),
    inflows,
    categories: breakdown,
  };
}
