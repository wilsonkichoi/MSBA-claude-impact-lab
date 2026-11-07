/**
 * Transparent, rule-based action plan. Every action records the rule that
 * produced it so a homeowner or counselor can see why it is suggested.
 * No savings, eligibility, or outcomes are promised.
 */
import { describeBuffer } from "./finance";
import { formatMonthDay, formatUSD } from "./format";
import type { BudgetImpact, HouseholdBudget, ReviewedChange } from "./schema";

export type ActionItem = {
  id: "confirm-renewal" | "ask-servicer" | "compare-coverage" | "update-plan" | "talk-to-counselor";
  title: string;
  why: string;
  how: string[];
  whoCanHelp: string;
  /** Plain statement of the rule that triggered/ranked this action. */
  rule: string;
};

export function buildActionPlan(budget: HouseholdBudget, change: ReviewedChange, impact: BudgetImpact): ActionItem[] {
  const increase = impact.monthlyCostChange > 0.005;
  const delta = formatUSD(Math.abs(impact.monthlyCostChange));
  const when = change.effectiveDate ? formatMonthDay(change.effectiveDate) : "the effective date";
  const level = describeBuffer(impact.afterCashBufferMonthly);
  const escrowish = change.paymentMethod !== "direct";

  const confirm: ActionItem = escrowish
    ? {
        id: "ask-servicer",
        title: "Ask your mortgage servicer how this affects your payment",
        why:
          change.paymentMethod === "escrow"
            ? "Because this premium is paid through escrow, your servicer decides the new monthly payment, which may include a shortage or catch-up amount."
            : "It is not clear whether this premium is paid directly or through escrow, which changes who bills you and when.",
        how: [
          "Call the number on your mortgage statement and ask whether the new premium has been received for escrow.",
          "Ask for the escrow analysis and the date and amount of any new monthly payment.",
          "Confirm the renewal premium and effective date with your insurer too.",
        ],
        whoCanHelp: "Your mortgage servicer and your insurance representative.",
        rule: `Shown first because the payment method is "${change.paymentMethod}", so the lender payment cannot be estimated from this notice.`,
      }
    : {
        id: "confirm-renewal",
        title: "Confirm the renewal details",
        why: `Before you change your plans, make sure the new premium (${change.newAmount !== null ? formatUSD(change.newAmount) : "amount"}${change.period === "annual" ? "/year" : change.period === "monthly" ? "/month" : ""}), the ${when} effective date, and direct billing are correct.`,
        how: [
          "Call your insurance representative using the number on your policy, not a number from an unexpected email or text.",
          "Ask what caused the change and whether coverage, deductibles, or discounts changed.",
          "Ask when the first payment at the new amount is due and whether installments are available.",
        ],
        whoCanHelp: "Your insurance representative or agent.",
        rule: "Always first: every number in this plan depends on the notice being correct.",
      };

  const compare: ActionItem = {
    id: "compare-coverage",
    title: "Ask about alternatives before renewing",
    why: increase
      ? `The premium rises by about ${delta}/month. Other quotes or discounts may exist, but there is no guarantee they will cost less.`
      : "Even without an increase, it can be worth reviewing your coverage once a year.",
    how: [
      "Ask your current insurer about available discounts (for example, bundling, safety devices, or a different deductible).",
      "Request one or two quotes from licensed agents or insurers for comparable coverage.",
      "Compare coverage limits, deductibles, exclusions, and the insurer's financial strength — not just price.",
      "Do not let coverage lapse. Many mortgages require continuous homeowners insurance.",
    ],
    whoCanHelp: "Licensed insurance agents; the California Department of Insurance consumer hotline for general questions.",
    rule: increase ? "Included because the premium increased." : "Included as a routine annual review.",
  };

  const plan: ActionItem = {
    id: "update-plan",
    title: "Update your monthly plan",
    why: increase
      ? `Setting aside about ${delta}/month starting ${when} keeps the larger bill from arriving as a surprise. Your estimated cushion would be ${formatUSD(impact.afterCashBufferMonthly)}/month.`
      : `Your estimated cushion would be ${formatUSD(impact.afterCashBufferMonthly)}/month.`,
    how: [
      increase
        ? `If possible, move ${delta} each month into a separate savings bucket for insurance.`
        : "Keep your current insurance savings amount.",
      "Review your listed essential expenses for anything that changed recently.",
      budget.emergencySavings > 0
        ? `Decide how much of your ${formatUSD(budget.emergencySavings)} emergency savings you want to keep untouched for true emergencies.`
        : "If you have no emergency savings, a counselor can help you think about a starting goal.",
    ],
    whoCanHelp: "You, with a housing or financial counselor if helpful.",
    rule: "Included whenever monthly housing costs change.",
  };

  const counselor: ActionItem = {
    id: "talk-to-counselor",
    title: "Talk to a housing counselor early",
    why:
      level === "none"
        ? "Your listed essential expenses would exceed your take-home pay. Reaching out before a payment is missed keeps more options open."
        : level === "thin"
          ? "Your monthly cushion is getting thin. A counselor can review your full budget with you and help identify available options."
          : "If your budget starts to feel tight, a counselor can review it with you. Asking early is normal and encouraged.",
    how: [
      "Share this summary with your Habitat homeowner services contact or a HUD-approved housing counselor.",
      "Bring the renewal notice and your most recent mortgage statement.",
      "Mention any other recent changes in income or expenses.",
    ],
    whoCanHelp: "Habitat for Humanity homeowner services staff or a HUD-approved housing counseling agency.",
    rule:
      level === "none"
        ? `Moved up to second because the estimated cushion after the change is ${formatUSD(impact.afterCashBufferMonthly)}/month.`
        : level === "thin"
          ? `Included because the estimated cushion after the change (${formatUSD(impact.afterCashBufferMonthly)}/month) is under $300.`
          : "Included as an option; the estimated cushion remains at or above $300/month.",
  };

  // Ranking: confirmation is always first. When listed essentials would exceed
  // take-home pay, the counselor moves to second. Otherwise the order is
  // confirm → compare → plan → counselor.
  if (level === "none") return [confirm, counselor, plan, compare];
  return [confirm, compare, plan, counselor];
}
