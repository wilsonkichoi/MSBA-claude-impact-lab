/**
 * Finance page (/): close the gap between a Find it home and a buyer's monthly budget
 * by stacking down-payment assistance programs.
 *
 * Pure functions, full precision. Rounding happens only in lib/format.ts.
 * Reuses Find it's cost assumptions and the Pencil funding-source catalog, so the
 * three pages agree on every number and every program fact.
 *
 * Model (ASSUMPTIONS, shown on the page):
 * - Every program amount lowers the first mortgage dollar for dollar.
 * - Grants are not repaid; deferred loans have no monthly payment and are repaid later.
 * - Mortgage insurance applies while the first mortgage is above 80% of the price.
 */

import { OPPORTUNITIES, type BuyerOpportunity } from "@/lib/findit/data";
import { DEFAULT_ASSUMPTIONS, PMI_THRESHOLD, type FinanceAssumptions } from "@/lib/findit/finance";
import { FUNDING_SOURCES, geographyCheck, type FundingSource } from "@/lib/fundit/catalog";
import { paymentFactor } from "@/lib/fundit/affordability";
import { STATE_2026_OC, incomeCategory, type IncomePlacement } from "@/lib/fundit/income-limits";

export type Household = {
  annualIncome: number;
  cash: number;
  budgetMonthly: number;
  persons: number;
};

export const SAMPLE_HOUSEHOLD: Readonly<Household> = Object.freeze({
  annualIncome: 100_000,
  cash: 25_000,
  budgetMonthly: 2_500,
  persons: 2,
});

export const BUYER_HOMES: readonly BuyerOpportunity[] = OPPORTUNITIES.filter((o): o is BuyerOpportunity => o.layer === "buyer");

export const DEFAULT_HOME_ID = "vista-pacifica-420";

export function buyerHome(id: string | null | undefined): BuyerOpportunity {
  return BUYER_HOMES.find((h) => h.id === id) ?? BUYER_HOMES.find((h) => h.id === DEFAULT_HOME_ID)!;
}

// ───────────────────────── monthly cost with assistance ─────────────────────────

export type PlanCost = {
  price: number;
  down: number;
  closing: number;
  cashAtClose: number;
  shortOfReserve: number;
  /** Assistance actually applied (never more than the first mortgage before help). */
  assistance: number;
  firstMortgage: number;
  principalInterest: number;
  tax: number;
  insurance: number;
  hoa: number;
  assessment: number;
  pmi: number;
  monthly: number;
};

function fixedMonthly(price: number, hoa: number, assessment: number, a: FinanceAssumptions) {
  return { tax: (price * a.taxRate) / 12, insurance: a.insuranceMonthly, hoa, assessment };
}

export function costWithAssistance(
  price: number,
  hoa: number,
  assessment: number,
  assistance: number,
  cash: number,
  a: FinanceAssumptions,
): PlanCost {
  const f = paymentFactor(a.ratePct, a.years);
  const down = price * a.downPct;
  const closing = price * a.closingPct;
  const beforeHelp = Math.max(0, price - down);
  const applied = Math.min(Math.max(0, assistance), beforeHelp);
  const firstMortgage = beforeHelp - applied;
  const principalInterest = firstMortgage * f;
  const fx = fixedMonthly(price, hoa, assessment, a);
  const pmi = firstMortgage > (1 - PMI_THRESHOLD) * price ? (firstMortgage * a.pmiRate) / 12 : 0;
  const cashAtClose = down + closing;
  return {
    price,
    down,
    closing,
    cashAtClose,
    shortOfReserve: Math.max(0, a.reserve + cashAtClose - cash),
    assistance: applied,
    firstMortgage,
    principalInterest,
    ...fx,
    pmi,
    monthly: principalInterest + fx.tax + fx.insurance + fx.hoa + fx.assessment + pmi,
  };
}

/**
 * Assistance needed to bring the monthly estimate down to the budget.
 * null when tax, insurance, HOA and assessments alone are over budget
 * (down-payment help can't close that).
 */
