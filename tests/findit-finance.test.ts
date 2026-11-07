import { describe, expect, it } from "vitest";
import { AVENIDA_SAN_JUAN, CAMINO_TWELVE, VISTA_PACIFICA, destination, station } from "@/lib/findit/data";
import {
  DEFAULT_ASSUMPTIONS,
  budgetShare,
  estimateMonthly,
  fitPrice,
  fitRange,
  fitSentence,
  haversineMiles,
} from "@/lib/findit/finance";
import { incomeCategory } from "@/lib/fundit/income-limits";

const CENT = 2; // toBeCloseTo(x, 2) → within $0.005
const A = DEFAULT_ASSUMPTIONS;
const CASH = 25_000;
const BUDGET = 2_500;

describe("§5.1 reference results", () => {
  it("budget share: $2,500 of $100,000 is 30.0%", () => {
    expect(budgetShare(BUDGET, 100_000)).toBeCloseTo(0.3, 10);
  });

  it("Vista Pacifica @ $369,000 demo price (about $3,800/mo), HOA $606 published, assessment scenario $100", () => {
    expect(VISTA_PACIFICA.price).toBe(369_000);
    expect(VISTA_PACIFICA.hoaMonthly).toBe(606);
    const e = estimateMonthly(369_000, 606, null, CASH, A);
    expect(e.principalInterest).toBeCloseTo(2424.74, CENT);
    expect(e.tax).toBeCloseTo(338.25, CENT);
    expect(e.insurance).toBe(150);
    expect(e.pmi).toBeCloseTo(178.97, CENT);
    expect(e.assessmentIsScenario).toBe(true);
    expect(e.hoaIsScenario).toBe(false);
    expect(e.monthly).toBeCloseTo(3797.96, CENT);
    expect(e.down).toBeCloseTo(11_070, CENT);
    expect(e.closing).toBeCloseTo(7_380, CENT);
    expect(e.cashAtClose).toBeCloseTo(18_450, CENT);
    expect(e.left).toBeCloseTo(6_550, CENT);
    expect(e.shortOfReserve).toBe(0);
    const s = fitSentence(e.monthly, BUDGET);
    expect(s.kind).toBe("above");
    expect(Math.round(s.amount!)).toBe(1298);
  });

  it("fit price with HOA $350 + assessment $100", () => {
    const f = fitPrice(BUDGET, CASH, 350, 100, A);
    expect(f.price).toBeCloseTo(238_310.72, CENT);
    expect(f.cashCap).toBeCloseTo(400_000, CENT);
    expect(f.binding).toBe("payment");
  });

  it("fit price range $219,496.71 – $269,667.39", () => {
    const r = fitRange(BUDGET, CASH, A);
    expect(r.low.price).toBeCloseTo(219_496.71, CENT);
    expect(r.high.price).toBeCloseTo(269_667.39, CENT);
  });

  it("fit price with no HOA or assessment", () => {
    expect(fitPrice(BUDGET, CASH, 0, 0, A).price).toBeCloseTo(294_752.73, CENT);
  });

  // FIND_IT.md §5.1 lists Vista → SC Station 2.19 mi and 504 → SC Station 1.95 mi. With the §3.1
  // San Clemente Station point (Census Geocoder 33.43282, −117.63345) the same haversine gives
  // 2.23 and 2.01 mi; the brief's figures appear to use a different station point. Recomputed here.
  it("straight-line miles", () => {
    const irv = destination("irvine-station").point;
    const uci = destination("uci").point;
    expect(haversineMiles(CAMINO_TWELVE.point, irv)).toBeCloseTo(12.11, 2);
    expect(haversineMiles(CAMINO_TWELVE.point, uci)).toBeCloseTo(14.11, 2);
    expect(haversineMiles(CAMINO_TWELVE.point, station("sjc").point)).toBeCloseTo(1.47, 2);
    expect(haversineMiles(VISTA_PACIFICA.point, irv)).toBeCloseTo(16.54, 2);
    expect(haversineMiles(VISTA_PACIFICA.point, station("sc").point)).toBeCloseTo(2.23, 2);
    expect(haversineMiles(AVENIDA_SAN_JUAN.point, irv)).toBeCloseTo(17.92, 2);
    expect(haversineMiles(AVENIDA_SAN_JUAN.point, station("sc").point)).toBeCloseTo(2.01, 2);
  });
});

describe("§5 guards", () => {
  it("fit price is never negative", () => {
    const f = fitPrice(100, CASH, 500, 100, A);
    expect(f.paymentCap).toBeLessThan(0);
    expect(f.price).toBe(0);
    expect(f.binding).toBe("none");
  });

  it("cash cap binds when the reserve exceeds cash", () => {
    const f = fitPrice(BUDGET, 4_000, 350, 100, A);
    expect(f.cashCap).toBeLessThan(0);
    expect(f.price).toBe(0);
    const g = fitPrice(5_000, 10_000, 0, 0, A);
    expect(g.binding).toBe("cash");
    expect(g.price).toBeCloseTo(100_000, CENT);
  });

  it("income 0 → no percentage", () => {
    expect(budgetShare(BUDGET, 0)).toBeNull();
    expect(budgetShare(BUDGET, -5)).toBeNull();
  });

  it("PMI is 0 at 20% down", () => {
    const e = estimateMonthly(475_000, 606, 0, 200_000, { ...A, downPct: 0.2 });
    expect(e.pmi).toBe(0);
    const g = fitPrice(BUDGET, 200_000, 0, 0, { ...A, downPct: 0.2 });
    const back = estimateMonthly(g.price, 0, 0, 200_000, { ...A, downPct: 0.2 });
    expect(back.monthly).toBeCloseTo(BUDGET, CENT);
  });

  it("fit price round-trips to the budget at default assumptions", () => {
    const f = fitPrice(BUDGET, CASH, 350, 100, A);
    expect(estimateMonthly(f.price, 350, 100, CASH, A).monthly).toBeCloseTo(BUDGET, CENT);
  });

  it("fit sentence: within / unknown", () => {
    expect(fitSentence(2_000, BUDGET)).toEqual({ kind: "within", amount: 500 });
    expect(fitSentence(null, BUDGET)).toEqual({ kind: "unknown", amount: null });
  });

  it("§2 HCD income category: $100,000 for 2 persons is Low income, ~90.2% of median", () => {
    const p = incomeCategory(100_000, 2)!;
    expect(p.category).toBe("lower");
    expect(p.pctOfAmi).toBeCloseTo(0.9017, 4);
  });
});
