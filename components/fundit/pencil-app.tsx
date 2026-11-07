"use client";

import Link from "next/link";
import { useMemo, useReducer, useState } from "react";
import { CAP_LABEL } from "@/lib/fundit/affordability";
import { INCOME_CATEGORY_LABEL, STATE_2026_OC } from "@/lib/fundit/income-limits";
import {
  computeProject,
  decisionSignal,
  INSURANCE_LEVER_MONTHLY,
  levers,
  rateFor,
  rateWeekDelta,
  sensitivityRanking,
  SENSITIVITY_STEPS,
  type LandMode,
} from "@/lib/fundit/project";
import { SAN_CLEMENTE, syntheticCheck } from "@/lib/fundit/property";
import { LATEST_PMMS, PMMS_SNAPSHOT, RATE_STEP_ASSUMPTION } from "@/lib/fundit/rates";
import { SOURCES } from "@/lib/fundit/sources";
import { createInitialPencilState, effectiveInputs, pencilReducer } from "@/lib/fundit/state";
import { formatPercent, formatSignedUSDWhole, formatUSD, formatUSDCents, formatUSDWhole } from "@/lib/format";
import { Badge, Button, Card, Icon, cx } from "../ui";
import { AssumptionChip, Group, NumberField, Segmented, SourceChip } from "./bits";
import { DonorPanel, LiveRateCheck, MemoPanel, SourcesPanel } from "./panels";
import { RecheckPanel } from "./recheck";

const usd = formatUSDWhole;

function Banner() {
  return (
    <div className="bg-amber-100 text-amber-950">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-center text-xs font-medium sm:text-sm">
        <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">Demo</span>
        Conditional scenario. Listing facts as published; the household is fictional; every assumed number is labeled ASSUMPTION. Hackathon prototype, not an official Habitat for Humanity product.
      </p>
    </div>
  );
}

function Tile({ label, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className={cx("rounded-2xl p-4 ring-1", big ? "bg-brand-700 text-white ring-brand-800" : "bg-white ring-line")}>
      <p className={cx("text-xs font-semibold uppercase tracking-wider", big ? "text-brand-100" : "text-muted")}>{label}</p>
      <p className={cx("mt-1 font-bold tabular-nums tracking-tight", big ? "text-4xl" : "text-2xl")}>{value}</p>
      {sub && <p className={cx("mt-1 text-xs", big ? "text-brand-100" : "text-muted")}>{sub}</p>}
    </div>
  );
}

function Row({ label, formula, value, strong, chip }: { label: string; formula?: string; value: string; strong?: boolean; chip?: React.ReactNode }) {
  return (
    <tr className={cx("border-t border-line align-top", strong && "font-semibold")}>
      <td className="py-2 pr-3">
        <span className="flex flex-wrap items-center gap-1.5">
          {label}
          {chip}
        </span>
        {formula && <span className="block text-xs font-normal text-muted">{formula}</span>}
      </td>
      <td className="py-2 text-right tabular-nums whitespace-nowrap">{value}</td>
    </tr>
  );
}

function DeltaText({ project, perHome }: { project: number; perHome: number }) {
  return (
    <span className="tabular-nums">
      <span className={cx("font-semibold", project > 0 ? "text-rose-700" : project < 0 ? "text-brand-700" : "")}>{formatSignedUSDWhole(project)}</span>
      <span className="text-muted"> project · {formatSignedUSDWhole(perHome)} per home</span>
    </span>
  );
}

