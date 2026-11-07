/**
 * Counselor / caseworker handoff. Non-diagnostic: it reports what the
 * homeowner reviewed and what still needs confirming. It never states that a
 * caseworker approved anything or that an intervention happened.
 */
import type { ActionItem } from "./actions";
import type { ResourceHandoff } from "./assistance";
import { formatLongDate, formatPercent, formatPointChange, formatSignedPercent, formatSignedUSD, formatUSD } from "./format";
import { cautionsFor, evidenceFor, FIELD_LABELS, fieldStatus, REQUIRED_FIELDS, type Caution, type FieldStatus } from "./review";
import type { BudgetImpact, ExtractedNotice, HouseholdBudget, NoticeField, ReviewedChange } from "./schema";

export type EvidenceRow = {
  field: NoticeField;
  label: string;
  value: string;
  quote: string | null;
  status: FieldStatus;
};

export type CounselorSummary = {
  household: HouseholdBudget;
  extractionMode: ExtractedNotice["extractionMode"] | "none";
  evidence: EvidenceRow[];
  impactRows: { label: string; before: string; after: string; change: string }[];
  assumptions: string[];
  cautions: Caution[];
  openQuestions: string[];
  checklist: string[];
};

export function displayValue(change: ReviewedChange, field: NoticeField): string {
  switch (field) {
    case "previousAmount":
    case "newAmount": {
      const v = change[field];
      if (v === null) return "Unknown";
      const per = change.period === "annual" ? "/year" : change.period === "monthly" ? "/month" : "";
      return `${formatUSD(v)}${per}`;
    }
    case "period":
      return change.period === "unknown" ? "Unknown" : change.period === "annual" ? "Annual" : "Monthly";
    case "paymentMethod":
      return change.paymentMethod === "direct"
        ? "Paid directly by homeowner"
        : change.paymentMethod === "escrow"
          ? "Paid through mortgage escrow"
          : "Not sure";
    case "documentType":
      return change.documentType === "insurance_renewal"
        ? "Homeowners insurance renewal"
        : change.documentType === "escrow_change"
          ? "Escrow change"
          : "Unknown";
    case "effectiveDate":
    case "noticeDate": {
      const v = change[field];
      return v ? formatLongDate(v) : "Unknown";
    }
    case "issuerName":
      return change.issuerName || "Unknown";
  }
}

export function buildCounselorSummary(
  budget: HouseholdBudget,
  change: ReviewedChange,
  extraction: ExtractedNotice | null,
  impact: BudgetImpact,
): CounselorSummary {
  const fields: NoticeField[] = ["documentType", "issuerName", "noticeDate", ...REQUIRED_FIELDS.filter((f) => f !== "documentType")];
  const evidence: EvidenceRow[] = fields.map((field) => ({
    field,
    label: FIELD_LABELS[field],
    value: displayValue(change, field),
    quote: evidenceFor(extraction, field)?.quote ?? null,
    status: fieldStatus(change, extraction, field),
  }));

  const impactRows = [
    {
      label: "Homeowners insurance (monthly equivalent)",
      before: formatUSD(impact.oldInsuranceMonthly),
      after: formatUSD(impact.newInsuranceMonthly),
      change: formatSignedUSD(impact.monthlyCostChange),
    },
    {
      label: "Housing cost (P&I + tax + insurance + HOA)",
      before: formatUSD(impact.beforeHousingMonthly),
      after: formatUSD(impact.afterHousingMonthly),
      change: formatSignedUSD(impact.afterHousingMonthly - impact.beforeHousingMonthly),
    },
    {
      label: "Listed essential outflow",
      before: formatUSD(impact.beforeEssentialOutflowMonthly),
      after: formatUSD(impact.afterEssentialOutflowMonthly),
      change: formatSignedUSD(impact.afterEssentialOutflowMonthly - impact.beforeEssentialOutflowMonthly),
    },
    {
      label: "Monthly cushion (take-home − essentials)",
      before: formatUSD(impact.beforeCashBufferMonthly),
      after: formatUSD(impact.afterCashBufferMonthly),
      change:
        formatSignedUSD(impact.afterCashBufferMonthly - impact.beforeCashBufferMonthly) +
        (impact.cashBufferChangeRatio !== null ? ` (${formatSignedPercent(impact.cashBufferChangeRatio)})` : ""),
    },
    {
      label: "Housing cost ÷ gross income (informational)",
      before: formatPercent(impact.beforeHousingToGrossIncome),
      after: formatPercent(impact.afterHousingToGrossIncome),
      change: formatPointChange(impact.beforeHousingToGrossIncome, impact.afterHousingToGrossIncome).replace(" percentage points", " pts"),
    },
  ];

  const assumptions = [
    "All budget figures are self-reported by the homeowner (synthetic in this demo) and have not been verified.",
    "Mortgage amount is principal + interest only; property tax and insurance are listed separately to avoid double counting.",
    change.period === "annual"
      ? `Annual premium converted to a monthly equivalent by dividing by 12 (${formatUSD(change.newAmount ?? 0)} ÷ 12 = ${formatUSD(impact.newInsuranceMonthly)}).`
      : "Premium is stated monthly and used as-is.",
    "Everything else in the budget is assumed to stay the same.",
    "Cushion uses take-home (net) income; the housing ratio uses gross income.",
  ];

  const cautions = cautionsFor(change, budget);

  const openQuestions = [
    change.paymentMethod === "direct"
      ? "Confirm insurance is paid directly (not through mortgage escrow)."
      : "Confirm how insurance is paid and request the servicer's escrow analysis if escrowed.",
    "Are there other recent expense or income changes?",
    "Has the homeowner talked with their insurer or a counselor yet?",
    "Did coverage limits or deductibles change at renewal?",
  ];
  if (change.editedFields.length > 0) {
    openQuestions.push(
      `Homeowner edited: ${change.editedFields.map((f) => FIELD_LABELS[f].toLowerCase()).join(", ")}. Compare with the original notice.`,
    );
  }

  const checklist = [
    "Ask the homeowner for consent before discussing or sharing their budget details.",
    "Review the original notice together and confirm the premium, effective date, and payment method.",
    "Confirm the self-reported budget figures and ask about any other recent changes.",
    "Discuss options the homeowner wants to explore (insurer discounts or quotes, budget adjustments, available programs).",
    "Agree on next steps and a follow-up date the homeowner is comfortable with.",
  ];

  return {
    household: budget,
    extractionMode: extraction?.extractionMode ?? "none",
    evidence,
    impactRows,
    assumptions,
    cautions,
    openQuestions,
    checklist,
  };
}

