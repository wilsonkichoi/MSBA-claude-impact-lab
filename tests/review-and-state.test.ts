import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildActionPlan } from "@/lib/actions";
import { buildCounselorSummary, summaryToText } from "@/lib/counselor";
import {
  createDemoHousehold,
  createSampleExtraction,
  createScenarioExtraction,
  createScenarioHousehold,
  DEMO_HOUSEHOLD,
  ESCROW_HOUSEHOLD,
  ESCROW_NOTICE_FIXTURE,
  ESCROW_NOTICE_TEXT,
} from "@/lib/demo-data";
import { analyzeNotice } from "@/lib/notice-extraction";
import { extractedNoticeSchema } from "@/lib/schema";
import { buildExplanation, buildInsight } from "@/lib/explain";
import { calculateInsuranceImpact } from "@/lib/finance";
import { cautionsFor, checkApplicable, draftFromExtraction, emptyManualDraft, fieldStatus, withConfirmed, withEdit } from "@/lib/review";
import { createInitialState, reducer, type AppState } from "@/lib/state";

const extraction = createSampleExtraction();
const draft = draftFromExtraction(extraction);

describe("review gating", () => {
  it("the sample draft can be applied and yields $300/month", () => {
    const r = checkApplicable(draft, extraction);
    expect(r).toEqual({ ok: true, newInsuranceMonthly: 300 });
  });

  it("unknown billing frequency prevents automatic application", () => {
    const d = { ...draft, period: "unknown" as const };
    const r = checkApplicable(d, extraction);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.blockers.join(" ")).toMatch(/Billing frequency is unknown/);
  });

  it("fields without high-confidence evidence need confirmation before applying", () => {
    const ex = { ...extraction, evidence: extraction.evidence.filter((e) => e.field !== "newAmount") };
    expect(fieldStatus(draft, ex, "newAmount")).toBe("needs-confirmation");
    expect(checkApplicable(draft, ex).ok).toBe(false);
    expect(checkApplicable(withConfirmed(draft, "newAmount"), ex).ok).toBe(true);
  });

  it("user edits are tracked and the edited value is used", () => {
    const edited = withEdit(draft, "newAmount", 3000);
    expect(edited.editedFields).toEqual(["newAmount"]);
    expect(fieldStatus(edited, extraction, "newAmount")).toBe("edited");
    expect(checkApplicable(edited, extraction)).toEqual({ ok: true, newInsuranceMonthly: 250 });
  });

  it("a blank manual draft is blocked until values are entered", () => {
    const r = checkApplicable(emptyManualDraft(), null);
    expect(r.ok).toBe(false);
  });

  it("'Not sure' payment method is allowed only once explicitly confirmed", () => {
    const d = { ...draft, paymentMethod: "unknown" as const };
    expect(checkApplicable(d, extraction).ok).toBe(false);
    expect(checkApplicable(withConfirmed(d, "paymentMethod"), extraction).ok).toBe(true);
  });
});

describe("escrow / unknown payment method", () => {
  const budget = createDemoHousehold();
  const impact = calculateInsuranceImpact(budget, 300);

  it("escrowed policy shows a caution and does not claim a precise new lender payment", () => {
    const d = { ...draft, paymentMethod: "escrow" as const };
    const cautions = cautionsFor(d, budget);
    expect(cautions.map((c) => c.id)).toContain("escrow");
    expect(cautions.find((c) => c.id === "escrow")!.detail).toMatch(/does not|monthly-equivalent cost only/);
    const actions = buildActionPlan(budget, d, impact);
    expect(actions[0]!.id).toBe("ask-servicer");
    const allText = [buildInsight(d, impact), ...buildExplanation(d, impact).map((p) => p.text), ...actions.map((a) => a.why)].join(" ");
    expect(allText).not.toMatch(/new (mortgage|lender) payment (is|will be) \$/i);
    expect(Object.keys(impact)).not.toContain("newLenderPayment");
  });

  it("unknown payment method shows a caution", () => {
    const cautions = cautionsFor({ ...draft, paymentMethod: "unknown" }, budget);
    expect(cautions.map((c) => c.id)).toContain("payment-unknown");
  });

  it("flags when the notice's prior premium disagrees with the budget", () => {
    const cautions = cautionsFor({ ...draft, previousAmount: 2400 }, budget);
    expect(cautions.map((c) => c.id)).toContain("prior-mismatch");
  });

  it("the sample (direct, matching prior) has no cautions", () => {
    expect(cautionsFor(draft, budget)).toEqual([]);
  });
});

