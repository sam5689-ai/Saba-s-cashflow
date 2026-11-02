# Saba's Cash Flow

A simple personal cash-flow dashboard showing, for each calendar month: money in, fixed costs, lifestyle spending, and what's left over. All figures are in Israeli Shekels (₪).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Prisma 6 · PostgreSQL

## Business rules

| Inflow | Rule |
| --- | --- |
| Apt 1–3 | 100% of the rent counts |
| Apt 4 | 70% of the rent counts (`ownershipShare = 0.7`) |
| UK pension | `netAmountIls = amountGbp × exchangeRate` |

Each inflow row stores its inputs (gross rent and the share at that time, or GBP and the rate used) as well as the net ILS amount. Changing a share or rate later leaves past months as they were. Always build rows with `lib/inflow-math.ts`.

There are two kinds of outflow, set by each category's `tier`:
- **FIXED_BASELINE**: Beresheet Fee, Rates, Car Overhead, Property Management
- **VARIABLE_LIFESTYLE**: Food/Groceries, Dining & Entertaining, Gifts, Travel

Every ledger row has a `source`: `RECURRING_RULE`, `MANUAL` or `STATEMENT_IMPORT`.

## Auto-posting each month

`lib/recurring.ts` → `postRecurringForMonth(db, year, month)` posts:
- one outflow per active `RecurringTemplate`
- expected rent for each property that has `expectedMonthlyRentIls`
- the expected pension payment, using the pension's default exchange rate

You can safely run it more than once. Each row has a unique `postingKey` such as `template:<id>:2026-11`, and existing rows are skipped, so amounts you correct by hand are kept. In production, have a scheduler (for example a Railway cron service) call it on the 1st of each month:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/post-recurring
```

## Local setup

```bash
cp .env.example .env   # set DATABASE_URL and CRON_SECRET
npm install
npm run db:migrate     # apply migrations
npm run db:seed        # properties, pension, categories, templates; posts current month
npm run dev
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:studio`.

> Amounts in `prisma/seed.ts` marked **PLACEHOLDER** (rents, pension £ and rate, Beresheet, car) are examples. Replace them with the real figures.

## Railway

1. Add a PostgreSQL service and set the app's `DATABASE_URL` to reference it. Also set `CRON_SECRET`.
2. Build command: `npm run build`. Pre-deploy command: `npm run db:deploy`. Start command: `npm start`.
3. Seed once with `railway run npm run db:seed`.

## Layout

```
prisma/schema.prisma          data model (+ migrations, incl. CHECK constraints)
prisma/seed.ts                reference data
lib/cashflow.ts               getMonthlyCashFlow(year, month), server-only
lib/recurring.ts              monthly auto-posting
lib/inflow-math.ts            rent share / GBP→ILS calculations
lib/dates.ts                  month ranges ("current month" in Asia/Jerusalem)
app/page.tsx                  senior-friendly monthly dashboard (?year=&month=)
app/api/cron/post-recurring   scheduler endpoint
```