const MODE_LABEL: Record<CounselorSummary["extractionMode"], string> = {
  "demo-fixture": "Demo fixture (pre-extracted sample, no AI call)",
  ai: "AI-extracted, then reviewed by homeowner",
  manual: "Entered manually by homeowner",
  none: "None",
};

export function extractionModeLabel(mode: CounselorSummary["extractionMode"]): string {
  return MODE_LABEL[mode];
}

/** Plain-text report for the "Copy summary" button. */
export function summaryToText(
  summary: CounselorSummary,
  insight: string,
  actions: ActionItem[],
  resources: ResourceHandoff[] = [],
): string {
  const h = summary.household;
  const lines: string[] = [
    "HOMESTAY COUNSELOR SUMMARY — DEMO / SYNTHETIC DATA ONLY",
    "Draft for discussion. Not a financial, insurance, or eligibility determination.",
    "",
    `Household: ${h.name} (fictional), ${h.city}, ${h.householdSize} people`,
    `Income: ${formatUSD(h.grossMonthlyIncome)}/mo gross, ${formatUSD(h.netMonthlyIncome)}/mo take-home (self-reported)`,
    `Emergency savings: ${formatUSD(h.emergencySavings)} (context only)`,
    "",
    "SUMMARY",
    insight,
    "",
    `REVIEWED NOTICE FACTS (source: ${extractionModeLabel(summary.extractionMode)})`,
    ...summary.evidence.map(
      (e) => `- ${e.label}: ${e.value} [${statusLabel(e.status)}]${e.quote ? ` — "${e.quote}"` : ""}`,
    ),
    "",
    "MONTHLY IMPACT (before → after)",
    ...summary.impactRows.map((r) => `- ${r.label}: ${r.before} → ${r.after} (${r.change})`),
    "",
    "ASSUMPTIONS",
    ...summary.assumptions.map((a) => `- ${a}`),
  ];
  if (summary.cautions.length > 0) {
    lines.push("", "CAUTIONS", ...summary.cautions.map((c) => `- ${c.title}: ${c.detail}`));
  }
  lines.push(
    "",
    "QUESTIONS TO CLARIFY",
    ...summary.openQuestions.map((q) => `- ${q}`),
    "",
    "HOMEOWNER'S SUGGESTED NEXT STEPS (not yet reviewed by staff)",
    ...actions.map((a, i) => `${i + 1}. ${a.title}`),
  );
  if (resources.length > 0) {
    lines.push(
      "",
      "POSSIBLE RESOURCES TO VERIFY",
      "Suggestions matched from self-reported facts. Not eligibility determinations; nothing is counted as savings.",
      ...resources.flatMap((r, i) => [
        `${i + 1}. ${r.name} — ${r.provider}`,
        `   Counselor status: ${r.counselorStatus}`,
        "   Still unknown:",
        ...r.stillUnknown.map((q) => `   - ${q}`),
        `   Official source: ${r.officialUrl}${r.officialPhone ? ` · ${r.officialPhone}` : ""}`,
        `   Source checked: ${formatLongDate(r.lastVerified)}`,
      ]),
    );
  }
  lines.push(
    "",
    "DRAFT FOLLOW-UP CHECKLIST",
    ...summary.checklist.map((c) => `[ ] ${c}`),
    "",
    "Prototype only. Not a lender, insurance advisor, or financial counselor.",
  );
  return lines.join("\n");
}

export function statusLabel(s: FieldStatus): string {
  switch (s) {
    case "found":
      return "Found in notice";
    case "edited":
      return "Edited by homeowner";
    case "confirmed":
      return "Confirmed by homeowner";
    case "needs-confirmation":
      return "Needs confirmation";
    case "missing":
      return "Missing";
  }
}