describe("explanation and actions", () => {
  const budget = createDemoHousehold();
  const impact = calculateInsuranceImpact(budget, 300);

  it("produces the exact user-facing insight from the spec", () => {
    expect(buildInsight(draft, impact)).toBe(
      "Your insurance renewal increases your estimated monthly housing costs by $150 starting December 1. If the rest of your budget stays the same, your estimated monthly money left after listed essential expenses drops from $400 to $250.",
    );
  });

  it("ranks the four sample actions in the spec's order", () => {
    expect(buildActionPlan(budget, draft, impact).map((a) => a.id)).toEqual([
      "confirm-renewal",
      "compare-coverage",
      "update-plan",
      "talk-to-counselor",
    ]);
  });

  it("moves counselor up when essentials exceed take-home pay", () => {
    const tight = { ...budget, netMonthlyIncome: 5000 };
    const ids = buildActionPlan(tight, draft, calculateInsuranceImpact(tight, 300)).map((a) => a.id);
    expect(ids[1]).toBe("talk-to-counselor");
  });

  it("negative buffers are described as a shortfall", () => {
    const tight = { ...budget, netMonthlyIncome: 5000 };
    expect(buildInsight(draft, calculateInsuranceImpact(tight, 300))).toMatch(/shortfall of \$150/);
  });

  it("never promises savings or predicts foreclosure", () => {
    const text = JSON.stringify(buildActionPlan(budget, draft, impact)) + buildExplanation(draft, impact).map((p) => p.text).join(" ");
    expect(text).not.toMatch(/foreclos|you will save|guaranteed|risk score/i);
  });
});

describe("counselor summary", () => {
  const budget = createDemoHousehold();
  const impact = calculateInsuranceImpact(budget, 300);
  const summary = buildCounselorSummary(budget, draft, extraction, impact);

  it("includes evidence quotes, open questions, and the impact numbers", () => {
    expect(summary.evidence.find((e) => e.field === "newAmount")!.quote).toBe(
      "Renewal annual homeowners insurance premium: $3,600.00",
    );
    expect(summary.openQuestions[0]).toMatch(/Confirm insurance is paid directly/);
    const text = summaryToText(summary, buildInsight(draft, impact), buildActionPlan(budget, draft, impact));
    expect(text).toMatch(/DEMO \/ SYNTHETIC DATA ONLY/);
    expect(text).toMatch(/\$400 → \$250 \(-\$150 \(-37\.5%\)\)/);
    expect(text).toMatch(/29\.4% → 31\.5%/);
    expect(text).not.toMatch(/approved/i);
  });
});

