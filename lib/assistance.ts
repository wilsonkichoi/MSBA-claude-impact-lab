/**
 * P2: tiny curated resource catalog. Each entry was checked against its
 * official source on the lastVerified date. Matching only says a resource
 * MAY apply; it never decides eligibility or counts savings as realized.
 *
 * Matching is deterministic: each resource has an explicit rule that looks at
 * self-reported household facts and, when available, the applied (reviewed)
 * notice and its calculated impact. Results are ranked by a fixed relevance
 * score (ties keep catalog order) and capped at three.
 */
import { describeBuffer } from "./finance";
import { formatSignedUSD, formatUSD } from "./format";
import type { BudgetImpact, HouseholdBudget, ReviewedChange } from "./schema";
import type { ResourceStatus } from "./state";

export type AssistanceResource = {
  id: string;
  name: string;
  provider: string;
  citiesOrArea: string[];
  appliesTo: string[];
  officialUrl: string;
  officialPhone?: string;
  requirements: string[];
  benefitDescription: string;
  status: "open" | "closed" | "verify";
  lastVerified: string;
  cautions: string[];
};

/** Counselor-set status labels, shared by the caseworker view and the copied summary. */
export const RESOURCE_STATUS_LABEL: Record<ResourceStatus, string> = {
  "to-verify": "To verify",
  "not-eligible": "Not eligible",
  applied: "Applied",
  confirmed: "Confirmed",
};

/** Orange County, CA incorporated cities (used only for area matching). */
const OC_CITIES = [
  "aliso viejo", "anaheim", "brea", "buena park", "costa mesa", "cypress", "dana point", "fountain valley",
  "fullerton", "garden grove", "huntington beach", "irvine", "la habra", "la palma", "laguna beach",
  "laguna hills", "laguna niguel", "laguna woods", "lake forest", "los alamitos", "mission viejo",
  "newport beach", "orange", "placentia", "rancho santa margarita", "san clemente", "san juan capistrano",
  "santa ana", "seal beach", "stanton", "tustin", "villa park", "westminster", "yorba linda",
];

/**
 * 2026–27 Property Tax Postponement household-income limit, as published by the
 * State Controller on 2026-11-06. Used only to decide whether to SUGGEST the
 * program; HomeStay never tells a household it does not qualify.
 */
export const PTP_INCOME_LIMIT_2026_27 = 57002;

