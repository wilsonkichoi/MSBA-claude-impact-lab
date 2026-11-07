import { describe, expect, it } from "vitest";
import {
  AVENIDA_SAN_JUAN,
  CAMINO_TWELVE,
  GUIDANCE,
  OPPORTUNITIES,
  TEST_STATUSES,
  VISTA_PACIFICA,
  type Contact,
} from "@/lib/findit/data";
import { BANNED_BRIEF, BRIEF_HEADER, buildBrief } from "@/lib/findit/brief";
import { ACCESS_MINUTES, BOARD_MINUTES, EGRESS_MINUTES, commute } from "@/lib/findit/commute";
import { DEFAULT_ASSUMPTIONS } from "@/lib/findit/finance";
import { DEFAULT_FILTERS, filterOpportunities, monthlyFor } from "@/lib/findit/filters";
import { FIND_SOURCES, FIND_SOURCE_LIST } from "@/lib/findit/sources";
import { INITIAL_STATE, SAMPLE_BUYER, reducer } from "@/lib/findit/state";
import { SAN_CLEMENTE } from "@/lib/fundit/property";
import { isoDateSchema } from "@/lib/schema";

const A = DEFAULT_ASSUMPTIONS;
const isHttps = (u: string) => new URL(u).protocol === "https:";

/** Names that appear on CEQAnet / listing pages and must never be stored. */
const PERSON_NAMES = /laura|stokes|joel|rojas|dawna|kuch|laurie|wickham|ilene|aldrich|marjorie|takacs|agent/i;

describe("data (§3)", () => {
  it("every source has an https URL and an ISO checkedDate", () => {
    expect(new Set(FIND_SOURCE_LIST.map((s) => s.id)).size).toBe(FIND_SOURCE_LIST.length);
    for (const s of FIND_SOURCE_LIST) {
      expect(isHttps(s.url), s.id).toBe(true);
      expect(isoDateSchema.safeParse(s.checkedDate).success, s.id).toBe(true);
      if (s.date) expect(isoDateSchema.safeParse(s.date).success, s.id).toBe(true);
    }
  });

  it("every opportunity has https sources and an ISO checkedDate", () => {
    for (const o of OPPORTUNITIES) {
      expect(isoDateSchema.safeParse(o.checkedDate).success, o.id).toBe(true);
      expect(o.sourceIds.length, o.id).toBeGreaterThan(0);
      for (const id of o.sourceIds) expect(isHttps(FIND_SOURCES[id].url), `${o.id}:${id}`).toBe(true);
    }
  });

  it("no opportunity has a price unless its source is a listing", () => {
    for (const o of OPPORTUNITIES) {
      if (o.layer !== "buyer" || o.price === null) continue;
      expect(o.priceSourceId, o.id).not.toBeNull();
      expect(o.priceSourceId!.startsWith("vista-listing") || o.priceSourceId!.startsWith("listing-"), o.id).toBe(true);
      expect(FIND_SOURCES[o.priceSourceId!].title.toLowerCase()).toContain("listing");
    }
  });

  it("Camino Twelve: price null → no monthly estimate (card renders Price unpublished)", () => {
    expect(CAMINO_TWELVE.price).toBeNull();
    expect(CAMINO_TWELVE.hoaMonthly).toBeNull();
    expect(monthlyFor(CAMINO_TWELVE, 25_000, A)).toBeNull();
    expect(CAMINO_TWELVE.history.map((h) => h.date)).toEqual(["2024-08-08", "2026-05-07", "2026-10-22"]);
  });

  it("the future site is layer 'future', has no monthly estimate, and reuses Pencil's listing", () => {
    expect(AVENIDA_SAN_JUAN.layer).toBe("future");
    expect(monthlyFor(AVENIDA_SAN_JUAN, 25_000, A)).toBeNull();
    expect(AVENIDA_SAN_JUAN.listing).toBe(SAN_CLEMENTE);
    expect(AVENIDA_SAN_JUAN.pathway.homesModeled).toBe(SAN_CLEMENTE.homesModeled);
  });

  it("site tests use only the three statuses and each has a reason, source and date", () => {
    expect(AVENIDA_SAN_JUAN.tests.length).toBe(12);
    for (const t of AVENIDA_SAN_JUAN.tests) {
      expect(TEST_STATUSES).toContain(t.status);
      expect(t.reason.length, t.test).toBeGreaterThan(10);
      expect(t.sourceIds.length, t.test).toBeGreaterThan(0);
      for (const id of t.sourceIds) expect(FIND_SOURCES[id], `${t.test}:${id}`).toBeDefined();
      expect(isoDateSchema.safeParse(t.checkedDate).success).toBe(true);
    }
    const fire = AVENIDA_SAN_JUAN.tests.find((t) => t.test === "Fire hazard")!;
    expect(fire.status).toBe("Conflict found");
    expect(AVENIDA_SAN_JUAN.tests.find((t) => t.test === "Parcel identity")!.status).toBe("Unknown");
  });

  it("no contact field holds a person's name", () => {
    const contacts: Contact[] = [...OPPORTUNITIES.flatMap((o) => o.contacts)];
    for (const c of contacts) {
      expect(c.label, c.label).not.toMatch(PERSON_NAMES);
      expect(isHttps(c.url)).toBe(true);
    }
    const all = JSON.stringify([OPPORTUNITIES, GUIDANCE]);
    expect(all).not.toMatch(/laura|stokes|joel|rojas|dawna|kuch|laurie|wickham/i);
  });

  it("Vista Pacifica facts as rechecked", () => {
    expect(VISTA_PACIFICA.status).toBe("For sale");
    expect(VISTA_PACIFICA.assessmentMonthly).toBeNull();
  });
});

