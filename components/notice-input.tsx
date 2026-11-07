"use client";

import { useEffect, useId, useState } from "react";
import { BACKEND_CONSENT_TEXT, type ExtractorBackend } from "@/lib/extractor-backends";
import { MAX_NOTICE_CHARS, MAX_UPLOAD_BYTES, type AnalyzeResult } from "@/lib/notice-extraction";
import type { ExtractedNotice } from "@/lib/schema";
import type { NoticeSource } from "@/lib/state";
import { Badge, Button, Card, Icon, cx } from "./ui";

type Loaded = (notice: NoticeSource, extraction: ExtractedNotice | null, note?: string) => void;

export function NoticeInput({ sampleText, onLoaded, onCancel }: { sampleText: string; onLoaded: Loaded; onCancel: () => void }) {
  const textId = useId();
  const fileId = useId();
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [backend, setBackend] = useState<ExtractorBackend | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"idle" | "reading" | "analyzing">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/analyze-notice")
      .then((r) => (r.ok ? r.json() : { aiAvailable: false }))
      .then((d: { aiAvailable?: boolean; backend?: string | null }) => {
        if (!alive) return;
        const b = d.backend && Object.hasOwn(BACKEND_CONSENT_TEXT, d.backend) ? (d.backend as ExtractorBackend) : null;
        // Only offer AI when the server names a known backend, so the consent text is always specific.
        setBackend(b);
        setAiAvailable(Boolean(d.aiAvailable) && b !== null);
      })
      .catch(() => alive && setAiAvailable(false));
    return () => {
      alive = false;
    };
  }, []);

  const source = (): NoticeSource => ({ kind: fileName ? "upload" : "pasted", fileName, text });

  async function onFile(file: File) {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) return setError("That file is larger than 5 MB.");
    const lower = file.name.toLowerCase();
    setBusy("reading");
    try {
      if (lower.endsWith(".txt") || file.type === "text/plain") {
        setText((await file.text()).slice(0, MAX_NOTICE_CHARS));
        setFileName(file.name);
      } else if (lower.endsWith(".pdf") || file.type === "application/pdf") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/extract-pdf-text", { method: "POST", body: fd });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok || !data.text) throw new Error(data.error ?? "Could not read that PDF.");
        setText(data.text);
        setFileName(file.name);
      } else {
        setError("Supported files: .txt or text-based .pdf");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy("idle");
    }
  }

  async function analyze() {
    setError(null);
    setBusy("analyzing");
    try {
      const res = await fetch("/api/analyze-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, consentToExternalAI: consent }),
      });
      const result = (await res.json()) as AnalyzeResult;
      if (result.status === "ok") onLoaded(source(), result.extraction);
      else if (result.status === "unavailable") onLoaded(source(), null, result.reason);
      else setError(result.reason);
    } catch {
      setError("Could not reach the extraction service. You can retry or enter the values yourself.");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <Card className="animate-fade-up overflow-hidden" aria-labelledby="notice-input-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <h2 id="notice-input-title" className="text-lg font-semibold">
          Upload or paste a notice
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>Use synthetic or redacted documents only.</strong> This demo is not built for real personal or financial records. Text is processed in memory and not saved.
          </p>
        </div>

        <div role="tablist" aria-label="Input method" className="inline-flex rounded-xl bg-canvas p-1 ring-1 ring-line">
          {(["paste", "upload"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx("rounded-lg px-4 py-1.5 text-sm font-medium", tab === t ? "bg-white shadow-sm ring-1 ring-line" : "text-muted hover:text-ink")}
            >
              {t === "paste" ? "Paste text" : "Upload file"}
            </button>
          ))}
        </div>

        {tab === "upload" && (
          <div>
            <label
              htmlFor={fileId}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas/50 px-4 py-8 text-center text-sm hover:border-brand-300 hover:bg-brand-50/40"
            >
              <Icon name="upload" className="h-6 w-6 text-brand-600" />
              <span className="font-medium">{busy === "reading" ? "Reading…" : "Choose a .txt or text-based .pdf"}</span>
              <span className="text-xs text-muted">Up to 5 MB. Scanned images are not supported yet.</span>
            </label>
            <input
              id={fileId}
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={textId} className="text-sm font-medium">
              Notice text {fileName && <span className="font-normal text-muted">from {fileName}</span>}
            </label>
            <button
              type="button"
              className="text-xs font-medium text-brand-700 hover:underline"
              onClick={() => {
                setText(sampleText);
                setFileName(undefined);
              }}
            >
              Insert sample text
            </button>
          </div>
          <textarea
            id={textId}
            rows={9}
            maxLength={MAX_NOTICE_CHARS}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileName(undefined);
            }}
            placeholder="Paste the text of an insurance renewal notice…"
            className="mt-1 w-full rounded-xl bg-white p-3 font-mono text-[13px] leading-6 ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="rounded-xl bg-canvas p-3 text-sm">
          {aiAvailable === null ? (
            <p className="text-muted">Checking whether AI extraction is configured…</p>
          ) : aiAvailable && backend ? (
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                {BACKEND_CONSENT_TEXT[backend]} <span className="text-muted">Leave unchecked to enter values yourself. The built-in sample notices are read without AI.</span>
              </span>
            </label>
          ) : (
            <p className="flex flex-wrap items-center gap-2 text-muted">
              <Badge tone="neutral">AI extraction off</Badge>
              No AI extraction is configured. The sample notice still works; other text goes to manual entry.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200" role="alert">
            <p>{error}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={analyze} disabled={!text.trim()}>
                Retry
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onLoaded(source(), null, "Extraction did not finish. Enter the values from your notice.")} disabled={!text.trim()}>
                Enter values manually
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => onLoaded(source(), null)} disabled={!text.trim() || busy !== "idle"}>
            Enter values manually
          </Button>
          <Button onClick={analyze} disabled={!text.trim() || busy !== "idle"}>
            {busy === "analyzing" ? "Reading notice…" : "Read this notice"}
            <Icon name="arrow-right" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