export const ASSISTANCE_RESOURCES: readonly AssistanceResource[] = [
  {
    id: "oc-homeowners-exemption",
    name: "Homeowners' Exemption",
    provider: "Orange County Assessor Department",
    citiesOrArea: ["Orange County, CA"],
    appliesTo: ["property_tax"],
    officialUrl: "https://www.ocassessor.gov/tax-saving-programs/homeowners-exemptions",
    officialPhone: "(714) 834-3821",
    requirements: [
      "You own the property.",
      "It was your principal residence on January 1 at 12:01 a.m.",
      "You do not already have a Homeowners' Exemption on any other property.",
      "You submit a completed Homeowners' Exemption application.",
    ],
    benefitDescription:
      "The Assessor says it saves a qualifying homeowner at least $70 per year in property taxes by exempting $7,000 of the property's value.",
    status: "verify",
    lastVerified: "2026-11-06",
    cautions: [
      "Many owners already have this exemption. The Assessor mails a pre-filled application to new homeowners, so it may already be on file.",
      "Per the Assessor, the filing deadline for the full exemption is February 15 at 5:00 p.m.; qualified applicants who file later, on or before December 10, may receive 80% of the full amount.",
      "This is not counted as savings in your budget. It only matters if it is not already claimed.",
    ],
  },
  {
    id: "ca-cdi-consumer-hotline",
    name: "Consumer Hotline and home insurance help",
    provider: "California Department of Insurance (CDI)",
    citiesOrArea: ["California"],
    appliesTo: ["insurance_increase"],
    officialUrl: "https://www.insurance.ca.gov/01-consumers/105-type/5-residential/",
    officialPhone: "(800) 927-4357 · TTY (800) 482-4833",
    requirements: [
      "For California insurance consumers with questions, or with complaints about an insurance company, agent, or broker.",
      "General questions: call the Consumer Hotline or use CDI's online inquiry form.",
      "Complaints: CDI asks you to complete its Request for Assistance form.",
    ],
    benefitDescription:
      "CDI says its Consumer Hotline is staffed by insurance experts, and its Consumer Services Division responds to consumer inquiries and complaints, including rate and underwriting complaints. CDI also publishes guides for shopping and comparing home insurance.",
    status: "open",
    lastVerified: "2026-11-06",
    cautions: [
      "HomeStay cannot tell whether this renewal involves a problem CDI would review. Ask the hotline.",
      "Keep your coverage in force while you ask questions. Many mortgages require continuous homeowners insurance.",
      "Use the phone number on insurance.ca.gov, not a number from an unexpected email or text.",
    ],
  },
  {
    id: "hud-housing-counseling",
    name: "HUD-approved housing counseling agencies",
    provider: "U.S. Department of Housing and Urban Development (HUD)",
    citiesOrArea: ["United States"],
    appliesTo: ["escrow_or_unknown_payment", "thin_or_no_cushion"],
    officialUrl: "https://www.hud.gov/hud-partners/single-family-about-housing-counseling",
    officialPhone: "(800) 569-4287 · TTY (202) 708-1455",
    requirements: [
      "Call HUD's line to reach a live operator, or search HUD's list of participating agencies by location.",
      "Not every agency offers every type of counseling, so ask whether it offers budget or post-purchase help.",
    ],
    benefitDescription:
      "HUD says participating agencies offer services that include budget and credit counseling, post-purchase workshops, and mortgage delinquency counseling. Its phone line connects you with an operator, in many languages, to find an agency near you.",
    status: "open",
    lastVerified: "2026-11-06",
    cautions: [
      "Per HUD, foreclosure counseling is always free, but other counseling may have a small fee. Agencies must disclose fees before counseling starts and waive fees you cannot afford.",
      "Before sharing documents, check that the agency is on HUD's list of participating agencies.",
    ],
  },
  {
    id: "ca-sco-property-tax-postponement",
    name: "Property Tax Postponement",
    provider: "California State Controller's Office",
    citiesOrArea: ["California"],
    appliesTo: ["property_tax", "thin_or_no_cushion"],
    officialUrl: "https://www.sco.ca.gov/ardtax_prop_tax_postponement.html",
    officialPhone: "(800) 952-5661",
    requirements: [
      "The applicant is at least 62 years old, blind, or disabled.",
      "Total household income is $57,002 or less, as defined in California Revenue and Taxation Code 20503.",
      "The applicant owns and lives in the home as their principal residence.",
      "There is at least 40% equity in the home and no reverse mortgage.",
      "You apply again every year you want a postponement.",
    ],
    benefitDescription:
      "The Controller says the program lets eligible homeowners defer current-year property taxes on their principal residence. The deferred taxes must be repaid, are secured by a lien on the home, and accrue 5% simple interest per year.",
    status: "verify",
    lastVerified: "2026-11-06",
    cautions: [
      "Funding is limited. The Controller approves applications first-come, first-served and says not everyone who qualifies may be approved.",
      "Per the Controller, the 2026–27 filing period runs October 1, 2026 to February 10, 2027.",
      "This is a deferral, not a reduction. Postponed taxes plus interest become due if you move, sell, refinance, take a reverse mortgage, or fall behind on future taxes or a senior lien, among other events.",
      "It does not lower your mortgage payment. If taxes are paid through escrow, you must contact your lender yourself.",
      "If you hold off on paying taxes while an application is pending and it is not approved, the county may charge penalties and interest.",
      "This is not counted as savings in your budget.",
    ],
  },
];

export type ResourceMatch = {
  resource: AssistanceResource;
  whyItMayApply: string[];
  stillUnknown: { question: string }[];
};

/** The applied notice and its calculated impact. Absent before a notice is applied. */
export type MatchContext = {
  change: ReviewedChange;
  impact: BudgetImpact;
};

