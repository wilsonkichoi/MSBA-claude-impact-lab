"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { displayValue, statusLabel } from "@/lib/counselor";
import { toMonthly } from "@/lib/finance";
import { formatUSD } from "@/lib/format";
import { checkApplicable, evidenceFor, FIELD_LABELS, fieldStatus, setReviewedField, withConfirmed, type FieldStatus } from "@/lib/review";
import type { DocumentType, ExtractedNotice, NoticeField, PaymentMethod, PremiumPeriod, ReviewedChange } from "@/lib/schema";
import type { NoticeSource } from "@/lib/state";
import { Badge, Button, Card, Icon, cx } from "./ui";

const FIELD_ORDER: NoticeField[] = [
  "documentType",
  "issuerName",
  "noticeDate",
  "previousAmount",
  "newAmount",
  "period",
  "effectiveDate",
  "paymentMethod",
];

const STATUS_TONE: Record<FieldStatus, "brand" | "amber" | "rose" | "sky" | "violet"> = {
  found: "brand",
  "needs-confirmation": "amber",
  missing: "rose",
  edited: "violet",
  confirmed: "sky",
};

/* ---------------------------- document preview ---------------------------- */

type Segment = { text: string; fields: NoticeField[] };

function segmentText(text: string, ex: ExtractedNotice | null): Segment[] {
  if (!ex || ex.evidence.length === 0) return [{ text, fields: [] }];
  const lower = text.toLowerCase();
  const ranges: { start: number; end: number; field: NoticeField }[] = [];
  for (const ev of ex.evidence) {
    const i = lower.indexOf(ev.quote.toLowerCase());
    if (i >= 0) ranges.push({ start: i, end: i + ev.quote.length, field: ev.field });
  }
  const cuts = new Set<number>([0, text.length]);
  ranges.forEach((r) => {
    cuts.add(r.start);
    cuts.add(r.end);
  });
  const points = [...cuts].sort((a, b) => a - b);
  const segs: Segment[] = [];
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    if (a === b) continue;
    segs.push({ text: text.slice(a, b), fields: ranges.filter((r) => r.start <= a && r.end >= b).map((r) => r.field) });
  }
  return segs;
}

function NoticePreview({ notice, extraction, activeField }: { notice: NoticeSource; extraction: ExtractedNotice | null; activeField: NoticeField | null }) {
  const segments = useMemo(() => segmentText(notice.text, extraction), [notice.text, extraction]);
  return (
    <Card className="flex flex-col overflow-hidden lg:sticky lg:top-24" aria-labelledby="notice-preview-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon name="doc" className="h-5 w-5 text-brand-600" />
          <h3 id="notice-preview-title" className="font-semibold">
            {notice.fileName ?? (notice.kind === "pasted" ? "Pasted notice" : "Uploaded notice")}
          </h3>
        </div>
        {notice.kind === "sample" ? <Badge tone="amber">Fictional sample document</Badge> : <Badge tone="neutral">Not stored</Badge>}
      </div>
      <div className="relative bg-[repeating-linear-gradient(0deg,transparent,transparent_27px,rgba(31,110,99,0.05)_28px)] p-5">
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-7 text-ink">
          {segments.map((s, i) =>
            s.fields.length === 0 ? (
              <span key={i}>{s.text}</span>
            ) : (
              <mark
                key={i}
                className={cx(
                  "rounded-sm transition-colors [box-decoration-break:clone]",
                  activeField && s.fields.includes(activeField) ? "bg-amber-200 text-ink" : "bg-brand-100/70 text-ink",
                )}
              >
                {s.text}
              </mark>
            ),
          )}
        </pre>
      </div>
      <p className="border-t border-line px-5 py-2.5 text-xs text-muted">
        Highlighted text is the evidence used for each field. Hover or focus a field to find its source.
      </p>
    </Card>
  );
}

/* ------------------------------ field editors ------------------------------ */

const inputCls =
  "w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-brand-400";

