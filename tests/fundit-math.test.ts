import { describe, expect, it } from "vitest";
import { amiForUnit, personsForUnit, programCapMonthly, solvePrice } from "@/lib/fundit/affordability";
import { HOME_2026_OC, incomeCategory, STATE_2026_OC } from "@/lib/fundit/income-limits";
import {
  computeProject,
  decisionSignal,
  DEFAULT_INPUTS,
  INSURANCE_LEVER_MONTHLY,
  levers,
  sensitivityRanking,
  type PencilInputs,
} from "@/lib/fundit/project";
import { syntheticCheck } from "@/lib/fundit/property";
import { SOURCE_LIST } from "@/lib/fundit/sources";
import { formatUSD } from "@/lib/format";
import { isoDateSchema } from "@/lib/schema";

const CENT = 2; // toBeCloseTo(x, 2) → within $0.005

const capOn: PencilInputs = { ...DEFAULT_INPUTS, applyCap: true };
const capOff: PencilInputs = { ...DEFAULT_INPUTS, applyCap: false };
const donated = (x: PencilInputs): PencilInputs => ({ ...x, landMode: "donated" });

describe("income-limit tables (§3.1, §3.2)", () => {
  it("has the OC AMI and key 4-person limits", () => {
    expect(STATE_2026_OC.ami4).toBe(138600);
    expect(STATE_2026_OC.rows.median[3]).toBe(138600);
    expect(STATE_2026_OC.rows.low[3]).toBe(148850);
    expect(STATE_2026_OC.rows.veryLow[3]).toBe(93050);
  });
  it("State and HOME 30/50/80 rows are equal", () => {
    expect([...HOME_2026_OC.rows.pct30]).toEqual([...STATE_2026_OC.rows.extremelyLow]);
    expect([...HOME_2026_OC.rows.pct50]).toEqual([...STATE_2026_OC.rows.veryLow]);
    expect([...HOME_2026_OC.rows.pct80]).toEqual([...STATE_2026_OC.rows.low]);
  });
  it("every source has an https URL and ISO dates", () => {
    expect(new Set(SOURCE_LIST.map((s) => s.id)).size).toBe(SOURCE_LIST.length);
    for (const s of SOURCE_LIST) {
      expect(new URL(s.url).protocol, s.id).toBe("https:");
      expect(isoDateSchema.safeParse(s.checkedDate).success, s.id).toBe(true);
      if (s.date !== null) expect(isoDateSchema.safeParse(s.date).success, s.id).toBe(true);
    }
  });
});

describe("50052.5 caps (§3.4, §5.1)", () => {
  it("gives the four OC 3BR monthly caps", () => {
    const ami = amiForUnit(3)!;
    expect(ami).toBe(138600);
    expect(programCapMonthly("extremelyLow", ami)).toBeCloseTo(1039.5, CENT);
    expect(programCapMonthly("veryLow", ami)).toBeCloseTo(1732.5, CENT);
    expect(programCapMonthly("lower", ami)).toBeCloseTo(2425.5, CENT);
    expect(programCapMonthly("moderate", ami)).toBeCloseTo(4446.75, CENT);
  });
  it("maps 3BR to 4 persons and >4BR to Unknown", () => {
    expect(personsForUnit(3)).toBe(4);
    expect(amiForUnit(5)).toBeNull();
    expect(personsForUnit(5)).toBeNull();
  });
  it("places $100,000 for 4 people in lower income at 72.2% of AMI", () => {
    const p = incomeCategory(100000, 4)!;
    expect(p.category).toBe("lower");
    expect((p.pctOfAmi * 100).toFixed(1)).toBe("72.2");
    expect(p.lowerBound).toEqual({ label: "very low", value: 93050 });
    expect(p.upperBound).toEqual({ label: "low", value: 148850 });
  });
});

