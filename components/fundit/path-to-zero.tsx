"use client";

import type { Dispatch } from "react";
import type { CatalogTotals } from "@/lib/fundit/catalog";
import { evaluateStack, singleChanges, type StackChoice } from "@/lib/fundit/path-to-zero";
import type { LandMode, PencilInputs } from "@/lib/fundit/project";
import { rateFor } from "@/lib/fundit/project";
import type { PencilAction } from "@/lib/fundit/state";
import { formatPercent, formatSignedUSDWhole, formatUSDWhole } from "@/lib/format";
import { Badge, Card, cx } from "../ui";
import { AssumptionChip, NumberField, Segmented } from "./bits";

const usd = formatUSDWhole;

export function PathToZeroPanel({
  inputs,
  totals,
  stack,
  city,
  dispatch,
}: {
  inputs: PencilInputs;
  totals: CatalogTotals;
  stack: StackChoice;
  city: string;
  dispatch: Dispatch<PencilAction>;
}) {
  const x = inputs;
  const single = singleChanges({ ...x, landMode: stack.land });
  const r = evaluateStack(x, totals, stack);
  const landLabel = stack.land === "donated" ? "donated land" : stack.land === "asking" ? "land at asking price" : "land at the custom price";
  const candidates = totals.evaluations.filter((e) => e.source.amountMax !== null && e.source.includeInCandidateTotal);

  const rows: { label: string; value: string; note: string; warn?: boolean }[] = [
    {
      label: "Mortgage rate",
      value: single.rate.value === null ? "No rate works" : `≤ ${single.rate.value.toFixed(2)}%`,
      note: `${single.rate.note} Now ${rateFor(x).toFixed(2)}%.`,
    },
    {
      label: "Deferred buyer assistance",
      value: single.buyerAssistance.value === null ? "Does not work" : `${usd(single.buyerAssistance.value)} per home`,
      note: `${single.buyerAssistance.note} For scale: MAP up to $120,000, WISH up to $32,837.`,
    },
    {
      label: "Development budget",
      value: single.devCost.value === null ? "None works" : `≤ ${usd(single.devCost.value)} (${usd(single.devCost.value / x.homes)}/home)`,
      note: `${single.devCost.note} Now ${usd(x.devCost)}.`,
    },
    { label: "Grants or gifts", value: usd(single.grants.value), note: single.grants.note },
    {
      label: "Household income",
      value:
        single.income.value === null
          ? "No income works"
          : `${usd(single.income.value)}${single.income.pctOfAmi !== null ? ` (${formatPercent(single.income.pctOfAmi)} of AMI)` : ""}`,
      note: single.income.changesWhoIsServed
        ? `That is ${single.income.category?.toLowerCase()}, so it changes who the homes serve.`
        : single.income.note,
      warn: single.income.changesWhoIsServed,
    },
  ];

  return (
    <Card className="p-5 sm:p-7" aria-labelledby="p2z-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="p2z-title" className="text-xl font-semibold tracking-tight">
          What would it take to reach $0?
        </h2>
        <Badge tone="amber">Scenario only: nothing here is committed</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Same assumptions as below (household, costs, reserve, buyer cash). Change them on the left and these update.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold">Any one of these alone, with {landLabel}</h3>
          {single.alreadyZero ? (
            <p className="mt-2 text-sm">These inputs already reach $0 with {landLabel}.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-line align-top">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{row.label}</span>
                      <span className={cx("block text-xs", row.warn ? "text-amber-900" : "text-muted")}>{row.note}</span>
                    </td>
                    <td className="py-2 text-right font-semibold whitespace-nowrap tabular-nums">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h3 className="font-semibold">Build a stack</h3>
          <div className="mt-2 space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Land</span>
              <Segmented<LandMode>
                label="Stack land"
                value={stack.land}
                onChange={(land) => dispatch({ type: "SET_STACK", patch: { land } })}
                options={[
                  ["donated", "Donated"],
                  ["asking", "Asking"],
                  ...(x.landMode === "custom" ? ([["custom", "Custom"]] as const) : []),
                ]}
              />
            </div>
            <fieldset>
              <legend className="font-medium">Programs, if they come through (in {city})</legend>
              <ul className="mt-1 space-y-1">
                {candidates.map((ev) => {
                  const out = ev.geo.inArea === false;
                  return (
                    <li key={ev.source.id}>
                      <label className={cx("flex items-start gap-2", out && "text-muted")}>
                        <input
                          type="checkbox"
                          className="mt-1"
                          disabled={out}
                          checked={!out && Boolean(stack.programs[ev.source.id])}
                          onChange={(e) => dispatch({ type: "TOGGLE_STACK_PROGRAM", id: ev.source.id, on: e.target.checked })}
                        />
                        <span>
                          {ev.source.name}: up to {usd(ev.source.amountMax ?? 0)}
                          {ev.source.recipient === "buyer" ? " per buyer" : ""}
                          {out && <span className="block text-xs text-rose-800">{ev.geo.text}</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1 text-xs text-muted">Programs with Unknown or conditional amounts can&apos;t be stacked until an amount is known.</p>
            </fieldset>
            <div className="rounded-xl bg-canvas p-3 ring-1 ring-line">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={stack.nonprofitLoan}
                  onChange={(e) => dispatch({ type: "SET_STACK", patch: { nonprofitLoan: e.target.checked } })}
                />
                <span>
                  <span className="font-medium">Below-market first mortgage held by the nonprofit or a partner</span> <AssumptionChip />
                  <span className="block text-xs text-muted">
                    Availability and terms: Unknown. Ask the mentors whether Habitat OC or a partner lender offers one.
                  </span>
                </span>
              </label>
              {stack.nonprofitLoan && (
                <div className="mt-2 w-40">
                  <NumberField
                    label="Loan rate"
                    suffix="%"
                    min={0}
                    step={0.25}
                    value={stack.nonprofitRate}
                    onChange={(v) => dispatch({ type: "SET_STACK", patch: { nonprofitRate: v } })}
                    chip={<AssumptionChip />}
                  />
                </div>
              )}
            </div>
          </div>

          <table className="mt-3 w-full text-sm">
            <tbody>
              <tr className="border-t border-line">
                <td className="py-1.5">Gap now (committed sources only)</td>
                <td className="py-1.5 text-right tabular-nums">{usd(r.startGap)}</td>
              </tr>
              {r.steps.map((st) => (
                <tr key={st.label} className="border-t border-line">
                  <td className="py-1.5">{st.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatSignedUSDWhole(st.delta)}</td>
                </tr>
              ))}
              <tr className={cx("border-t-2 font-semibold", r.closes ? "border-brand-300 text-brand-800" : "border-line")}>
                <td className="py-2">{r.closes ? "Closes the gap. Left over:" : "Left to raise"}</td>
                <td className="py-2 text-right text-lg tabular-nums">
                  {usd(Math.abs(r.remaining))}
                  <span className="block text-xs font-normal text-muted">{usd(Math.abs(r.remainingPerHome))} per home</span>
                </td>
              </tr>
            </tbody>
          </table>
          {stack.nonprofitLoan && (
            <p className="mt-2 text-sm">
              First-mortgage capital: <strong>{usd(r.loanCapital)}</strong> for {x.homes} homes, funded by the nonprofit or a partner and repaid monthly over{" "}
              {x.years} years. At the market rate a bank lender would fund {usd(r.loanCapitalMarket)}.
            </p>
          )}
          {r.programsSkipped.length > 0 && (
            <ul className="mt-2 text-xs text-muted">
              {r.programsSkipped.map((p) => (
                <li key={p.id}>
                  {p.name}: not stacked. {p.reason}
                </li>
              ))}
            </ul>
          )}
          {r.cautions.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
              {r.cautions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
