/**
 * Display helpers. Calculations stay unrounded; rounding happens only here.
 * Dollars: whole dollars when exact, otherwise to the nearest cent.
 * Percentages: one decimal place.
 */

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const cents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function roundToCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** $1,800 or $150.50. Negative values render as -$150. */
export function formatUSD(n: number): string {
  const r = roundToCents(n);
  const fmt = Number.isInteger(r) ? wholeDollars : cents;
  // Avoid "-$0".
  return fmt.format(Object.is(r, -0) ? 0 : r);
}

/** Always shows cents: $150.00. */
export function formatUSDCents(n: number): string {
  return cents.format(roundToCents(n));
}

/** +$150 / -$150 / $0 */
export function formatSignedUSD(n: number): string {
  const r = roundToCents(n);
  if (r === 0) return formatUSD(0);
  return `${r > 0 ? "+" : "-"}${formatUSD(Math.abs(r))}`;
}

/** 0.29444 -> "29.4%". Null -> "Unavailable". */
export function formatPercent(ratio: number | null, digits = 1): string {
  if (ratio === null || !Number.isFinite(ratio)) return "Unavailable";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** -0.375 -> "-37.5%" */
export function formatSignedPercent(ratio: number | null, digits = 1): string {
  if (ratio === null || !Number.isFinite(ratio)) return "Unavailable";
  const v = Number((ratio * 100).toFixed(digits));
  if (v === 0) return `${(0).toFixed(digits)}%`;
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

/** Percentage-point difference between two ratios: "+2.1 percentage points". */
export function formatPointChange(before: number | null, after: number | null, digits = 1): string {
  if (before === null || after === null) return "Unavailable";
  const v = Number(((after - before) * 100).toFixed(digits));
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)} percentage points`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-12-01" -> "December 1" (no timezone shifting). */
export function formatMonthDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d || !MONTHS[m - 1]) return iso;
  return `${MONTHS[m - 1]} ${d}`;
}

/** "2026-12-01" -> "December 1, 2026" */
export function formatLongDate(iso: string): string {
  const [y] = iso.split("-");
  const md = formatMonthDay(iso);
  return md === iso ? iso : `${md}, ${y}`;
}
