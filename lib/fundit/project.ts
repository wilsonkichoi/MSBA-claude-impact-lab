/**
 * §5.3 project gap, levers, and the §5.5 "verify first" ranking.
 * Pure, deterministic. Every default marked ASSUMPTION is shown as such in the UI.
 */

import {
  amiForUnit,
  householdBudgetMonthly,
  paymentFactor,
  programCapMonthly,
  solvePrice,
  usedBudgetMonthly,
  type CapCategory,
  type PriceResult,
} from "./affordability";
import { incomeCategory, type IncomeCategory, type IncomePlacement } from "./income-limits";
import { SAN_CLEMENTE } from "./property";
import { LATEST_PMMS, pmmsRate, RATE_STEP_ASSUMPTION } from "./rates";

export type LandMode = "asking" | "custom" | "donated";
export type RateMode = "pmms" | "custom";
export type GiftLine = "development" | "land";

export type PencilInputs = {
  /** ASSUMPTION (listing claim of 4 parcels). */
  homes: number;
  /** ASSUMPTION: 3-bedroom homes → 4 persons under 50052.5(h). */
  bedrooms: number;
  askingPrice: number;
  landMode: LandMode;
  customLandPrice: number;
  /** ASSUMPTION: total development budget, no site-specific bids. */
  devCost: number;
  /** Fictional household. */
  persons: number;
  grossIncome: number;
  /** ASSUMPTION: 30% of gross income. */
  budgetShare: number;
  /** Apply the 50052.5 cap (only if the project's assistance requires it, which is Unknown). */
  applyCap: boolean;
  /** "auto" places the household in the §3.1 rows. */
  capCategory: CapCategory | "auto";
  /** ASSUMPTION: recurring non-P&I costs per home, $/mo. */
  reserveMonthly: number;
  /** Lever: extra homeowners insurance per home, $/mo (HomeStay bridge). */
  insuranceExtraMonthly: number;
  /** ASSUMPTION: buyer cash per home. */
  buyerCash: number;
  rateMode: RateMode;
  pmmsWeek: string;
  /** Custom rate, labeled "not published". */
  customRate: number;
  years: number;
  /** Lever: donor gift (counts as a committed project source). */
  donorGift: number;
  giftLine: GiftLine;
  /** Sum of project-side sources marked Committed with an amount (from the catalog). */
  committedProjectSources: number;
  /** Committed project sources the user says arrive by land closing. */
  committedByLandClose: number;
  /** Committed, geographically applicable buyer-side assistance per home (D). */
  committedBuyerAssistancePerHome: number;
  /** Used only by the sensitivity ranking: shifts the used budget. */
  budgetAdjustMonthly: number;
};

export const DEFAULT_INPUTS: Readonly<PencilInputs> = Object.freeze({
  homes: SAN_CLEMENTE.homesModeled,
  bedrooms: 3,
  askingPrice: SAN_CLEMENTE.askingPrice,
  landMode: "asking",
  customLandPrice: 1_000_000,
  devCost: 2_000_000,
  persons: 4,
  grossIncome: 100_000,
  budgetShare: 0.3,
  applyCap: true,
  capCategory: "auto",
  reserveMonthly: 700,
  insuranceExtraMonthly: 0,
  buyerCash: 10_000,
  rateMode: "pmms",
  pmmsWeek: LATEST_PMMS.week,
  customRate: LATEST_PMMS.rate30,
  years: 30,
  donorGift: 0,
  giftLine: "development",
  committedProjectSources: 0,
  committedByLandClose: 0,
  committedBuyerAssistancePerHome: 0,
  budgetAdjustMonthly: 0,
});

/** The insurance lever step: the HomeStay sample renewal ($1,800 → $3,600/yr = +$150/mo). */
export const INSURANCE_LEVER_MONTHLY = 150;

export function capCategoryFor(cat: IncomeCategory): CapCategory | null {
  switch (cat) {
    case "acutelyLow":
    case "extremelyLow":
      return "extremelyLow";
    case "veryLow":
      return "veryLow";
    case "lower":
      return "lower";
    case "moderate":
      return "moderate";
    case "aboveModerate":
      return null;
  }
}

export function landPrice(x: PencilInputs): number {
  return x.landMode === "asking" ? x.askingPrice : x.landMode === "custom" ? x.customLandPrice : 0;
}

export function rateFor(x: PencilInputs): number {
  if (x.rateMode === "custom") return x.customRate;
  return pmmsRate(x.pmmsWeek) ?? LATEST_PMMS.rate30;
}

export type ProjectResult = {
  placement: IncomePlacement | null;
  ami: number | null;
  capCategory: CapCategory | null;
  capMonthly: number | null;
  householdBudget: number;
  usedBudget: number;
  capBinds: boolean;
  reserveTotal: number;
  ratePct: number;
  paymentFactor: number;
  price: PriceResult;
  proceeds: number;
  land: number;
  devCost: number;
  committedProject: number;
  gap: number;
  gapPerHome: number;
  /** proceeds + committed project sources − development cost. < 0 means no land price works. */
  maxLandSupported: number;
  landPerHome: number;
  cashAtLandClose: number;
};

