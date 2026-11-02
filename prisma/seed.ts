/**
 * Seeds reference data and auto-posts the current month.
 *
 *   npm run db:seed
 *
 * Idempotent: everything is upserted by its unique name, so re-running is
 * safe. Amounts marked PLACEHOLDER are illustrative — replace them with the
 * real figures (re-running the seed will update templates/properties, but
 * already-posted months keep the amounts they were posted with).
 */
import { CategoryTier, PrismaClient } from "@prisma/client";

import { currentYearMonth } from "@/lib/dates";
import { postRecurringForMonth } from "@/lib/recurring";

const prisma = new PrismaClient();

const PROPERTIES = [
  { name: "Apt 1", ownershipShare: "1.0", expectedMonthlyRentIls: "5000" }, // PLACEHOLDER rent
  { name: "Apt 2", ownershipShare: "1.0", expectedMonthlyRentIls: "5000" }, // PLACEHOLDER rent
  { name: "Apt 3", ownershipShare: "1.0", expectedMonthlyRentIls: "5000" }, // PLACEHOLDER rent
  {
    name: "Apt 4",
    ownershipShare: "0.7",
    expectedMonthlyRentIls: "6000", // PLACEHOLDER — full rent; 70% is counted
    notes: "Shared property — 70% ownership share.",
  },
];

const PENSIONS = [
  {
    name: "UK Pension",
    provider: "UK pension provider", // PLACEHOLDER
    expectedMonthlyGbp: "1000", // PLACEHOLDER
    defaultExchangeRate: "4.70", // PLACEHOLDER — ILS per £1; update regularly
    notes: "Paid in GBP into a UK bank account.",
  },
];

const CATEGORIES: { name: string; tier: CategoryTier }[] = [
  { name: "Beresheet Fee", tier: CategoryTier.FIXED_BASELINE },
  { name: "Rates", tier: CategoryTier.FIXED_BASELINE },
  { name: "Car Overhead", tier: CategoryTier.FIXED_BASELINE },
  { name: "Property Management", tier: CategoryTier.FIXED_BASELINE },
  { name: "Food/Groceries", tier: CategoryTier.VARIABLE_LIFESTYLE },
  { name: "Dining & Entertaining", tier: CategoryTier.VARIABLE_LIFESTYLE },
  { name: "Gifts", tier: CategoryTier.VARIABLE_LIFESTYLE },
  { name: "Travel", tier: CategoryTier.VARIABLE_LIFESTYLE },
];

const TEMPLATES = [
  {
    name: "Beresheet accommodation fee",
    category: "Beresheet Fee",
    amountIls: "15000", // PLACEHOLDER
    description: "Beresheet monthly accommodation fee",
  },
  {
    name: "Car overhead",
    category: "Car Overhead",
    amountIls: "1200", // PLACEHOLDER
    description: "Car insurance, licence and baseline petrol (monthly share)",
  },
];

async function main() {
  for (const p of PROPERTIES) {
    await prisma.property.upsert({ where: { name: p.name }, create: p, update: p });
  }

  for (const p of PENSIONS) {
    await prisma.pension.upsert({ where: { name: p.name }, create: p, update: p });
  }

  const categoryIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const data = { ...c, sortOrder: i };
    const row = await prisma.category.upsert({ where: { name: c.name }, create: data, update: data });
    categoryIds.set(row.name, row.id);
  }

  // Templates start from the first of the current month.
  const { year, month } = currentYearMonth();
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  for (const t of TEMPLATES) {
    const categoryId = categoryIds.get(t.category);
    if (!categoryId) throw new Error(`Unknown category ${t.category}`);
    const data = { name: t.name, categoryId, amountIls: t.amountIls, description: t.description, dayOfMonth: 1 };
    await prisma.recurringTemplate.upsert({
      where: { name: t.name },
      create: { ...data, startDate },
      update: data,
    });
  }

  const posted = await postRecurringForMonth(prisma, year, month);

  console.log(
    `Seeded ${PROPERTIES.length} properties, ${PENSIONS.length} pension, ` +
      `${CATEGORIES.length} categories, ${TEMPLATES.length} recurring templates.\n` +
      `Auto-posted ${year}-${String(month).padStart(2, "0")}: ` +
      `${posted.outflowsCreated} outflows, ${posted.inflowsCreated} inflows.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
