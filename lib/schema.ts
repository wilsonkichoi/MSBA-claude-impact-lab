import { z } from "zod";

/** Finite, nonnegative dollar amount. */
export const money = z
  .number({ error: "Enter a number" })
  .refine(Number.isFinite, "Must be a finite number")
  .refine((n) => n >= 0, "Cannot be negative");

export const paymentMethodSchema = z.enum(["direct", "escrow", "unknown"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const premiumPeriodSchema = z.enum(["annual", "monthly", "unknown"]);
export type PremiumPeriod = z.infer<typeof premiumPeriodSchema>;

export const documentTypeSchema = z.enum(["insurance_renewal", "escrow_change", "unknown"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof confidenceSchema>;

/** ISO calendar date (yyyy-mm-dd) that is a real date. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-mm-dd")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Not a valid calendar date");

export const householdBudgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  householdSize: z.number().int().positive(),
  grossMonthlyIncome: money,
  netMonthlyIncome: money,
  /** Principal + interest ONLY. Taxes and insurance are entered separately. */
  mortgagePrincipalInterest: money,
  propertyTaxMonthly: money,
  homeownerInsuranceMonthly: money,
  hoaMonthly: money,
  utilitiesMonthly: money,
  livingEssentialsMonthly: money,
  minimumDebtPaymentsMonthly: money,
  emergencySavings: money,
  insurancePaymentMethod: paymentMethodSchema,
});
export type HouseholdBudget = z.infer<typeof householdBudgetSchema>;

/** Numeric budget fields a user can edit. */
export const BUDGET_MONEY_FIELDS = [
  "grossMonthlyIncome",
  "netMonthlyIncome",
  "mortgagePrincipalInterest",
  "propertyTaxMonthly",
  "homeownerInsuranceMonthly",
  "hoaMonthly",
  "utilitiesMonthly",
  "livingEssentialsMonthly",
  "minimumDebtPaymentsMonthly",
  "emergencySavings",
] as const satisfies readonly (keyof HouseholdBudget)[];
export type BudgetMoneyField = (typeof BUDGET_MONEY_FIELDS)[number];

export const noticeFieldSchema = z.enum([
  "documentType",
  "issuerName",
  "noticeDate",
  "effectiveDate",
  "previousAmount",
  "newAmount",
  "period",
  "paymentMethod",
]);
export type NoticeField = z.infer<typeof noticeFieldSchema>;

export const evidenceSchema = z.object({
  field: noticeFieldSchema,
  /** Verbatim excerpt from the source text. Never an invented citation. */
  quote: z.string().min(1),
  page: z.number().int().positive().optional(),
  confidence: confidenceSchema,
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const extractedNoticeSchema = z.object({
  documentType: documentTypeSchema,
  issuerName: z.string().optional(),
  noticeDate: isoDateSchema.optional(),
  effectiveDate: isoDateSchema.optional(),
  previousAmount: money.optional(),
  newAmount: money.optional(),
  period: premiumPeriodSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  evidence: z.array(evidenceSchema),
  uncertainties: z.array(z.string()),
  extractionMode: z.enum(["demo-fixture", "ai", "manual"]),
});
export type ExtractedNotice = z.infer<typeof extractedNoticeSchema>;

/**
 * The homeowner-reviewed version of a notice. Values may be null while still
 * unknown; a change cannot be applied until required values are present.
 */
export type ReviewedChange = {
  documentType: DocumentType;
  issuerName: string;
  noticeDate: string | null;
  effectiveDate: string | null;
  previousAmount: number | null;
  newAmount: number | null;
  period: PremiumPeriod;
  paymentMethod: PaymentMethod;
  /** Fields the homeowner changed from the extracted value. */
  editedFields: NoticeField[];
  /** Fields the homeowner explicitly confirmed despite low confidence. */
  confirmedFields: NoticeField[];
};

export type BudgetImpact = {
  oldInsuranceMonthly: number;
  newInsuranceMonthly: number;
  beforeHousingMonthly: number;
  afterHousingMonthly: number;
  beforeEssentialOutflowMonthly: number;
  afterEssentialOutflowMonthly: number;
  beforeCashBufferMonthly: number;
  afterCashBufferMonthly: number;
  monthlyCostChange: number;
  annualizedCostChange: number;
  /** Fractional change in buffer, e.g. -0.375. Null when the before buffer is 0 or negative. */
  cashBufferChangeRatio: number | null;
  /** Housing cost / GROSS monthly income. Null when gross income is 0. */
  beforeHousingToGrossIncome: number | null;
  afterHousingToGrossIncome: number | null;
};
