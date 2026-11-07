"use client";

/**
 * Finance (/): pick a home from Find it, see the gap to the buyer's monthly budget,
 * and stack down-payment assistance programs to close it. Styled like HomeStay.
 * All state lives in this browser tab. Nothing is sent. No AI at runtime.
 */

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  BUYER_HOMES,
  buildPlan,
  buyerHome,
  canCount,
  defaultSelection,
  type Availability,
  type Household,
  type Plan,
  type ProgramOption,
} from "@/lib/buyer-finance";
import type { FinanceAssumptions } from "@/lib/findit/finance";
import { monthlyFor } from "@/lib/findit/filters";
import { FIND_SOURCES } from "@/lib/findit/sources";
import { INCOME_CATEGORY_LABEL } from "@/lib/fundit/income-limits";
import { formatLongDate, formatPercent, formatUSDWhole } from "@/lib/format";
import { Badge, Button, Card, Icon, cx } from "../ui";

const usd = formatUSDWhole;

const outlineLink =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/40 hover:bg-white/10";

const AVAILABILITY_TONE: Record<Availability, "brand" | "amber" | "violet" | "rose"> = {
  available: "brand",
  "verify-amount": "amber",
  "assumed-amount": "amber",
  conditional: "violet",
  "not-here": "rose",
  "over-income": "rose",
};

/** Bar colors for programs in the plan, in display order. */
const SEGMENT = ["bg-brand-600", "bg-sky-500", "bg-amber-400", "bg-violet-400", "bg-rose-400"];

