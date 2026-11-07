"use client";

import { useState } from "react";
import type { ActionItem } from "@/lib/actions";
import { buildResourceHandoff, type ResourceMatch } from "@/lib/assistance";
import { extractionModeLabel, statusLabel, summaryToText, type CounselorSummary } from "@/lib/counselor";
import { formatUSD } from "@/lib/format";
import type { FieldStatus } from "@/lib/review";
import type { ResourceStatus } from "@/lib/state";
import { AssistanceNavigator } from "./assistance-navigator";
import { Badge, Button, Card, Icon, cx } from "./ui";

const STATUS_TONE: Record<FieldStatus, "brand" | "amber" | "rose" | "sky" | "violet"> = {
  found: "brand",
  "needs-confirmation": "amber",
  missing: "rose",
  edited: "violet",
  confirmed: "sky",
};

export function CounselorEmptyState({ onStart }: { onStart: () => void }) {
  return (
    <Card className="animate-fade-up mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icon name="users" className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">No reviewed notice yet</h2>
      <p className="mt-2 text-sm text-muted">
        The case summary appears after the homeowner reviews and applies a notice. Try the sample scenario to see it.
      </p>
      <Button className="mt-5" onClick={onStart}>
        Try sample scenario
      </Button>
    </Card>
  );
}

export function CounselorView({
  summary,
  insight,
  actions,
  checklist,
  onToggleChecklist,
  matches,
  resourceStatus,
  onResourceStatusChange,
}: {
  summary: CounselorSummary;
  insight: string;
  actions: ActionItem[];
  checklist: Record<number, boolean>;
  onToggleChecklist: (i: number) => void;
  matches: ResourceMatch[];
  resourceStatus: Record<string, ResourceStatus>;
  onResourceStatusChange: (id: string, s: ResourceStatus) => void;
}) {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const h = summary.household;

  const copy = async () => {
    const text = summaryToText(summary, insight, actions, buildResourceHandoff(matches, resourceStatus));
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      // Fallback for browsers that block the async clipboard API.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(ok ? "ok" : "fail");
    }
    setTimeout(() => setCopied("idle"), 2500);
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Caseworker view</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Case summary: {h.name} <span className="font-normal text-muted">(fictional)</span>
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="amber">Demo only · synthetic household</Badge>
            <Badge tone="violet">Homeowner-reviewed · not yet reviewed by staff</Badge>
            <Badge tone="neutral">Source: {extractionModeLabel(summary.extractionMode)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span role="status" aria-live="polite" className="text-sm text-brand-700">
            {copied === "ok" ? "Copied to clipboard" : copied === "fail" ? "Copy failed — select the text manually" : ""}
          </span>
          <Button onClick={copy}>
            <Icon name="copy" className="h-4 w-4" />
            Copy summary
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Summary</p>
        <p className="mt-1.5 leading-relaxed">{insight}</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="min-w-0 space-y-5">
          <Card className="p-5" aria-labelledby="cw-household">
            <h3 id="cw-household" className="font-semibold">
              Household (self-reported)
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Location</dt>
              <dd className="text-right">{h.city}</dd>
              <dt className="text-muted">Household size</dt>
              <dd className="text-right">{h.householdSize}</dd>
              <dt className="text-muted">Gross income / mo</dt>
              <dd className="text-right tabular-nums">{formatUSD(h.grossMonthlyIncome)}</dd>
              <dt className="text-muted">Take-home / mo</dt>
              <dd className="text-right tabular-nums">{formatUSD(h.netMonthlyIncome)}</dd>
              <dt className="text-muted">Emergency savings</dt>
              <dd className="text-right tabular-nums">{formatUSD(h.emergencySavings)}</dd>
              <dt className="text-muted">Insurance paid (budget)</dt>
              <dd className="text-right">{h.insurancePaymentMethod === "direct" ? "Directly" : h.insurancePaymentMethod === "escrow" ? "Escrow" : "Not sure"}</dd>
            </dl>
          </Card>

          <Card className="overflow-hidden" aria-labelledby="cw-impact">
            <h3 id="cw-impact" className="px-5 pt-5 font-semibold">
              Monthly impact
            </h3>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-y border-line bg-canvas text-left text-xs uppercase tracking-wider text-muted">
                    <th scope="col" className="px-5 py-2 font-semibold">
                      Measure
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">
                      Before
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">
                      After
                    </th>
                    <th scope="col" className="px-5 py-2 text-right font-semibold">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {summary.impactRows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row" className="px-5 py-2.5 text-left font-normal">
                        {r.label}
                      </th>
                      <td className="px-2 py-2.5 text-right tabular-nums">{r.before}</td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{r.after}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right tabular-nums">{r.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-muted">The housing ratio is informational. It is not an approval, denial, or eligibility threshold.</p>
          </Card>

          <Card className="p-5" aria-labelledby="cw-assumptions">
            <h3 id="cw-assumptions" className="font-semibold">
              Assumptions
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {summary.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden" aria-labelledby="cw-evidence">
            <h3 id="cw-evidence" className="px-5 pt-5 font-semibold">
              Extracted change and source evidence
            </h3>
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {summary.evidence.map((e) => (
                <li key={e.field} className="grid gap-1 px-5 py-2.5 text-sm sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-3">
                  <span className="text-muted">{e.label}</span>
                  <span>
                    <span className="font-medium">{e.value}</span>
                    {e.quote && <span className="mt-0.5 block text-xs italic text-muted">&ldquo;{e.quote}&rdquo;</span>}
                  </span>
                  <Badge tone={STATUS_TONE[e.status]} className="justify-self-start sm:justify-self-end">
                    {statusLabel(e.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>

          {summary.cautions.length > 0 && (
            <Card className="bg-amber-50/50 p-5 ring-amber-200" aria-labelledby="cw-cautions">
              <h3 id="cw-cautions" className="flex items-center gap-2 font-semibold text-amber-950">
                <Icon name="alert" className="h-5 w-5" />
                Cautions
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-amber-950">
                {summary.cautions.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.title}.</span> {c.detail}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5" aria-labelledby="cw-questions">
            <h3 id="cw-questions" className="font-semibold">
              Questions to clarify
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {summary.openQuestions.map((q) => (
                <li key={q} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  {q}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5" aria-labelledby="cw-actions">
            <h3 id="cw-actions" className="font-semibold">
              Next steps shown to the homeowner
            </h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {actions.map((a) => (
                <li key={a.id}>{a.title}</li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">Suggestions only; staff have not reviewed or approved them.</p>
          </Card>

          <Card className="p-5" aria-labelledby="cw-checklist">
            <div className="flex items-center justify-between gap-2">
              <h3 id="cw-checklist" className="font-semibold">
                Suggested follow-up checklist
              </h3>
              <Badge tone="neutral">Draft · not saved</Badge>
            </div>
            <ul className="mt-3 space-y-2">
              {summary.checklist.map((item, i) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1.5 text-sm hover:bg-canvas">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                      checked={!!checklist[i]}
                      onChange={() => onToggleChecklist(i)}
                    />
                    <span className={cx(checklist[i] && "text-muted line-through")}>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg bg-canvas p-3 text-xs text-muted">
              Suggested opener: &ldquo;Thanks for sharing this. Would it be okay if we looked at the renewal notice and your budget together? You decide what to share, and nothing is sent to anyone without your OK.&rdquo;
            </p>
          </Card>
        </div>
      </div>

      <AssistanceNavigator matches={matches} statuses={resourceStatus} onStatusChange={onResourceStatusChange} />
    </div>
  );
}
