/**
 * FIND_IT.md §5: monthly cost, cash at closing, and the price that fits a budget.
 * Pure functions, full precision. Rounding happens only in lib/format.ts.
 */

import { paymentFactor } from "@/lib/fundit/affordability";
import { LATEST_PMMS } from "@/lib/fundit/rates";

export type FinanceAssumptions = {
  /** Freddie Mac PMMS week (source, not an assumption). */
  pmmsWeek: string;
  ratePct: number;
  /** ASSUMPTION */
  years: number;
  /** ASSUMPTION: down payment as a share of price. */
  downPct: number;
  /** ASSUMPTION: closing costs as a share of price. */
  closingPct: number;
  /** ASSUMPTION: cash kept in reserve after closing ($). */
  reserve: number;
  /** ASSUMPTION: property tax as a share of price per year. */
  taxRate: number;
  /** ASSUMPTION: homeowners insurance ($/mo), matches HomeStay and Pencil. */
  insuranceMonthly: number;
  /** ASSUMPTION: PMI per year as a share of the loan, below 20% down. */
  pmiRate: number;
  /** ASSUMPTION: HOA used when a source does not publish one ($/mo). */
  hoaScenario: number;
  /** ASSUMPTION: special assessment / Mello-Roos used when unpublished ($/mo). */
  assessmentScenario: number;
};

export const DEFAULT_ASSUMPTIONS: Readonly<FinanceAssumptions> = Object.freeze({
  pmmsWeek: LATEST_PMMS.week,
  ratePct: LATEST_PMMS.rate30,
  years: 30,
  downPct: 0.03,
  closingPct: 0.02,
  reserve: 5_000,
  taxRate: 0.011,
  insuranceMonthly: 150,
  pmiRate: 0.006,
  hoaScenario: 350,
  assessmentScenario: 100,
});

/** ASSUMPTION ranges for unpriced homes ("What price would fit my budget?"). */
export const HOA_RANGE = Object.freeze({ low: 200, high: 500 });
export const ASSESSMENT_RANGE = Object.freeze({ low: 0, high: 100 });

/** Mortgage insurance applies when the down payment is below 20%. */
export const PMI_THRESHOLD = 0.2;

export type MonthlyEstimate = {
  price: number;
  principalInterest: number;
  tax: number;
  insurance: number;
  hoa: number;
  hoaIsScenario: boolean;
  assessment: number;
  assessmentIsScenario: boolean;
  pmi: number;
  monthly: number;
  down: number;
  closing: number;
  loan: number;
  cashAtClose: number;
  /** Savings after closing (can be negative). */
  left: number;
  /** How far savings fall short of covering closing and keeping the reserve (≥ 0). */
  shortOfReserve: number;
};

/**
 * Monthly all-in cost for a known price. `hoa` / `assessment` are the published
 * values, or null to use the labeled scenario values.
 */
export function estimateMonthly(
  price: number,
  hoaPublished: number | null,
  assessmentPublished: number | null,
  cash: number,
  a: FinanceAssumptions,
): MonthlyEstimate {
  const f = paymentFactor(a.ratePct, a.years);
  const down = price * a.downPct;
  const closing = price * a.closingPct;
  const loan = price - down;
  const principalInterest = loan * f;
  const tax = (price * a.taxRate) / 12;
  const pmi = a.downPct < PMI_THRESHOLD ? (loan * a.pmiRate) / 12 : 0;
  const hoa = hoaPublished ?? a.hoaScenario;
  const assessment = assessmentPublished ?? a.assessmentScenario;
  const monthly = principalInterest + tax + a.insuranceMonthly + hoa + assessment + pmi;
  const cashAtClose = down + closing;
  return {
    price,
    principalInterest,
    tax,
    insurance: a.insuranceMonthly,
    hoa,
    hoaIsScenario: hoaPublished === null,
    assessment,
    assessmentIsScenario: assessmentPublished === null,
    pmi,
    monthly,
    down,
    closing,
    loan,
    cashAtClose,
    left: cash - cashAtClose,
    shortOfReserve: Math.max(0, a.reserve + cashAtClose - cash),
  };
}

export type FitPrice = {
  paymentCap: number;
  cashCap: number;
  /** max(0, min(paymentCap, cashCap)). 0 → "No positive price fits these assumptions". */
  price: number;
  binding: "payment" | "cash" | "none";
};

/** Highest price whose monthly cost stays within the budget and whose closing cash keeps the reserve. */
export function fitPrice(budget: number, cash: number, hoa: number, assessment: number, a: FinanceAssumptions): FitPrice {
  const f = paymentFactor(a.ratePct, a.years);
  const d = a.downPct;
  const pmiTerm = d < PMI_THRESHOLD ? ((1 - d) * a.pmiRate) / 12 : 0;
  const paymentCap = (budget - a.insuranceMonthly - hoa - assessment) / ((1 - d) * f + a.taxRate / 12 + pmiTerm);
  const cashCap = (cash - a.reserve) / (d + a.closingPct);
  const raw = Math.min(paymentCap, cashCap);
  const price = Math.max(0, raw);
  const binding = price === 0 ? "none" : paymentCap <= cashCap ? "payment" : "cash";
  return { paymentCap, cashCap, price, binding };
}

/** Planning range for an unpriced home: high HOA + high assessment → low end; low + low → high end. */
export function fitRange(budget: number, cash: number, a: FinanceAssumptions): { low: FitPrice; high: FitPrice } {
  return {
    low: fitPrice(budget, cash, HOA_RANGE.high, ASSESSMENT_RANGE.high, a),
    high: fitPrice(budget, cash, HOA_RANGE.low, ASSESSMENT_RANGE.low, a),
  };
}

/** Preferred payment as a share of gross monthly income; null when income ≤ 0 (ask for income). */
export function budgetShare(budgetMonthly: number, annualIncome: number): number | null {
  if (!Number.isFinite(annualIncome) || annualIncome <= 0 || !Number.isFinite(budgetMonthly)) return null;
  return (budgetMonthly * 12) / annualIncome;
}

export type FitSentence = { kind: "above" | "within" | "unknown"; amount: number | null };

export function fitSentence(monthly: number | null, budget: number): FitSentence {
  if (monthly === null) return { kind: "unknown", amount: null };
  if (monthly > budget) return { kind: "above", amount: monthly - budget };
  return { kind: "within", amount: budget - monthly };
}

const EARTH_RADIUS_MI = 3958.8;

/** Straight-line (great-circle) miles. Never a travel time. */
export function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}
