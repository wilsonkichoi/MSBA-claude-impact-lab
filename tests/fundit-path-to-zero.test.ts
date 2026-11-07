import { describe, expect, it } from "vitest";
import { buildMemo } from "@/lib/fundit/memo";
import { defaultStack, evaluateStack, singleChanges, stackSentence, type StackChoice } from "@/lib/fundit/path-to-zero";
import { computeProject, DEFAULT_INPUTS, type PencilInputs } from "@/lib/fundit/project";
import { createInitialPencilState, effectiveInputs, pencilReducer, type PencilState } from "@/lib/fundit/state";
import { formatUSDWhole } from "@/lib/format";

const CENT = 2;
const donated: PencilInputs = { ...DEFAULT_INPUTS, landMode: "donated" };
const BANNED = /you qualify|you are eligible|guaranteed|approved for/i;

function stackFor(s: PencilState) {
  const { inputs, totals } = effectiveInputs(s);
  return evaluateStack(inputs, totals, s.stack);
}

describe("single changes that reach $0 (donated land, cap applied, 7.18%)", () => {
  const sc = singleChanges(donated);
  it("each lever's closing value, verified by recomputing the gap", () => {
    expect(sc.baseGap).toBeCloseTo(941156.61, CENT);
    expect(sc.grants.value).toBeCloseTo(941156.61, CENT);
    expect(sc.buyerAssistance.value!).toBeCloseTo(235289.15, CENT);
    expect(sc.devCost.value!).toBeCloseTo(1058843.39, CENT);
    expect(sc.rate.value!).toBeCloseTo(1.6455, 3);
    expect(sc.income.value!).toBeGreaterThan(160700);
    expect(sc.income.value!).toBeLessThan(160800);
    expect(sc.income.changesWhoIsServed).toBe(true);
    expect(sc.income.category).toBe("Moderate income");
    // Each value really closes the gap, and stays within a cent / a hundredth of a point.
    expect(computeProject({ ...donated, rateMode: "custom", customRate: sc.rate.value! }).gap).toBeLessThanOrEqual(0.005);
    expect(computeProject({ ...donated, rateMode: "custom", customRate: sc.rate.value! + 0.01 }).gap).toBeGreaterThan(0);
    expect(computeProject({ ...donated, committedBuyerAssistancePerHome: sc.buyerAssistance.value! }).gap).toBeCloseTo(0, CENT);
    expect(computeProject({ ...donated, devCost: sc.devCost.value! }).gap).toBeCloseTo(0, CENT);
    expect(computeProject({ ...donated, grossIncome: sc.income.value! }).gap).toBeLessThanOrEqual(0.005);
    expect(computeProject({ ...donated, grossIncome: sc.income.value! - 1 }).gap).toBeGreaterThan(0);
  });
  it("at asking price no rate or development budget works", () => {
    const ask = singleChanges(DEFAULT_INPUTS);
    expect(ask.rate.value).toBeNull();
    expect(ask.devCost.value).toBeNull();
  });
});

describe("stack", () => {
  it("defaults: donated land, stated-amount candidates, 3% nonprofit loan", () => {
    const s = defaultStack();
    expect(s).toEqual({ land: "donated", programs: { "oc-map": true, "fhlbsf-wish": true }, nonprofitLoan: true, nonprofitRate: 3 });
  });
  it("San Clemente: MAP skipped (not in area); WISH + 3% leaves $191,570.89", () => {
    const r = stackFor(createInitialPencilState());
    expect(r.startGap).toBeCloseTo(6841156.61, CENT);
    expect(r.programsUsed.map((p) => p.id)).toEqual(["fhlbsf-wish"]);
    expect(r.programsSkipped.map((p) => p.id)).toEqual(["oc-map"]);
    expect(r.steps[0]!.delta).toBeCloseTo(-5900000, CENT);
    expect(r.steps[1]!.delta).toBeCloseTo(-131348, CENT);
    expect(r.remaining).toBeCloseTo(191570.89, CENT);
    expect(r.remainingPerHome).toBeCloseTo(47892.72, CENT);
    expect(r.closes).toBe(false);
  });
  it("San Clemente without the loan leaves $809,808.61", () => {
    let s = createInitialPencilState();
    s = pencilReducer(s, { type: "SET_STACK", patch: { nonprofitLoan: false } });
    expect(stackFor(s).remaining).toBeCloseTo(809808.61, CENT);
  });
  it("Dana Point what-if: MAP + WISH leaves $329,808.61; with 3% it closes with $288,429.11 to spare", () => {
    let s = pencilReducer(createInitialPencilState(), { type: "SET_CITY", city: "Dana Point" });
    const r = stackFor(s);
    expect(r.closes).toBe(true);
    expect(r.remaining).toBeCloseTo(-288429.11, CENT);
    s = pencilReducer(s, { type: "SET_STACK", patch: { nonprofitLoan: false } });
    expect(stackFor(s).remaining).toBeCloseTo(329808.61, CENT);
  });
  it("loan capital is homes × mortgage at the loan rate", () => {
    const r = stackFor(createInitialPencilState());
    expect(r.loanCapital).toBeCloseTo(4 * computeProject(r.inputs).price.mortgage, CENT);
    expect(r.loanCapital).toBeGreaterThan(r.loanCapitalMarket);
  });
  it("the stack never changes the base gap or the committed totals", () => {
    const s = createInitialPencilState();
    const before = computeProject(effectiveInputs(s).inputs).gap;
    stackFor(s);
    expect(computeProject(effectiveInputs(s).inputs).gap).toBe(before);
    expect(effectiveInputs(s).totals.committedBuyerPerHome).toBe(0);
  });
  it("sentence, memo section, and reset", () => {
    const s0 = createInitialPencilState();
    const sentence = stackSentence(stackFor(s0), s0.stack as StackChoice, formatUSDWhole);
    expect(sentence).toBe(
      "What would it take: Donated land, WISH for each buyer (if it comes through) and a 3.00% nonprofit-held loan (ASSUMPTION) would leave $191,571 ($47,893 per home) to raise.",
    );
    const memo = buildMemo(s0);
    expect(memo).toContain(sentence);
    expect(memo).toContain("Below-market first mortgage at 3.00%");
    expect(memo).not.toMatch(BANNED);
    let s = pencilReducer(s0, { type: "SET_STACK", patch: { nonprofitRate: 1, land: "asking" } });
    s = pencilReducer(s, { type: "TOGGLE_STACK_PROGRAM", id: "fhlbsf-wish", on: false });
    expect(pencilReducer(s, { type: "RESET" })).toEqual(createInitialPencilState());
    expect(pencilReducer(s0, { type: "SET_STACK", patch: { nonprofitRate: Number.NaN } }).stack.nonprofitRate).toBe(3);
  });
});
