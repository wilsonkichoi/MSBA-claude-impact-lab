/**
 * FIND_IT.md §4: the buyer brief. Plain text the user copies; nothing is sent.
 */

import { formatLongDate, formatPercent, formatUSDWhole } from "@/lib/format";
import { destination, opportunity, type BuyerOpportunity } from "./data";
import { budgetShare, type FinanceAssumptions } from "./finance";
import { monthlyFor } from "./filters";
import { FIND_SOURCES, type FindSourceId } from "./sources";
import type { BuyerInputs } from "./state";

export const BRIEF_HEADER = "BUYER BRIEF · DRAFT · FICTIONAL SAMPLE · NOTHING HAS BEEN SENT";

/** Words the brief must never contain. */
export const BANNED_BRIEF = /you qualify|you are eligible|guaranteed|approved for|pre-?approved/i;

function unresolvedCosts(o: BuyerOpportunity, a: FinanceAssumptions): string[] {
  const out: string[] = [];
  if (o.price === null) out.push("price (unpublished)");
  if (o.hoaMonthly === null) out.push("HOA dues (unpublished)");
  if (o.assessmentMonthly === null) out.push("special assessments / Mello-Roos (unknown)");
  if (a.downPct < 0.2) out.push("mortgage insurance (depends on the lender)");
  return out;
}

export function buildBrief(savedIds: readonly string[], inputs: BuyerInputs, a: FinanceAssumptions): string {
  const homes = savedIds
    .map((id) => opportunity(id))
    .filter((o): o is BuyerOpportunity => !!o && o.layer === "buyer");
  const share = budgetShare(inputs.budgetMonthly, inputs.annualIncome);
  const dest = destination(inputs.destination);
  const lines: string[] = [BRIEF_HEADER, ""];
  lines.push(
    `Preferred monthly payment: ${formatUSDWhole(inputs.budgetMonthly)}${
      share === null ? " (add income to see the share)" : ` (${formatPercent(share)} of gross monthly income)`
    }. This is the buyer's choice; a lender decides approval separately.`,
  );
  lines.push(`Work destination: ${dest.name}. Commute mode: ${inputs.mode === "drive" ? "Drive" : "Transit"}.`);
  lines.push("");
  if (homes.length === 0) lines.push("Saved communities: none yet. Save up to two homes to compare.");
  const sourceIds = new Set<FindSourceId>();
  for (const o of homes) {
    const est = monthlyFor(o, inputs.cash, a);
    lines.push(`${o.name} (${o.city}) · ${o.status}`);
    lines.push(`  Monthly estimate: ${est ? `${formatUSDWhole(est.monthly)} (planning estimate with labeled assumptions)` : "Price unpublished"}`);
    lines.push(`  Unresolved costs: ${unresolvedCosts(o, a).join("; ") || "none listed"}`);
    lines.push("  Questions to ask:");
    o.questions.forEach((q, i) => lines.push(`    ${i + 1}. ${q}`));
    for (const c of o.contacts) lines.push(`  Contact: ${c.label}${c.phone ? `, ${c.phone}` : ""} · ${c.url}`);
    lines.push("");
    o.sourceIds.forEach((s) => sourceIds.add(s));
  }
  if (sourceIds.size) {
    lines.push("Sources (last checked):");
    for (const id of sourceIds) {
      const s = FIND_SOURCES[id];
      lines.push(`  - ${s.title}: ${s.url} (checked ${formatLongDate(s.checkedDate)})`);
    }
    lines.push("");
  }
  lines.push("Prototype. Not financial, legal or lending advice. The buyer decides whether to share this.");
  return lines.join("\n");
}
