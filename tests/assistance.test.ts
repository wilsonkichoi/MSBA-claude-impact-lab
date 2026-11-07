import { describe, expect, it } from "vitest";
import { buildActionPlan } from "@/lib/actions";
import { ASSISTANCE_RESOURCES, buildResourceHandoff, matchResources, type MatchContext } from "@/lib/assistance";
import { buildCounselorSummary, summaryToText } from "@/lib/counselor";
import type { SampleScenarioId } from "@/lib/demo-data";
import { buildInsight } from "@/lib/explain";
import { calculateInsuranceImpact, toMonthly } from "@/lib/finance";
import { isoDateSchema, type HouseholdBudget } from "@/lib/schema";
import { createInitialState, reducer, type AppState } from "@/lib/state";

/** Run a sample scenario through the real reducer: pick → load → apply. */
function appliedScenario(id: SampleScenarioId): AppState {
  let s = createInitialState();
  s = reducer(s, { type: "SELECT_SCENARIO", id });
  s = reducer(s, { type: "LOAD_SAMPLE" });
  s = reducer(s, { type: "APPLY_CHANGE" });
  expect(s.step).toBe("impact");
  return s;
}

function contextFor(s: AppState, budget: HouseholdBudget = s.budget): MatchContext {
  const change = s.applied!;
  const impact = calculateInsuranceImpact(budget, toMonthly(change.newAmount!, change.period)!);
  return { change, impact };
}

const CONCLUSION = /you are eligible|you're eligible|you qualify|you will save|you'll save|guaranteed|approved for/i;

describe("assistance catalog", () => {
  it("has 3–4 complete entries with an official https URL, a valid check date, and a status", () => {
    expect(ASSISTANCE_RESOURCES.length).toBeGreaterThanOrEqual(3);
    expect(ASSISTANCE_RESOURCES.length).toBeLessThanOrEqual(4);
    expect(new Set(ASSISTANCE_RESOURCES.map((r) => r.id)).size).toBe(ASSISTANCE_RESOURCES.length);
    for (const r of ASSISTANCE_RESOURCES) {
      expect(new URL(r.officialUrl).protocol, r.id).toBe("https:");
      expect(isoDateSchema.safeParse(r.lastVerified).success, r.id).toBe(true);
      expect(["open", "closed", "verify"]).toContain(r.status);
      expect(r.name && r.provider && r.benefitDescription, r.id).toBeTruthy();
      expect(r.requirements.length, r.id).toBeGreaterThan(0);
      expect(r.citiesOrArea.length, r.id).toBeGreaterThan(0);
    }
  });

  it("never states a conclusion about eligibility or savings", () => {
    expect(JSON.stringify(ASSISTANCE_RESOURCES)).not.toMatch(CONCLUSION);
  });
});

