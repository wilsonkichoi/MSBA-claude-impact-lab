/**
 * Pure, deterministic budget math. No AI, no rounding until display.
 * All amounts are US dollars. Function and field names state their unit.
 */
import type { BudgetImpact, HouseholdBudget, PremiumPeriod } from "./schema";

export class InvalidAmountError extends Error {
  constructor(field: string, value: unknown) {
    super(`${field} must be a finite, nonnegative number (received ${String(value)})`);
    this.name = "InvalidAmountError";
  }
}

function assertAmount(field: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new InvalidAmountError(field, value);
  }
}

export function assertValidBudget(budget: HouseholdBudget): void {
  assertAmount("grossMonthlyIncome", budget.grossMonthlyIncome);
  assertAmount("netMonthlyIncome", budget.netMonthlyIncome);
  assertAmount("mortgagePrincipalInterest", budget.mortgagePrincipalInterest);
  assertAmount("propertyTaxMonthly", budget.propertyTaxMonthly);
  assertAmount("homeownerInsuranceMonthly", budget.homeownerInsuranceMonthly);
  assertAmount("hoaMonthly", budget.hoaMonthly);
  assertAmount("utilitiesMonthly", budget.utilitiesMonthly);
  assertAmount("livingEssentialsMonthly", budget.livingEssentialsMonthly);
  assertAmount("minimumDebtPaymentsMonthly", budget.minimumDebtPaymentsMonthly);
  assertAmount("emergencySavings", budget.emergencySavings);
}

/** annual / 12. */
export function monthlyEquivalentOfAnnual(annual: number): number {
  assertAmount("annual", annual);
  return annual / 12;
}

/**
 * Convert an amount with a stated period to a monthly equivalent.
 * Returns null when the period is unknown: callers must ask the user, never guess.
 */
export function toMonthly(amount: number, period: PremiumPeriod): number | null {
  assertAmount("amount", amount);
  if (period === "annual") return amount / 12;
  if (period === "monthly") return amount;
  return null;
}

/** P&I + property tax + insurance + HOA. */
export function housingMonthly(budget: HouseholdBudget, insuranceMonthly = budget.homeownerInsuranceMonthly): number {
  assertAmount("insuranceMonthly", insuranceMonthly);
  return budget.mortgagePrincipalInterest + budget.propertyTaxMonthly + insuranceMonthly + budget.hoaMonthly;
}

/** housing + utilities + living essentials + minimum debt payments. */
export function essentialOutflowMonthly(budget: HouseholdBudget, insuranceMonthly = budget.homeownerInsuranceMonthly): number {
  return (
    housingMonthly(budget, insuranceMonthly) +
    budget.utilitiesMonthly +
    budget.livingEssentialsMonthly +
    budget.minimumDebtPaymentsMonthly
  );
}

/** Take-home (net) income minus essential outflow. May be negative. */
export function cashBufferMonthly(budget: HouseholdBudget, insuranceMonthly = budget.homeownerInsuranceMonthly): number {
  return budget.netMonthlyIncome - essentialOutflowMonthly(budget, insuranceMonthly);
}

/** Housing cost / GROSS monthly income. Null (unavailable) when gross income is not > 0. */
export function housingToGrossIncomeRatio(housingMonthlyAmount: number, grossMonthlyIncome: number): number | null {
  if (!Number.isFinite(grossMonthlyIncome) || grossMonthlyIncome <= 0) return null;
  return housingMonthlyAmount / grossMonthlyIncome;
}

/**
 * Before/after impact of replacing the budget's current monthly insurance with
 * a new monthly-equivalent insurance cost. The budget object is not mutated.
 *
 * This is a COST change. It does not compute a new lender/escrow payment.
 */
export function calculateInsuranceImpact(budget: HouseholdBudget, newInsuranceMonthly: number): BudgetImpact {
  assertValidBudget(budget);
  assertAmount("newInsuranceMonthly", newInsuranceMonthly);

  const oldInsuranceMonthly = budget.homeownerInsuranceMonthly;
  const beforeHousing = housingMonthly(budget, oldInsuranceMonthly);
  const afterHousing = housingMonthly(budget, newInsuranceMonthly);
  const beforeOutflow = essentialOutflowMonthly(budget, oldInsuranceMonthly);
  const afterOutflow = essentialOutflowMonthly(budget, newInsuranceMonthly);
  const beforeBuffer = budget.netMonthlyIncome - beforeOutflow;
  const afterBuffer = budget.netMonthlyIncome - afterOutflow;
  const monthlyCostChange = newInsuranceMonthly - oldInsuranceMonthly;

  return {
    oldInsuranceMonthly,
    newInsuranceMonthly,
    beforeHousingMonthly: beforeHousing,
    afterHousingMonthly: afterHousing,
    beforeEssentialOutflowMonthly: beforeOutflow,
    afterEssentialOutflowMonthly: afterOutflow,
    beforeCashBufferMonthly: beforeBuffer,
    afterCashBufferMonthly: afterBuffer,
    monthlyCostChange,
    annualizedCostChange: monthlyCostChange * 12,
    cashBufferChangeRatio: beforeBuffer > 0 ? (afterBuffer - beforeBuffer) / beforeBuffer : null,
    beforeHousingToGrossIncome: housingToGrossIncomeRatio(beforeHousing, budget.grossMonthlyIncome),
    afterHousingToGrossIncome: housingToGrossIncomeRatio(afterHousing, budget.grossMonthlyIncome),
  };
}

/** Restrained, non-predictive description of the buffer level. */
export type BufferLevel = "comfortable" | "thin" | "none";

/** Informational only. Thresholds describe the cushion, not a risk prediction. */
export function describeBuffer(bufferMonthly: number): BufferLevel {
  if (bufferMonthly <= 0) return "none";
  if (bufferMonthly < 300) return "thin";
  return "comfortable";
}
