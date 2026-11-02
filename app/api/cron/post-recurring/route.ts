import { NextResponse } from "next/server";

import { currentYearMonth } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { postRecurringForMonth } from "@/lib/recurring";

export const dynamic = "force-dynamic";

/**
 * Auto-posts the current month's recurring entries. Call it from a scheduler
 * (e.g. a Railway cron service) on the 1st — or daily; it is idempotent.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/post-recurring
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { year, month } = currentYearMonth();
  const result = await postRecurringForMonth(prisma, year, month);
  return NextResponse.json({ year, month, ...result });
}
