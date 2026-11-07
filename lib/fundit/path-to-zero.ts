/**
 * "What would it take to reach $0?" Pure, deterministic.
 *
 * 1. Single changes: for each lever alone, the value that brings the gap to $0.
 * 2. Stack: land choice + candidate programs (if they come through) + an optional
 *    below-market loan held by the nonprofit or a partner. The loan rate is an
 *    ASSUMPTION; whether such a loan is available, and on what terms, is Unknown.
 *    Nothing in the stack is committed. It shows a path to check, not a plan.
 */

import { FUNDING_SOURCES, type CatalogTotals } from "./catalog";
import { incomeCategory, INCOME_CATEGORY_LABEL } from "./income-limits";
import { formatUSDWhole } from "@/lib/format";
import { computeProject, gapOf, rateFor, type LandMode, type PencilInputs } from "./project";

const EPS = 0.005;

/**
 * Bisection for a monotone gap. `closes(v)` is true where the gap is <= 0.
 * `closingAtLo` says which end closes. Returns a value on the closing side.
 */
function threshold(closes: (v: number) => boolean, lo: number, hi: number, closingAtLo: boolean, iters = 200): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < iters; i++) {
    const m = (a + b) / 2;
    if (closes(m) === closingAtLo) a = m;
    else b = m;
  }
  return closingAtLo ? a : b;
}

export type SingleChange =
  | { id: "rate"; value: number | null; note: string }
  | { id: "buyerAssistance"; value: number | null; note: string }
  | { id: "devCost"; value: number | null; note: string }
  | { id: "grants"; value: number; note: string }
  | { id: "income"; value: number | null; pctOfAmi: number | null; category: string | null; changesWhoIsServed: boolean; note: string };

export type SingleChanges = {
  baseGap: number;
  alreadyZero: boolean;
  rate: Extract<SingleChange, { id: "rate" }>;
  buyerAssistance: Extract<SingleChange, { id: "buyerAssistance" }>;
  devCost: Extract<SingleChange, { id: "devCost" }>;
  grants: Extract<SingleChange, { id: "grants" }>;
  income: Extract<SingleChange, { id: "income" }>;
};

/** For each lever alone, the value that brings the gap to $0 (null = no value of that lever works). */
export function singleChanges(x: PencilInputs): SingleChanges {
  const base = computeProject(x);
  const g = base.gap;
  const alreadyZero = g <= EPS;

  // Rate: gap rises with rate. Search [0, current].
  const current = rateFor(x);
  const gapAtRate = (r: number) => gapOf({ ...x, rateMode: "custom", customRate: r });
  let rateValue: number | null;
  if (alreadyZero) rateValue = current;
  else if (gapAtRate(0) > 0) rateValue = null;
  else rateValue = threshold((r) => gapAtRate(r) <= 0, 0, current, true);

  // Deferred buyer assistance per home: raises the price 1:1 when the budget covers the reserve.
  const perHome = x.homes > 0 ? Math.max(0, g) / x.homes : 0;
  const assistOk = base.price.pencilsAtBudget || alreadyZero;
  const assistValue = assistOk ? x.committedBuyerAssistancePerHome + perHome : null;

  // Development budget: gap falls 1:1.
  const devValue = x.devCost - Math.max(0, g);

  // Household income: search upward. The 50052.5 category (and its cap) follows the income.
  const gapAtIncome = (inc: number) => gapOf({ ...x, grossIncome: inc });
  let incomeValue: number | null = null;
  if (alreadyZero) incomeValue = x.grossIncome;
  else {
    const hi = Math.max(x.grossIncome * 10, 2_000_000);
    if (gapAtIncome(hi) <= 0) incomeValue = threshold((v) => gapAtIncome(v) <= 0, x.grossIncome, hi, false);
  }
  const before = incomeCategory(x.grossIncome, x.persons);
  const after = incomeValue !== null ? incomeCategory(incomeValue, x.persons) : null;

  return {
    baseGap: g,
    alreadyZero,
    rate: {
      id: "rate",
      value: rateValue,
      note:
        rateValue === null
          ? "Even a 0% loan does not close it."
          : "Only with a below-market loan held by the nonprofit or a partner. Availability: Unknown.",
    },
    buyerAssistance: {
      id: "buyerAssistance",
      value: assistValue,
      note: assistValue === null ? "The monthly budget does not cover the recurring costs." : "Deferred (silent) assistance per buyer, in total.",
    },
    devCost: {
      id: "devCost",
      value: devValue > 0 ? devValue : null,
      note: devValue > 0 ? "Total development budget for all homes." : "No development budget works at this land price.",
    },
    grants: { id: "grants", value: Math.max(0, g), note: "Project grants or gifts, in total." },
    income: {
      id: "income",
      value: incomeValue,
      pctOfAmi: after?.pctOfAmi ?? null,
      category: after ? INCOME_CATEGORY_LABEL[after.category] : null,
      changesWhoIsServed: Boolean(before && after && before.category !== after.category),
      note: "Household gross income per year. A higher income changes who the homes serve.",
    },
  };
}

/** ASSUMPTION: illustrative rate for a loan held by the nonprofit or a partner. Not a published Habitat OC term. */
export const DEFAULT_NONPROFIT_RATE = 3;

export type StackChoice = {
  land: LandMode;
  /** Candidate program ids to include "if they come through". */
  programs: Record<string, boolean>;
  nonprofitLoan: boolean;
  nonprofitRate: number;
};

