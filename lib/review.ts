/**
 * Turning an extraction into a homeowner-reviewed change, and deciding
 * (deterministically) whether that change is complete enough to apply.
 */
import { toMonthly } from "./finance";
import { formatUSD } from "./format";
import type { Evidence, ExtractedNotice, HouseholdBudget, NoticeField, ReviewedChange } from "./schema";

export const REQUIRED_FIELDS: readonly NoticeField[] = [
  "documentType",
  "previousAmount",
  "newAmount",
  "period",
  "effectiveDate",
  "paymentMethod",
];

export const FIELD_LABELS: Record<NoticeField, string> = {
  documentType: "Document type",
  issuerName: "Issuer",
  noticeDate: "Notice date",
  effectiveDate: "Effective date",
  previousAmount: "Previous premium",
  newAmount: "New premium",
  period: "Billing frequency",
  paymentMethod: "Payment method",
};

export function draftFromExtraction(ex: ExtractedNotice): ReviewedChange {
  return {
    documentType: ex.documentType,
    issuerName: ex.issuerName ?? "",
    noticeDate: ex.noticeDate ?? null,
    effectiveDate: ex.effectiveDate ?? null,
    previousAmount: ex.previousAmount ?? null,
    newAmount: ex.newAmount ?? null,
    period: ex.period ?? "unknown",
    paymentMethod: ex.paymentMethod ?? "unknown",
    editedFields: [],
    confirmedFields: [],
  };
}

export function emptyManualDraft(): ReviewedChange {
  return {
    documentType: "insurance_renewal",
    issuerName: "",
    noticeDate: null,
    effectiveDate: null,
    previousAmount: null,
    newAmount: null,
    period: "unknown",
    paymentMethod: "unknown",
    editedFields: [],
    confirmedFields: [],
  };
}

export type FieldStatus = "found" | "needs-confirmation" | "missing" | "edited" | "confirmed";

function fieldValue(change: ReviewedChange, field: NoticeField): unknown {
  return change[field];
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === "unknown";
}

export function evidenceFor(ex: ExtractedNotice | null, field: NoticeField): Evidence | undefined {
  return ex?.evidence.find((e) => e.field === field);
}

/**
 * - missing: no usable value
 * - edited / confirmed: the homeowner acted on it
 * - found: high-confidence evidence quote exists
 * - needs-confirmation: value exists but evidence is absent or not high confidence
 */
export function fieldStatus(change: ReviewedChange, ex: ExtractedNotice | null, field: NoticeField): FieldStatus {
  // "Not sure" is an explicit, allowed answer for payment method once the homeowner confirms it.
  if (field === "paymentMethod" && change.paymentMethod === "unknown" && change.confirmedFields.includes(field)) {
    return "confirmed";
  }
  if (isMissing(fieldValue(change, field))) return "missing";
  if (change.editedFields.includes(field)) return "edited";
  if (change.confirmedFields.includes(field)) return "confirmed";
  const ev = evidenceFor(ex, field);
  if (ev && ev.confidence === "high") return "found";
  return "needs-confirmation";
}

export type ApplyCheck = { ok: true; newInsuranceMonthly: number } | { ok: false; blockers: string[] };

/** A change can be applied only when every required fact is known and reviewed. */
export function checkApplicable(change: ReviewedChange, ex: ExtractedNotice | null): ApplyCheck {
  const blockers: string[] = [];

  if (change.documentType !== "insurance_renewal") {
    blockers.push(
      change.documentType === "escrow_change"
        ? "HomeStay can only estimate insurance premium changes right now. For escrow statements, use the servicer's stated new payment with a counselor."
        : "Choose the document type. HomeStay currently supports insurance renewal notices.",
    );
  }

  for (const field of REQUIRED_FIELDS) {
    if (field === "documentType") continue;
    const status = fieldStatus(change, ex, field);
    if (status === "missing") {
      blockers.push(
        field === "period"
          ? "Billing frequency is unknown. Choose annual or monthly so the premium is not guessed."
          : field === "paymentMethod"
            ? "Payment method is unknown. Choose direct, escrow, or 'Not sure'."
            : `${FIELD_LABELS[field]} is missing.`,
      );
    } else if (status === "needs-confirmation") {
      blockers.push(`Confirm or edit ${FIELD_LABELS[field].toLowerCase()} — it was not clearly supported by the notice.`);
    }
  }

  for (const [field, value] of [
    ["previousAmount", change.previousAmount],
    ["newAmount", change.newAmount],
  ] as const) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      blockers.push(`${FIELD_LABELS[field]} must be a nonnegative number.`);
    }
  }

  if (blockers.length > 0) return { ok: false, blockers };

  const newMonthly = toMonthly(change.newAmount as number, change.period);
  if (newMonthly === null) return { ok: false, blockers: ["Billing frequency is unknown."] };
  return { ok: true, newInsuranceMonthly: newMonthly };
}

