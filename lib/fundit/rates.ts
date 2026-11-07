/**
 * Freddie Mac PMMS 30-year fixed, weekly national average.
 * Snapshot read from the PMMS history CSV on 2026-11-07. No runtime fetch.
 */

export type PmmsWeek = { week: string; rate30: number };

export const PMMS_SNAPSHOT: readonly PmmsWeek[] = Object.freeze(
  (
    [
      ["2026-09-03", 6.71],
      ["2026-09-10", 6.76],
      ["2026-09-17", 6.95],
      ["2026-09-24", 7.03],
      ["2026-10-01", 7.28],
      ["2026-10-08", 7.4],
      ["2026-10-15", 7.4],
      ["2026-10-22", 7.32],
      ["2026-10-29", 7.24],
      ["2026-11-05", 7.18],
    ] as const
  ).map(([week, rate30]) => Object.freeze({ week, rate30 })),
);

export const LATEST_PMMS: PmmsWeek = PMMS_SNAPSHOT[PMMS_SNAPSHOT.length - 1]!;

export function pmmsRate(week: string): number | null {
  return PMMS_SNAPSHOT.find((w) => w.week === week)?.rate30 ?? null;
}

/** ASSUMPTION: the "rates move" scenario step, +0.50 point over the chosen week. Not a published value. */
export const RATE_STEP_ASSUMPTION = 0.5;

/** ASSUMPTION: a chosen PMMS week older than this many days gets a stale warning. */
export const PMMS_STALE_DAYS = 14;

/** Parse the PMMS history CSV ("date,pmms30,...", dates as M/D/YYYY) and return the latest 30-year row. */
export function parsePmmsLatest(csv: string): PmmsWeek | null {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0]?.split(",").map((h) => h.trim().toLowerCase()) ?? [];
  const di = header.indexOf("date");
  const ri = header.indexOf("pmms30");
  if (di === -1 || ri === -1) return null;
  for (let i = lines.length - 1; i > 0; i--) {
    const cols = lines[i]!.split(",");
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((cols[di] ?? "").trim());
    const rate = Number((cols[ri] ?? "").trim());
    if (m && (cols[ri] ?? "").trim() !== "" && Number.isFinite(rate) && rate > 0 && rate < 30) {
      const week = `${m[3]}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
      return { week, rate30: rate };
    }
  }
  return null;
}

/** Whole days from an ISO week date to an ISO "today" date (UTC, no time zone shifting). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}
