import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SAMPLE_NOTICE_FIXTURE, SAMPLE_NOTICE_TEXT, isSampleNoticeText } from "@/lib/demo-data";
import { analyzeNotice, MAX_NOTICE_CHARS, quoteAppearsIn, sanitizeModelOutput, type ModelOutput } from "@/lib/notice-extraction";
import { extractedNoticeSchema } from "@/lib/schema";

const validModelOutput: ModelOutput = {
  documentType: "insurance_renewal",
  issuerName: "Pacific Community Home Insurance (fictional)",
  noticeDate: "2026-11-01",
  effectiveDate: "2026-12-01",
  previousAmount: 1800,
  newAmount: 3600,
  period: "annual",
  paymentMethod: "direct",
  evidence: [
    { field: "newAmount", quote: "Renewal annual homeowners insurance premium: $3,600.00", confidence: "high" },
    { field: "previousAmount", quote: "Prior annual premium was $1,800", confidence: "high" }, // not verbatim
  ],
  uncertainties: [],
};

describe("sample notice + fixture", () => {
  it("public sample file matches the in-code sample text", () => {
    const file = readFileSync(path.join(process.cwd(), "public/samples/sample-insurance-renewal.txt"), "utf8");
    expect(file).toBe(SAMPLE_NOTICE_TEXT);
  });

  it("fixture is schema-valid and every evidence quote is verbatim from the notice", () => {
    expect(() => extractedNoticeSchema.parse(SAMPLE_NOTICE_FIXTURE)).not.toThrow();
    for (const ev of SAMPLE_NOTICE_FIXTURE.evidence) {
      expect(SAMPLE_NOTICE_TEXT.includes(ev.quote), ev.quote).toBe(true);
    }
  });

  it("sample text is detected with whitespace differences", () => {
    expect(isSampleNoticeText(SAMPLE_NOTICE_TEXT.replace(/\n/g, "\r\n  "))).toBe(true);
    expect(isSampleNoticeText(SAMPLE_NOTICE_TEXT.replace("$3,600.00", "$4,000.00"))).toBe(false);
  });
});

describe("analyzeNotice fallback behavior", () => {
  it("returns the labeled demo fixture for the sample without calling a model", async () => {
    const extractor = vi.fn();
    const r = await analyzeNotice(SAMPLE_NOTICE_TEXT, { extractor });
    expect(extractor).not.toHaveBeenCalled();
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.extraction.extractionMode).toBe("demo-fixture");
  });

  it("does not silently apply a predefined result to arbitrary text when AI is unavailable", async () => {
    const r = await analyzeNotice("Your premium is going up to $5,000 per year.", { extractor: null });
    expect(r.status).toBe("unavailable");
  });

  it("returns an error (not a crash) when the model throws", async () => {
    const r = await analyzeNotice("Some notice", { extractor: async () => Promise.reject(new Error("boom")) });
    expect(r.status).toBe("error");
  });

  it("returns an error on malformed model JSON", async () => {
    const r = await analyzeNotice("Some notice", { extractor: async () => ({ documentType: "pizza" }) });
    expect(r).toMatchObject({ status: "error" });
  });

  it("times out gracefully", async () => {
    const slow = (_t: string, signal: AbortSignal) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const r = await analyzeNotice("Some notice", { extractor: slow, timeoutMs: 10 });
    expect(r).toMatchObject({ status: "error" });
    if (r.status === "error") expect(r.reason).toMatch(/timed out/);
  });

  it("clamps very long input before sending it to the model", async () => {
    const extractor = vi.fn(async (text: string) => {
      expect(text.length).toBe(MAX_NOTICE_CHARS);
      return { ...validModelOutput, evidence: [] };
    });
    const r = await analyzeNotice("x".repeat(MAX_NOTICE_CHARS + 500), { extractor });
    expect(r).toMatchObject({ status: "ok", truncated: true });
  });

  it("rejects empty input", async () => {
    expect(await analyzeNotice("   ", { extractor: null })).toMatchObject({ status: "error" });
  });
});

describe("sanitizeModelOutput", () => {
  it("keeps verbatim quotes and drops invented ones", () => {
    const r = sanitizeModelOutput(validModelOutput, SAMPLE_NOTICE_TEXT);
    expect(r.extractionMode).toBe("ai");
    expect(r.evidence.map((e) => e.field)).toEqual(["newAmount"]);
    expect(r.uncertainties.some((u) => u.includes("previousAmount"))).toBe(true);
  });

  it("drops invalid dates and negative amounts rather than passing them through", () => {
    const r = sanitizeModelOutput(
      { ...validModelOutput, effectiveDate: "2026-02-30", previousAmount: -5, evidence: [] },
      SAMPLE_NOTICE_TEXT,
    );
    expect(r.effectiveDate).toBeUndefined();
    expect(r.previousAmount).toBeUndefined();
    expect(r.uncertainties.length).toBeGreaterThanOrEqual(2);
  });

  it("maps null period/payment method to explicit unknown", () => {
    const r = sanitizeModelOutput({ ...validModelOutput, period: null, paymentMethod: null }, SAMPLE_NOTICE_TEXT);
    expect(r.period).toBe("unknown");
    expect(r.paymentMethod).toBe("unknown");
  });

  it("quote matching ignores whitespace and case", () => {
    expect(quoteAppearsIn("Renewal  effective\ndate: December 1", "renewal effective date: december 1")).toBe(true);
    expect(quoteAppearsIn("abc", "")).toBe(false);
  });
});