describe("context-aware matching", () => {
  const cases: [SampleScenarioId, string[], [number, number], [number, number]][] = [
    ["direct", ["ca-cdi-consumer-hotline", "hud-housing-counseling", "oc-homeowners-exemption"], [150, 300], [400, 250]],
    ["escrow", ["hud-housing-counseling", "ca-cdi-consumer-hotline", "oc-homeowners-exemption"], [150, 270], [400, 280]],
  ];

  for (const [id, expectedIds, insurance, cushion] of cases) {
    it(`${id} scenario: returns ${expectedIds.join(", ")} and leaves budget and impact unchanged`, () => {
      const s = appliedScenario(id);
      const budgetBefore = structuredClone(s.budget);
      const ctx = contextFor(s);
      const impactBefore = structuredClone(ctx.impact);

      const matches = matchResources(s.budget, ctx);
      expect(matches.map((m) => m.resource.id)).toEqual(expectedIds);
      expect(matches.length).toBeLessThanOrEqual(3);
      // Deterministic.
      expect(matchResources(s.budget, ctx)).toEqual(matches);

      // No input mutated, and the impact numbers are exactly the published sample results.
      expect(s.budget).toEqual(budgetBefore);
      expect(ctx.impact).toEqual(impactBefore);
      expect(calculateInsuranceImpact(s.budget, ctx.impact.newInsuranceMonthly)).toEqual(impactBefore);
      expect([ctx.impact.oldInsuranceMonthly, ctx.impact.newInsuranceMonthly]).toEqual(insurance);
      expect([ctx.impact.beforeCashBufferMonthly, ctx.impact.afterCashBufferMonthly]).toEqual(cushion);

      for (const m of matches) {
        expect(m.whyItMayApply.length, m.resource.id).toBeGreaterThan(0);
        expect(m.stillUnknown.length, m.resource.id).toBeGreaterThan(0);
        for (const q of m.stillUnknown) expect(q.question, m.resource.id).toMatch(/\?/);
      }
    });
  }

  it("keeps the OC Homeowners' Exemption wording", () => {
    const s = appliedScenario("direct");
    const ex = matchResources(s.budget, contextFor(s)).find((m) => m.resource.id === "oc-homeowners-exemption")!;
    expect(ex.whyItMayApply).toEqual([
      "Your home is listed in Santa Ana, CA, which is in Orange County.",
      "Your budget includes property tax, so you are paying the tax this exemption reduces.",
    ]);
    expect(ex.resource.benefitDescription).toMatch(/at least \$70 per year/);
  });

  it("why-lines cite the household's own facts", () => {
    const s = appliedScenario("escrow");
    const byId = Object.fromEntries(matchResources(s.budget, contextFor(s)).map((m) => [m.resource.id, m.whyItMayApply.join(" ")]));
    expect(byId["ca-cdi-consumer-hotline"]).toMatch(/\$1,800 to \$3,240 \(about \+\$120\/month\)/);
    expect(byId["hud-housing-counseling"]).toMatch(/mortgage escrow/);
    expect(byId["hud-housing-counseling"]).toMatch(/\$280\/month/);
  });

  it("gives a household outside Orange County no OC-only resources", () => {
    const s = appliedScenario("direct");
    for (const city of ["Fresno, CA", "Riverside, CA", "Phoenix, AZ"]) {
      const budget = { ...s.budget, city };
      const ids = matchResources(budget, contextFor(s, budget)).map((m) => m.resource.id);
      expect(ids, city).not.toContain("oc-homeowners-exemption");
    }
    const az = { ...s.budget, city: "Phoenix, AZ" };
    expect(matchResources(az, contextFor(s, az)).map((m) => m.resource.id)).toEqual(["hud-housing-counseling"]);
  });

  it("suggests Property Tax Postponement only when listed income is at or under the published limit and the cushion is thin", () => {
    const s = appliedScenario("direct");
    expect(matchResources(s.budget, contextFor(s)).map((m) => m.resource.id)).not.toContain("ca-sco-property-tax-postponement");

    const lowIncome = { ...s.budget, city: "Fresno, CA", grossMonthlyIncome: 4500, netMonthlyIncome: 4000, livingEssentialsMonthly: 1000 };
    const matches = matchResources(lowIncome, contextFor(s, lowIncome));
    const ptp = matches.find((m) => m.resource.id === "ca-sco-property-tax-postponement");
    expect(ptp).toBeDefined();
    expect(ptp!.stillUnknown.map((q) => q.question).join(" ")).toMatch(/62 years old, blind, or disabled/);
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("does not suggest CDI when the premium did not increase", () => {
    const s = appliedScenario("direct");
    const flat = calculateInsuranceImpact(s.budget, 150);
    const ids = matchResources(s.budget, { change: { ...s.applied!, newAmount: 1800 }, impact: flat }).map((m) => m.resource.id);
    expect(ids).toEqual(["oc-homeowners-exemption"]);
  });
});

describe("counselor handoff", () => {
  function copyText(s: AppState): string {
    const ctx = contextFor(s);
    const actions = buildActionPlan(s.budget, ctx.change, ctx.impact);
    const summary = buildCounselorSummary(s.budget, ctx.change, s.extraction, ctx.impact);
    const handoff = buildResourceHandoff(matchResources(s.budget, ctx), s.resourceStatus);
    return summaryToText(summary, buildInsight(ctx.change, ctx.impact), actions, handoff);
  }

  for (const id of ["direct", "escrow"] as const) {
    it(`${id}: Copy summary lists each resource with status, open questions, URL, and check date`, () => {
      let s = appliedScenario(id);
      const text = copyText(s);
      expect(text).toMatch(/POSSIBLE RESOURCES TO VERIFY/);
      expect(text).toMatch(/Not eligibility determinations/);
      const matches = matchResources(s.budget, contextFor(s));
      for (const m of matches) {
        expect(text).toContain(m.resource.name);
        expect(text).toContain(m.resource.officialUrl);
        for (const q of m.stillUnknown) expect(text).toContain(q.question);
      }
      expect(text.match(/Counselor status: To verify/g)).toHaveLength(matches.length);
      expect(text).toMatch(/Source checked: November 6, 2026/);
      expect(text).not.toMatch(CONCLUSION);

      s = reducer(s, { type: "SET_RESOURCE_STATUS", id: "oc-homeowners-exemption", status: "applied" });
      expect(copyText(s)).toMatch(/Homeowners' Exemption — Orange County Assessor Department\n {3}Counselor status: Applied/);
    });
  }

  it("view switching keeps statuses; Reset clears them", () => {
    let s = appliedScenario("escrow");
    s = reducer(s, { type: "SWITCH_VIEW", view: "caseworker" });
    s = reducer(s, { type: "SET_RESOURCE_STATUS", id: "hud-housing-counseling", status: "confirmed" });
    const before = structuredClone({ budget: s.budget, applied: s.applied, resourceStatus: s.resourceStatus });
    s = reducer(s, { type: "SWITCH_VIEW", view: "homeowner" });
    s = reducer(s, { type: "SWITCH_VIEW", view: "caseworker" });
    expect({ budget: s.budget, applied: s.applied, resourceStatus: s.resourceStatus }).toEqual(before);
    s = reducer(s, { type: "RESET" });
    expect(s.resourceStatus).toEqual({});
    expect(s).toEqual(createInitialState());
  });
});