function DemoBanner() {
  return (
    <div className="bg-amber-100 text-amber-950">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-center text-xs font-medium sm:text-sm">
        <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">Demo</span>
        Fictional sample buyer. Program facts are from official pages checked Nov 7, 2026; amounts are estimates, not offers or eligibility decisions.
      </p>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{children}</p>;
}

function NumberInput({
  label,
  value,
  onCommit,
  prefix = "$",
  hint,
  allowEmpty = false,
  integer = false,
}: {
  label: string;
  value: number | null;
  onCommit: (n: number | null) => void;
  prefix?: string;
  hint?: string;
  allowEmpty?: boolean;
  integer?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? "" : String(value));
  const parse = (s: string) => Number(s.replace(/[$,\s]/g, ""));
  const n = parse(shown);
  const empty = shown.trim() === "";
  const invalid = empty ? !allowEmpty : !Number.isFinite(n) || n < 0 || (integer && !Number.isInteger(n));
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={cx(
          "mt-1 flex items-center rounded-lg bg-white ring-1 ring-inset focus-within:ring-2",
          invalid ? "ring-rose-300 focus-within:ring-rose-400" : "ring-line focus-within:ring-brand-400",
        )}
      >
        {prefix && (
          <span className="pl-3 text-sm text-muted" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          inputMode="decimal"
          className="w-full rounded-lg bg-transparent px-2 py-2 text-sm tabular-nums outline-none"
          value={shown}
          aria-invalid={invalid}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onFocus={() => setDraft(value === null ? "" : String(value))}
          onChange={(e) => {
            const s = e.target.value;
            setDraft(s);
            if (s.trim() === "") {
              if (allowEmpty) onCommit(null);
              return;
            }
            const v = parse(s);
            if (Number.isFinite(v) && v >= 0 && (!integer || Number.isInteger(v))) onCommit(v);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      {invalid ? (
        <p className="mt-1 text-xs text-rose-700">Enter a {integer ? "whole number" : "number"} of 0 or more. The last valid value is kept.</p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

// ───────────────────────── step 1: home and household ─────────────────────────

function HomePicker({
  homeId,
  household,
  assumptions,
  onChange,
}: {
  homeId: string;
  household: Household;
  assumptions: FinanceAssumptions;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-medium">
        Home <span className="font-normal text-muted">(from Find it)</span>
      </legend>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        {BUYER_HOMES.map((h) => {
          const active = h.id === homeId;
          const est = monthlyFor(h, household.cash, assumptions);
          return (
            <button
              key={h.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(h.id)}
              className={cx(
                "rounded-xl p-3 text-left ring-1 transition",
                active ? "bg-white ring-2 ring-brand-500 shadow-sm" : "bg-canvas ring-line hover:bg-white",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{h.name}</span>
                {active && <Icon name="check" className="h-4 w-4 text-brand-600" />}
              </span>
              <span className="block text-sm text-muted">
                {h.city} · {h.status}
              </span>
              <span className="mt-1 block text-sm tabular-nums">{est ? `${usd(est.monthly)}/mo estimate` : "Price unpublished"}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function HouseholdCard({ household, onChange, plan }: { household: Household; onChange: (patch: Partial<Household>) => void; plan: Plan }) {
  const [editing, setEditing] = useState(false);
  const share = household.annualIncome > 0 ? (household.budgetMonthly * 12) / household.annualIncome : null;
  return (
    <Card className="overflow-hidden" aria-labelledby="household-title">
      <div className="flex flex-col gap-3 border-b border-line bg-gradient-to-br from-brand-50 to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white" aria-hidden>
            <Icon name="users" className="h-5 w-5" />
          </div>
          <div>
            <h2 id="household-title" className="font-semibold text-ink">
              Sample buyer <span className="font-normal text-muted">(fictional)</span>
            </h2>
            <p className="text-sm text-muted">
              Household of {household.persons} · works in Irvine
            </p>
          </div>
        </div>
        {plan.placement && (
          <Badge tone="sky" className="self-start">
            {INCOME_CATEGORY_LABEL[plan.placement.category]} · {formatPercent(plan.placement.pctOfAmi)} of OC median (HCD category, not an eligibility decision)
          </Badge>
        )}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
        <div className="px-2 py-3">
          <dt className="text-xs text-muted">Income / yr</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{usd(household.annualIncome)}</dd>
        </div>
        <div className="px-2 py-3">
          <dt className="text-xs text-muted">Savings</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{usd(household.cash)}</dd>
        </div>
        <div className="px-2 py-3">
          <dt className="text-xs text-muted">Budget / mo</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-brand-700">{usd(household.budgetMonthly)}</dd>
        </div>
      </dl>

      <div className="px-5 py-4">
        {editing ? (
          <div id="household-editor" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="Gross income per year" value={household.annualIncome} onCommit={(n) => onChange({ annualIncome: n ?? 0 })} />
              <NumberInput label="Savings for buying" value={household.cash} onCommit={(n) => onChange({ cash: n ?? 0 })} hint="Pays the down payment and closing costs." />
              <NumberInput label="Preferred monthly payment" value={household.budgetMonthly} onCommit={(n) => onChange({ budgetMonthly: n ?? 0 })} />
              <NumberInput
                label="People in household"
                value={household.persons}
                prefix=""
                integer
                onCommit={(n) => onChange({ persons: Math.min(8, Math.max(1, n ?? 1)) })}
                hint="1–8, used for income limits."
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setEditing(false)} aria-controls="household-editor" aria-expanded>
                <Icon name="check" className="h-4 w-4" />
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Budget is {share === null ? "Unknown" : formatPercent(share)} of gross monthly income.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)} aria-expanded={false} aria-controls="household-editor">
              <Icon name="edit" className="h-4 w-4" />
              Edit
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ───────────────────────── step 2: the gap ─────────────────────────

function GapSection({ plan, household }: { plan: Plan; household: Household }) {
  const budget = household.budgetMonthly;
  const counted = plan.options.filter((p) => plan.counted.includes(p.id));

  if (!plan.before || !plan.after || plan.gapBefore === null || plan.gapAfter === null) {
    return (
      <section aria-labelledby="gap-title" className="animate-fade-up space-y-4">
        <div>
          <Eyebrow>Step 2 · Your gap</Eyebrow>
          <h2 id="gap-title" className="mt-1 text-2xl font-semibold tracking-tight">
            What price would fit your budget?
          </h2>
          <p className="mt-1 text-sm text-muted">
            {plan.home.name}&apos;s price is unpublished. Enter an expected price above to see the gap, or use these planning figures.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <p className="text-sm font-medium text-muted">Without help</p>
            <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-muted/80">{usd(plan.fitWithout)}</p>
            <p className="mt-2 text-sm text-muted">Highest price that keeps the estimate at {usd(budget)}/mo.</p>
          </Card>
          <Card className="p-6 ring-2 ring-brand-300">
            <p className="text-sm font-medium text-muted">With your plan</p>
            <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-brand-700">{usd(plan.fitWithPlan)}</p>
            <p className="mt-2 text-sm text-muted">
              {counted.length ? `With ${counted.map((p) => shortName(p)).join(" + ")}.` : "Add programs below to raise this."}
            </p>
          </Card>
        </div>
        <p className="text-xs text-muted">Planning estimate for this buyer, not a price for the property. HOA and assessments use the labeled scenario values.</p>
      </section>
    );
  }

  const before = plan.before;
  const after = plan.after;
  const closed = plan.gapAfter <= 0.005;
  const needed = plan.needed;
  const pct = needed && needed > 0 ? Math.min(1, after.assistance / needed) : 1;
  return (
    <section aria-labelledby="gap-title" className="animate-fade-up space-y-4">
      <div>
        <Eyebrow>Step 2 · Your gap</Eyebrow>
        <h2 id="gap-title" className="mt-1 text-2xl font-semibold tracking-tight">
          {plan.home.name} vs. your {usd(budget)} budget
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Monthly estimate, all-in</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-5xl font-bold tracking-tight tabular-nums">
            <span className="text-muted/70">{usd(before.monthly)}</span>
            <Icon name="arrow-right" className="h-8 w-8 self-center text-muted" />
            <span className="text-brand-700">{usd(after.monthly)}</span>
          </p>
          <p className="mt-2 text-sm text-muted">Without help → with your plan. Price {usd(before.price)}.</p>
        </Card>
        <Card className={cx("p-6", closed ? "bg-brand-50/60" : "bg-amber-50/60")} aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted">{closed ? "Gap closed" : "Still over budget"}</p>
            <Badge tone={closed ? "brand" : "amber"}>
              <Icon name={closed ? "check" : "info"} className="h-3 w-3" />
              {closed ? "Within budget" : `${usd(plan.gapBefore)}/mo before help`}
            </Badge>
          </div>
          <p className={cx("mt-1 text-5xl font-bold tracking-tight tabular-nums", closed ? "text-brand-700" : "text-amber-800")}>
            {closed ? `${usd(-plan.gapAfter)}` : `${usd(plan.gapAfter)}`}
            <span className="text-2xl font-semibold text-muted">/mo{closed ? " to spare" : " over"}</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            With your plan, a price up to <strong className="text-ink">{usd(plan.fitWithPlan)}</strong> fits your budget (without help: {usd(plan.fitWithout)}).
          </p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6" aria-labelledby="bar-title">
        <h3 id="bar-title" className="font-semibold">
          Down-payment help needed to reach {usd(budget)}/mo
        </h3>
        {needed === null ? (
          <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            Property tax, insurance, HOA and assessments alone are {usd(after.tax + after.insurance + after.hoa + after.assessment)}/mo, over your budget. Down-payment help
            can&apos;t close this gap.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              About <strong className="text-ink">{usd(needed)}</strong> needed. Your plan has <strong className="text-ink">{usd(after.assistance)}</strong> (
              {formatPercent(pct, 0)}).
            </p>
            <div className="mt-3 flex h-6 overflow-hidden rounded-lg bg-slate-100" role="img" aria-label={`Plan covers ${formatPercent(pct, 0)} of the help needed`}>
              {counted.map((p, i) => {
                const share = needed > 0 ? Math.min(p.amount, Math.max(0, needed)) / needed : 0;
                return <div key={p.id} className={SEGMENT[i % SEGMENT.length]} style={{ width: `${Math.min(100, share * 100)}%` }} title={`${shortName(p)}: ${usd(p.amount)}`} />;
              })}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {counted.map((p, i) => (
                <li key={p.id} className="flex items-center gap-1.5">
                  <span className={cx("h-2.5 w-2.5 rounded-sm", SEGMENT[i % SEGMENT.length])} aria-hidden />
                  {shortName(p)}: {usd(p.amount)}
                </li>
              ))}
              {!closed && (
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" aria-hidden />
                  Still needed: {usd(Math.max(0, needed - after.assistance))}
                </li>
              )}
            </ul>
          </>
        )}
        {before.shortOfReserve > 0 && (
          <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            Cash at closing is {usd(before.cashAtClose)}. That leaves you {usd(before.shortOfReserve)} short of keeping a reserve. Some programs (like WISH) can also pay
            closing costs; ask the lender.
          </p>
        )}
      </Card>
    </section>
  );
}

const SHORT_NAME: Record<string, string> = {
  "fhlbsf-wish": "WISH",
  "oc-map": "OC MAP",
  "calhfa-myhome": "MyHome",
  "calhfa-dream-for-all": "Dream For All",
  "santa-ana-my-first-home": "My First Home",
};

function shortName(p: ProgramOption): string {
  return SHORT_NAME[p.id] ?? p.source.name;
}

// ───────────────────────── step 3: programs ─────────────────────────

function ProgramCard({ p, on, onToggle, colorIdx }: { p: ProgramOption; on: boolean; onToggle: () => void; colorIdx: number | null }) {
  const usable = canCount(p);
  const id = `prog-${p.id}`;
  return (
    <Card as="article" className={cx("p-5", on && usable && "ring-2 ring-brand-300")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{p.source.name}</h3>
          <p className="text-sm text-muted">{p.source.provider}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{p.kind}</Badge>
          <Badge tone={AVAILABILITY_TONE[p.availability]}>{p.availabilityLabel}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 text-sm md:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Estimated for you</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums tracking-tight">
            {colorIdx !== null && <span className={cx("h-3 w-3 rounded-sm", SEGMENT[colorIdx % SEGMENT.length])} aria-hidden />}
            {usable ? usd(p.amount) : "$0"}
          </p>
          <p className="mt-1 text-xs text-muted">{p.amountNote}</p>
          <p className="mt-2 text-xs text-muted">{p.repaid ? "Repaid later, no monthly payment." : "Grant: not repaid (retention rules apply)."}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Why it may apply</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {p.why.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Still to check</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {[...p.source.openQuestions, ...p.source.conflicts].map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {p.source.requirements.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-brand-700">Requirements and cautions</summary>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <ul className="list-disc space-y-1 pl-5">
              {p.source.requirements.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              {p.source.cautions.map((c) => (
                <li key={c}>{c}</li>
              ))}
              <li>{p.source.timing}</li>
            </ul>
          </div>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a
            href={p.source.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            <Icon name="link" className="h-4 w-4" />
            Official page
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <span className="text-xs text-muted">Source checked {formatLongDate(p.source.lastVerified)}</span>
        </div>
        <label htmlFor={id} className={cx("inline-flex items-center gap-2 font-semibold", usable ? "cursor-pointer" : "cursor-not-allowed text-muted")}>
          <input id={id} type="checkbox" className="h-4 w-4 accent-brand-600" checked={on && usable} disabled={!usable} onChange={onToggle} />
          {usable ? "Add to my plan" : "Can't count for this home"}
        </label>
      </div>
    </Card>
  );
}

function ProgramsSection({ plan, selected, onToggle }: { plan: Plan; selected: readonly string[]; onToggle: (id: string) => void }) {
  const shown = plan.options.filter((p) => p.availability !== "not-here");
  const notHere = plan.options.filter((p) => p.availability === "not-here");
  return (
    <section aria-labelledby="programs-title" className="animate-fade-up">
      <Eyebrow>Step 3 · Close the gap</Eyebrow>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h2 id="programs-title" className="text-2xl font-semibold tracking-tight">
          Assistance programs for {plan.home.city}
        </h2>
        <Badge tone="sky">Verify before relying on it</Badge>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Check a program to add it to your plan and watch the gap change. Estimates use each program&apos;s published maximum
        {plan.price === null ? ` at a ${usd(plan.amountsAt)} price (the most your plan supports)` : ""}. Whether programs can be combined is decided by the lender and
        each program.
      </p>
      <div className="mt-4 grid gap-4">
        {shown.map((p) => {
          const idx = plan.counted.indexOf(p.id);
          return <ProgramCard key={p.id} p={p} on={selected.includes(p.id)} onToggle={() => onToggle(p.id)} colorIdx={idx === -1 ? null : idx} />;
        })}
      </div>
      {notHere.length > 0 && (
        <details className="mt-4 rounded-2xl bg-white p-5 text-sm ring-1 ring-line">
          <summary className="cursor-pointer font-semibold">Not available for this home ({notHere.length})</summary>
          <ul className="mt-2 space-y-2">
            {notHere.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.source.name}</span> <span className="text-muted">({p.source.provider})</span>: {p.why[0]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ───────────────────────── summary, how it works ─────────────────────────

function planSentence(plan: Plan, h: Household): string {
  const names = plan.options.filter((p) => plan.counted.includes(p.id)).map(shortName);
  const withText = names.length ? `With ${names.join(" + ")}` : "With no programs selected";
  if (!plan.after || plan.gapAfter === null) {
    return `${withText}, a price up to ${usd(plan.fitWithPlan)} fits your ${usd(h.budgetMonthly)}/mo budget at ${plan.home.name}.`;
  }
  const head =
    plan.gapAfter <= 0.005
      ? `${withText}, ${plan.home.name} comes to about ${usd(plan.after.monthly)}/mo, within your budget by ${usd(-plan.gapAfter)}.`
      : `${withText}, ${plan.home.name} comes to about ${usd(plan.after.monthly)}/mo, still ${usd(plan.gapAfter)} over your budget.`;
  const capped = plan.selectedTotal > plan.after.assistance + 0.5 ? ` Only ${usd(plan.after.assistance)} of the ${usd(plan.selectedTotal)} selected can count, because that pays off the whole first mortgage.` : "";
  return head + capped;
}

function HowCalculated({ plan, a }: { plan: Plan; a: FinanceAssumptions }) {
  return (
    <details className="group rounded-2xl bg-white p-5 ring-1 ring-line">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        How these numbers were calculated
        <span className="text-sm font-normal text-brand-700 group-open:hidden">Show</span>
        <span className="hidden text-sm font-normal text-brand-700 group-open:inline">Hide</span>
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
        <li>
          Rate {a.ratePct.toFixed(2)}% (Freddie Mac PMMS, week of {formatLongDate(a.pmmsWeek)}), {a.years}-year fixed. Down payment {formatPercent(a.downPct)}, closing
          costs {formatPercent(a.closingPct)}, {usd(a.reserve)} reserve kept after closing (ASSUMPTIONS, same as Find it).
        </li>
        <li>
          Monthly = first-mortgage P&amp;I + property tax ({formatPercent(a.taxRate, 2)} of price/yr) + insurance ({usd(a.insuranceMonthly)}) + HOA ({usd(plan.hoa)}
          {plan.hoaIsScenario ? ", scenario" : ", published"}) + assessments ({usd(plan.assessment)}
          {plan.assessmentIsScenario ? ", scenario" : ", published"}) + mortgage insurance ({formatPercent(a.pmiRate, 2)} of the loan/yr while the first mortgage is over 80%
          of price).
        </li>
        <li>ASSUMPTION: every program dollar lowers the first mortgage dollar for dollar. Deferred loans have no monthly payment and are repaid when you sell, refinance or pay off the first mortgage.</li>
        {plan.owedLater > 0 && <li>Your selected deferred loans total {usd(plan.owedLater)} (plus MAP interest or a Dream For All appreciation share) to repay later.</li>}
        <li>Income category uses HCD&apos;s 2026 Orange County State Income Limits. Programs use their own tables; only the program decides eligibility.</li>
        <li>
          {plan.home.priceNote ??
            (plan.home.price === null ? `${plan.home.name}: price unpublished; any price here is one you entered.` : `${plan.home.name}: listed ${usd(plan.home.price)}.`)}
        </li>
      </ul>
    </details>
  );
}

// ───────────────────────── main ─────────────────────────

export function FinanceApp({ homeId: initialHome, household: initialHousehold, assumptions }: { homeId: string; household: Household; assumptions: FinanceAssumptions }) {
  const [homeId, setHomeId] = useState(initialHome);
  const [household, setHousehold] = useState<Household>(initialHousehold);
  const [priceByHome, setPriceByHome] = useState<Record<string, number | null>>(() => Object.fromEntries(BUYER_HOMES.map((h) => [h.id, h.price])));
  const [selected, setSelected] = useState<string[]>(() => defaultSelection(buyerHome(initialHome), initialHousehold, assumptions));

  const home = buyerHome(homeId);
  const price = priceByHome[home.id] ?? null;
  const plan = useMemo(() => buildPlan(home, price, household, assumptions, selected), [home, price, household, assumptions, selected]);

  const chooseHome = (id: string) => {
    if (id === homeId) return;
    setHomeId(id);
    setSelected(defaultSelection(buyerHome(id), household, assumptions));
  };
  const reset = () => {
    setHomeId(initialHome);
    setHousehold(initialHousehold);
    setPriceByHome(Object.fromEntries(BUYER_HOMES.map((h) => [h.id, h.price])));
    setSelected(defaultSelection(buyerHome(initialHome), initialHousehold, assumptions));
  };
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const counselor = FIND_SOURCES["cfpb-counselor"];
  const habitat = FIND_SOURCES["habitat-oc-orientation"];

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />

      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Icon name="chart" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight tracking-tight">Finance</span>
              <span className="hidden text-xs text-muted sm:block">Close the gap between a home and your budget</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/find" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              <Icon name="arrow-left" className="h-4 w-4" />
              Back to Find it
            </Link>
            <Button variant="ghost" size="sm" onClick={reset} title="Reset to the home and buyer you arrived with">
              <Icon name="reset" className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
              <span className="sr-only sm:hidden">Reset</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-6 sm:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="animate-fade-up">
            <Eyebrow>Step 1 · Home and household</Eyebrow>
            <h1 className="mt-2 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">Close the gap between the home and your budget.</h1>
            <p className="mt-4 text-lg text-muted">See how far over budget a home is, then add assistance programs to bring it down.</p>

            <HomePicker homeId={homeId} household={household} assumptions={assumptions} onChange={chooseHome} />

            <div className="mt-4 max-w-xs">
              <NumberInput
                key={home.id}
                label={home.price === null ? "Expected price (optional)" : "Price"}
                value={price}
                allowEmpty={home.price === null}
                onCommit={(n) => setPriceByHome((m) => ({ ...m, [home.id]: n }))}
                hint={home.price === null ? "Price unpublished. Leave blank to see what price fits." : "Demo price (ASSUMPTION). Change it to test another price."}
              />
            </div>
          </div>
          <HouseholdCard household={household} onChange={(patch) => setHousehold((h) => ({ ...h, ...patch }))} plan={plan} />
        </div>

        <GapSection plan={plan} household={household} />

        <ProgramsSection plan={plan} selected={selected} onToggle={toggle} />

        <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white ring-0 lg:flex-row lg:items-center">
          <div className="max-w-2xl" aria-live="polite">
            <p className="text-lg font-semibold">Your plan</p>
            <p className="mt-1 text-sm text-brand-100">{planSentence(plan, household)}</p>
            {plan.owedLater > 0 && <p className="mt-1 text-sm text-brand-100">Deferred loans to repay later: {usd(plan.owedLater)}.</p>}
            <p className="mt-1 text-sm text-brand-100">Most programs require homebuyer education. A HUD-approved counselor can check which ones you qualify for.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={counselor.url} target="_blank" rel="noopener noreferrer" className={outlineLink}>
              <Icon name="users" className="h-4 w-4" />
              Find a housing counselor
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a href={habitat.url} target="_blank" rel="noopener noreferrer" className={outlineLink}>
              <Icon name="home" className="h-4 w-4" />
              Habitat OC orientation
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <Link href="/homestay" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
              Next: Stay
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <HowCalculated plan={plan} a={assumptions} />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl space-y-1 px-4 py-5 text-center text-xs text-muted">
          <p>Prototype only. Not a lender or financial counselor, and not an eligibility decision. Verify with each program and a HUD-approved housing counselor.</p>
          <p>
            For nonprofit finance staff: the{" "}
            <Link href="/pencil" className="font-semibold text-brand-700 underline">
              Pencil site analysis
            </Link>{" "}
            models what it would take to build on 504 E Avenida San Juan.
          </p>
        </div>
      </footer>
    </div>
  );
}