export function defaultStack(): StackChoice {
  return {
    land: "donated",
    programs: Object.fromEntries(FUNDING_SOURCES.filter((s) => s.amountMax !== null && s.includeInCandidateTotal).map((s) => [s.id, true])),
    nonprofitLoan: true,
    nonprofitRate: DEFAULT_NONPROFIT_RATE,
  };
}

export type StackStep = { label: string; delta: number; kind: "land" | "program" | "loan"; perHome?: number };

export type StackResult = {
  startGap: number;
  steps: StackStep[];
  remaining: number;
  remainingPerHome: number;
  closes: boolean;
  /** Programs included and applicable in this city. */
  programsUsed: { id: string; name: string; perHome: number }[];
  /** Programs selected but excluded (not in area, marked not eligible, already committed). */
  programsSkipped: { id: string; name: string; reason: string }[];
  /** First-mortgage capital for all homes: who funds it depends on the loan choice. */
  loanCapital: number;
  loanCapitalMarket: number;
  inputs: PencilInputs;
  cautions: string[];
};

/** Apply the stack on top of the current (committed-only) inputs. Order: land, programs, loan. Steps are additive. */
export function evaluateStack(x: PencilInputs, totals: CatalogTotals, s: StackChoice): StackResult {
  const start = { ...x };
  const startGap = gapOf(start);
  const steps: StackStep[] = [];

  const withLand: PencilInputs = { ...start, landMode: s.land };
  if (s.land !== x.landMode) {
    const d = gapOf(withLand) - startGap;
    steps.push({ label: s.land === "donated" ? "Land donated" : s.land === "asking" ? "Land at asking price" : "Land at custom price", delta: d, kind: "land" });
  }

  let cur = withLand;
  const programsUsed: StackResult["programsUsed"] = [];
  const programsSkipped: StackResult["programsSkipped"] = [];
  for (const ev of totals.evaluations) {
    if (!s.programs[ev.source.id]) continue;
    if (ev.candidate <= 0) {
      programsSkipped.push({ id: ev.source.id, name: ev.source.name, reason: ev.counted > 0 ? "Already committed and counted." : ev.reason });
      continue;
    }
    const next: PencilInputs =
      ev.source.recipient === "buyer"
        ? { ...cur, committedBuyerAssistancePerHome: cur.committedBuyerAssistancePerHome + ev.candidate }
        : { ...cur, committedProjectSources: cur.committedProjectSources + ev.candidate };
    const d = gapOf(next) - gapOf(cur);
    steps.push({
      label: `${ev.source.name}, if it comes through${ev.source.recipient === "buyer" ? " for each buyer" : ""}`,
      delta: d,
      kind: "program",
      perHome: ev.source.recipient === "buyer" ? ev.candidate : undefined,
    });
    programsUsed.push({ id: ev.source.id, name: ev.source.name, perHome: ev.source.recipient === "buyer" ? ev.candidate : 0 });
    cur = next;
  }

  const loanCapitalMarket = x.homes * computeProject(cur).price.mortgage;
  if (s.nonprofitLoan) {
    const next: PencilInputs = { ...cur, rateMode: "custom", customRate: s.nonprofitRate };
    steps.push({ label: `${s.nonprofitRate.toFixed(2)}% loan held by the nonprofit or a partner (ASSUMPTION)`, delta: gapOf(next) - gapOf(cur), kind: "loan" });
    cur = next;
  }
  const final = computeProject(cur);
  const cautions: string[] = [];
  if (programsUsed.length > 0) cautions.push("Programs are candidates, not commitments. Each counts only after it is committed with an amount.");
  if (s.nonprofitLoan) {
    cautions.push(
      `Whether the nonprofit or a partner can offer a ${s.nonprofitRate.toFixed(2)}% first mortgage is Unknown. Someone must fund ${formatUSDWhole(final.price.mortgage * x.homes)} of first mortgages, repaid monthly over ${x.years} years, instead of a bank lender.`,
    );
    if (programsUsed.length > 0) cautions.push("Whether these programs allow a nonprofit-held first mortgage is Unknown (MAP lists participating lenders; WISH works through member banks).");
  }
  return {
    startGap,
    steps,
    remaining: final.gap,
    remainingPerHome: final.gapPerHome,
    closes: final.gap <= EPS,
    programsUsed,
    programsSkipped,
    loanCapital: x.homes * final.price.mortgage,
    loanCapitalMarket,
    inputs: cur,
    cautions,
  };
}

/** One sentence for the decision card. */
export function stackSentence(r: StackResult, s: StackChoice, fmt: (n: number) => string): string {
  const parts: string[] = [];
  parts.push(s.land === "donated" ? "Donated land" : s.land === "asking" ? "Land at asking price" : "Land at the custom price");
  for (const p of r.programsUsed) parts.push(p.perHome > 0 ? `${p.name.split(" (")[0]} for each buyer (if it comes through)` : `${p.name} (if it comes through)`);
  if (s.nonprofitLoan) parts.push(`a ${s.nonprofitRate.toFixed(2)}% nonprofit-held loan (ASSUMPTION)`);
  const lead = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]!;
  return r.closes
    ? `What would it take: ${lead} would close the gap, with ${fmt(-r.remaining)} to spare.`
    : `What would it take: ${lead} would leave ${fmt(r.remaining)} (${fmt(r.remainingPerHome)} per home) to raise.`;
}
