import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonthlyCashFlow, type CategoryBreakdown, type MonthlyCashFlow } from "@/lib/cashflow";
import { currentYearMonth, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Always read fresh figures from the database.
export const dynamic = "force-dynamic";

const ils = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function parseMonth(params: { year?: string; month?: string }) {
  const fallback = currentYearMonth();
  const year = Number(params.year);
  const month = Number(params.month);
  const valid = Number.isInteger(year) && year >= 2000 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12;
  return valid ? { year, month } : fallback;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year, month } = parseMonth(await searchParams);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  let data: MonthlyCashFlow | null = null;
  try {
    data = await getMonthlyCashFlow(year, month);
  } catch (error) {
    console.error("Failed to load cash flow", error);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-10 flex flex-col gap-6">
        <p className="text-xl font-semibold text-muted-foreground">Monthly cash flow</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{monthLabel(year, month)}</h1>
        <nav aria-label="Change month" className="flex flex-wrap gap-4">
          <MonthLink href={`/?year=${prev.year}&month=${prev.month}`}>← {monthLabel(prev.year, prev.month)}</MonthLink>
          <MonthLink href={`/?year=${next.year}&month=${next.month}`}>{monthLabel(next.year, next.month)} →</MonthLink>
        </nav>
      </header>

      {data ? (
        <Dashboard data={data} />
      ) : (
        <Card className="border-2 border-destructive">
          <CardContent>
            <p className="text-xl font-semibold">The figures could not be loaded right now.</p>
            <p className="mt-2 text-lg">Please try again in a moment.</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function MonthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-14 items-center rounded-lg border-2 border-foreground px-5 text-lg font-semibold hover:bg-muted focus-visible:outline-4 focus-visible:outline-offset-2"
    >
      {children}
    </Link>
  );
}

function Dashboard({ data }: { data: MonthlyCashFlow }) {
  const surplus = data.netSurplusIls >= 0;
  const fixed = data.categories.filter((c) => c.tier === "FIXED_BASELINE");
  const variable = data.categories.filter((c) => c.tier === "VARIABLE_LIFESTYLE");

  return (
    <div className="flex flex-col gap-10">
      {/* The answer first. */}
      <Card className={cn("border-4", surplus ? "border-money-in" : "border-money-out")}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{surplus ? "Left over this month" : "Short this month"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-6xl font-extrabold tabular-nums sm:text-7xl",
              surplus ? "text-money-in" : "text-money-out",
            )}
          >
            {ils.format(Math.abs(data.netSurplusIls))}
          </p>
          <p className="mt-3 text-xl">
            {ils.format(data.totalInflowIls)} in, minus {ils.format(data.totalOutflowIls)} out.
          </p>
        </CardContent>
      </Card>

      <section aria-label="Totals" className="grid gap-6 sm:grid-cols-3">
        <Figure label="Money in" value={data.totalInflowIls} tone="in" />
        <Figure label="Fixed costs" value={data.totalFixedOutflowIls} tone="out" />
        <Figure label="Lifestyle spending" value={data.totalVariableOutflowIls} tone="out" />
      </section>

      <Section title="Money in">
        {data.inflows.length === 0 ? (
          <p className="text-xl">Nothing recorded yet for this month.</p>
        ) : (
          <Rows
            rows={data.inflows.map((i) => ({
              key: i.key,
              label: i.label,
              detail: i.totalGbp !== undefined ? `${gbp.format(i.totalGbp)} converted` : undefined,
              value: i.totalIls,
            }))}
            total={data.totalInflowIls}
          />
        )}
      </Section>

      <Section title="Fixed costs">
        <CategoryRows categories={fixed} total={data.totalFixedOutflowIls} />
      </Section>

      <Section title="Lifestyle spending">
        <CategoryRows categories={variable} total={data.totalVariableOutflowIls} />
      </Section>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: number; tone: "in" | "out" }) {
  return (
    <Card className="border-2 gap-3">
      <CardHeader>
        <CardTitle className="text-xl font-bold">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-4xl font-extrabold tabular-nums", tone === "in" ? "text-money-in" : "text-money-out")}>
          {ils.format(value)}
        </p>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-3xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function CategoryRows({ categories, total }: { categories: CategoryBreakdown[]; total: number }) {
  return (
    <Rows rows={categories.map((c) => ({ key: c.categoryId, label: c.name, value: c.totalIls }))} total={total} />
  );
}

function Rows({
  rows,
  total,
}: {
  rows: { key: string; label: string; detail?: string; value: number }[];
  total: number;
}) {
  return (
    <ul className="divide-y-2 divide-border border-y-2 border-foreground text-xl">
      {rows.map((r) => (
        <li key={r.key} className="flex items-baseline justify-between gap-4 py-4">
          <span>
            {r.label}
            {r.detail && <span className="block text-lg text-muted-foreground">{r.detail}</span>}
          </span>
          <span className="font-semibold tabular-nums">{ils.format(r.value)}</span>
        </li>
      ))}
      <li className="flex items-baseline justify-between gap-4 py-4 font-bold">
        <span>Total</span>
        <span className="tabular-nums">{ils.format(total)}</span>
      </li>
    </ul>
  );
}
