import { describeBuffer } from "@/lib/finance";
import { buildExplanation, buildInsight, ratioNote } from "@/lib/explain";
import { formatMonthDay, formatPercent, formatSignedPercent, formatSignedUSD, formatUSD } from "@/lib/format";
import type { Caution } from "@/lib/review";
import type { BudgetImpact, HouseholdBudget, ReviewedChange } from "@/lib/schema";
import { Badge, Card, Icon, cx } from "./ui";

function CompareBar({ label, before, after, max, hint }: { label: string; before: number; after: number; max: number; hint?: string }) {
  const w = (n: number) => `${Math.max(0, Math.min(100, (n / max) * 100))}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <p className="font-medium">{label}</p>
        <p className="tabular-nums text-muted">
          {formatUSD(before)} → <span className="font-semibold text-ink">{formatUSD(after)}</span>
        </p>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="mt-2 space-y-1.5" aria-hidden>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-xs text-muted">Before</span>
          <div className="h-3 flex-1 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-slate-400" style={{ width: w(before) }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-xs text-muted">After</span>
          <div className="h-3 flex-1 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-brand-500" style={{ width: w(after) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

type HousingPart = { label: string; value: number; cls: string };

function housingParts(budget: HouseholdBudget, insurance: number): HousingPart[] {
  return [
    { label: "Principal + interest", value: budget.mortgagePrincipalInterest, cls: "bg-brand-700" },
    { label: "Property tax", value: budget.propertyTaxMonthly, cls: "bg-brand-400" },
    { label: "Insurance", value: insurance, cls: "bg-amber-400" },
    { label: "HOA", value: budget.hoaMonthly, cls: "bg-slate-400" },
  ];
}

function CompositionRow({ title, parts, total, max }: { title: string; parts: HousingPart[]; total: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{title}</span>
        <span className="tabular-nums font-medium text-ink">{formatUSD(total)}</span>
      </div>
      <div className="flex h-5 overflow-hidden rounded-md bg-slate-100" style={{ width: `${total > 0 ? (total / max) * 100 : 0}%` }} aria-hidden>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.label} className={p.cls} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${formatUSD(p.value)}`} />
          ))}
      </div>
    </div>
  );
}

