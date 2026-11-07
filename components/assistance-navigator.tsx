import { RESOURCE_STATUS_LABEL, type AssistanceResource, type ResourceMatch } from "@/lib/assistance";
import { formatLongDate } from "@/lib/format";
import type { ResourceStatus } from "@/lib/state";
import { Badge, Card, Icon } from "./ui";

const SOURCE_STATUS_LABEL: Record<AssistanceResource["status"], string> = {
  open: "Open per source",
  closed: "Closed per source",
  verify: "Status to verify",
};

export function AssistanceNavigator({
  matches,
  statuses,
  onStatusChange,
}: {
  matches: ResourceMatch[];
  statuses: Record<string, ResourceStatus>;
  /** Present only in the caseworker view. */
  onStatusChange?: (id: string, status: ResourceStatus) => void;
}) {
  if (matches.length === 0) return null;
  return (
    <section aria-labelledby="nav-title" className="animate-fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="nav-title" className="text-xl font-semibold tracking-tight">
          Resources you may want to check
        </h2>
        <Badge tone="sky">Verify before relying on it</Badge>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        {onStatusChange
          ? "Suggestions to verify, not determinations. Based only on the homeowner's self-reported budget and the reviewed notice. Status is set by the counselor and included in Copy summary. Nothing here is counted as savings."
          : "Based only on facts in your budget and the notice you reviewed. HomeStay does not decide eligibility, and nothing here is counted as savings."}
      </p>

      <div className="mt-4 grid gap-4">
        {matches.map(({ resource: r, whyItMayApply, stillUnknown }) => {
          const status = statuses[r.id] ?? "to-verify";
          return (
            <Card as="article" key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{r.name}</h3>
                  <p className="text-sm text-muted">{r.provider}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="amber">{r.status === "verify" ? "You may be eligible — verify" : "May help — verify fit"}</Badge>
                  <Badge tone="neutral">{SOURCE_STATUS_LABEL[r.status]}</Badge>
                  <Badge tone="neutral">Source checked {formatLongDate(r.lastVerified)}</Badge>
                </div>
              </div>

              <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Why it may apply</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    {whyItMayApply.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Still unknown</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    {stillUnknown.map((q) => (
                      <li key={q.question}>{q.question}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Potential benefit (per source)</p>
                  <p className="mt-1.5">{r.benefitDescription}</p>
                </div>
              </div>

              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-medium text-brand-700">Requirements and cautions</summary>
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <ul className="list-disc space-y-1 pl-5">
                    {r.requirements.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                  <ul className="list-disc space-y-1 pl-5 text-muted">
                    {r.cautions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </details>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <a href={r.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-700 underline-offset-2 hover:underline">
                    <Icon name="link" className="h-4 w-4" />
                    Official page
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  {r.officialPhone && (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Icon name="phone" className="h-4 w-4" />
                      {r.officialPhone}
                    </span>
                  )}
                </div>
                {onStatusChange ? (
                  <label className="flex items-center gap-2">
                    <span className="text-muted">Counselor status</span>
                    <select
                      className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-400"
                      value={status}
                      onChange={(e) => onStatusChange(r.id, e.target.value as ResourceStatus)}
                    >
                      {(Object.keys(RESOURCE_STATUS_LABEL) as ResourceStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {RESOURCE_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <Badge tone="neutral">Status: {RESOURCE_STATUS_LABEL[status]}</Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
