/**
 * ALL DATA IN THIS FILE IS FICTIONAL. Jordan Rivera, the property, and
 * "Pacific Community Home Insurance" are invented for demonstration.
 */
import type { ExtractedNotice, HouseholdBudget } from "./schema";

export const DEMO_HOUSEHOLD: Readonly<HouseholdBudget> = Object.freeze({
  id: "demo-household-001",
  name: "Jordan Rivera",
  city: "Santa Ana, CA",
  householdSize: 4,
  grossMonthlyIncome: 7200,
  netMonthlyIncome: 5400,
  mortgagePrincipalInterest: 1650,
  propertyTaxMonthly: 320,
  homeownerInsuranceMonthly: 150,
  hoaMonthly: 0,
  utilitiesMonthly: 280,
  livingEssentialsMonthly: 2250,
  minimumDebtPaymentsMonthly: 350,
  emergencySavings: 3300,
  insurancePaymentMethod: "direct",
});

/** Returns a fresh, mutable copy so callers can never alter the seed. */
export function createDemoHousehold(): HouseholdBudget {
  return { ...DEMO_HOUSEHOLD };
}

export const SAMPLE_NOTICE_FILE_NAME = "sample-insurance-renewal.txt";

/** Must stay identical to public/samples/sample-insurance-renewal.txt (checked by tests). */
export const SAMPLE_NOTICE_TEXT = `SAMPLE DOCUMENT — FICTIONAL / NOT A REAL INSURANCE NOTICE
Pacific Community Home Insurance (fictional)
Policyholder: Jordan Rivera
Property: Sample Residence, Santa Ana, CA (fictional)
Notice date: November 1, 2026
Renewal effective date: December 1, 2026
Prior annual homeowners insurance premium: $1,800.00
Renewal annual homeowners insurance premium: $3,600.00
Premium is paid directly by the policyholder, not through mortgage escrow.
Please contact your insurance representative to discuss options and coverage.
`;

/**
 * Pre-computed extraction for the sample notice, used in demo mode so the
 * demo never depends on a network call. Every quote is a verbatim substring of
 * SAMPLE_NOTICE_TEXT (enforced by tests).
 */
export const SAMPLE_NOTICE_FIXTURE: Readonly<ExtractedNotice> = Object.freeze({
  documentType: "insurance_renewal",
  issuerName: "Pacific Community Home Insurance (fictional)",
  noticeDate: "2026-11-01",
  effectiveDate: "2026-12-01",
  previousAmount: 1800,
  newAmount: 3600,
  period: "annual",
  paymentMethod: "direct",
  evidence: [
    { field: "documentType", quote: "Renewal annual homeowners insurance premium", confidence: "high" },
    { field: "issuerName", quote: "Pacific Community Home Insurance (fictional)", confidence: "high" },
    { field: "noticeDate", quote: "Notice date: November 1, 2026", confidence: "high" },
    { field: "effectiveDate", quote: "Renewal effective date: December 1, 2026", confidence: "high" },
    { field: "previousAmount", quote: "Prior annual homeowners insurance premium: $1,800.00", confidence: "high" },
    { field: "newAmount", quote: "Renewal annual homeowners insurance premium: $3,600.00", confidence: "high" },
    { field: "period", quote: "Prior annual homeowners insurance premium", confidence: "high" },
    {
      field: "paymentMethod",
      quote: "Premium is paid directly by the policyholder, not through mortgage escrow.",
      confidence: "high",
    },
  ],
  uncertainties: [
    "The notice does not say whether coverage limits or deductibles changed at renewal.",
    "The notice does not give a payment due date or say whether installments are available.",
  ],
  extractionMode: "demo-fixture",
}) as ExtractedNotice;

export function createSampleExtraction(): ExtractedNotice {
  return structuredClone(SAMPLE_NOTICE_FIXTURE) as ExtractedNotice;
}

const normWs = (s: string) => s.replace(/\s+/g, " ").trim();

/** Whitespace-insensitive check for "is this exactly the sample notice?" */
export function isSampleNoticeText(text: string): boolean {
  return normWs(text) === normWs(SAMPLE_NOTICE_TEXT);
}

/* ------------------- Second scenario: escrow-paid renewal ------------------ */
/* Same fictional household and fictional insurer; the premium is paid through
 * mortgage escrow. HomeStay shows the monthly-equivalent cost only and never
 * estimates the new mortgage/lender payment. */

export const ESCROW_HOUSEHOLD: Readonly<HouseholdBudget> = Object.freeze({
  ...DEMO_HOUSEHOLD,
  id: "demo-household-001-escrow",
  insurancePaymentMethod: "escrow",
});