export function computeProject(x: PencilInputs): ProjectResult {
  const placement = incomeCategory(x.grossIncome, x.persons);
  const ami = amiForUnit(x.bedrooms);
  const capCategory = x.capCategory === "auto" ? (placement ? capCategoryFor(placement.category) : null) : x.capCategory;
  const capMonthly = ami !== null && capCategory !== null ? programCapMonthly(capCategory, ami) : null;
  const householdBudget = householdBudgetMonthly(x.grossIncome, x.budgetShare);
  const used = usedBudgetMonthly(householdBudget, capMonthly, x.applyCap);
  const usedBudget = used + x.budgetAdjustMonthly;
  const reserveTotal = x.reserveMonthly + x.insuranceExtraMonthly;
  const ratePct = rateFor(x);
  const price = solvePrice({
    budgetMonthly: usedBudget,
    reserveMonthly: reserveTotal,
    buyerCash: x.buyerCash,
    deferredAssistance: x.committedBuyerAssistancePerHome,
    ratePct,
    years: x.years,
  });
  const proceeds = x.homes * price.price;
  const land = landPrice(x);
  const committedProject = x.committedProjectSources + x.donorGift;
  const gap = land + x.devCost - proceeds - committedProject;
  return {
    placement,
    ami,
    capCategory,
    capMonthly,
    householdBudget,
    usedBudget,
    capBinds: x.applyCap && capMonthly !== null && capMonthly < householdBudget,
    reserveTotal,
    ratePct,
    paymentFactor: paymentFactor(ratePct, x.years),
    price,
    proceeds,
    land,
    devCost: x.devCost,
    committedProject,
    gap,
    gapPerHome: x.homes > 0 ? gap / x.homes : gap,
    maxLandSupported: proceeds + committedProject - x.devCost,
    landPerHome: x.homes > 0 ? land / x.homes : land,
    cashAtLandClose: Math.max(0, land - x.committedByLandClose),
  };
}

export function gapOf(x: PencilInputs): number {
  return computeProject(x).gap;
}

export type Delta = { project: number; perHome: number };

function delta(base: PencilInputs, changed: PencilInputs): Delta {
  const d = gapOf(changed) - gapOf(base);
  return { project: d, perHome: base.homes > 0 ? d / base.homes : d };
}

export type Levers = {
  /** Gap change from asking price to donated land (negative = gap shrinks). */
  landAskingToDonated: Delta;
  /** Gap change from the +0.50 point ASSUMPTION over the current rate. */
  ratePlusStep: Delta;
  /** Gap change from the donor gift currently entered (negative). */
  gift: Delta;
  /** Gap change from +$150/mo insurance per home, regardless of the toggle. */
  insurance: Delta;
  /** Gap change from removing the 50052.5 cap (negative when the cap binds). */
  capOff: Delta;
};

export function levers(x: PencilInputs): Levers {
  const asking = { ...x, landMode: "asking" as const };
  const rate = rateFor(x);
  const noIns = { ...x, insuranceExtraMonthly: 0 };
  const noGift = { ...x, donorGift: 0 };
  return {
    landAskingToDonated: delta(asking, { ...x, landMode: "donated" }),
    ratePlusStep: delta(x, { ...x, rateMode: "custom", customRate: rate + RATE_STEP_ASSUMPTION }),
    gift: delta(noGift, x),
    insurance: delta(noIns, { ...noIns, insuranceExtraMonthly: INSURANCE_LEVER_MONTHLY }),
    capOff: delta({ ...x, applyCap: true }, { ...x, applyCap: false }),
  };
}

/** Gap change between two PMMS weeks (M02: "rates went up"). */
export function rateWeekDelta(x: PencilInputs, fromWeek: string, toWeek: string): Delta {
  return delta({ ...x, rateMode: "pmms", pmmsWeek: fromWeek }, { ...x, rateMode: "pmms", pmmsWeek: toWeek });
}

export type SensitivityId = "devCost" | "reserve" | "budget" | "rate" | "buyerCash";

export type SensitivityRow = {
  id: SensitivityId;
  label: string;
  /** ASSUMPTION: the step size, in words. */
  step: string;
  delta: number;
  /** Plain-language "verify first" sentence. */
  sentence: string;
};

/** §5.5 step sizes. Each is an ASSUMPTION shown in the UI. Land is excluded: it is an explicit lever. */
export const SENSITIVITY_STEPS = Object.freeze({
  devCostPct: 0.1,
  reserveMonthly: 100,
  budgetMonthly: -100,
  ratePoints: RATE_STEP_ASSUMPTION,
  buyerCash: -5000,
});

