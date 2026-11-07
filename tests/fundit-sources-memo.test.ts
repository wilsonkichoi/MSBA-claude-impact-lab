import { describe, expect, it } from "vitest";
import { catalogTotals, DEFAULT_LEAD_ENTRY, evaluateSource, FUNDING_SOURCES, type LeadEntry } from "@/lib/fundit/catalog";
import { buildMemo, MEMO_HEADER } from "@/lib/fundit/memo";
import { computeProject, DEFAULT_INPUTS } from "@/lib/fundit/project";
import { SAN_CLEMENTE } from "@/lib/fundit/property";
import { SOURCE_LIST } from "@/lib/fundit/sources";
import { candidateInputs, createInitialPencilState, effectiveInputs, pencilReducer, type PencilState } from "@/lib/fundit/state";

const CENT = 2;
const BANNED = /you qualify|you are eligible|guaranteed|approved for/i;
const map = FUNDING_SOURCES.find((s) => s.id === "oc-map")!;
const santaAna = FUNDING_SOURCES.find((s) => s.id === "santa-ana-my-first-home")!;
const committed = (amount: number | null): LeadEntry => ({ status: "committed", amount, byLandClose: false });

function withLead(s: PencilState, id: string, patch: Partial<LeadEntry>): PencilState {
  return pencilReducer(s, { type: "SET_LEAD", id, patch });
}

describe("funding-source catalog", () => {
  it("every source has an https URL, an ISO check date, and a recipient", () => {
    for (const s of FUNDING_SOURCES) {
      expect(new URL(s.officialUrl).protocol, s.id).toBe("https:");
      expect(s.lastVerified, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["project", "buyer"]).toContain(s.recipient);
    }
  });
  it("OC MAP for San Clemente: not in eligible area, $0 counted even if marked Committed", () => {
    const ev = evaluateSource(map, committed(120000), "San Clemente");
    expect(ev.geo.inArea).toBe(false);
    expect(ev.counted).toBe(0);
    expect(ev.candidate).toBe(0);
    expect(ev.reason).toMatch(/Not in eligible area/);
  });
  it("OC MAP for Dana Point: candidate, still $0 in the base gap until Committed with an amount", () => {
    const ev = evaluateSource(map, DEFAULT_LEAD_ENTRY, "Dana Point");
    expect(ev.geo.inArea).toBe(true);
    expect(ev.counted).toBe(0);
    expect(ev.candidate).toBe(120000);
    expect(evaluateSource(map, committed(null), "Dana Point").counted).toBe(0);
    expect(evaluateSource(map, committed(80000), "Dana Point").counted).toBe(80000);
  });
  it("MAP card lists the $120k vs $80k / 20% conflict and the 85%-of-median check", () => {
    const c = map.conflicts.join(" ");
    expect(c).toContain("$120,000");
    expect(c).toContain("$80,000");
    expect(c).toContain("20%");
    expect(map.requirements.join(" ")).toMatch(/85% of the OC median/);
  });
  it("no source counts until Committed; unknown amounts are excluded and counted", () => {
    const s = createInitialPencilState();
    const { totals, inputs } = effectiveInputs(s);
    expect(totals.committedProject).toBe(0);
    expect(totals.committedBuyerPerHome).toBe(0);
    expect(computeProject(inputs).gap).toBeCloseTo(computeProject(DEFAULT_INPUTS).gap, CENT);
    // San Clemente: MAP and Santa Ana out of area; WISH is the only stated-amount candidate.
    expect(totals.candidateBuyerPerHome).toBe(32837);
    const unknown = totals.evaluations.filter((e) => e.candidateUnknown).map((e) => e.source.id);
    expect(unknown).toEqual(["calhfa-myhome", "calhfa-dream-for-all", "hcd-calhome", "ochft"]);
    expect(totals.unknownCount).toBe(4);
  });
  it("Santa Ana only for Santa Ana", () => {
    expect(evaluateSource(santaAna, DEFAULT_LEAD_ENTRY, "San Clemente").geo.inArea).toBe(false);
    expect(evaluateSource(santaAna, DEFAULT_LEAD_ENTRY, "Dana Point").geo.inArea).toBe(false);
    expect(evaluateSource(santaAna, DEFAULT_LEAD_ENTRY, "Santa Ana").geo.inArea).toBe(true);
  });
  it("a committed project source reduces the gap; a committed buyer source raises the price per home", () => {
    let s = createInitialPencilState();
    s = withLead(s, "hcd-calhome", { status: "committed", amount: 100000 });
    expect(computeProject(effectiveInputs(s).inputs).gap).toBeCloseTo(computeProject(DEFAULT_INPUTS).gap - 100000, CENT);
    let t = pencilReducer(createInitialPencilState(), { type: "SET_CITY", city: "Dana Point" });
    t = withLead(t, "oc-map", { status: "committed", amount: 120000 });
    expect(computeProject(effectiveInputs(t).inputs).gap).toBeCloseTo(computeProject(DEFAULT_INPUTS).gap - 480000, CENT);
  });
  it("Dana Point candidates total includes MAP and WISH per home", () => {
    const totals = catalogTotals({}, "Dana Point");
    expect(totals.candidateBuyerPerHome).toBe(120000 + 32837);
    const x = candidateInputs(DEFAULT_INPUTS, totals);
    expect(computeProject(x).gap).toBeCloseTo(computeProject(DEFAULT_INPUTS).gap - 4 * 152837, CENT);
  });
});