function normalizeCity(city: string): string {
  return city.toLowerCase().replace(/,?\s*(ca|california)\.?$/, "").trim();
}

function inOrangeCounty(city: string): boolean {
  return OC_CITIES.includes(normalizeCity(city));
}

/** True when the city names California ("…, CA" / "…, California") or is an Orange County city. */
function inCalifornia(city: string): boolean {
  return /,?\s*(ca|california)\.?$/i.test(city.trim()) || inOrangeCounty(city);
}

function cushionLine(impact: BudgetImpact): string | null {
  const after = impact.afterCashBufferMonthly;
  switch (describeBuffer(after)) {
    case "none":
      return `After this change, your listed essential expenses would be ${formatUSD(Math.abs(after))}/month more than your take-home pay.`;
    case "thin":
      return `Your estimated cushion after this change is ${formatUSD(after)}/month, under the $300 level HomeStay uses to flag a thin cushion.`;
    case "comfortable":
      return null;
  }
}

function increaseLine(change: ReviewedChange, impact: BudgetImpact): string {
  const per = change.period === "annual" ? "annual" : change.period === "monthly" ? "monthly" : "";
  const delta = `about ${formatSignedUSD(impact.monthlyCostChange)}/month`;
  if (change.previousAmount !== null && change.newAmount !== null && per) {
    return `Your reviewed notice shows the ${per} premium going from ${formatUSD(change.previousAmount)} to ${formatUSD(change.newAmount)} (${delta}).`;
  }
  return `Your reviewed notice raises your homeowners insurance cost by ${delta}.`;
}

type Scored = { match: ResourceMatch; score: number };
type Matcher = (r: AssistanceResource, budget: HouseholdBudget, ctx: MatchContext | null) => Scored | null;

/*
 * Relevance scores (higher first; ties keep catalog order):
 *   CDI hotline      3 when the applied notice raises the premium.
 *   HUD counseling   3 for escrow / "not sure" payment, +2 thin cushion, +4 no cushion.
 *   OC exemption     1 (household facts only; not tied to the notice).
 *   PTP              1 thin cushion, 2 no cushion (only if listed income is at or under the published limit).
 */
