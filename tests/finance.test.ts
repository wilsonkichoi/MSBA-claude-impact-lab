import { describe, expect, it } from "vitest";
import {
  calculateInsuranceImpact,
  cashBufferMonthly,
  essentialOutflowMonthly,
  housingMonthly,
  housingToGrossIncomeRatio,
  InvalidAmountError,
  monthlyEquivalentOfAnnual,
  toMonthly,
} from "@/lib/finance";
import { createDemoHousehold } from "@/lib/demo-data";
import { formatPercent, formatPointChange, formatSignedPercent, formatSignedUSD, formatUSD } from "@/lib/format";

const household = createDemoHousehold();
const impact = calculateInsuranceImpact(household, monthlyEquivalentOfAnnual(3600));

describe("sample scenario: expected exact results (PROTOTYPE_PLAN §3)", () => {
  it("annual $1,800 → $3,600 converts to monthly $150 → $300", () => {
    expect(monthlyEquivalentOfAnnual(1800)).toBe(150);
    expect(monthlyEquivalentOfAnnual(3600)).toBe(300);
    expect(toMonthly(1800, "annual")).toBe(150);
    expect(toMonthly(3600, "annual")).toBe(300);
  });

  it("insurance delta is +$150/month and +$1,800/year", () => {
    expect(impact.oldInsuranceMonthly).toBe(150);
    expect(impact.newInsuranceMonthly).toBe(300);
    expect(impact.monthlyCostChange).toBe(150);
    expect(impact.annualizedCostChange).toBe(1800);
  });

  it("housing monthly is $2,120 → $2,270", () => {
    expect(impact.beforeHousingMonthly).toBe(2120);
    expect(impact.afterHousingMonthly).toBe(2270);
    expect(housingMonthly(household)).toBe(2120);
  });

  it("essential outflow is $5,000 → $5,150", () => {
    expect(impact.beforeEssentialOutflowMonthly).toBe(5000);
    expect(impact.afterEssentialOutflowMonthly).toBe(5150);
    expect(essentialOutflowMonthly(household)).toBe(5000);
  });

  it("cash buffer is $400 → $250, a 37.5% reduction", () => {
    expect(impact.beforeCashBufferMonthly).toBe(400);
    expect(impact.afterCashBufferMonthly).toBe(250);
    expect(cashBufferMonthly(household)).toBe(400);
    expect(impact.cashBufferChangeRatio).toBe(-0.375);
    expect(formatSignedPercent(impact.cashBufferChangeRatio)).toBe("-37.5%");
  });

  it("housing-to-gross-income ratio is ~0.2944 → ~0.3153 (+2.08 pts)", () => {
    expect(impact.beforeHousingToGrossIncome).toBeCloseTo(0.2944, 4);
    expect(impact.afterHousingToGrossIncome).toBeCloseTo(0.3153, 4);
    const pts = (impact.afterHousingToGrossIncome! - impact.beforeHousingToGrossIncome!) * 100;
    expect(pts).toBeCloseTo(2.08, 2);
  });

  it("displays with the documented rounding rules", () => {
    expect(formatUSD(impact.monthlyCostChange)).toBe("$150");
    expect(formatSignedUSD(impact.monthlyCostChange)).toBe("+$150");
    expect(formatPercent(impact.beforeHousingToGrossIncome)).toBe("29.4%");
    expect(formatPercent(impact.afterHousingToGrossIncome)).toBe("31.5%");
    expect(formatPointChange(impact.beforeHousingToGrossIncome, impact.afterHousingToGrossIncome)).toBe(
      "+2.1 percentage points",
    );
    expect(formatUSD(150.5)).toBe("$150.50");
    expect(formatUSD(-50)).toBe("-$50");
  });

  it("does not mutate the input budget", () => {
    const b = createDemoHousehold();
    const snapshot = { ...b };
    calculateInsuranceImpact(b, 300);
    expect(b).toEqual(snapshot);
  });
});

describe("edge cases", () => {
  it("unknown billing frequency yields no monthly value (never guessed)", () => {
    expect(toMonthly(3600, "unknown")).toBeNull();
  });

  it("zero gross income returns an unavailable ratio instead of dividing by zero", () => {
    const b = { ...createDemoHousehold(), grossMonthlyIncome: 0 };
    const r = calculateInsuranceImpact(b, 300);
    expect(r.beforeHousingToGrossIncome).toBeNull();
    expect(r.afterHousingToGrossIncome).toBeNull();
    expect(housingToGrossIncomeRatio(100, 0)).toBeNull();
    expect(formatPercent(null)).toBe("Unavailable");
  });

  it("zero net income and negative buffer do not crash", () => {
    const b = { ...createDemoHousehold(), netMonthlyIncome: 0 };
    const r = calculateInsuranceImpact(b, 300);
    expect(r.beforeCashBufferMonthly).toBe(-5000);
    expect(r.afterCashBufferMonthly).toBe(-5150);
    expect(r.cashBufferChangeRatio).toBeNull();
    expect(Number.isFinite(r.afterCashBufferMonthly)).toBe(true);
  });

  it("rejects negative or non-finite amounts", () => {
    expect(() => monthlyEquivalentOfAnnual(-1)).toThrow(InvalidAmountError);
    expect(() => calculateInsuranceImpact(createDemoHousehold(), Number.NaN)).toThrow(InvalidAmountError);
    expect(() => calculateInsuranceImpact({ ...createDemoHousehold(), utilitiesMonthly: Infinity }, 300)).toThrow(
      InvalidAmountError,
    );
  });

  it("handles a premium decrease", () => {
    const r = calculateInsuranceImpact(createDemoHousehold(), 100);
    expect(r.monthlyCostChange).toBe(-50);
    expect(r.afterCashBufferMonthly).toBe(450);
  });
});
