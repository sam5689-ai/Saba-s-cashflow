// Run by the Railway cron service: asks the web app to auto-post the current
// month's recurring entries, then exits (non-zero on failure so Railway shows it).
// Needs APP_URL (e.g. https://your-app.up.railway.app) and CRON_SECRET.
const { APP_URL, CRON_SECRET } = process.env;
if (!APP_URL || !CRON_SECRET) {
  console.error("APP_URL and CRON_SECRET must be set");
  process.exit(1);
}

const res = await fetch(new URL("/api/cron/post-recurring", APP_URL), {
  method: "POST",
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
  signal: AbortSignal.timeout(30_000),
});
const body = await res.text();
console.log(res.status, body);
process.exit(res.ok ? 0 : 1);