describe("app state", () => {
  function demoFlow(): AppState {
    let s = createInitialState();
    s = reducer(s, { type: "LOAD_SAMPLE" });
    s = reducer(s, { type: "APPLY_CHANGE" });
    return s;
  }

  it("sample flow reaches impact with the change stored separately from the budget", () => {
    const s = demoFlow();
    expect(s.step).toBe("impact");
    expect(s.applied?.newAmount).toBe(3600);
    expect(s.budget.homeownerInsuranceMonthly).toBe(150);
  });

  it("switching between views does not mutate financial data", () => {
    const s = demoFlow();
    const before = structuredClone({ budget: s.budget, applied: s.applied, draft: s.draft, extraction: s.extraction });
    let t = reducer(s, { type: "SWITCH_VIEW", view: "caseworker" });
    t = reducer(t, { type: "SWITCH_VIEW", view: "homeowner" });
    t = reducer(t, { type: "SWITCH_VIEW", view: "caseworker" });
    expect({ budget: t.budget, applied: t.applied, draft: t.draft, extraction: t.extraction }).toEqual(before);
  });

  it("editing the draft after applying does not change the applied snapshot", () => {
    const s = demoFlow();
    const t = reducer(s, { type: "UPDATE_DRAFT", draft: withEdit(s.draft!, "newAmount", 9999) });
    expect(t.applied?.newAmount).toBe(3600);
  });

  it("an unapplyable draft cannot be applied", () => {
    let s = reducer(createInitialState(), { type: "LOAD_SAMPLE" });
    s = reducer(s, { type: "UPDATE_DRAFT", draft: { ...s.draft!, period: "unknown" } });
    s = reducer(s, { type: "APPLY_CHANGE" });
    expect(s.applied).toBeNull();
    expect(s.step).toBe("review");
  });

  it("rejects invalid budget edits", () => {
    const s = createInitialState();
    expect(reducer(s, { type: "SET_BUDGET_FIELD", field: "utilitiesMonthly", value: -1 })).toBe(s);
    expect(reducer(s, { type: "SET_BUDGET_FIELD", field: "utilitiesMonthly", value: Number.NaN })).toBe(s);
  });

  it("reset returns to the exact synthetic scenario", () => {
    let s = demoFlow();
    s = reducer(s, { type: "SET_BUDGET_FIELD", field: "netMonthlyIncome", value: 1 });
    s = reducer(s, { type: "SWITCH_VIEW", view: "caseworker" });
    s = reducer(s, { type: "TOGGLE_CHECKLIST", index: 0 });
    s = reducer(s, { type: "RESET" });
    expect(s).toEqual(createInitialState());
    expect(s.budget).toEqual(DEMO_HOUSEHOLD);
  });

  it("the seed household cannot be mutated", () => {
    expect(Object.isFrozen(DEMO_HOUSEHOLD)).toBe(true);
  });
});