function AmountInput({ id, value, onChange }: { id: string; value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const n = Number(text.replace(/[$,\s]/g, ""));
  const invalid = text.trim() !== "" && (!Number.isFinite(n) || n < 0);
  return (
    <div>
      <div className="flex items-center rounded-lg bg-white ring-1 ring-inset ring-line focus-within:ring-2 focus-within:ring-brand-400">
        <span className="pl-3 text-sm text-muted" aria-hidden>
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          className="w-full bg-transparent px-2 py-2 text-sm tabular-nums outline-none"
          value={text}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            const v = e.target.value.trim();
            const parsed = Number(v.replace(/[$,\s]/g, ""));
            if (v === "") onChange(null);
            else if (Number.isFinite(parsed) && parsed >= 0) onChange(parsed);
          }}
        />
      </div>
      {invalid && <p className="mt-1 text-xs text-rose-700">Enter a dollar amount of 0 or more.</p>}
    </div>
  );
}

type FieldSetter = <K extends NoticeField>(field: K, value: ReviewedChange[K]) => void;

function FieldEditor({ field, change, onChange }: { field: NoticeField; change: ReviewedChange; onChange: FieldSetter }) {
  const id = useId();
  const label = (
    <label htmlFor={id} className="sr-only">
      {FIELD_LABELS[field]}
    </label>
  );
  switch (field) {
    case "documentType":
      return (
        <>
          {label}
          <select id={id} className={inputCls} value={change.documentType} onChange={(e) => onChange(field, e.target.value as DocumentType)}>
            <option value="insurance_renewal">Homeowners insurance renewal</option>
            <option value="escrow_change">Escrow change</option>
            <option value="unknown">Something else / not sure</option>
          </select>
        </>
      );
    case "issuerName":
      return (
        <>
          {label}
          <input id={id} className={inputCls} value={change.issuerName} onChange={(e) => onChange(field, e.target.value)} />
        </>
      );
    case "noticeDate":
    case "effectiveDate":
      return (
        <>
          {label}
          <input
            id={id}
            type="date"
            className={inputCls}
            value={change[field] ?? ""}
            onChange={(e) => onChange(field, e.target.value || null)}
          />
        </>
      );
    case "previousAmount":
    case "newAmount":
      return (
        <>
          {label}
          <AmountInput id={id} value={change[field]} onChange={(v) => onChange(field, v)} />
        </>
      );
    case "period":
      return (
        <>
          {label}
          <select id={id} className={inputCls} value={change.period} onChange={(e) => onChange(field, e.target.value as PremiumPeriod)}>
            <option value="annual">Per year (annual)</option>
            <option value="monthly">Per month</option>
            <option value="unknown">Not sure</option>
          </select>
        </>
      );
    case "paymentMethod":
      return (
        <>
          {label}
          <select id={id} className={inputCls} value={change.paymentMethod} onChange={(e) => onChange(field, e.target.value as PaymentMethod)}>
            <option value="direct">I pay the insurer directly</option>
            <option value="escrow">Through my mortgage escrow</option>
            <option value="unknown">Not sure</option>
          </select>
        </>
      );
  }
}

/* --------------------------------- screen --------------------------------- */