describe("funder memo", () => {
  const memo = buildMemo(createInitialPencilState());
  it("contains the header, listing URL, check dates and ASSUMPTION labels", () => {
    expect(memo.startsWith(MEMO_HEADER)).toBe(true);
    expect(memo).toContain("CONDITIONAL");
    expect(memo).toContain(SAN_CLEMENTE.sourceUrl);
    expect(memo).toContain("checked 2026-11-07");
    expect(memo).toContain("ASSUMPTION");
    for (const s of SOURCE_LIST) expect(memo, s.id).toContain(s.url);
    expect(memo).toContain("$941,157");
    expect(memo).toMatch(/Mortgage Assistance Program \(MAP\).*Not in eligible area/);
  });
  it("does not use banned eligibility or guarantee phrasing", () => {
    expect(memo).not.toMatch(BANNED);
    let s = pencilReducer(createInitialPencilState(), { type: "SET_CITY", city: "Dana Point" });
    s = withLead(s, "oc-map", { status: "committed", amount: 120000 });
    s = pencilReducer(s, { type: "SET_INPUTS", patch: { donorGift: 25000, landMode: "donated", insuranceExtraMonthly: 150 } });
    expect(buildMemo(s)).not.toMatch(BANNED);
  });
  it("catalog text does not use banned phrasing either", () => {
    expect(JSON.stringify(FUNDING_SOURCES)).not.toMatch(BANNED);
  });
});

describe("pencil state", () => {
  it("reset restores the initial state", () => {
    let s = createInitialPencilState();
    s = pencilReducer(s, { type: "SET_INPUTS", patch: { landMode: "donated", donorGift: 25000, applyCap: false } });
    s = pencilReducer(s, { type: "SET_CITY", city: "Dana Point" });
    s = withLead(s, "oc-map", { status: "committed", amount: 1 });
    s = pencilReducer(s, { type: "RESET" });
    expect(s).toEqual(createInitialPencilState());
  });
  it("seeds are frozen and edits do not mutate them", () => {
    expect(Object.isFrozen(DEFAULT_INPUTS)).toBe(true);
    expect(Object.isFrozen(SAN_CLEMENTE)).toBe(true);
    expect(Object.isFrozen(FUNDING_SOURCES)).toBe(true);
    expect(Object.isFrozen(DEFAULT_LEAD_ENTRY)).toBe(true);
    const s = createInitialPencilState();
    pencilReducer(s, { type: "SET_NUMBER", field: "devCost", value: 1 });
    expect(s.inputs.devCost).toBe(2000000);
    expect(DEFAULT_INPUTS.devCost).toBe(2000000);
  });
  it("ignores non-finite numbers", () => {
    const s = createInitialPencilState();
    expect(pencilReducer(s, { type: "SET_NUMBER", field: "devCost", value: Number.NaN })).toBe(s);
  });
});