const MATCHERS: Record<string, Matcher> = {
  "oc-homeowners-exemption": (resource, budget) => {
    if (!inOrangeCounty(budget.city) || budget.propertyTaxMonthly <= 0) return null;
    return {
      score: 1,
      match: {
        resource,
        whyItMayApply: [
          `Your home is listed in ${budget.city}, which is in Orange County.`,
          "Your budget includes property tax, so you are paying the tax this exemption reduces.",
        ],
        stillUnknown: [
          { question: "Is a Homeowners' Exemption already on file for this home? (Check your property tax bill or ask the Assessor.)" },
          { question: "Was this home your principal residence on January 1?" },
        ],
      },
    };
  },

  "ca-cdi-consumer-hotline": (resource, budget, ctx) => {
    if (!ctx || !inCalifornia(budget.city)) return null;
    if (ctx.change.documentType !== "insurance_renewal" || ctx.impact.monthlyCostChange <= 0.005) return null;
    return {
      score: 3,
      match: {
        resource,
        whyItMayApply: [
          increaseLine(ctx.change, ctx.impact),
          `Your home is listed in ${budget.city}, and CDI's Consumer Hotline serves California insurance consumers.`,
        ],
        stillUnknown: [
          { question: "What does the insurer say caused the increase, and did coverage limits, deductibles, or discounts change?" },
          {
            question:
              "Is this a general question for the hotline, or a complaint about the insurer, agent, or broker (CDI's Request for Assistance form)?",
          },
        ],
      },
    };
  },

  "hud-housing-counseling": (resource, _budget, ctx) => {
    if (!ctx) return null;
    const why: string[] = [];
    let score = 0;
    if (ctx.change.paymentMethod === "escrow") {
      score += 3;
      why.push("Your reviewed notice says this premium is paid through mortgage escrow, so any payment change will come from your servicer, not this notice.");
    } else if (ctx.change.paymentMethod === "unknown") {
      score += 3;
      why.push('You marked the payment method as "Not sure", so it is not yet clear who will bill the new amount or when.');
    }
    const level = describeBuffer(ctx.impact.afterCashBufferMonthly);
    const cushion = cushionLine(ctx.impact);
    if (cushion) {
      score += level === "none" ? 4 : 2;
      why.push(cushion);
    }
    if (score === 0) return null;
    const stillUnknown = [
      {
        question:
          "Which HUD-approved agency near you offers budget or post-purchase counseling, in your preferred language? (Call (800) 569-4287 or search HUD's agency list.)",
      },
      { question: "Does that agency charge a fee for this type of counseling, and can it be waived?" },
    ];
    if (ctx.change.paymentMethod !== "direct") {
      stillUnknown.push({
        question: "Has the servicer sent its escrow analysis with the new monthly payment and any shortage amount? Bring it to the counselor.",
      });
    }
    return { score, match: { resource, whyItMayApply: why, stillUnknown } };
  },

  "ca-sco-property-tax-postponement": (resource, budget, ctx) => {
    if (!ctx || !inCalifornia(budget.city) || budget.propertyTaxMonthly <= 0) return null;
    const level = describeBuffer(ctx.impact.afterCashBufferMonthly);
    const cushion = cushionLine(ctx.impact);
    if (!cushion) return null;
    const grossAnnual = budget.grossMonthlyIncome * 12;
    // Not suggested when the household's own listed income is above the published limit.
    if (grossAnnual > PTP_INCOME_LIMIT_2026_27) return null;
    return {
      score: level === "none" ? 2 : 1,
      match: {
        resource,
        whyItMayApply: [
          `Your budget includes ${formatUSD(budget.propertyTaxMonthly)}/month in property tax, and your home is listed in ${budget.city}.`,
          `Your listed gross income is about ${formatUSD(grossAnnual)}/year, at or below the ${formatUSD(PTP_INCOME_LIMIT_2026_27)} limit the Controller publishes. The program uses its own definition of household income.`,
          cushion,
        ],
        stillUnknown: [
          { question: "Is the homeowner applying at least 62 years old, blind, or disabled (as the program defines it)?" },
          { question: `Is total household income, as the Controller defines it, ${formatUSD(PTP_INCOME_LIMIT_2026_27)} or less?` },
          { question: "Is there at least 40% equity in the home, and no reverse mortgage?" },
          { question: "Can the application be filed by February 10, 2027, and is program funding still available?" },
        ],
      },
    };
  },
};

/**
 * Return at most three potential matches, ranked by relevance. Uses only the
 * household's stated facts and, once a notice has been applied, the reviewed
 * change and its calculated impact. Never mutates its inputs.
 */
export function matchResources(budget: HouseholdBudget, ctx: MatchContext | null = null): ResourceMatch[] {
  const scored: Scored[] = [];
  for (const resource of ASSISTANCE_RESOURCES) {
    const s = MATCHERS[resource.id]?.(resource, budget, ctx);
    if (s) scored.push(s);
  }
  // Array.prototype.sort is stable, so equal scores keep catalog order.
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.match);
}

/** One resource as it appears in the counselor handoff. */
export type ResourceHandoff = {
  id: string;
  name: string;
  provider: string;
  counselorStatus: string;
  stillUnknown: string[];
  officialUrl: string;
  officialPhone?: string;
  lastVerified: string;
};

export function buildResourceHandoff(matches: ResourceMatch[], statuses: Record<string, ResourceStatus>): ResourceHandoff[] {
  return matches.map(({ resource: r, stillUnknown }) => ({
    id: r.id,
    name: r.name,
    provider: r.provider,
    counselorStatus: RESOURCE_STATUS_LABEL[statuses[r.id] ?? "to-verify"],
    stillUnknown: stillUnknown.map((q) => q.question),
    officialUrl: r.officialUrl,
    officialPhone: r.officialPhone,
    lastVerified: r.lastVerified,
  }));
}
