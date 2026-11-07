import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveExtractor, type TaskOverride } from "@/lib/extractor";
import {
  analyzeProgramPage,
  MAX_PROGRAM_CHARS,
  PROGRAM_SYSTEM_PROMPT,
  programJsonSchema,
  programModelSchema,
  wrapProgramText,
} from "@/lib/fundit/program-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASK: TaskOverride = {
  cli: { systemPrompt: PROGRAM_SYSTEM_PROMPT, jsonSchema: programJsonSchema(), wrap: wrapProgramText },
  sdk: { systemPrompt: PROGRAM_SYSTEM_PROMPT, schema: programModelSchema, wrap: wrapProgramText },
};

const bodySchema = z.object({
  text: z.string().max(MAX_PROGRAM_CHARS * 2),
  consentToExternalAI: z.boolean(),
});

/** Reports whether live AI extraction is configured and which backend. */
export async function GET() {
  const active = getActiveExtractor(process.env, TASK);
  return NextResponse.json({ aiAvailable: active !== null, backend: active?.backend ?? null });
}

// Privacy: pasted text and model output are never logged or stored.
export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ status: "error", reason: "Invalid request." }, { status: 400 });
  }
  const active = getActiveExtractor(process.env, TASK);
  const result = await analyzeProgramPage(body.text, {
    extractor: body.consentToExternalAI ? (active?.extractor ?? null) : null,
    timeoutMs: active?.timeoutMs,
  });
  if (result.status === "unavailable" && active) {
    return NextResponse.json({
      status: "unavailable",
      reason: "AI extraction needs your permission to send this text to an external provider.",
    });
  }
  return NextResponse.json(result);
}
