"use client";

import { useEffect, useState, type Dispatch } from "react";
import { BACKEND_CONSENT_TEXT, type ExtractorBackend } from "@/lib/extractor-backends";
import { FUNDING_SOURCES } from "@/lib/fundit/catalog";
import {
  OC_MAP_DEMO_EXCERPT,
  PROGRAM_FIELD_LABEL,
  type ProgramAnalyzeResult,
  type ProgramExtraction,
} from "@/lib/fundit/program-extraction";
import type { PencilAction, PencilState } from "@/lib/fundit/state";
import { Badge, Button, Card } from "../ui";

export function RecheckPanel({ state, dispatch }: { state: PencilState; dispatch: Dispatch<PencilAction> }) {
  const [programId, setProgramId] = useState("oc-map");
  const [text, setText] = useState("");
  const [backend, setBackend] = useState<ExtractorBackend | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ extraction: ProgramExtraction; programId: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/recheck-program")
      .then((r) => r.json() as Promise<{ aiAvailable: boolean; backend: ExtractorBackend | null }>)
      .then((j) => {
        if (live) setBackend(j.aiAvailable ? j.backend : null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const run = async () => {
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const res = await fetch("/api/recheck-program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, consentToExternalAI: consent }),
      });
      const j = (await res.json()) as ProgramAnalyzeResult;
      if (j.status === "ok") setResult({ extraction: j.extraction, programId });
      else setMessage(j.reason);
    } catch {
      setMessage("The re-check failed. Compare the page with the card yourself.");
    } finally {
      setBusy(false);
    }
  };

  const confirmed = (field: string) => (state.rechecks[result?.programId ?? ""] ?? []).some((f) => f.field === field);
  const program = FUNDING_SOURCES.find((s) => s.id === programId);

  return (
    <Card className="p-4 sm:p-5" aria-labelledby="recheck-title">
      <h2 id="recheck-title" className="text-base font-semibold">
        Re-check a program from its page
      </h2>
      <p className="mt-1 text-sm text-muted">
        Paste text from the official program page. Only stated fields are extracted, each with a verbatim quote. Quotes not found in your text are dropped.
        You confirm each field before it appears on the card. Nothing here changes a number.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block font-medium">Program</span>
          <select className="mt-1 rounded-xl bg-white px-3 py-2 ring-1 ring-line" value={programId} onChange={(e) => setProgramId(e.target.value)}>
            {FUNDING_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setProgramId("oc-map");
            setText(OC_MAP_DEMO_EXCERPT);
          }}
        >
          Use demo excerpt (OC MAP)
        </Button>
        {program && (
          <a className="text-sm text-brand-700 underline" href={program.officialUrl} target="_blank" rel="noreferrer">
            Open official page
          </a>
        )}
      </div>
      <label className="mt-2 block text-sm">
        <span className="sr-only">Pasted program page text</span>
        <textarea
          className="mt-1 h-32 w-full rounded-xl bg-white p-3 text-sm ring-1 ring-line"
          placeholder="Paste text copied from the official program page"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {backend ? (
        <label className="mt-1 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{BACKEND_CONSENT_TEXT[backend]} Only for text from a public program page.</span>
        </label>
      ) : (
        <p className="mt-1 text-xs text-muted">AI extraction is off. The demo excerpt still works (demo fixture, no AI call).</p>
      )}
      <div className="mt-2">
        <Button onClick={run} disabled={busy || text.trim() === ""}>
          {busy ? "Reading…" : "Extract stated fields"}
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-amber-900">{message}</p>}
      {result && (
        <div className="mt-3 space-y-2">
          <Badge tone={result.extraction.mode === "demo-fixture" ? "violet" : "sky"}>
            {result.extraction.mode === "demo-fixture" ? "Demo fixture, no AI call" : "AI-extracted: check each quote against the page"}
          </Badge>
          {result.extraction.fields.length === 0 && <p className="text-sm">No stated fields were found with a verifiable quote.</p>}
          <ul className="space-y-2">
            {result.extraction.fields.map((f) => (
              <li key={f.field} className="rounded-xl p-3 text-sm ring-1 ring-line">
                <p className="font-semibold">
                  {PROGRAM_FIELD_LABEL[f.field]}: <span className="font-normal">{f.value}</span>
                </p>
                <blockquote className="mt-1 border-l-4 border-sky-200 pl-2 text-muted">“{f.quote}”</blockquote>
                <div className="mt-2">
                  {confirmed(f.field) ? (
                    <Badge tone="brand">Confirmed: shown on the card</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => dispatch({ type: "CONFIRM_RECHECK", id: result.programId, field: { ...f, mode: result.extraction.mode } })}
                    >
                      I checked this against the page: confirm
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {result.extraction.uncertainties.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-muted">
              {result.extraction.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
