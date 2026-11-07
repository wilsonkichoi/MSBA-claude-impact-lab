/**
 * Deterministic plain-language text built from validated numbers.
 * No model output is used here, so text can never disagree with the math.
 */
import { describeBuffer } from "./finance";
import { formatLongDate, formatMonthDay, formatPercent, formatPointChange, formatUSD } from "./format";
import type { BudgetImpact, ReviewedChange } from "./schema";

function bufferPhrase(n: number): string {
  return n < 0 ? `${formatUSD(n)} (a shortfall of ${formatUSD(Math.abs(n))})` : formatUSD(n);
}

/** The headline insight shown to the homeowner. */
export function buildInsight(change: ReviewedChange, impact: BudgetImpact): string {
  const delta = impact.monthlyCostChange;
  const when = change.effectiveDate ? ` starting ${formatMonthDay(change.effectiveDate)}` : "";
  const before = bufferPhrase(impact.beforeCashBufferMonthly);
  const after = bufferPhrase(impact.afterCashBufferMonthly);

  if (Math.abs(delta) < 0.005) {
    return `Your insurance renewal does not change your estimated monthly housing costs. Your estimated monthly money left after listed essential expenses stays at ${before}.`;
  }

  const direction = delta > 0 ? "increases" : "decreases";
  const movement = delta > 0 ? "drops" : "rises";
  return (
    `Your insurance renewal ${direction} your estimated monthly housing costs by ${formatUSD(Math.abs(delta))}${when}. ` +
    `If the rest of your budget stays the same, your estimated monthly money left after listed essential expenses ${movement} from ${before} to ${after}.`
  );
}

export type ExplanationPoint = { label: string; text: string };

export function buildExplanation(change: ReviewedChange, impact: BudgetImpact): ExplanationPoint[] {
  const points: ExplanationPoint[] = [];
  const periodWord = change.period === "annual" ? "yearly" : "monthly";

  if (change.previousAmount !== null && change.newAmount !== null) {
    points.push({
      label: "What changed",
      text: `Your ${periodWord} homeowners insurance premium goes from ${formatUSD(change.previousAmount)} to ${formatUSD(change.newAmount)}. As a monthly equivalent, that is ${formatUSD(impact.oldInsuranceMonthly)} → ${formatUSD(impact.newInsuranceMonthly)} in your budget.`,
    });
  }

  points.push({
    label: "When",
    text: change.effectiveDate
      ? `The new premium takes effect ${formatLongDate(change.effectiveDate)}. That is when the cost changes; the date you actually pay depends on your insurer's billing schedule.`
      : "The notice does not give a clear effective date. Confirm it with your insurer.",
  });

  const level = describeBuffer(impact.afterCashBufferMonthly);
  const why =
    level === "none"
      ? `Your listed essential expenses would be more than your take-home pay each month. That makes it worth talking with someone early, before any bill is due.`
      : level === "thin"
        ? `A smaller cushion leaves less room for surprise costs like repairs or a medical bill. Planning now gives you more options than waiting.`
        : `You still have a cushion, but it is smaller. Knowing this now lets you plan instead of react.`;
  points.push({ label: "Why it matters", text: why });

  return points;
}

/** Context line for the housing-cost ratio. Explicitly informational. */
export function ratioNote(impact: BudgetImpact): string {
  if (impact.beforeHousingToGrossIncome === null || impact.afterHousingToGrossIncome === null) {
    return "Housing cost as a share of gross income is unavailable because gross monthly income is $0.";
  }
  return `Housing cost divided by gross (before-tax) monthly income goes from ${formatPercent(impact.beforeHousingToGrossIncome)} to ${formatPercent(impact.afterHousingToGrossIncome)} (${formatPointChange(impact.beforeHousingToGrossIncome, impact.afterHousingToGrossIncome)}). This is an informational indicator only, not an approval or denial threshold.`;
}