export function assistanceNeeded(price: number, hoa: number, assessment: number, budget: number, a: FinanceAssumptions): number | null {
  const f = paymentFactor(a.ratePct, a.years);
  const fx = fixedMonthly(price, hoa, assessment, a);
  const room = budget - fx.tax - fx.insurance - fx.hoa - fx.assessment;
  const beforeHelp = Math.max(0, price - price * a.downPct);
  if (room < 0) return null;
  const pmiLine = (1 - PMI_THRESHOLD) * price;
  const noPmi = room / f;
  let target: number;
  if (noPmi <= pmiLine) {
    target = noPmi;
  } else {
    const withPmi = room / (f + a.pmiRate / 12);
    target = withPmi > pmiLine ? withPmi : pmiLine;
  }
  return Math.max(0, beforeHelp - target);
}

// ───────────────────────── programs ─────────────────────────

export type ProgramKind = "Grant" | "Deferred loan" | "Shared-appreciation loan" | "Loan";

export type Availability = "available" | "verify-amount" | "assumed-amount" | "conditional" | "not-here" | "over-income";

export type ProgramOption = {
  id: string;
  source: FundingSource;
  kind: ProgramKind;
  /** True for loans the buyer repays later (no monthly payment). */
  repaid: boolean;
  availability: Availability;
  availabilityLabel: string;
  /** Estimated amount for this buyer and price. 0 when the program can't count here. */
  amount: number;
  amountNote: string;
  /** Plain-language "why it may apply" / "why it doesn't". */
  why: string[];
  /** Included in the plan when the page first loads. */
  defaultOn: boolean;
};

const KIND: Record<string, ProgramKind> = {
  "fhlbsf-wish": "Grant",
  "oc-map": "Deferred loan",
  "calhfa-myhome": "Deferred loan",
  "calhfa-dream-for-all": "Shared-appreciation loan",
  "santa-ana-my-first-home": "Loan",
};

/** Buyer programs from the catalog, in the order the page shows them. */
const ORDER = ["fhlbsf-wish", "oc-map", "calhfa-myhome", "calhfa-dream-for-all", "santa-ana-my-first-home"];

export const WISH_MATCH = 4;
export const WISH_MAX = 32_837;
export const MAP_LOW_MAX = 120_000;
export const MAP_MODERATE_MAX = 80_000;
/** ASSUMPTION: MyHome amount; the event lane notes say up to 3% of price for conventional loans (not confirmed). */
export const MYHOME_PCT_ASSUMPTION = 0.03;
export const DREAM_PCT = 0.2;
export const DREAM_MAX = 150_000;

export function lowIncomeLimit(persons: number): number | null {
  if (!Number.isInteger(persons) || persons < 1 || persons > 8) return null;
  return STATE_2026_OC.rows.low[persons - 1] ?? null;
}

