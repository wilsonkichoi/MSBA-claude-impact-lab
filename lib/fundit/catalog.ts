/**
 * §3.9 funding-source catalog, same pattern as HomeStay's lib/assistance.ts.
 * Rules:
 * - The base gap counts only sources the finance lead marks Committed with an amount.
 * - A source whose published geography does not include the site's city counts $0,
 *   even if marked Committed.
 * - Buyer-side amounts are per home and raise the price a buyer can pay (D in §5.2).
 *   Project-side amounts reduce the gap directly.
 */

import { SOURCES, type SourceId } from "./sources";

export type Recipient = "project" | "buyer";
export type CatalogStatus = "open" | "verify" | "closed";

export type Geography =
  | { kind: "areas"; areas: readonly string[]; text: string }
  | { kind: "city"; city: string; text: string }
  | { kind: "region"; text: string }
  | { kind: "via-lender"; text: string };

export type FundingSource = {
  id: string;
  name: string;
  provider: string;
  recipient: Recipient;
  eligibleUse: string;
  geography: Geography;
  /** What the page says about the amount, paraphrased. */
  amountText: string;
  /** Only if stated. Per buyer for buyer sources; total for project sources. */
  amountMax: number | null;
  /** False when a stated maximum still depends on something we can't assume (e.g. a lottery voucher). */
  includeInCandidateTotal: boolean;
  timing: string;
  status: CatalogStatus;
  statusNote: string;
  officialUrl: string;
  sourceIds: readonly SourceId[];
  lastVerified: string;
  requirements: readonly string[];
  cautions: readonly string[];
  openQuestions: readonly string[];
  /** Sources that disagree. Shown side by side; never resolved silently. */
  conflicts: readonly string[];
};

export const OC_MAP_ELIGIBLE_AREAS = Object.freeze([
  "Brea",
  "Cypress",
  "Dana Point",
  "La Palma",
  "Laguna Beach",
  "Laguna Hills",
  "Laguna Woods",
  "Los Alamitos",
  "Placentia",
  "San Juan Capistrano",
  "Seal Beach",
  "Stanton",
  "Villa Park",
  "Yorba Linda",
  "Unincorporated Orange County",
]);