describe("escrow-paid sample scenario", () => {
  const budget = createScenarioHousehold("escrow");
  const ex = createScenarioExtraction("escrow");
  const d = draftFromExtraction(ex);

  it("fixture is schema-valid, quotes are verbatim, and the public file matches", () => {
    expect(() => extractedNoticeSchema.parse(ESCROW_NOTICE_FIXTURE)).not.toThrow();
    for (const ev of ESCROW_NOTICE_FIXTURE.evidence) expect(ESCROW_NOTICE_TEXT.includes(ev.quote), ev.quote).toBe(true);
    const file = readFileSync(path.join(process.cwd(), "public/samples/sample-insurance-renewal-escrow.txt"), "utf8");
    expect(file).toBe(ESCROW_NOTICE_TEXT);
    expect(ESCROW_NOTICE_TEXT).toMatch(/FICTIONAL \/ NOT A REAL INSURANCE NOTICE/);
  });

  it("the exact escrow notice returns its own demo fixture without a model", async () => {
    const r = await analyzeNotice(ESCROW_NOTICE_TEXT, { extractor: null });
    expect(r).toMatchObject({ status: "ok", extraction: { extractionMode: "demo-fixture", paymentMethod: "escrow", newAmount: 3240 } });
  });

  it("has clean numbers: $150 → $270/month, cushion $400 → $280", () => {
    expect(budget.insurancePaymentMethod).toBe("escrow");
    const check = checkApplicable(d, ex);
    expect(check).toEqual({ ok: true, newInsuranceMonthly: 270 });
    const impact = calculateInsuranceImpact(budget, 270);
    expect(impact.monthlyCostChange).toBe(120);
    expect(impact.annualizedCostChange).toBe(1440);
    expect([impact.beforeHousingMonthly, impact.afterHousingMonthly]).toEqual([2120, 2240]);
    expect([impact.beforeEssentialOutflowMonthly, impact.afterEssentialOutflowMonthly]).toEqual([5000, 5120]);
    expect([impact.beforeCashBufferMonthly, impact.afterCashBufferMonthly]).toEqual([400, 280]);
    expect(impact.cashBufferChangeRatio).toBe(-0.3);
    expect(impact.afterHousingToGrossIncome).toBeCloseTo(0.3111, 4);
  });

  it("shows the escrow caution and servicer action, and never states a new lender payment", () => {
    const impact = calculateInsuranceImpact(budget, 270);
    expect(cautionsFor(d, budget).map((c) => c.id)).toEqual(["escrow"]);
    const actions = buildActionPlan(budget, d, impact);
    expect(actions[0]!.id).toBe("ask-servicer");
    expect(actions[0]!.how.join(" ")).toMatch(/escrow analysis/);
    const summary = buildCounselorSummary(budget, d, ex, impact);
    expect(summary.openQuestions[0]).toMatch(/servicer's escrow analysis/);
    const insight = buildInsight(d, impact);
    expect(insight).toMatch(/by \$120 starting December 1/);
    const allText = [insight, ...buildExplanation(d, impact).map((p) => p.text), summaryToText(summary, insight, actions)].join(" ");
    expect(allText).not.toMatch(/(new|monthly) (mortgage|lender|escrow) payment (is|will be|of|would be) (about )?\$/i);
    expect(allText).toMatch(/monthly-equivalent cost only/);
    expect(Object.keys(impact).some((k) => /lender|mortgagePayment|escrowPayment/i.test(k))).toBe(false);
  });

  it("picker loads the escrow scenario; reset returns to the direct-pay default", () => {
    let s = reducer(createInitialState(), { type: "SELECT_SCENARIO", id: "escrow" });
    expect(s.budget).toEqual(ESCROW_HOUSEHOLD);
    s = reducer(s, { type: "LOAD_SAMPLE" });
    expect(s.notice?.text).toBe(ESCROW_NOTICE_TEXT);
    expect(s.extraction?.paymentMethod).toBe("escrow");
    s = reducer(s, { type: "APPLY_CHANGE" });
    expect(s.applied?.newAmount).toBe(3240);
    s = reducer(s, { type: "RESET" });
    expect(s).toEqual(createInitialState());
    expect(s.scenarioId).toBe("direct");
    expect(s.budget).toEqual(DEMO_HOUSEHOLD);
    expect(Object.isFrozen(ESCROW_HOUSEHOLD)).toBe(true);
  });
});

describe("setReviewedField", () => {
  it("marks a changed field as edited and clears it when reverted", async () => {
    const { setReviewedField } = await import("@/lib/review");
    const edited = setReviewedField(draft, extraction, "newAmount", 3000);
    expect(edited.editedFields).toEqual(["newAmount"]);
    const reverted = setReviewedField(edited, extraction, "newAmount", 3600);
    expect(reverted.editedFields).toEqual([]);
    expect(reverted.newAmount).toBe(3600);
  });

  it("always marks manual-entry fields as edited", async () => {
    const { setReviewedField } = await import("@/lib/review");
    const d = setReviewedField(emptyManualDraft(), null, "period", "annual");
    expect(d.editedFields).toEqual(["period"]);
  });
});

describe("assistance navigator (P2)", () => {
  it("surfaces the OC Homeowners' Exemption for Santa Ana as 'verify', without changing the budget", async () => {
    const { matchResources } = await import("@/lib/assistance");
    const budget = createDemoHousehold();
    const before = { ...budget };
    const matches = matchResources(budget);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.resource.status).toBe("verify");
    expect(matches[0]!.stillUnknown.length).toBeGreaterThan(0);
    expect(budget).toEqual(before);
    expect(calculateInsuranceImpact(budget, 300).afterCashBufferMonthly).toBe(250);
  });

  it("does not match households outside Orange County", async () => {
    const { matchResources } = await import("@/lib/assistance");
    expect(matchResources({ ...createDemoHousehold(), city: "Fresno, CA" })).toEqual([]);
  });
});