function HousingComposition({ budget, impact }: { budget: HouseholdBudget; impact: BudgetImpact }) {
  const max = Math.max(impact.beforeHousingMonthly, impact.afterHousingMonthly, 1);
  return (
    <div className="space-y-3">
      <CompositionRow title="Before" parts={housingParts(budget, impact.oldInsuranceMonthly)} total={impact.beforeHousingMonthly} max={max} />
      <CompositionRow title="After" parts={housingParts(budget, impact.newInsuranceMonthly)} total={impact.afterHousingMonthly} max={max} />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
        {housingParts(budget, impact.newInsuranceMonthly).map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className={cx("h-2.5 w-2.5 rounded-sm", p.cls)} aria-hidden />
            {p.label}: {p.label === "Insurance" ? `${formatUSD(impact.oldInsuranceMonthly)} → ${formatUSD(impact.newInsuranceMonthly)}` : formatUSD(p.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ImpactSummary({
  budget,
  change,
  impact,
  cautions,
}: {
  budget: HouseholdBudget;
  change: ReviewedChange;
  impact: BudgetImpact;
  cautions: Caution[];
}) {
  const insight = buildInsight(change, impact);
  const points = buildExplanation(change, impact);
  const level = describeBuffer(impact.afterCashBufferMonthly);
  const maxFlow = Math.max(budget.netMonthlyIncome, impact.afterEssentialOutflowMonthly, 1);
  const maxBuffer = Math.max(Math.abs(impact.beforeCashBufferMonthly), Math.abs(impact.afterCashBufferMonthly), 1);

  return (
    <section aria-labelledby="impact-title" className="animate-fade-up space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Step 3 · Your impact</p>
        <h2 id="impact-title" className="mt-1 text-2xl font-semibold tracking-tight">
          What this means for your monthly budget
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.1fr_1.3fr]">
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Homeowners insurance</p>
          <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-ink sm:text-6xl">
            {formatSignedUSD(impact.monthlyCostChange)}
            <span className="text-2xl font-semibold text-muted sm:text-3xl">/month</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {formatSignedUSD(impact.annualizedCostChange)}/year
            {change.effectiveDate && <> · starting {formatMonthDay(change.effectiveDate)}</>}
          </p>
        </Card>
        <Card className={cx("p-6", level === "none" ? "bg-amber-50/60" : "")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted">Monthly cushion after listed essentials</p>
            {level !== "comfortable" && (
              <Badge tone="amber">
                <Icon name="info" className="h-3 w-3" />
                {level === "none" ? "Needs attention" : "Getting thin"}
              </Badge>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
            <span className="text-muted/70">{formatUSD(impact.beforeCashBufferMonthly)}</span>
            <Icon name="arrow-right" className="h-8 w-8 self-center text-muted" />
            <span className={level === "none" ? "text-amber-800" : "text-brand-700"}>{formatUSD(impact.afterCashBufferMonthly)}</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {formatSignedUSD(impact.afterCashBufferMonthly - impact.beforeCashBufferMonthly)}
            {impact.cashBufferChangeRatio !== null && <> ({formatSignedPercent(impact.cashBufferChangeRatio)} of your cushion)</>}
          </p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <p className="text-lg leading-relaxed text-ink">{insight}</p>
        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          {points.map((p) => (
            <div key={p.label} className="rounded-xl bg-canvas p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-brand-700">{p.label}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink">{p.text}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {cautions.length > 0 && (
        <div className="space-y-2">
          {cautions.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
              <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="mt-0.5">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6" aria-labelledby="flow-title">
          <h3 id="flow-title" className="font-semibold">
            Before and after, per month
          </h3>
          <div className="mt-4 space-y-5">
            <CompareBar label="Housing cost" before={impact.beforeHousingMonthly} after={impact.afterHousingMonthly} max={maxFlow} hint="Mortgage P&I + property tax + insurance + HOA" />
            <CompareBar
              label="Listed essential expenses"
              before={impact.beforeEssentialOutflowMonthly}
              after={impact.afterEssentialOutflowMonthly}
              max={maxFlow}
              hint={`Housing + utilities + living essentials + minimum debt. Take-home income: ${formatUSD(budget.netMonthlyIncome)}`}
            />
            <CompareBar
              label="Monthly cushion"
              before={Math.max(0, impact.beforeCashBufferMonthly)}
              after={Math.max(0, impact.afterCashBufferMonthly)}
              max={maxBuffer}
              hint="Take-home income − listed essential expenses"
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6" aria-labelledby="housing-title">
          <h3 id="housing-title" className="font-semibold">
            Where your housing money goes
          </h3>
          <div className="mt-4">
            <HousingComposition budget={budget} impact={impact} />
          </div>
          <div className="mt-5 rounded-xl bg-sky-50 p-4 text-sm text-sky-950 ring-1 ring-sky-100">
            <p className="font-semibold">
              Housing cost ÷ gross income: {formatPercent(impact.beforeHousingToGrossIncome)} → {formatPercent(impact.afterHousingToGrossIncome)}
            </p>
            <p className="mt-1">{ratioNote(impact)}</p>
          </div>
        </Card>
      </div>

      <details className="group rounded-2xl bg-white p-5 ring-1 ring-line">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          How these numbers were calculated
          <span className="text-sm font-normal text-brand-700 group-open:hidden">Show</span>
          <span className="hidden text-sm font-normal text-brand-700 group-open:inline">Hide</span>
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>
            Monthly insurance = {change.period === "annual" ? "annual premium ÷ 12" : "monthly premium"}: {formatUSD(change.newAmount ?? 0)}
            {change.period === "annual" ? " ÷ 12 = " : " = "}
            {formatUSD(impact.newInsuranceMonthly)}.
          </li>
          <li>
            Housing = {formatUSD(budget.mortgagePrincipalInterest)} P&amp;I + {formatUSD(budget.propertyTaxMonthly)} tax + {formatUSD(impact.newInsuranceMonthly)} insurance + {formatUSD(budget.hoaMonthly)} HOA = {formatUSD(impact.afterHousingMonthly)}.
          </li>
          <li>
            Essentials = {formatUSD(impact.afterHousingMonthly)} housing + {formatUSD(budget.utilitiesMonthly)} utilities + {formatUSD(budget.livingEssentialsMonthly)} living + {formatUSD(budget.minimumDebtPaymentsMonthly)} debt = {formatUSD(impact.afterEssentialOutflowMonthly)}.
          </li>
          <li>
            Cushion = {formatUSD(budget.netMonthlyIncome)} take-home − {formatUSD(impact.afterEssentialOutflowMonthly)} = {formatUSD(impact.afterCashBufferMonthly)}.
          </li>
          <li>Everything else in your budget is assumed to stay the same. Numbers are estimates, not a bill.</li>
          <li>The {formatUSD(budget.emergencySavings)} in emergency savings is shown for context and is not used in these calculations.</li>
        </ul>
      </details>
    </section>
  );
}
