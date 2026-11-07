/**
 * Orange County income limits, copied from two HCD documents with different
 * dates. Index 0 = 1 person ... index 7 = 8 persons. Frozen.
 */

type Row = readonly [number, number, number, number, number, number, number, number];

function freezeTable<T extends Record<string, Row>>(t: T): Readonly<T> {
  for (const v of Object.values(t)) Object.freeze(v);
  return Object.freeze(t);
}

/** §3.1: HCD Revised 2026 State Income Limits (memo dated 2026-06-23), Orange County, page 11. */
export const STATE_2026_OC = Object.freeze({
  sourceId: "hcd-state-2026" as const,
  county: "Orange",
  /** Area median income, 4-person. */
  ami4: 138600,
  rows: freezeTable({
    acutelyLow: [14550, 16650, 18700, 20800, 22450, 24150, 25800, 27450],
    extremelyLow: [39100, 44700, 50300, 55850, 60350, 64800, 69300, 73750],
    veryLow: [65150, 74450, 83750, 93050, 100500, 107950, 115400, 122850],
    low: [104200, 119100, 134000, 148850, 160800, 172700, 184600, 196500],
    median: [97000, 110900, 124750, 138600, 149700, 160800, 171850, 182950],
    moderate: [116400, 133050, 149650, 166300, 179600, 192900, 206200, 219500],
  } as const satisfies Record<string, Row>),
});

/** §3.2: HCD 2026 State HOME Income Limits (effective 2026-06-01), Orange, page 2. */
export const HOME_2026_OC = Object.freeze({
  sourceId: "hcd-home-2026" as const,
  county: "Orange",
  rows: freezeTable({
    pct30: [39100, 44700, 50300, 55850, 60350, 64800, 69300, 73750],
    pct50: [65150, 74450, 83750, 93050, 100500, 107950, 115400, 122850],
    pct60: [78180, 89340, 100500, 111660, 120600, 129540, 138480, 147420],
    pct80: [104200, 119100, 134000, 148850, 160800, 172700, 184600, 196500],
  } as const satisfies Record<string, Row>),
});

export type IncomeCategory = "acutelyLow" | "extremelyLow" | "veryLow" | "lower" | "moderate" | "aboveModerate";

export const INCOME_CATEGORY_LABEL: Record<IncomeCategory, string> = {
  acutelyLow: "Acutely low income",
  extremelyLow: "Extremely low income",
  veryLow: "Very low income",
  lower: "Lower (low) income",
  moderate: "Moderate income",
  aboveModerate: "Above moderate income",
};

function limit(row: Row, persons: number): number | null {
  if (!Number.isInteger(persons) || persons < 1 || persons > 8) return null;
  return row[persons - 1] ?? null;
}

export type IncomePlacement = {
  category: IncomeCategory;
  /** Gross income ÷ the State table's median for this household size. */
  pctOfAmi: number;
  /** The limits just below and above the household's income, for display. */
  lowerBound: { label: string; value: number } | null;
  upperBound: { label: string; value: number } | null;
};

/** Place a gross annual income in the §3.1 rows. Persons outside 1–8 → null (Unknown). */
export function incomeCategory(grossIncome: number, persons: number): IncomePlacement | null {
  const r = STATE_2026_OC.rows;
  const median = limit(r.median, persons);
  if (median === null || !Number.isFinite(grossIncome) || grossIncome < 0) return null;
  const steps: { cat: IncomeCategory; label: string; value: number }[] = [
    { cat: "acutelyLow", label: "acutely low", value: limit(r.acutelyLow, persons)! },
    { cat: "extremelyLow", label: "extremely low", value: limit(r.extremelyLow, persons)! },
    { cat: "veryLow", label: "very low", value: limit(r.veryLow, persons)! },
    { cat: "lower", label: "low", value: limit(r.low, persons)! },
    { cat: "moderate", label: "moderate", value: limit(r.moderate, persons)! },
  ];
  const idx = steps.findIndex((s) => grossIncome <= s.value);
  const category: IncomeCategory = idx === -1 ? "aboveModerate" : steps[idx]!.cat;
  const below = idx === -1 ? steps[steps.length - 1]! : idx > 0 ? steps[idx - 1]! : null;
  const above = idx === -1 ? null : steps[idx]!;
  return {
    category,
    pctOfAmi: grossIncome / median,
    lowerBound: below ? { label: below.label, value: below.value } : null,
    upperBound: above ? { label: above.label, value: above.value } : null,
  };
}