describe("§5.4 reference results", () => {
  const cases = [
    {
      name: "cap applied",
      x: capOn,
      budget: 2425.5,
      mortgage: 254710.85,
      price: 264710.85,
      proceeds: 1058843.39,
      gapAsking: 6841156.61,
      gapDonated: 941156.61,
      perHome: 235289.15,
      gift: 916156.61,
      rate768: 990047.29,
      rateDelta: 48890.68,
    },
    {
      name: "cap not applied",
      x: capOff,
      budget: 2500,
      mortgage: 265708.22,
      price: 275708.22,
      proceeds: 1102832.86,
      gapAsking: 6797167.14,
      gapDonated: 897167.14,
      perHome: 224291.78,
      gift: 872167.14,
      rate768: 948168.72,
      rateDelta: 51001.58,
    },
  ];
  for (const c of cases) {
    describe(c.name, () => {
      const r = computeProject(c.x);
      const d = computeProject(donated(c.x));
      it("budget, mortgage, price, proceeds", () => {
        expect(r.usedBudget).toBeCloseTo(c.budget, CENT);
        expect(r.price.principalInterest).toBeCloseTo(c.budget - 700, CENT);
        expect(r.price.mortgage).toBeCloseTo(c.mortgage, CENT);
        expect(r.price.price).toBeCloseTo(c.price, CENT);
        expect(r.proceeds).toBeCloseTo(c.proceeds, CENT);
      });
      it("gaps at asking, donated, with gift, at 7.68%", () => {
        expect(r.gap).toBeCloseTo(c.gapAsking, CENT);
        expect(d.gap).toBeCloseTo(c.gapDonated, CENT);
        expect(d.gapPerHome).toBeCloseTo(c.perHome, CENT);
        expect(computeProject({ ...donated(c.x), donorGift: 25000 }).gap).toBeCloseTo(c.gift, CENT);
        const r768 = computeProject({ ...donated(c.x), rateMode: "custom", customRate: 7.68 });
        expect(r768.gap).toBeCloseTo(c.rate768, CENT);
        expect(levers(donated(c.x)).ratePlusStep.project).toBeCloseTo(c.rateDelta, CENT);
      });
      it("max land supported is negative (none)", () => {
        expect(r.maxLandSupported).toBeCloseTo(-c.gapDonated, CENT);
        expect(r.maxLandSupported).toBeLessThan(0);
      });
      it("insurance +$150/mo per home adds $88,569.41", () => {
        expect(levers(c.x).insurance.project).toBeCloseTo(88569.41, CENT);
        const withIns = computeProject({ ...donated(c.x), insuranceExtraMonthly: INSURANCE_LEVER_MONTHLY });
        expect(withIns.gap - d.gap).toBeCloseTo(88569.41, CENT);
      });
    });
  }
  it("land per home at asking and the cost of the cap", () => {
    expect(computeProject(capOn).landPerHome).toBe(1475000);
    expect(levers(capOn).capOff.project).toBeCloseTo(-43989.47, CENT);
    expect(levers(capOn).landAskingToDonated.project).toBeCloseTo(-5900000, CENT);
  });
  it("price is never negative", () => {
    const p = solvePrice({ budgetMonthly: 500, reserveMonthly: 700, buyerCash: 10000, ratePct: 7.18 });
    expect(p.price).toBe(0);
    expect(p.pencilsAtBudget).toBe(false);
    expect(computeProject({ ...capOn, grossIncome: 10000 }).price.price).toBe(0);
  });
  it("synthetic organizers' bill balances to $0", () => {
    const s = syntheticCheck();
    expect(s.costTotal).toBe(535000);
    expect(s.paidTotal).toBe(535000);
    expect(s.balance).toBe(0);
    expect(s.balances).toBe(true);
  });
});

describe("§5.5 verify-first ranking", () => {
  it("cap not applied: order and values", () => {
    const rows = sensitivityRanking(donated(capOff));
    expect(rows.map((r) => r.id)).toEqual(["devCost", "reserve", "budget", "rate", "buyerCash"]);
    const v = rows.map((r) => r.delta);
    expect(v[0]).toBeCloseTo(200000, CENT);
    expect(v[1]).toBeCloseTo(59046.27, CENT);
    expect(v[2]).toBeCloseTo(59046.27, CENT);
    expect(v[3]).toBeCloseTo(51001.58, CENT);
    expect(v[4]).toBeCloseTo(20000, CENT);
  });
  it("cap applied: same order, rate step $48,890.68", () => {
    const rows = sensitivityRanking(capOn);
    expect(rows.map((r) => r.id)).toEqual(["devCost", "reserve", "budget", "rate", "buyerCash"]);
    expect(rows[2]!.delta).toBeCloseTo(59046.27, CENT);
    expect(rows[3]!.delta).toBeCloseTo(48890.68, CENT);
  });
  it("decision signal reads like the brief", () => {
    const d = decisionSignal(capOn, formatUSD);
    expect(d.headline).toBe("At asking price, 504 E Avenida San Juan does not pencil for 4 homes.");
    expect(d.freeLandLine).toContain(formatUSD(941156.61));
    expect(d.verifyFirst).toBe("Verify first: the $2,000,000 development budget. A 10% miss moves the gap by $200,000.");
  });
});