function ModeBanner({ extraction, note }: { extraction: ExtractedNotice | null; note: string | null }) {
  if (!extraction) {
    return (
      <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200" role="status">
        <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Manual entry</p>
          <p className="mt-0.5">{note ?? "Enter the values from your notice. Nothing is filled in for you."}</p>
        </div>
      </div>
    );
  }
  if (extraction.extractionMode === "demo-fixture") {
    return (
      <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200" role="status">
        <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Demo mode: pre-extracted sample</p>
          <p className="mt-0.5">
            These values come from a fixed demo fixture for the fictional sample notice. No AI service was called. Every value is still yours to check and correct.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 rounded-xl bg-violet-50 p-4 text-sm text-violet-950 ring-1 ring-violet-200" role="status">
      <Icon name="sparkle" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">AI-extracted — please check every value</p>
        <p className="mt-0.5">An AI model read this notice. It can make mistakes. Fields without a matching quote need your confirmation before they can be used.</p>
      </div>
    </div>
  );
}

export function NoticeReview({
  notice,
  extraction,
  draft,
  analysisNote,
  onDraftChange,
  onApply,
  onBack,
}: {
  notice: NoticeSource;
  extraction: ExtractedNotice | null;
  draft: ReviewedChange;
  analysisNote: string | null;
  onDraftChange: (d: ReviewedChange) => void;
  onApply: () => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(extraction === null);
  const [activeField, setActiveField] = useState<NoticeField | null>(null);
  const check = checkApplicable(draft, extraction);

  const setField: FieldSetter = (field, value) => onDraftChange(setReviewedField(draft, extraction, field, value));

  const newMonthly = draft.newAmount !== null ? toMonthly(draft.newAmount, draft.period) : null;
  const prevMonthly = draft.previousAmount !== null ? toMonthly(draft.previousAmount, draft.period) : null;

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Step 2 · Review the notice</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Check what the notice says</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Nothing changes in your budget until you press <strong>Apply this change</strong>.
          </p>
        </div>
      </div>

      <ModeBanner extraction={extraction} note={analysisNote} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <NoticePreview notice={notice} extraction={extraction} activeField={activeField} />

        <Card aria-labelledby="fields-title">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
            <h3 id="fields-title" className="font-semibold">
              Extracted facts
            </h3>
            <Button variant={editing ? "subtle" : "secondary"} size="sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
              <Icon name={editing ? "check" : "edit"} className="h-4 w-4" />
              {editing ? "Done editing" : "Edit values"}
            </Button>
          </div>

          <ul className="divide-y divide-line">
            {FIELD_ORDER.map((field) => {
              const status = fieldStatus(draft, extraction, field);
              const ev = evidenceFor(extraction, field);
              const optional = field === "issuerName" || field === "noticeDate";
              return (
                <li
                  key={field}
                  className={cx("px-5 py-3 transition-colors", activeField === field && "bg-amber-50/60")}
                  onMouseEnter={() => setActiveField(field)}
                  onMouseLeave={() => setActiveField(null)}
                  onFocus={() => setActiveField(field)}
                  onBlur={() => setActiveField(null)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-muted">
                      {FIELD_LABELS[field]}
                      {optional && <span className="ml-1 text-xs font-normal">(optional)</span>}
                    </p>
                    {!(optional && status === "missing") && (
                      <Badge tone={STATUS_TONE[status]}>
                        {status === "found" && <Icon name="check" className="h-3 w-3" />}
                        {status === "needs-confirmation" && <Icon name="alert" className="h-3 w-3" />}
                        {statusLabel(status)}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5">
                    {editing ? (
                      <FieldEditor field={field} change={draft} onChange={setField} />
                    ) : (
                      <p className={cx("text-base font-semibold", status === "missing" && "text-rose-700")}>{displayValue(draft, field)}</p>
                    )}
                  </div>
                  {ev && !draft.editedFields.includes(field) && (
                    <p className="mt-1.5 border-l-2 border-brand-200 pl-2 text-xs italic text-muted">
                      &ldquo;{ev.quote}&rdquo;
                      <span className="not-italic"> · {ev.confidence} confidence</span>
                    </p>
                  )}
                  {(status === "needs-confirmation" || (field === "paymentMethod" && status === "missing")) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="subtle" size="sm" onClick={() => onDraftChange(withConfirmed(draft, field))}>
                        {field === "paymentMethod" && status === "missing" ? "I'm not sure — continue" : "Yes, this is correct"}
                      </Button>
                      {!editing && (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                          Edit
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="space-y-3 border-t border-line bg-canvas/60 px-5 py-4 text-sm">
            <p className="font-medium">Monthly equivalent used in your budget</p>
            {newMonthly !== null ? (
              <p className="tabular-nums">
                {prevMonthly !== null && (
                  <>
                    {formatUSD(prevMonthly)} → {" "}
                  </>
                )}
                <strong>{formatUSD(newMonthly)}/month</strong>
                {draft.period === "annual" && draft.newAmount !== null && (
                  <span className="text-muted"> ({formatUSD(draft.newAmount)} ÷ 12)</span>
                )}
              </p>
            ) : (
              <p className="text-amber-900">Can&apos;t calculate yet: {draft.period === "unknown" ? "billing frequency is unknown." : "the new premium is missing."}</p>
            )}
          </div>

          {extraction && extraction.uncertainties.length > 0 && (
            <div className="border-t border-line px-5 py-4">
              <p className="text-sm font-medium">What the notice doesn&apos;t say</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted">
                {extraction.uncertainties.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <StickyActions>
        {!check.ok && (
          <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200" role="status" aria-live="polite">
            <p className="font-semibold">Needs confirmation before applying</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {check.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={onBack}>
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </Button>
          <Button size="lg" onClick={onApply} disabled={!check.ok}>
            Apply this change
            <Icon name="arrow-right" className="h-4 w-4" />
          </Button>
        </div>
      </StickyActions>
    </div>
  );
}

function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-lg">
      {children}
    </div>
  );
}