export const ESCROW_NOTICE_FILE_NAME = "sample-insurance-renewal-escrow.txt";

/** Must stay identical to public/samples/sample-insurance-renewal-escrow.txt (checked by tests). */
export const ESCROW_NOTICE_TEXT = `SAMPLE DOCUMENT — FICTIONAL / NOT A REAL INSURANCE NOTICE
Pacific Community Home Insurance (fictional)
Policyholder: Jordan Rivera
Property: Sample Residence, Santa Ana, CA (fictional)
Notice date: November 1, 2026
Renewal effective date: December 1, 2026
Prior annual homeowners insurance premium: $1,800.00
Renewal annual homeowners insurance premium: $3,240.00
This premium is paid through your mortgage escrow account. We will send the renewal bill to your mortgage servicer.
Your mortgage servicer, not this insurer, determines any change to your monthly mortgage payment.
Please contact your insurance representative to discuss options and coverage.
`;

/** Every quote is a verbatim substring of ESCROW_NOTICE_TEXT (enforced by tests). */
export const ESCROW_NOTICE_FIXTURE: Readonly<ExtractedNotice> = Object.freeze({
  documentType: "insurance_renewal",
  issuerName: "Pacific Community Home Insurance (fictional)",
  noticeDate: "2026-11-01",
  effectiveDate: "2026-12-01",
  previousAmount: 1800,
  newAmount: 3240,
  period: "annual",
  paymentMethod: "escrow",
  evidence: [
    { field: "documentType", quote: "Renewal annual homeowners insurance premium", confidence: "high" },
    { field: "issuerName", quote: "Pacific Community Home Insurance (fictional)", confidence: "high" },
    { field: "noticeDate", quote: "Notice date: November 1, 2026", confidence: "high" },
    { field: "effectiveDate", quote: "Renewal effective date: December 1, 2026", confidence: "high" },
    { field: "previousAmount", quote: "Prior annual homeowners insurance premium: $1,800.00", confidence: "high" },
    { field: "newAmount", quote: "Renewal annual homeowners insurance premium: $3,240.00", confidence: "high" },
    { field: "period", quote: "Prior annual homeowners insurance premium", confidence: "high" },
    { field: "paymentMethod", quote: "This premium is paid through your mortgage escrow account.", confidence: "high" },
  ],
  uncertainties: [
    "The notice does not state a new monthly mortgage payment or when one would start. Your servicer decides that after its escrow analysis.",
    "The notice does not say whether coverage limits or deductibles changed at renewal.",
  ],
  extractionMode: "demo-fixture",
}) as ExtractedNotice;

/* ------------------------------ Scenario registry ------------------------------ */

export type SampleScenarioId = "direct" | "escrow";
export const DEFAULT_SCENARIO_ID: SampleScenarioId = "direct";

export type SampleScenario = {
  id: SampleScenarioId;
  label: string;
  description: string;
  fileName: string;
  text: string;
  household: Readonly<HouseholdBudget>;
  fixture: Readonly<ExtractedNotice>;
};

export const SAMPLE_SCENARIOS: Readonly<Record<SampleScenarioId, SampleScenario>> = Object.freeze({
  direct: {
    id: "direct",
    label: "Direct-pay renewal",
    description: "The homeowner pays the insurer directly. Shows the full before-and-after budget impact.",
    fileName: SAMPLE_NOTICE_FILE_NAME,
    text: SAMPLE_NOTICE_TEXT,
    household: DEMO_HOUSEHOLD,
    fixture: SAMPLE_NOTICE_FIXTURE,
  },
  escrow: {
    id: "escrow",
    label: "Escrow-paid renewal",
    description: "The premium is paid through mortgage escrow. Shows the monthly-equivalent cost and what to ask the servicer.",
    fileName: ESCROW_NOTICE_FILE_NAME,
    text: ESCROW_NOTICE_TEXT,
    household: ESCROW_HOUSEHOLD,
    fixture: ESCROW_NOTICE_FIXTURE,
  },
});

export function createScenarioHousehold(id: SampleScenarioId): HouseholdBudget {
  return { ...SAMPLE_SCENARIOS[id].household };
}

export function createScenarioExtraction(id: SampleScenarioId): ExtractedNotice {
  return structuredClone(SAMPLE_SCENARIOS[id].fixture) as ExtractedNotice;
}

/** The demo fixture for text that exactly matches a sample notice (ignoring whitespace), else null. */
export function sampleExtractionForText(text: string): ExtractedNotice | null {
  const t = normWs(text);
  const match = Object.values(SAMPLE_SCENARIOS).find((s) => normWs(s.text) === t);
  return match ? createScenarioExtraction(match.id) : null;
}