export function moderateIncomeLimit(persons: number): number | null {
  if (!Number.isInteger(persons) || persons < 1 || persons > 8) return null;
  return STATE_2026_OC.rows.moderate[persons - 1] ?? null;
}

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Program options for a home at a given price (amounts for WISH, MyHome and Dream For All depend on price). */
export function programOptions(home: BuyerOpportunity, price: number, h: Household, a: FinanceAssumptions): ProgramOption[] {
  const low = lowIncomeLimit(h.persons);
  const moderate = moderateIncomeLimit(h.persons);
  const withinLow = low !== null && h.annualIncome <= low;
  const withinModerate = moderate !== null && h.annualIncome <= moderate;
  const ownFunds = price * (a.downPct + a.closingPct);
  const incomeLine =
    low !== null
      ? `Your income (${usd(h.annualIncome)}) is ${withinLow ? "at or under" : "over"} HCD's low-income limit of ${usd(low)} for ${h.persons} ${h.persons === 1 ? "person" : "people"}.`
      : "Household size outside 1–8: income limit Unknown.";

  return ORDER.map((id) => FUNDING_SOURCES.find((s) => s.id === id)!).map((s): ProgramOption => {
    const kind = KIND[s.id] ?? "Loan";
    const base = { id: s.id, source: s, kind, repaid: kind !== "Grant" };
    const geo = geographyCheck(s, home.city);
    if (geo.inArea === false) {
      return {
        ...base,
        availability: "not-here",
        availabilityLabel: `Not available in ${home.city}`,
        amount: 0,
        amountNote: s.amountText,
        why: [geo.text.replace(" Counts $0.", ""), "Counts $0 for this home."],
        defaultOn: false,
      };
    }
    switch (s.id) {
      case "fhlbsf-wish": {
        if (!withinLow) {
          return {
            ...base,
            availability: "over-income",
            availabilityLabel: "Income likely over the limit",
            amount: 0,
            amountNote: s.amountText,
            why: [incomeLine, "WISH is for buyers at or under 80% of area median income (HUD table, not read)."],
            defaultOn: false,
          };
        }
        const amount = Math.min(WISH_MAX, WISH_MATCH * ownFunds);
        return {
          ...base,
          availability: "available",
          availabilityLabel: "Open · through a member bank",
          amount,
          amountNote: `$${WISH_MATCH} for every $1 you put in, up to ${usd(WISH_MAX)}. Your ${usd(ownFunds)} down payment and closing costs (ASSUMPTION: they count as your contribution) → ${usd(amount)}.`,
          why: [incomeLine, "Program open; member banks can enroll through Mar 12, 2027.", geo.text],
          defaultOn: true,
        };
      }
      case "oc-map": {
        if (!withinModerate) {
          return {
            ...base,
            availability: "over-income",
            availabilityLabel: "Income likely over the limit",
            amount: 0,
            amountNote: s.amountText,
            why: [`${home.city} is in MAP's published areas.`, "MAP serves low (80% AMI) and moderate (120% AMI) income buyers."],
            defaultOn: false,
          };
        }
        const amount = withinLow ? MAP_LOW_MAX : MAP_MODERATE_MAX;
        return {
          ...base,
          availability: "verify-amount",
          availabilityLabel: "Available here · amount to verify",
          amount,
          amountNote: `Program page: up to ${usd(amount)} for ${withinLow ? "low" : "moderate"}-income buyers, 3% simple interest, deferred 30 years.`,
          why: [`${home.city} is in MAP's published eligible areas.`, incomeLine],
          defaultOn: true,
        };
      }
      case "calhfa-myhome": {
        const amount = price * MYHOME_PCT_ASSUMPTION;
        return {
          ...base,
          availability: "assumed-amount",
          availabilityLabel: "Statewide · amount not confirmed",
          amount,
          amountNote: `ASSUMPTION: ${Math.round(MYHOME_PCT_ASSUMPTION * 100)}% of price (${usd(amount)}). The MyHome page does not state an amount.`,
          why: ["Statewide CalHFA program for first-time, owner-occupant buyers.", "Uses CalHFA's own income limits (not checked here)."],
          defaultOn: false,
        };
      }
      case "calhfa-dream-for-all": {
        const amount = Math.min(DREAM_MAX, price * DREAM_PCT);
        return {
          ...base,
          availability: "conditional",
          availabilityLabel: "Only with a lottery voucher",
          amount,
          amountNote: `Up to ${Math.round(DREAM_PCT * 100)}% of price, max ${usd(DREAM_MAX)} → ${usd(amount)}. Repaid with a share of the home's appreciation.`,
          why: ["For first-generation buyers.", "Counts only if you hold a voucher from CalHFA's randomized drawing."],
          defaultOn: false,
        };
      }
      default:
        return {
          ...base,
          availability: "verify-amount",
          availabilityLabel: "Amount Unknown",
          amount: 0,
          amountNote: s.amountText,
          why: [geo.text],
          defaultOn: false,
        };
    }
  });
}

/** Programs that can count for this home (available, needs verification, or conditional). */
export function canCount(p: ProgramOption): boolean {
  return p.availability !== "not-here" && p.availability !== "over-income" && p.amount > 0;
}