export const FUNDING_SOURCES: readonly FundingSource[] = Object.freeze([
  {
    id: "oc-map",
    name: "Mortgage Assistance Program (MAP)",
    provider: "OC Housing & Community Development",
    recipient: "buyer",
    eligibleUse: "Silent (deferred-payment) down-payment loan for first-time buyers.",
    geography: {
      kind: "areas",
      areas: OC_MAP_ELIGIBLE_AREAS,
      text: "Published eligible areas only. San Clemente and Irvine are not listed.",
    },
    amountText:
      "Program page: up to $120,000 for low-income (80% AMI) buyers; up to $80,000 for moderate (120% AMI). 3% simple interest, 30-year deferred.",
    amountMax: 120000,
    includeInCandidateTotal: true,
    timing: "At the buyer's purchase (down-payment loan). Application dates: Unknown.",
    status: "verify",
    statusNote: "Verify with the program administrator before counting.",
    officialUrl: SOURCES["oc-hcd-homeowner-programs"].url,
    sourceIds: ["oc-hcd-homeowner-programs", "oc-map-application-2026-08"],
    lastVerified: SOURCES["oc-hcd-homeowner-programs"].checkedDate,
    requirements: [
      "First-time buyer.",
      "1% minimum down payment.",
      "Total sales price ≤ 85% of the OC median sales price for all homes (the median value is not on the page: Unknown).",
      "Homebuyer education and counseling required.",
      "Participating lenders only.",
    ],
    cautions: ["A deferred loan the buyer repays later, not a grant."],
    openQuestions: [
      "Does the price per home fall under 85% of the OC median sales price? The median is Unknown.",
      "Is MAP funding available now, and which amount applies?",
    ],
    conflicts: [
      "Program page says up to $120,000 (low-income); a program document seen only in search results (application package dated Aug 3, 2026, and a County memo) says up to $80,000 and not more than 20% of purchase price. Verify with the program administrator before counting.",
    ],
  },
  {
    id: "fhlbsf-wish",
    name: "WISH (Workforce Initiative Subsidy for Homeownership)",
    provider: "FHLBank San Francisco",
    recipient: "buyer",
    eligibleUse: "Matching down-payment and closing-cost grant for first-time buyers, through a member bank.",
    geography: { kind: "via-lender", text: "Through participating member banks. Whether one serves this buyer: verify." },
    amountText: "4-to-1 matching grants up to $32,837 per buyer. The 2026 program has $13M.",
    amountMax: 32837,
    includeInCandidateTotal: true,
    timing: "Member banks can request to participate through Mar 12, 2027. Buyer must open escrow within a year of enrollment.",
    status: "open",
    statusNote: "Program open; per-buyer funds through a member bank: verify.",
    officialUrl: SOURCES["fhlbsf-wish"].url,
    sourceIds: ["fhlbsf-wish"],
    lastVerified: SOURCES["fhlbsf-wish"].checkedDate,
    requirements: [
      "First-time buyer.",
      "Income ≤ 80% of HUD AMI (the HUD table WISH uses was not read).",
      "Buyer contribution required (4-to-1 match).",
      "Homebuyer counseling.",
    ],
    cautions: ["Repayment rules apply during a retention period."],
    openQuestions: ["Which member bank would enroll these buyers, and does it have 2026 funds left?"],
    conflicts: [],
  },
  {
    id: "santa-ana-my-first-home",
    name: "My First Home",
    provider: "City of Santa Ana",
    recipient: "buyer",
    eligibleUse: "First-time buyer assistance for a unit in Santa Ana.",
    geography: { kind: "city", city: "Santa Ana", text: "Unit must be in Santa Ana." },
    amountText: "No loan amount on the page: Unknown.",
    amountMax: null,
    includeInCandidateTotal: false,
    timing: "Unknown.",
    status: "verify",
    statusNote: "Amount Unknown.",
    officialUrl: SOURCES["santa-ana-my-first-home"].url,
    sourceIds: ["santa-ana-my-first-home"],
    lastVerified: SOURCES["santa-ana-my-first-home"].checkedDate,
    requirements: [
      "First-time buyer.",
      "Housing cost 28–40% of income; total debt ≤ 45%.",
      "Credit score ≥ 640; 3% seasoned funds.",
      "Currently 80% AMI only.",
    ],
    cautions: [],
    openQuestions: ["What is the loan amount?"],
    conflicts: [],
  },
  {
    id: "calhfa-myhome",
    name: "MyHome Assistance Program",
    provider: "CalHFA",
    recipient: "buyer",
    eligibleUse: "Down-payment or closing-cost assistance loan for first-time, owner-occupant buyers.",
    geography: { kind: "region", text: "California." },
    amountText:
      "Amount not on the MyHome page: Unknown. The event lane notes say up to 3.5% (FHA) / 3% (conventional) on CalHFA's programs page (not confirmed by us).",
    amountMax: null,
    includeInCandidateTotal: false,
    timing: "At purchase, through CalHFA-approved lenders. Dates: Unknown.",
    status: "verify",
    statusNote: "Amount not confirmed.",
    officialUrl: SOURCES["calhfa-myhome"].url,
    sourceIds: ["calhfa-myhome"],
    lastVerified: SOURCES["calhfa-myhome"].checkedDate,
    requirements: ["First-time buyer, owner-occupied.", "Homebuyer education.", "CalHFA income limits.", "CalHFA-approved lender."],
    cautions: [],
    openQuestions: ["What is the current MyHome amount for this loan type?"],
    conflicts: [],
  },
  {
    id: "calhfa-dream-for-all",
    name: "Dream For All Shared Appreciation Loan",
    provider: "CalHFA",
    recipient: "buyer",
    eligibleUse: "Down-payment loan with shared appreciation on repayment, for first-generation buyers.",
    geography: { kind: "region", text: "California." },
    amountText: "Up to 20% of price, not to exceed $150,000.",
    amountMax: 150000,
    includeInCandidateTotal: false,
    timing: "Only if the buyer holds a voucher from a randomized drawing (update dated 05/20/2026).",
    status: "verify",
    statusNote: "Counts only if a buyer already holds a voucher.",
    officialUrl: SOURCES["calhfa-dream-for-all"].url,
    sourceIds: ["calhfa-dream-for-all"],
    lastVerified: SOURCES["calhfa-dream-for-all"].checkedDate,
    requirements: ["First-generation buyer.", "Voucher by randomized drawing.", "Homebuyer education."],
    cautions: ["Shared appreciation is repaid when the loan is repaid."],
    openQuestions: ["Does any buyer hold a voucher?"],
    conflicts: [],
  },
  {
    id: "hcd-calhome",
    name: "CalHome / Homeownership Super NOFA",
    provider: "California HCD",
    recipient: "project",
    eligibleUse: "Grants to agencies and nonprofits for development, acquisition and buyer assistance (deferred loans to households).",
    geography: { kind: "region", text: "California." },
    amountText: "Unknown for this project.",
    amountMax: null,
    includeInCandidateTotal: false,
    timing: "No open general round confirmed. The HOSN page lists only 2024 Tribal NOFA documents.",
    status: "verify",
    statusNote: "No open general round confirmed.",
    officialUrl: SOURCES["hcd-calhome"].url,
    sourceIds: ["hcd-calhome", "hcd-hosn", "habitat-oc-difficult"],
    lastVerified: SOURCES["hcd-calhome"].checkedDate,
    requirements: ["Applicant is a local agency or nonprofit."],
    cautions: ["Habitat OC's own post says CalHome funding has been reduced."],
    openQuestions: ["When is the next general Homeownership Super NOFA round?"],
    conflicts: [],
  },
  {
    id: "ochft",
    name: "Orange County Housing Finance Trust",
    provider: "OCHFT",
    recipient: "project",
    eligibleUse: "Lead only: a NOFA is shown; homeownership eligibility not confirmed.",
    geography: { kind: "region", text: "Orange County." },
    amountText: "Unknown.",
    amountMax: null,
    includeInCandidateTotal: false,
    timing: "Unknown.",
    status: "verify",
    statusNote: "Lead from the event lane notes (checked Nov 6); not read by us.",
    officialUrl: SOURCES["ochft"].url,
    sourceIds: ["ochft"],
    lastVerified: SOURCES["ochft"].checkedDate,
    requirements: [],
    cautions: [],
    openQuestions: ["Does the current NOFA fund ownership homes?"],
    conflicts: [],
  },
] satisfies FundingSource[]);