describe("filters (§4)", () => {
  it("sample buyer, budget $2,500, unpublished off → zero results with the unpublished reason", () => {
    const r = filterOpportunities("buyer", { ...DEFAULT_FILTERS, maxMonthly: 2_500, showUnpublished: false }, 25_000, A);
    expect(r.results).toHaveLength(0);
    expect(r.reason).toBe("unpublished-hidden");
  });

  it("unpublished on → Camino Twelve is listed", () => {
    const r = filterOpportunities("buyer", { ...DEFAULT_FILTERS, maxMonthly: 2_500, showUnpublished: true }, 25_000, A);
    expect(r.results.map((o) => o.id)).toEqual(["camino-twelve"]);
  });

  it("default filters show both buyer pins", () => {
    const r = filterOpportunities("buyer", DEFAULT_FILTERS, 25_000, A);
    expect(r.results.map((o) => o.id)).toEqual(["camino-twelve", "vista-pacifica-420"]);
  });

  it("layer switch → only the 504 site", () => {
    const r = filterOpportunities("future", DEFAULT_FILTERS, 25_000, A);
    expect(r.results.map((o) => o.id)).toEqual(["504-e-avenida-san-juan"]);
  });

  it("over-budget reason when unpublished is not the cause", () => {
    const r = filterOpportunities(
      "buyer",
      { ...DEFAULT_FILTERS, maxMonthly: 2_500, city: "San Clemente", showUnpublished: true },
      25_000,
      A,
    );
    expect(r.results).toHaveLength(0);
    expect(r.reason).toBe("over-budget");
  });
});

