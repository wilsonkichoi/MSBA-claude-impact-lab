/**
 * §5.1–5.2: what families can pay, and the price per home that payment supports.
 * Pure functions. All rounding happens in lib/format.ts at display time.
 */

import { STATE_2026_OC } from "./income-limits";

/** HSC 50052.5(b) categories that have an owner housing-cost formula. */
export type CapCategory = "extremelyLow" | "veryLow" | "lower" | "moderate";

export const CAP_LABEL: Record<CapCategory, string> = {
  extremelyLow: "Extremely low income: 30% × 30% of AMI",
  veryLow: "Very low income: 30% × 50% of AMI",
  lower: "Lower income: 30% × 70% of AMI",
  moderate: "Moderate income (upper bound): 35% × 110% of AMI",
};

const CAP_FACTOR: Record<CapCategory, number> = {
  extremelyLow: 0.3 * 0.3,
  veryLow: 0.3 * 0.5,
  lower: 0.3 * 0.7,
  moderate: 0.35 * 1.1,
};

/**
 * HSC 50052.5(h): household size for a unit = bedrooms + 1 (studio = 1 ... 4BR = 5).
 * Returns the AMI for that household size from the State table's median row,
 * or null ("Unknown") for more than 4 bedrooms or invalid input.
 */
export function amiForUnit(bedrooms: number): number | null {
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 4) return null;
  return STATE_2026_OC.rows.median[bedrooms] ?? null;
}

export function personsForUnit(bedrooms: number): number | null {
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 4) return null;
  return bedrooms + 1;
}

/** Monthly 50052.5(b) cap for a category and an AMI. */
export function programCapMonthly(category: CapCategory, ami: number): number {
  return (CAP_FACTOR[category] * ami) / 12;
}

/** ASSUMPTION: share of gross income a family can put toward housing (default 30%). */
export const DEFAULT_BUDGET_SHARE = 0.3;

export function householdBudgetMonthly(grossAnnualIncome: number, budgetShare = DEFAULT_BUDGET_SHARE): number {
  return (budgetShare * grossAnnualIncome) / 12;
}

export function usedBudgetMonthly(householdBudget: number, cap: number | null, applyCap: boolean): number {
  return applyCap && cap !== null ? Math.min(householdBudget, cap) : householdBudget;
}

/** Monthly payment per $1 of loan: i(1+i)^n / ((1+i)^n − 1). */
export function paymentFactor(ratePct: number, years = 30): number {
  const n = years * 12;
  const i = ratePct / 100 / 12;
  if (i === 0) return 1 / n;
  const p = Math.pow(1 + i, n);
  return (i * p) / (p - 1);
}

export type PriceInputs = {
  /** B: what the family pays for housing each month ($). */
  budgetMonthly: number;
  /** R: recurring non-P&I costs not modeled as % of price ($/mo). */
  reserveMonthly: number;
  /** C: fixed buyer cash ($). */
  buyerCash: number;
  /** d: buyer cash as a share of price (0–1). */
  buyerCashPct?: number;
  /** D: committed, applicable deferred buyer assistance per home ($). */
  deferredAssistance?: number;
  /** t: property-tax rate as a share of price per year (0 when taxes are inside R). */
  taxRate?: number;
  ratePct: number;
  years?: number;
};

export type PriceResult = {
  price: number;
  mortgage: number;
  /** Monthly principal and interest. */
  principalInterest: number;
  /** False when the budget does not cover the recurring costs; price is then $0. */
  pencilsAtBudget: boolean;
};

/**
 * §5.2 general solver:
 *   P = (B − R + (C + D)·f) / ((1 − d)·f + t/12)
 * Loan = (1 − d)·P − C − D. Never negative.
 */
export function solvePrice(x: PriceInputs): PriceResult {
  const f = paymentFactor(x.ratePct, x.years ?? 30);
  const d = x.buyerCashPct ?? 0;
  const D = x.deferredAssistance ?? 0;
  const t = x.taxRate ?? 0;
  const B = x.budgetMonthly;
  const R = x.reserveMonthly;
  const C = x.buyerCash;
  if (B - R <= 0) return { price: 0, mortgage: 0, principalInterest: 0, pencilsAtBudget: false };
  const price = Math.max(0, (B - R + (C + D) * f) / ((1 - d) * f + t / 12));
  const mortgage = Math.max(0, (1 - d) * price - C - D);
  return { price, mortgage, principalInterest: mortgage * f, pencilsAtBudget: true };
}
