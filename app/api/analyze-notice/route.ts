import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveExtractor } from "@/lib/extractor";
import { analyzeNotice, MAX_NOTICE_CHARS } from "@/lib/notice-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().max(MAX_NOTICE_CHARS * 2),
  /** The user must explicitly agree before text is sent to an external AI provider. */
  consentToExternalAI: z.boolean(),
});

/** Reports whether live AI extraction is configured and which backend, without revealing anything else. */
export async function GET() {
  const active = getActiveExtractor();
  return NextResponse.json({ aiAvailable: active !== null, backend: active?.backend ?? null });
}

// Privacy: request bodies, extracted values, and model/CLI responses are never
// logged or persisted. Errors are reported with generic messages only.
export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ status: "error", reason: "Invalid request." }, { status: 400 });
  }

  const active = getActiveExtractor();
  const result = await analyzeNotice(body.text, {
    extractor: body.consentToExternalAI ? (active?.extractor ?? null) : null,
    timeoutMs: active?.timeoutMs,
  });
  if (result.status === "unavailable" && active) {
    return NextResponse.json({
      status: "unavailable",
      reason: "AI extraction needs your permission to send this text to an external provider. You can also enter the values yourself.",
    });
  }
  return NextResponse.json(result);
}
