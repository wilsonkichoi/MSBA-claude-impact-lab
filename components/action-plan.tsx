import type { ActionItem } from "@/lib/actions";
import { Card, Icon } from "./ui";

export function ActionPlan({ actions }: { actions: ActionItem[] }) {
  return (
    <section aria-labelledby="actions-title" className="animate-fade-up">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Step 4 · Next steps</p>
      <h2 id="actions-title" className="mt-1 text-2xl font-semibold tracking-tight">
        What you can do now
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">Ranked for your situation. Each step says why it&apos;s suggested and who can help.</p>

      <ol className="mt-5 grid gap-4 md:grid-cols-2">
        {actions.map((a, i) => (
          <li key={a.id}>
            <Card as="article" className="flex h-full flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white" aria-hidden>
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold leading-snug">{a.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{a.why}</p>
                </div>
              </div>
              <div className="mt-4 flex-1 pl-11">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">How</p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  {a.how.map((h) => (
                    <li key={h} className="flex gap-2">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 space-y-2 border-t border-line pt-3 pl-11 text-sm">
                <p className="flex gap-2">
                  <Icon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <span>
                    <span className="font-medium">Who can help: </span>
                    {a.whoCanHelp}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  <span className="font-medium">Why this is suggested: </span>
                  {a.rule}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