export function sensitivityRanking(x: PencilInputs, fmt: (n: number) => string = (n) => n.toFixed(2)): SensitivityRow[] {
  const base = gapOf(x);
  const s = SENSITIVITY_STEPS;
  const rows: Omit<SensitivityRow, "sentence">[] = [
    { id: "devCost", label: "Development budget", step: "+10%", delta: gapOf({ ...x, devCost: x.devCost * (1 + s.devCostPct) }) - base },
    {
      id: "reserve",
      label: "Recurring cost reserve",
      step: "+$100/mo per home",
      delta: gapOf({ ...x, reserveMonthly: x.reserveMonthly + s.reserveMonthly }) - base,
    },
    {
      id: "budget",
      label: "What families can pay (monthly budget)",
      step: "−$100/mo per home",
      delta: gapOf({ ...x, budgetAdjustMonthly: x.budgetAdjustMonthly + s.budgetMonthly }) - base,
    },
    {
      id: "rate",
      label: "Mortgage rate",
      step: "+0.50 point",
      delta: gapOf({ ...x, rateMode: "custom", customRate: rateFor(x) + s.ratePoints }) - base,
    },
    { id: "buyerCash", label: "Buyer cash", step: "−$5,000 per home", delta: gapOf({ ...x, buyerCash: x.buyerCash + s.buyerCash }) - base },
  ];
  // Stable sort keeps the listed order for ties.
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => Math.abs(b.r.delta) - Math.abs(a.r.delta) || a.i - b.i)
    .map(({ r }) => ({ ...r, sentence: sentenceFor(r, x, fmt) }));
}

function sentenceFor(r: Omit<SensitivityRow, "sentence">, x: PencilInputs, fmt: (n: number) => string): string {
  const moves = `moves the gap by ${fmt(Math.abs(r.delta))}`;
  switch (r.id) {
    case "devCost":
      return `the ${fmt(x.devCost)} development budget. A 10% miss ${moves}.`;
    case "reserve":
      return `the ${fmt(x.reserveMonthly)}/month recurring cost reserve. $100 more per home per month ${moves}.`;
    case "budget":
      return `what families can pay each month. $100 less per home ${moves}.`;
    case "rate":
      return `the mortgage rate. Half a point higher ${moves}.`;
    case "buyerCash":
      return `the ${fmt(x.buyerCash)} buyer cash per home. $5,000 less per home ${moves}.`;
  }
}

export type DecisionSignal = {
  pencilsAtLand: boolean;
  headline: string;
  /** Why: land and building cost per home vs what a family can pay. */
  perHomeLine: string;
  freeLandLine: string;
  freeLandGap: number;
  freeLandGapPerHome: number;
  verifyFirst: string;
  nextChecks: string[];
};

export function decisionSignal(x: PencilInputs, fmt: (n: number) => string): DecisionSignal {
  const r = computeProject(x);
  const free = computeProject({ ...x, landMode: "donated" });
  const where =
    x.landMode === "asking"
      ? `At the ${fmt(x.askingPrice)} asking price`
      : x.landMode === "custom"
        ? `At a land price of ${fmt(x.customLandPrice)}`
        : "With donated land";
  const homes = `${x.homes} home${x.homes === 1 ? "" : "s"}`;
  const site = `${SAN_CLEMENTE.address} (a ${SAN_CLEMENTE.lotAcres}-acre lot)`;
  const pencilsAtLand = r.gap <= 0;
  const headline = pencilsAtLand
    ? `${where}, building ${homes} on ${site} pencils, with ${fmt(-r.gap)} to spare.`
    : `${where}, building ${homes} on ${site} does not pencil.`;
  const pct = r.placement ? `${(r.placement.pctOfAmi * 100).toFixed(1)}% of AMI` : "this income";
  const perHomeLine = `Land is ${fmt(r.landPerHome)} per home and building is ${fmt(x.homes > 0 ? x.devCost / x.homes : x.devCost)} per home (ASSUMPTION). A family at ${pct} can pay about ${fmt(r.price.price)} per home.`;
  const freeLandLine =
    free.gap > 0
      ? `Even with donated land, the project still needs ${fmt(free.gap)} (${fmt(free.gapPerHome)} per home).`
      : `With donated land the project has ${fmt(-free.gap)} to spare, so it can support a land price of up to ${fmt(free.maxLandSupported)}.`;
  const top = sensitivityRanking(x, fmt)[0]!;
  return {
    pencilsAtLand,
    headline,
    perHomeLine,
    freeLandLine,
    freeLandGap: free.gap,
    freeLandGapPerHome: free.gapPerHome,
    verifyFirst: `Verify first: ${top.sentence}`,
    nextChecks: [
      "Are 4 ownership parcels still approvable? Ask the City of San Clemente.",
      "Does the development budget survive a preliminary estimate?",
    ],
  };
}