export function defaultSelection(home: BuyerOpportunity, h: Household, a: FinanceAssumptions): string[] {
  const price = home.price ?? 0;
  return programOptions(home, price, h, a)
    .filter((p) => p.defaultOn && (home.price === null || canCount(p)))
    .map((p) => p.id);
}

function selectedTotal(options: ProgramOption[], selected: readonly string[]): number {
  return options.filter((p) => selected.includes(p.id) && canCount(p)).reduce((s, p) => s + p.amount, 0);
}

// ───────────────────────── the plan ─────────────────────────

export type Plan = {
  home: BuyerOpportunity;
  /** Price used for the gap; null when unpublished and none entered. */
  price: number | null;
  hoa: number;
  hoaIsScenario: boolean;
  assessment: number;
  assessmentIsScenario: boolean;
  placement: IncomePlacement | null;
  options: ProgramOption[];
  /** Price the program amounts were computed at (the entered price, or the fit price when unpriced). */
  amountsAt: number;
  /** Ids actually counted (selected and able to count). */
  counted: string[];
  /** Sum of counted program amounts (before the cap at the first mortgage). */
  selectedTotal: number;
  before: PlanCost | null;
  after: PlanCost | null;
  /** Assistance needed to reach the budget (null: fixed costs alone exceed it). */
  needed: number | null;
  /** Monthly over budget (≤ 0 means within budget). */
  gapBefore: number | null;
  gapAfter: number | null;
  /** Sum of selected deferred loans: repaid later, not monthly. */
  owedLater: number;
  /** Highest price that fits the budget with no help / with the selected programs. */
  fitWithout: number;
  fitWithPlan: number;
};

/** Highest price whose monthly estimate with the selected programs stays within budget and whose closing cash keeps the reserve. */
export function fitPriceWithPlan(
  home: BuyerOpportunity,
  h: Household,
  a: FinanceAssumptions,
  selected: readonly string[],
): number {
  const hoa = home.hoaMonthly ?? a.hoaScenario;
  const assessment = home.assessmentMonthly ?? a.assessmentScenario;
  const cashCap = (h.cash - a.reserve) / (a.downPct + a.closingPct);
  if (!(cashCap > 0)) return 0;
  const fits = (p: number) => {
    const s = selectedTotal(programOptions(home, p, h, a), selected);
    return costWithAssistance(p, hoa, assessment, s, h.cash, a).monthly <= h.budgetMonthly + 1e-9;
  };
  if (!fits(0)) return 0;
  // The monthly estimate rises with price in steps (PMI), so scan down from the cash cap in coarse
  // steps first, then bisect inside the first step that fits.
  const top = Math.min(cashCap, 5_000_000);
  if (fits(top)) return top;
  const step = 5_000;
  let hi = top;
  let lo = Math.max(0, top - step);
  while (lo > 0 && !fits(lo)) {
    hi = lo;
    lo = Math.max(0, lo - step);
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function buildPlan(
  home: BuyerOpportunity,
  price: number | null,
  h: Household,
  a: FinanceAssumptions,
  selected: readonly string[],
): Plan {
  const hoa = home.hoaMonthly ?? a.hoaScenario;
  const assessment = home.assessmentMonthly ?? a.assessmentScenario;
  const fitWithout = fitPriceWithPlan(home, h, a, []);
  const fitWithPlan = fitPriceWithPlan(home, h, a, selected);
  const priced = price !== null && price > 0;
  // Unpriced home: program amounts that depend on price are shown at the price the plan supports.
  const amountsAt = priced ? price : fitWithPlan;
  const options = programOptions(home, amountsAt, h, a);
  const counted = options.filter((p) => selected.includes(p.id) && canCount(p)).map((p) => p.id);
  const total = selectedTotal(options, selected);
  const base = {
    home,
    hoa,
    hoaIsScenario: home.hoaMonthly === null,
    assessment,
    assessmentIsScenario: home.assessmentMonthly === null,
    placement: incomeCategory(h.annualIncome, h.persons),
    options,
    amountsAt,
    counted,
    selectedTotal: total,
    owedLater: options.filter((p) => counted.includes(p.id) && p.repaid).reduce((s, p) => s + p.amount, 0),
    fitWithout,
    fitWithPlan,
  };
  if (!priced) {
    return { ...base, price: null, before: null, after: null, needed: null, gapBefore: null, gapAfter: null };
  }
  const before = costWithAssistance(price, hoa, assessment, 0, h.cash, a);
  const after = costWithAssistance(price, hoa, assessment, total, h.cash, a);
  return {
    ...base,
    price,
    before,
    after,
    needed: assistanceNeeded(price, hoa, assessment, h.budgetMonthly, a),
    gapBefore: before.monthly - h.budgetMonthly,
    gapAfter: after.monthly - h.budgetMonthly,
  };
}

// ───────────────────────── Find it → Finance link ─────────────────────────

const NUMERIC_ASSUMPTIONS = (Object.keys(DEFAULT_ASSUMPTIONS) as (keyof FinanceAssumptions)[]).filter(
  (k) => typeof DEFAULT_ASSUMPTIONS[k] === "number",
) as Exclude<keyof FinanceAssumptions, "pmmsWeek">[];

/** `/?home=…&income=…` carrying the buyer's inputs and any changed assumptions. Nothing leaves the browser. */
export function financeHref(homeId: string, h: Household, a: FinanceAssumptions): string {
  const q = new URLSearchParams({
    home: homeId,
    income: String(h.annualIncome),
    cash: String(h.cash),
    budget: String(h.budgetMonthly),
    persons: String(h.persons),
  });
  for (const k of NUMERIC_ASSUMPTIONS) {
    if (a[k] !== DEFAULT_ASSUMPTIONS[k]) q.set(k, String(a[k]));
  }
  if (a.pmmsWeek !== DEFAULT_ASSUMPTIONS.pmmsWeek) q.set("pmmsWeek", a.pmmsWeek);
  return `/?${q.toString()}`;
}

export type SearchParams = Record<string, string | string[] | undefined>;

function num(v: string | string[] | undefined, fallback: number, max: number, integer = false): number {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s.trim() === "") return fallback;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) return fallback;
  return n;
}