export type Caution = { id: string; title: string; detail: string };

/** Transparent caveats that travel with an applied change into every view. */
export function cautionsFor(change: ReviewedChange, budget: HouseholdBudget): Caution[] {
  const out: Caution[] = [];

  if (change.paymentMethod === "escrow") {
    out.push({
      id: "escrow",
      title: "Paid through escrow: lender payment not estimated",
      detail:
        "Your mortgage servicer sets the escrow payment after its own escrow analysis, which can include a shortage or catch-up amount and may start on a different date. HomeStay shows the monthly-equivalent cost only. Ask your servicer for the actual new payment notice.",
    });
  } else if (change.paymentMethod === "unknown") {
    out.push({
      id: "payment-unknown",
      title: "Payment method not confirmed",
      detail:
        "It is not clear whether you pay this premium directly or through mortgage escrow. If it is escrowed, your lender payment may change by a different amount or on a different date. HomeStay does not estimate a new lender payment.",
    });
  }

  if (change.paymentMethod !== "unknown" && budget.insurancePaymentMethod !== "unknown" && change.paymentMethod !== budget.insurancePaymentMethod) {
    out.push({
      id: "payment-mismatch",
      title: "Payment method differs from your budget",
      detail: `Your budget says insurance is paid ${budget.insurancePaymentMethod === "direct" ? "directly" : "through escrow"}, but the reviewed notice says ${change.paymentMethod === "direct" ? "directly" : "through escrow"}. Confirm which is correct.`,
    });
  }

  if (change.previousAmount !== null && change.period !== "unknown") {
    const prevMonthly = toMonthly(change.previousAmount, change.period);
    if (prevMonthly !== null && Math.abs(prevMonthly - budget.homeownerInsuranceMonthly) >= 0.01) {
      out.push({
        id: "prior-mismatch",
        title: "Prior premium does not match your budget",
        detail: `The notice's prior premium works out to ${formatUSD(prevMonthly)}/month, but your budget lists ${formatUSD(budget.homeownerInsuranceMonthly)}/month. The "before" numbers use your budget. Confirm which figure is right.`,
      });
    }
  }

  return out;
}

/**
 * Set a field from the review form. The field is tracked as "edited" only when
 * it differs from what was extracted; reverting to the original clears it.
 */
export function setReviewedField<K extends NoticeField>(
  change: ReviewedChange,
  ex: ExtractedNotice | null,
  field: K,
  value: ReviewedChange[K],
): ReviewedChange {
  const original = ex ? draftFromExtraction(ex)[field] : undefined;
  if (ex && value === original) {
    return { ...change, [field]: value, editedFields: change.editedFields.filter((f) => f !== field) };
  }
  return withEdit(change, field, value);
}

/** Mark a field as edited (user changed it from the extracted value). */
export function withEdit<K extends NoticeField>(change: ReviewedChange, field: K, value: ReviewedChange[K]): ReviewedChange {
  return {
    ...change,
    [field]: value,
    editedFields: change.editedFields.includes(field) ? change.editedFields : [...change.editedFields, field],
  };
}

export function withConfirmed(change: ReviewedChange, field: NoticeField): ReviewedChange {
  if (change.confirmedFields.includes(field)) return change;
  return { ...change, confirmedFields: [...change.confirmedFields, field] };
}