describe("commute (§3.6)", () => {
  it("Drive never returns a time", () => {
    const c = commute(CAMINO_TWELVE.point, "sjc", "irvine-station", "drive");
    expect(c.kind).toBe("drive");
    if (c.kind === "drive") {
      expect(c.minutes).toBeNull();
      expect(c.straightLineMiles).toBeCloseTo(12.11, 2);
      expect(c.directionsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//);
    }
    expect(JSON.stringify(c)).not.toMatch(/minutes":\d/);
  });

  it("a transit pair without a cached example returns the route-unavailable state", () => {
    const c = commute(VISTA_PACIFICA.point, "sc", "uci", "transit", []);
    expect(c.kind).toBe("unavailable");
    if (c.kind === "unavailable") {
      expect(c.message).toBe("No cached route for this trip.");
      expect(c.tripPlannerUrl).toMatch(/^https:\/\/octa\.net/);
    }
    expect(commute(AVENIDA_SAN_JUAN.point, null, "uci", "transit").kind).toBe("unavailable");
  });

  it("station-to-station minutes and door-to-door total are separate fields", () => {
    const c = commute(CAMINO_TWELVE.point, "sjc", "irvine-station", "transit");
    expect(c.kind).toBe("transit");
    if (c.kind !== "transit") return;
    expect(c.stationToStationMinutes).toBe(16);
    expect(c.doorToDoorMinutes).toBe(ACCESS_MINUTES + BOARD_MINUTES + 16 + EGRESS_MINUTES);
    expect(c.homeToStationMiles).toBeCloseTo(1.47, 2);
  });

  it("UC Irvine adds the OCTA 473 leg after train 603 reaches Tustin", () => {
    const c = commute(CAMINO_TWELVE.point, "sjc", "uci", "transit");
    if (c.kind !== "transit") throw new Error("expected transit");
    expect(c.legs.map((l) => `${l.depart}-${l.arrive}`)).toEqual(["5:56-6:20", "6:23-6:41"]);
    expect(c.transferMinutes).toBe(3);
    expect(c.stationToStationMinutes).toBe(45);
  });
});

describe("brief (§4)", () => {
  const brief = buildBrief(["camino-twelve", "vista-pacifica-420"], SAMPLE_BUYER, A);
  it("contains the Camino question, budget and %, destination, unresolved costs and NOTHING HAS BEEN SENT", () => {
    expect(brief.startsWith(BRIEF_HEADER)).toBe(true);
    expect(brief).toContain("NOTHING HAS BEEN SENT");
    expect(brief).toContain(CAMINO_TWELVE.questions[0]!);
    expect(brief).toContain("$2,500");
    expect(brief).toContain("30.0%");
    expect(brief).toContain("Irvine Station");
    expect(brief).toContain("price (unpublished)");
    expect(brief).toContain("HOA dues (unpublished)");
    expect(brief).toContain("mortgage insurance");
  });
  it("does not match the banned regex", () => {
    expect(brief).not.toMatch(BANNED_BRIEF);
    expect(buildBrief([], { ...SAMPLE_BUYER, annualIncome: 0 }, A)).not.toMatch(BANNED_BRIEF);
  });
});

describe("state (§4)", () => {
  it("sample reset restores defaults and selects Camino Twelve", () => {
    let s = reducer(INITIAL_STATE, { type: "setInput", patch: { annualIncome: 1, budgetMonthly: 9 } });
    s = reducer(s, { type: "setAssumption", patch: { ratePct: 9 } });
    s = reducer(s, { type: "setLayer", layer: "future" });
    s = reducer(s, { type: "loadSample" });
    expect(s.inputs).toEqual(SAMPLE_BUYER);
    expect(s.assumptions).toEqual(DEFAULT_ASSUMPTIONS);
    expect(s.layer).toBe("buyer");
    expect(s.selectedId).toBe("camino-twelve");
  });

  it("saving a third drops the oldest; a future site can't be saved", () => {
    let s = reducer(INITIAL_STATE, { type: "toggleSave", id: "camino-twelve" });
    s = reducer(s, { type: "toggleSave", id: "vista-pacifica-420" });
    expect(s.saved).toEqual(["camino-twelve", "vista-pacifica-420"]);
    s = reducer(s, { type: "toggleSave", id: "504-e-avenida-san-juan" });
    expect(s.saved).toEqual(["camino-twelve", "vista-pacifica-420"]);
    expect(s.saveNote).toMatch(/Compare homes with homes/);
    // Toggling a saved home removes it.
    s = reducer(s, { type: "toggleSave", id: "camino-twelve" });
    expect(s.saved).toEqual(["vista-pacifica-420"]);
    // Only two buyer homes exist in the snapshot, so start from a full list with another saved id
    // and save a third: the oldest (Vista) is dropped, with a note.
    const full = { ...INITIAL_STATE, saved: ["vista-pacifica-420", "another-home"] };
    const third = reducer(full, { type: "toggleSave", id: "camino-twelve" });
    expect(third.saved).toEqual(["another-home", "camino-twelve"]);
    expect(third.saveNote).toMatch(/Replaced Vista Pacifica #420 with Camino Twelve/);
  });
});