/** Validate URL params (a trust boundary): bad values fall back to the sample buyer and defaults. */
export function parseFinanceParams(sp: SearchParams): { homeId: string; household: Household; assumptions: FinanceAssumptions } {
  const homeRaw = Array.isArray(sp.home) ? sp.home[0] : sp.home;
  const household: Household = {
    annualIncome: num(sp.income, SAMPLE_HOUSEHOLD.annualIncome, 10_000_000),
    cash: num(sp.cash, SAMPLE_HOUSEHOLD.cash, 10_000_000),
    budgetMonthly: num(sp.budget, SAMPLE_HOUSEHOLD.budgetMonthly, 1_000_000),
    persons: Math.max(1, num(sp.persons, SAMPLE_HOUSEHOLD.persons, 8, true)),
  };
  const assumptions: FinanceAssumptions = { ...DEFAULT_ASSUMPTIONS };
  const limits: Partial<Record<keyof FinanceAssumptions, number>> = {
    ratePct: 30,
    years: 40,
    downPct: 1,
    closingPct: 1,
    reserve: 10_000_000,
    taxRate: 1,
    insuranceMonthly: 100_000,
    pmiRate: 1,
    hoaScenario: 100_000,
    assessmentScenario: 100_000,
  };
  for (const k of NUMERIC_ASSUMPTIONS) {
    assumptions[k] = num(sp[k], DEFAULT_ASSUMPTIONS[k], limits[k] ?? 1_000_000);
  }
  if (!(assumptions.years >= 1)) assumptions.years = DEFAULT_ASSUMPTIONS.years;
  const week = Array.isArray(sp.pmmsWeek) ? sp.pmmsWeek[0] : sp.pmmsWeek;
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) assumptions.pmmsWeek = week;
  return { homeId: buyerHome(homeRaw).id, household, assumptions };
}
