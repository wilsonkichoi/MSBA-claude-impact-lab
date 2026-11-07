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