export function PencilApp() {
  const [state, dispatch] = useReducer(pencilReducer, undefined, createInitialPencilState);
  const [weekA, setWeekA] = useState(PMMS_SNAPSHOT[0]!.week);
  const [weekB, setWeekB] = useState(LATEST_PMMS.week);
  const { inputs, totals } = useMemo(() => effectiveInputs(state), [state]);
  const x = inputs;
  const r = useMemo(() => computeProject(x), [x]);
  const free = useMemo(() => computeProject({ ...x, landMode: "donated" }), [x]);
  const decision = useMemo(() => decisionSignal(x, usd), [x]);
  const lv = useMemo(() => levers(x), [x]);
  const ranking = useMemo(() => sensitivityRanking(x, usd), [x]);
  const weekDelta = useMemo(() => rateWeekDelta({ ...x, landMode: "donated" }, weekA, weekB), [x, weekA, weekB]);
  const synth = useMemo(() => syntheticCheck(), []);
  const set = (patch: Partial<typeof x>) => dispatch({ type: "SET_INPUTS", patch });
  const rateStepOn = x.rateMode === "custom" && Math.abs(x.customRate - (LATEST_PMMS.rate30 + RATE_STEP_ASSUMPTION)) < 1e-9;
  const placement = r.placement;
  const listing = SOURCES["listing-504-avenida-san-juan"];
  const hcd = SOURCES["hcd-state-2026"];

  return (
    <div className="flex min-h-screen flex-col">
      <Banner />
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Icon name="chart" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight tracking-tight">Pencil</span>
              <span className="hidden text-xs text-muted sm:block">What would it take? A funding-gap check for one site</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/homestay" className="rounded-xl px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              HomeStay (after closing) →
            </Link>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "RESET" })} title="Reset every input to the starting scenario">
              <Icon name="reset" className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:py-8">
        {/* Decision card */}
        <Card className="p-5 sm:p-7" aria-labelledby="decision-title">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">Signal for the finance lead, not a decision</Badge>
            <Badge tone="amber">Conditional scenario; listing establishes asking price only</Badge>
            {state.city !== SAN_CLEMENTE.city && <Badge tone="rose">What-if: geography checks run as if the site were in {state.city}</Badge>}
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h1 id="decision-title" className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {decision.headline}
              </h1>
              <p className="mt-3 text-xl leading-snug sm:text-2xl">
                {decision.freeLandGap > 0 ? (
                  <>
                    Even with donated land, the project still needs <strong className="tabular-nums">{usd(decision.freeLandGap)}</strong> (
                    <strong className="tabular-nums">{usd(decision.freeLandGapPerHome)}</strong> per home).
                  </>
                ) : (
                  decision.freeLandLine
                )}
              </p>
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-base font-medium text-amber-950 ring-1 ring-amber-200">
                {decision.verifyFirst}
              </p>
              <div className="mt-3 text-sm text-muted">
                <p className="font-medium text-ink">Next checks</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                  {decision.nextChecks.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ol>
              </div>
              {!decision.pencilsAtLand && x.landMode === "asking" && (
                <p className="mt-3 text-sm text-muted">Pause at asking price? These inputs say it does not pencil. Gap at asking: {usd(r.gap)}.</p>
              )}
            </div>
            <div className="grid content-start gap-3">
              <Tile big label="Gap per home, free land" value={usd(free.gapPerHome)} sub={`${usd(free.gap)} for ${x.homes} homes`} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Tile
                  label="Max land price supported"
                  value={r.maxLandSupported < 0 ? "None" : usd(r.maxLandSupported)}
                  sub={r.maxLandSupported < 0 ? `${usd(r.maxLandSupported)}: even free land leaves a gap` : "proceeds + committed − development"}
                />
                <Tile
                  label="Cash needed at land closing"
                  value={usd(r.cashAtLandClose)}
                  sub="Land price − committed sources received by then"
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {/* Inputs */}
          <div className="space-y-4">
            <Group title="Property" aside={<SourceChip source={listing} label="public listing" />}>
              <div className="rounded-xl bg-canvas p-3 text-sm ring-1 ring-line">
                <p className="font-semibold">
                  {SAN_CLEMENTE.address}, {SAN_CLEMENTE.city}
                </p>
                <p className="text-muted">
                  MLS# {SAN_CLEMENTE.mls} · {SAN_CLEMENTE.lotAcres} acres · {SAN_CLEMENTE.propertyType}
                </p>
                <p className="mt-1">
                  Asking price <strong>{usd(SAN_CLEMENTE.askingPrice)}</strong>. Purchase price: Unknown.
                </p>
                <p className="mt-1 text-muted">{SAN_CLEMENTE.status}</p>
                <p className="mt-1">
                  Listing says: “{SAN_CLEMENTE.descriptionClaim}”. <span className="text-muted">Listing claim; current approval Unknown.</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  Data last updated {SAN_CLEMENTE.dataLastUpdated}; page checked {SAN_CLEMENTE.checkedDate}.{" "}
                  <a className="underline" href={SAN_CLEMENTE.sourceUrl} target="_blank" rel="noreferrer">
                    Open listing
                  </a>
                </p>
              </div>
              <NumberField
                label="Homes"
                value={x.homes}
                min={1}
                step={1}
                onChange={(v) => dispatch({ type: "SET_NUMBER", field: "homes", value: Math.max(1, Math.round(v)) })}
                chip={<AssumptionChip />}
                note="Based on the listing's 4-parcel claim. City verification needed."
              />
              <div>
                <p className="text-sm font-medium">Land price</p>
                <div className="mt-1">
                  <Segmented<LandMode>
                    label="Land price"
                    value={x.landMode}
                    onChange={(m) => set({ landMode: m })}
                    options={[
                      ["asking", `Asking ${usd(x.askingPrice)}`],
                      ["custom", "Custom"],
                      ["donated", "Donated ($0)"],
                    ]}
                  />
                </div>
                {x.landMode === "custom" && (
                  <div className="mt-2">
                    <NumberField
                      label="Custom land price"
                      prefix="$"
                      min={0}
                      step={10000}
                      value={x.customLandPrice}
                      onChange={(v) => dispatch({ type: "SET_NUMBER", field: "customLandPrice", value: v })}
                      chip={<AssumptionChip />}
                    />
                  </div>
                )}
                <p className="mt-1 text-xs text-muted">Land per proposed home: {usd(r.landPerHome)}.</p>
              </div>
            </Group>

            <Group title="Development costs">
              <NumberField
                label="Development budget, all homes"
                prefix="$"
                min={0}
                step={50000}
                value={x.devCost}
                onChange={(v) => dispatch({ type: "SET_NUMBER", field: "devCost", value: v })}
                chip={<AssumptionChip />}
                note="Construction, site work, fees, financing, sales, contingency. No site-specific bids."
              />
            </Group>

            <Group title="Household (fictional)">
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="People"
                  min={1}
                  step={1}
                  value={x.persons}
                  onChange={(v) => dispatch({ type: "SET_NUMBER", field: "persons", value: Math.round(v) })}
                  chip={<AssumptionChip />}
                />
                <NumberField
                  label="Gross income / yr"
                  prefix="$"
                  min={0}
                  step={1000}
                  value={x.grossIncome}
                  onChange={(v) => dispatch({ type: "SET_NUMBER", field: "grossIncome", value: v })}
                  chip={<AssumptionChip />}
                />
              </div>
              <div className="text-sm">
                {placement ? (
                  <p>
                    {formatPercent(placement.pctOfAmi)} of AMI ({usd(STATE_2026_OC.rows.median[x.persons - 1] ?? 0)} for {x.persons}{" "}
                    {x.persons === 1 ? "person" : "people"})
                    {placement.lowerBound && placement.upperBound
                      ? `, between ${placement.lowerBound.label} (${usd(placement.lowerBound.value)}) and ${placement.upperBound.label} (${usd(placement.upperBound.value)})`
                      : ""}
                    : <strong>{INCOME_CATEGORY_LABEL[placement.category].toLowerCase()}</strong>.
                  </p>
                ) : (
                  <p>Income category: Unknown (the table covers 1–8 people).</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  In OC the 4-person Low Income limit ({usd(STATE_2026_OC.rows.low[3])}) is higher than the AMI ({usd(STATE_2026_OC.ami4)}). The 50052.5
                  formula uses AMI for the unit size (the Median Income row), not the income limit. The memo says each program&apos;s own definitions
                  and effective dates govern.
                </p>
                <div className="mt-1">
                  <SourceChip source={hcd} label="HCD State Income Limits, memo dated 2026-06-23" />
                </div>
              </div>
            </Group>

            <Group title="What families can pay">
              <NumberField
                label="Share of gross income for housing"
                suffix="%"
                min={0}
                step={1}
                value={Math.round(x.budgetShare * 1000) / 10}
                onChange={(v) => dispatch({ type: "SET_NUMBER", field: "budgetShare", value: v / 100 })}
                chip={<AssumptionChip />}
                note="Santa Ana's My First Home uses a 28–40% housing-cost range."
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className={cx("rounded-xl p-3 ring-1", !r.capBinds ? "bg-brand-50 ring-brand-200" : "bg-canvas ring-line")}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Household budget</p>
                  <p className="text-lg font-bold tabular-nums">{formatUSDCents(r.householdBudget)}/mo</p>
                  <p className="text-xs text-muted">
                    {formatPercent(x.budgetShare)} × {usd(x.grossIncome)} ÷ 12 <AssumptionChip />
                  </p>
                </div>
                <div className={cx("rounded-xl p-3 ring-1", r.capBinds ? "bg-brand-50 ring-brand-200" : "bg-canvas ring-line")}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">50052.5 program cap</p>
                  <p className="text-lg font-bold tabular-nums">{r.capMonthly !== null ? `${formatUSDCents(r.capMonthly)}/mo` : "Unknown"}</p>
                  <p className="text-xs text-muted">{r.capCategory ? CAP_LABEL[r.capCategory] : "No 50052.5 category for this income"}, 3BR AMI {r.ami !== null ? usd(r.ami) : "Unknown"}</p>
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={x.applyCap} onChange={(e) => set({ applyCap: e.target.checked })} />
                <span>
                  Apply the 50052.5 cap (use the lower of the two). Whether this project&apos;s funding requires it is <strong>Unknown</strong> until a funder
                  is chosen.
                </span>
              </label>
              <p className="text-sm">
                Using <strong className="tabular-nums">{formatUSDCents(r.usedBudget)}/mo</strong>.{" "}
                {lv.capOff.project < 0 && x.applyCap && (
                  <span>If the funder requires the 50052.5 lower-income cap, families can pay less: {formatSignedUSDWhole(-lv.capOff.project)} gap.</span>
                )}
              </p>
              <p className="text-xs text-muted">
                50052.5(b): for lower-income households at or above 70% of AMI, an agency may instead require ≤ 30% of actual gross income. (a) pre-1991
                assistance and (d) tenants/co-ops are out of scope. The max-sales-price method in HCD regulations (c), (e) was not read; this price
                solver is our own method. <SourceChip source={SOURCES["hsc-50052-5"]} label="HSC 50052.5" />
              </p>
              <NumberField
                label="Recurring costs reserve, per home"
                prefix="$"
                suffix="/mo"
                min={0}
                step={25}
                value={x.reserveMonthly}
                onChange={(v) => dispatch({ type: "SET_NUMBER", field: "reserveMonthly", value: v })}
                chip={<AssumptionChip />}
                note={
                  <>
                    Stands in for the 25 CCR 6920 housing-cost lines other than principal and interest: taxes, fire and casualty insurance, maintenance,
                    utilities allowance, HOA fees, any mortgage insurance. <SourceChip source={SOURCES["ccr-25-6920"]} label="25 CCR 6920 (unofficial copy)" />
                  </>
                }
              />
              <div>
                <p className="text-sm font-medium">Mortgage rate, 30 years</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Segmented
                    label="Rate source"
                    value={x.rateMode}
                    onChange={(m) => set({ rateMode: m })}
                    options={[
                      ["pmms", "PMMS week"],
                      ["custom", "Custom"],
                    ]}
                  />
                  {x.rateMode === "pmms" ? (
                    <select
                      aria-label="PMMS week"
                      className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line"
                      value={x.pmmsWeek}
                      onChange={(e) => set({ pmmsWeek: e.target.value })}
                    >
                      {PMMS_SNAPSHOT.map((w) => (
                        <option key={w.week} value={w.week}>
                          {w.week}: {w.rate30.toFixed(2)}%
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-32">
                      <NumberField
                        label="Custom rate"
                        suffix="%"
                        min={0}
                        step={0.01}
                        value={x.customRate}
                        onChange={(v) => dispatch({ type: "SET_NUMBER", field: "customRate", value: v })}
                      />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {x.rateMode === "pmms" ? (
                    <>
                      Freddie Mac PMMS 30-year fixed, national average, week of {x.pmmsWeek}. The buyer&apos;s actual rate and Habitat-style loan terms
                      may differ. <SourceChip source={SOURCES.pmms} label="PMMS history CSV" />
                    </>
                  ) : (
                    <>
                      Custom rate {x.customRate.toFixed(2)}%: <strong>not published</strong>. <AssumptionChip />
                    </>
                  )}
                </p>
                <LiveRateCheck chosenWeek={x.rateMode === "pmms" ? x.pmmsWeek : null} />
              </div>
              <NumberField
                label="Buyer cash, per home"
                prefix="$"
                min={0}
                step={1000}
                value={x.buyerCash}
                onChange={(v) => dispatch({ type: "SET_NUMBER", field: "buyerCash", value: v })}
                chip={<AssumptionChip />}
                note="Closing costs assumed covered separately. Habitat-style loan terms need verification."
              />
            </Group>

            <details className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
              <summary className="cursor-pointer text-base font-semibold">Synthetic check (organizers): arithmetic only</summary>
              <p className="mt-2 text-sm text-muted">
                The organizers&apos; made-up one-home bill. Every line is an ASSUMPTION. Not a benchmark.{" "}
                <a className="underline" href={SOURCES["organizers-synthetic-deal"].url} target="_blank" rel="noreferrer">
                  Source
                </a>
              </p>
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                {(
                  [
                    ["Cost to create", synth.costLines, synth.costTotal],
                    ["Paid by", synth.paidLines, synth.paidTotal],
                  ] as const
                ).map(([title, lines, total]) => (
                  <table key={title} className="w-full">
                    <caption className="text-left font-semibold">{title}</caption>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.label}>
                          <td className="py-0.5">{l.label}</td>
                          <td className="py-0.5 text-right tabular-nums">{usd(l.value)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-line font-semibold">
                        <td className="py-0.5">Total</td>
                        <td className="py-0.5 text-right tabular-nums">{usd(total)}</td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>
              <p className="mt-2 text-sm">
                Balance: <strong>{usd(synth.balance)}</strong> {synth.balances ? "(balances as given)" : "(does not balance)"}.
              </p>
            </details>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <Card className="p-4 sm:p-5" aria-labelledby="breakdown-title">
              <h2 id="breakdown-title" className="text-base font-semibold">
                Breakdown
              </h2>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  <Row label="What families can pay, per home" formula={x.applyCap ? "lower of household budget and 50052.5 cap" : "household budget (cap not applied)"} value={`${formatUSDCents(r.usedBudget)}/mo`} />
                  <Row label="− Recurring costs reserve" formula={x.insuranceExtraMonthly > 0 ? `${usd(x.reserveMonthly)} + ${usd(x.insuranceExtraMonthly)} insurance lever` : undefined} value={`${formatUSDCents(r.reserveTotal)}/mo`} chip={<AssumptionChip />} />
                  <Row label="= Principal and interest" value={`${formatUSDCents(r.price.principalInterest)}/mo`} />
                  <Row label="Mortgage supported" formula={`P&I ÷ payment factor ${r.paymentFactor.toFixed(6)} (${r.ratePct.toFixed(2)}%, ${x.years} yr)`} value={formatUSDCents(r.price.mortgage)} />
                  <Row label="+ Buyer cash" value={formatUSD(x.buyerCash)} chip={<AssumptionChip />} />
                  {x.committedBuyerAssistancePerHome > 0 && <Row label="+ Committed buyer assistance" value={formatUSD(x.committedBuyerAssistancePerHome)} />}
                  <Row label="= Price per home" value={formatUSDCents(r.price.price)} strong />
                  <Row label={`× ${x.homes} homes = buyer proceeds`} value={formatUSDCents(r.proceeds)} strong />
                  <Row label="Land" formula={x.landMode === "asking" ? "asking price (purchase price Unknown)" : x.landMode === "donated" ? "donated" : "custom (ASSUMPTION)"} value={usd(r.land)} />
                  <Row label="+ Development budget" value={usd(r.devCost)} chip={<AssumptionChip />} />
                  <Row label="− Buyer proceeds" value={formatUSDCents(r.proceeds)} />
                  <Row label="− Committed sources" formula="only sources marked Committed with an amount, plus the donor gift" value={usd(r.committedProject)} />
                  <Row label="= Gap" formula="land + development − proceeds − committed" value={formatUSDCents(r.gap)} strong />
                  <Row label="Gap per home" value={formatUSDCents(r.gapPerHome)} />
                </tbody>
              </table>
              {!r.price.pencilsAtBudget && (
                <p className="mt-2 rounded-xl bg-rose-50 p-2 text-sm text-rose-900 ring-1 ring-rose-200">
                  The monthly budget does not cover the recurring costs, so the price per home is $0. Does not pencil at this budget.
                </p>
              )}
            </Card>

            <Card className="p-4 sm:p-5" aria-labelledby="levers-title">
              <h2 id="levers-title" className="text-base font-semibold">
                Levers
              </h2>
              <ul className="mt-2 divide-y divide-line text-sm">
                <li className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Land: asking → donated</span>
                    <Segmented<LandMode>
                      label="Land lever"
                      value={x.landMode}
                      onChange={(m) => set({ landMode: m })}
                      options={[
                        ["asking", "Asking"],
                        ["donated", "Donated"],
                      ]}
                    />
                  </div>
                  <p className="mt-1">
                    <DeltaText {...lv.landAskingToDonated} />
                  </p>
                </li>
                <li className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      Rate +{RATE_STEP_ASSUMPTION.toFixed(2)} point <AssumptionChip />
                    </span>
                    <Button
                      size="sm"
                      variant={rateStepOn ? "primary" : "secondary"}
                      aria-pressed={rateStepOn}
                      onClick={() =>
                        rateStepOn
                          ? set({ rateMode: "pmms", pmmsWeek: LATEST_PMMS.week })
                          : set({ rateMode: "custom", customRate: LATEST_PMMS.rate30 + RATE_STEP_ASSUMPTION })
                      }
                    >
                      {rateStepOn ? `On: ${(LATEST_PMMS.rate30 + RATE_STEP_ASSUMPTION).toFixed(2)}%` : `Try ${(LATEST_PMMS.rate30 + RATE_STEP_ASSUMPTION).toFixed(2)}%`}
                    </Button>
                  </div>
                  <p className="mt-1">
                    From {rateFor(x).toFixed(2)}%: <DeltaText {...lv.ratePlusStep} />
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>Compare two PMMS weeks:</span>
                    {[
                      [weekA, setWeekA, "From week"],
                      [weekB, setWeekB, "To week"],
                    ].map(([w, setW, label]) => (
                      <select
                        key={label as string}
                        aria-label={label as string}
                        className="rounded-lg bg-white px-2 py-1 ring-1 ring-line"
                        value={w as string}
                        onChange={(e) => (setW as (v: string) => void)(e.target.value)}
                      >
                        {PMMS_SNAPSHOT.map((p) => (
                          <option key={p.week} value={p.week}>
                            {p.week} ({p.rate30.toFixed(2)}%)
                          </option>
                        ))}
                      </select>
                    ))}
                    <span>
                      → <DeltaText {...weekDelta} />
                    </span>
                  </div>
                </li>
                <li className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Homeowners insurance +{usd(INSURANCE_LEVER_MONTHLY)}/mo per home</span>
                    <Button
                      size="sm"
                      variant={x.insuranceExtraMonthly > 0 ? "primary" : "secondary"}
                      aria-pressed={x.insuranceExtraMonthly > 0}
                      onClick={() => set({ insuranceExtraMonthly: x.insuranceExtraMonthly > 0 ? 0 : INSURANCE_LEVER_MONTHLY })}
                    >
                      {x.insuranceExtraMonthly > 0 ? "On" : "Try it"}
                    </Button>
                  </div>
                  <p className="mt-1">
                    <DeltaText {...lv.insurance} />
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    25 CCR 6920 counts fire and casualty insurance in a buyer&apos;s housing cost. The HomeStay sample renewal ($1,800 → $3,600/yr) is +$150/mo. A
                    project that pencils at closing can stop penciling at the first renewal.{" "}
                    <Link href="/homestay" className="font-semibold text-brand-700 underline">
                      See this renewal from the family&apos;s side →
                    </Link>
                  </p>
                </li>
                <li className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Donor gift</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={x.donorGift === 25000 ? "primary" : "secondary"} onClick={() => set({ donorGift: x.donorGift === 25000 ? 0 : 25000 })}>
                        {x.donorGift === 25000 ? "$25,000 on" : "Try $25,000"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1">
                    {x.donorGift > 0 ? <DeltaText {...lv.gift} /> : <span className="text-muted">No gift entered. Set an amount in the donor view below.</span>}
                  </p>
                </li>
              </ul>
            </Card>

            <Card className="p-4 sm:p-5" aria-labelledby="verify-title">
              <h2 id="verify-title" className="text-base font-semibold">
                Verify first
              </h2>
              <p className="mt-1 text-sm text-muted">
                Each assumption moved by a fixed step (the steps are themselves ASSUMPTIONs), sorted by how much the gap moves. Land is excluded because it is
                an explicit lever.
              </p>
              <ol className="mt-2 space-y-1.5 text-sm">
                {ranking.map((row, i) => (
                  <li key={row.id} className={cx("flex flex-wrap items-baseline justify-between gap-2 rounded-xl px-3 py-2 ring-1", i === 0 ? "bg-amber-50 ring-amber-200" : "ring-line")}>
                    <span>
                      <span className="font-semibold">
                        {i + 1}. {row.label}
                      </span>{" "}
                      <span className="text-muted">step {row.step}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatSignedUSDWhole(row.delta)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted">
                Steps: development {formatPercent(SENSITIVITY_STEPS.devCostPct, 0)}, reserve +${SENSITIVITY_STEPS.reserveMonthly}/mo, budget −$
                {Math.abs(SENSITIVITY_STEPS.budgetMonthly)}/mo, rate +{SENSITIVITY_STEPS.ratePoints.toFixed(2)} point, buyer cash −$
                {Math.abs(SENSITIVITY_STEPS.buyerCash).toLocaleString("en-US")}. <AssumptionChip />
              </p>
            </Card>

            <SourcesPanel state={state} dispatch={dispatch} totals={totals} inputs={x} />
            <RecheckPanel state={state} dispatch={dispatch} />
            <DonorPanel inputs={x} dispatch={dispatch} />
            <MemoPanel state={state} />
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-muted">
          Prototype. Not legal, financial or lending advice. Listing facts are as published; program terms change; verify with the source. Nothing here is
          sent, filed or submitted.
        </p>
      </footer>
    </div>
  );
}