export type LeadStatus = "to-verify" | "not-eligible" | "applied" | "committed";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  "to-verify": "To verify",
  "not-eligible": "Not eligible",
  applied: "Applied",
  committed: "Committed",
};

export type LeadEntry = { status: LeadStatus; amount: number | null; byLandClose: boolean };

export const DEFAULT_LEAD_ENTRY: LeadEntry = Object.freeze({ status: "to-verify", amount: null, byLandClose: false });

export type GeoResult = { inArea: boolean | null; text: string };

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Does the source's published geography include the city? null = cannot tell from the page. */
export function geographyCheck(source: FundingSource, city: string): GeoResult {
  const g = source.geography;
  switch (g.kind) {
    case "areas": {
      const hit = g.areas.some((a) => norm(a) === norm(city));
      return hit
        ? { inArea: true, text: `${city} is in the published eligible areas.` }
        : { inArea: false, text: `Not in eligible area: ${city} is not in the published list. Counts $0.` };
    }
    case "city":
      return norm(g.city) === norm(city)
        ? { inArea: true, text: `Site is in ${g.city}.` }
        : { inArea: false, text: `Only for units in ${g.city}. Counts $0.` };
    case "region":
      return { inArea: true, text: g.text };
    case "via-lender":
      return { inArea: null, text: g.text };
  }
}

export type SourceEvaluation = {
  source: FundingSource;
  entry: LeadEntry;
  geo: GeoResult;
  /** Amount counted in the base gap (per home for buyer sources). */
  counted: number;
  /** Amount used in the "if candidates came through" total (0 when not a candidate or unknown). */
  candidate: number;
  candidateUnknown: boolean;
  reason: string;
};

export function evaluateSource(source: FundingSource, entry: LeadEntry, city: string): SourceEvaluation {
  const geo = geographyCheck(source, city);
  const base = { source, entry, geo, counted: 0, candidate: 0, candidateUnknown: false };
  if (geo.inArea === false) return { ...base, reason: geo.text };
  if (entry.status === "not-eligible") return { ...base, reason: "Marked not eligible. Counts $0." };
  if (entry.status === "committed") {
    if (entry.amount !== null && entry.amount > 0) {
      return { ...base, counted: entry.amount, reason: "Committed with an amount: counted." };
    }
    return { ...base, candidateUnknown: true, reason: "Committed but no amount entered. Counts $0." };
  }
  const label = entry.status === "applied" ? "Applied, not committed" : "To verify, not committed";
  if (source.amountMax !== null && source.includeInCandidateTotal) {
    return { ...base, candidate: source.amountMax, reason: `${label}. Counts $0 in the base gap.` };
  }
  return { ...base, candidateUnknown: true, reason: `${label}; amount Unknown or conditional. Counts $0.` };
}

export type CatalogTotals = {
  evaluations: SourceEvaluation[];
  committedProject: number;
  committedProjectByLandClose: number;
  committedBuyerPerHome: number;
  candidateProject: number;
  candidateBuyerPerHome: number;
  /** Candidates excluded from the "if candidates came through" total because the amount is Unknown or conditional. */
  unknownCount: number;
};

export function catalogTotals(entries: Readonly<Record<string, LeadEntry>>, city: string): CatalogTotals {
  const evaluations = FUNDING_SOURCES.map((s) => evaluateSource(s, entries[s.id] ?? DEFAULT_LEAD_ENTRY, city));
  const sum = (r: Recipient, k: "counted" | "candidate", pred: (e: SourceEvaluation) => boolean = () => true) =>
    evaluations.filter((e) => e.source.recipient === r && pred(e)).reduce((a, e) => a + e[k], 0);
  return {
    evaluations,
    committedProject: sum("project", "counted"),
    committedProjectByLandClose: sum("project", "counted", (e) => e.entry.byLandClose),
    committedBuyerPerHome: sum("buyer", "counted"),
    candidateProject: sum("project", "candidate"),
    candidateBuyerPerHome: sum("buyer", "candidate"),
    unknownCount: evaluations.filter((e) => e.candidateUnknown).length,
  };
}
