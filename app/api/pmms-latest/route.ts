/**
 * Optional live rate check (FUND_IT §7). Fetches the Freddie Mac PMMS CSV at most once per
 * server start (successful result cached in memory), with a 10-second timeout.
 * Runs only when the user clicks "Check latest PMMS". No other runtime fetches.
 */

import { parsePmmsLatest, type PmmsWeek } from "@/lib/fundit/rates";
import { SOURCES } from "@/lib/fundit/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cached: { latest: PmmsWeek; fetchedAt: string } | null = null;

export async function GET() {
  if (cached) return Response.json({ ok: true, ...cached.latest, fetchedAt: cached.fetchedAt, cached: true });
  try {
    const res = await fetch(SOURCES.pmms.url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const latest = parsePmmsLatest(await res.text());
    if (!latest) throw new Error("unparsable");
    cached = { latest, fetchedAt: new Date().toISOString() };
    return Response.json({ ok: true, ...latest, fetchedAt: cached.fetchedAt, cached: false });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}
