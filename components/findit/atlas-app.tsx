"use client";

/**
 * FIND_IT.md §4: South OC Home Atlas. Buyer panel, map, list cards, detail, compare and brief.
 * All state lives in this browser tab. Nothing is sent. No AI at runtime.
 */

import Link from "next/link";
import { useCallback, useMemo, useReducer, useRef, useState, type ReactNode, type RefObject } from "react";
import { financeHref } from "@/lib/buyer-finance";
import {
  ASK_TEXT,
  DESTINATIONS,
  GUIDANCE,
  OPPORTUNITIES,
  station,
  type BuyerOpportunity,
  type Opportunity,
} from "@/lib/findit/data";
import {
  ACCESS_MINUTES,
  BOARD_MINUTES,
  EGRESS_MINUTES,
  METROLINK_URL,
  MORNING_TRAIN_NOTE,
  QUICKMAP_URL,
  TRIP_PLANNER_URL,
  commute,
  type CommuteResult,
  type Mode,
} from "@/lib/findit/commute";
import {
  ASSESSMENT_RANGE,
  HOA_RANGE,
  PMI_THRESHOLD,
  budgetShare,
  fitRange,
  fitSentence,
  haversineMiles,
  type FinanceAssumptions,
  type MonthlyEstimate,
} from "@/lib/findit/finance";
import { CITIES, NO_RESULTS_TEXT, filterOpportunities, monthlyFor, noResultsHint, type Layer } from "@/lib/findit/filters";
import { BRIEF_HEADER, buildBrief } from "@/lib/findit/brief";
import { INITIAL_STATE, MAX_SAVED, reducer, type AtlasState } from "@/lib/findit/state";
import { CHECKED, FIND_SOURCES } from "@/lib/findit/sources";
import { INCOME_CATEGORY_LABEL, STATE_2026_OC, incomeCategory } from "@/lib/fundit/income-limits";
import { PMMS_SNAPSHOT, pmmsRate } from "@/lib/fundit/rates";
import { formatLongDate, formatPercent, formatUSD, formatUSDWhole } from "@/lib/format";
import { AtlasMap, PinShape, type MapPin } from "./atlas-map";
import { Assumption, SourceChip, SourceLinks, StatusTag } from "./bits";
import { SitePanel } from "./site-panel";

const CHECKED_LABEL = `Checked ${formatLongDate(CHECKED)}`;

function cx(...p: (string | false | null | undefined)[]) {
  return p.filter(Boolean).join(" ");
}

const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-[#2b1d14] text-[#fffdf8] hover:bg-[#3d2a1d]`;
const btnSecondary = `${btn} border border-[#d9ccb4] bg-[#fffdf8] text-[#2b1d14] hover:bg-[#f3ead8]`;
const inputCls =
  "atlas-num w-full rounded-md border border-[#d9ccb4] bg-[#fffdf8] px-2.5 py-1.5 text-sm text-[#2b1d14] focus:border-[#8a6a2f]";

const miles = (n: number) => `${n.toFixed(1)} mi`;

// ───────────────────────── main ─────────────────────────

export function AtlasApp() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [overlay, setOverlay] = useState<"compare" | "brief" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const budgetRef = useRef<HTMLInputElement>(null);

  const { inputs, assumptions: a, layer, filters, selectedId } = state;
  const filtered = useMemo(() => filterOpportunities(layer, filters, inputs.cash, a), [layer, filters, inputs.cash, a]);
  const selected = useMemo(() => filtered.results.find((o) => o.id === selectedId) ?? null, [filtered, selectedId]);
  const pins: MapPin[] = useMemo(
    () => filtered.results.map((o) => ({ id: o.id, name: o.name, status: o.status, lat: o.point.lat, lon: o.point.lon })),
    [filtered],
  );
  const onSelect = useCallback((id: string) => {
    dispatch({ type: "select", id });
    setOverlay(null);
  }, []);

  const list = (
    <ResultsList
      state={state}
      results={filtered.results}
      reason={filtered.reason}
      onSelect={(id) => {
        onSelect(id);
        setSheetOpen(false);
      }}
      onToggleSave={(id) => dispatch({ type: "toggleSave", id })}
      onShowUnpublished={() => dispatch({ type: "setFilters", patch: { showUnpublished: true } })}
      onClearFilters={() => dispatch({ type: "clearFilters" })}
    />
  );

  return (
    <div className="atlas-root flex flex-col text-[15px] leading-relaxed min-[860px]:h-[calc(100dvh-31px)] min-[860px]:overflow-hidden">
      <div className="flex flex-1 flex-col min-[860px]:min-h-0 min-[860px]:flex-row">
        {/* Left: buyer panel (after the map on mobile) */}
        <aside
          aria-label="Buyer panel"
          className="order-2 w-full border-[#d9ccb4] bg-[#fffdf8] min-[860px]:order-none min-[860px]:w-[360px] min-[860px]:shrink-0 min-[860px]:overflow-y-auto min-[860px]:border-r"
        >
          <BuyerPanel
            state={state}
            dispatch={dispatch}
            budgetRef={budgetRef}
            onSample={() => {
              dispatch({ type: "loadSample" });
              setOverlay(null);
            }}
          />
          <div className="hidden border-t border-[#d9ccb4] px-4 py-3 min-[860px]:block">{list}</div>
          <p className="border-t border-[#d9ccb4] px-4 py-3 text-xs text-[#6b5a4c]">
            Prototype. Not financial, legal or lending advice. Fictional sample buyer; inputs stay in your browser.
          </p>
        </aside>

        {/* Right: toolbar + map + docked detail */}
        <main className="order-1 flex min-w-0 flex-1 flex-col min-[860px]:order-none min-[860px]:min-h-0">
          <Toolbar state={state} dispatch={dispatch} onOpen={setOverlay} />
          <div className="relative flex flex-1 flex-col min-[860px]:min-h-0 min-[860px]:flex-row">
            <div className="relative h-[58vh] min-w-0 shrink-0 min-[860px]:h-auto min-[860px]:flex-1 min-[860px]:shrink">
              <AtlasMap pins={pins} selectedId={selected?.id ?? null} onSelect={onSelect} />
              <Legend />
              {filtered.results.length === 0 && filtered.reason && (
                <div
                  role="status"
                  className="absolute left-1/2 top-14 z-[550] w-[min(92%,420px)] -translate-x-1/2 rounded-md border border-[#d9ccb4] bg-[#fffdf8] p-3 text-sm shadow"
                >
                  <p className="font-semibold">{NO_RESULTS_TEXT}</p>
                  <p className="mt-1 text-[#6b5a4c]">{noResultsHint(filtered.reason)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!filters.showUnpublished && (
                      <button className={btnPrimary} onClick={() => dispatch({ type: "setFilters", patch: { showUnpublished: true } })}>
                        Show unpublished prices
                      </button>
                    )}
                    <button className={btnSecondary} onClick={() => dispatch({ type: "clearFilters" })}>
                      Clear filters
                    </button>
                  </div>
                </div>
              )}
              {overlay && (
                <div className="absolute inset-x-2 top-2 z-[600] max-h-[calc(100%-16px)] overflow-y-auto rounded-md border border-[#d9ccb4] bg-[#fffdf8] p-4 shadow-lg min-[860px]:inset-x-6">
                  {overlay === "compare" ? (
                    <ComparePanel state={state} onClose={() => setOverlay(null)} />
                  ) : (
                    <BriefPanel state={state} onClose={() => setOverlay(null)} />
                  )}
                </div>
              )}
            </div>
            {selected && (
              <aside
                aria-label={`Details: ${selected.name}`}
                className="w-full border-[#d9ccb4] bg-[#fffdf8] min-[860px]:w-[440px] min-[860px]:shrink-0 min-[860px]:overflow-y-auto min-[860px]:border-l"
              >
                <DetailPanel
                  o={selected}
                  state={state}
                  onClose={() => dispatch({ type: "select", id: null })}
                  onToggleSave={(id) => dispatch({ type: "toggleSave", id })}
                  onBrief={() => setOverlay("brief")}
                  onCompare={() => setOverlay("compare")}
                />
              </aside>
            )}
          </div>
        </main>
      </div>

      {/* Mobile results sheet */}
      <div className="sticky bottom-0 z-[700] border-t border-[#d9ccb4] bg-[#fffdf8] shadow-[0_-2px_8px_rgba(43,29,20,0.12)] min-[860px]:hidden">
        <button
          type="button"
          aria-expanded={sheetOpen}
          aria-controls="atlas-sheet"
          onClick={() => setSheetOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
        >
          <span>
            {filtered.results.length} {filtered.results.length === 1 ? "result" : "results"} ·{" "}
            {layer === "buyer" ? "Buy or plan ahead" : "Future sites"}
          </span>
          <span aria-hidden="true">{sheetOpen ? "▾ Hide list" : "▴ Show list"}</span>
        </button>
        <div id="atlas-sheet" hidden={!sheetOpen} className="max-h-[65vh] overflow-y-auto border-t border-[#d9ccb4] px-4 py-3">
          {list}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── buyer panel ─────────────────────────

type Dispatch = (a: Parameters<typeof reducer>[1]) => void;

function BuyerPanel({
  state,
  dispatch,
  budgetRef,
  onSample,
}: {
  state: AtlasState;
  dispatch: Dispatch;
  budgetRef: RefObject<HTMLInputElement | null>;
  onSample: () => void;
}) {
  const { inputs, assumptions: a } = state;
  const share = budgetShare(inputs.budgetMonthly, inputs.annualIncome);
  const placement = incomeCategory(inputs.annualIncome, inputs.persons);
  const median = STATE_2026_OC.rows.median[inputs.persons - 1];
  const setIn = (patch: Partial<typeof inputs>) => dispatch({ type: "setInput", patch });
  const setA = (patch: Partial<FinanceAssumptions>) => dispatch({ type: "setAssumption", patch });

  return (
    <div className="space-y-4 px-4 py-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a2f]">South OC Home Atlas</p>
        <h1 className="atlas-serif mt-1 text-[26px] font-semibold leading-tight">Where could you buy in South OC?</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={onSample}>
            Explore with a sample buyer
          </button>
          <button className={btnSecondary} onClick={() => budgetRef.current?.focus()}>
            Set my budget
          </button>
        </div>
      </header>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Your household (fictional sample by default)</legend>
        <Field label="Annual gross income" id="f-income">
          <MoneyInput id="f-income" value={inputs.annualIncome} onChange={(v) => setIn({ annualIncome: v })} />
        </Field>
        <Field label="Household size" id="f-persons">
          <select
            id="f-persons"
            className={inputCls}
            value={inputs.persons}
            onChange={(e) => setIn({ persons: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "person" : "persons"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cash available" id="f-cash">
          <MoneyInput id="f-cash" value={inputs.cash} onChange={(v) => setIn({ cash: v })} />
        </Field>
        <Field label="Preferred all-in monthly payment" id="f-budget">
          <MoneyInput id="f-budget" inputRef={budgetRef} value={inputs.budgetMonthly} onChange={(v) => setIn({ budgetMonthly: v })} />
        </Field>
        <p className="text-sm text-[#4e4033]">
          {share === null ? (
            "Enter an annual income to see what share of it this payment is."
          ) : (
            <>
              <span className="atlas-num font-semibold">{formatUSDWhole(inputs.budgetMonthly)}</span> is{" "}
              <span className="atlas-num font-semibold">{formatPercent(share)}</span> of gross monthly income.
            </>
          )}{" "}
          This is your choice; a lender decides approval separately, and program eligibility is a separate question.
        </p>
        <div className="rounded-md bg-[#f7f2e8] p-2.5 text-sm">
          {placement && median ? (
            <p>
              <span className="font-semibold">{INCOME_CATEGORY_LABEL[placement.category]}</span> on HCD&apos;s 2026 state limits for Orange County,{" "}
              {inputs.persons} {inputs.persons === 1 ? "person" : "persons"}
              {placement.lowerBound && (
                <>
                  : above {placement.lowerBound.label} (<span className="atlas-num">{formatUSDWhole(placement.lowerBound.value)}</span>)
                </>
              )}
              {placement.upperBound && (
                <>
                  , at or below {placement.upperBound.label} (<span className="atlas-num">{formatUSDWhole(placement.upperBound.value)}</span>)
                </>
              )}
              . About <span className="atlas-num">{formatPercent(placement.pctOfAmi)}</span> of the median (
              <span className="atlas-num">{formatUSDWhole(median)}</span>).{" "}
              <span className="text-[#6b5a4c]">HCD income category, not a program eligibility decision.</span> <SourceChip id="hcd-state-2026" />
            </p>
          ) : (
            <p>HCD income category: Unknown for these inputs.</p>
          )}
        </div>
        <Field label="Work destination" id="f-dest">
          <select
            id="f-dest"
            className={inputCls}
            value={inputs.destination}
            onChange={(e) => setIn({ destination: e.target.value as typeof inputs.destination })}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <div role="group" aria-label="Commute mode" className="flex gap-2">
          {(["transit", "drive"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={inputs.mode === m}
              onClick={() => setIn({ mode: m })}
              className={inputs.mode === m ? btnPrimary : btnSecondary}
            >
              {m === "drive" ? "Drive" : "Transit"}
            </button>
          ))}
        </div>
      </fieldset>

      <details className="rounded-md border border-[#d9ccb4] bg-[#fffdf8] p-3">
        <summary className="cursor-pointer text-sm font-semibold">Advanced financing assumptions</summary>
        <div className="mt-3 space-y-3">
          <Field
            label="Rate (Freddie Mac PMMS 30-yr, national average)"
            id="a-rate"
            chip={<SourceChip id="pmms" />}
          >
            <select
              id="a-rate"
              className={inputCls}
              value={a.pmmsWeek}
              onChange={(e) => setA({ pmmsWeek: e.target.value, ratePct: pmmsRate(e.target.value) ?? a.ratePct })}
            >
              {[...PMMS_SNAPSHOT].reverse().map((w) => (
                <option key={w.week} value={w.week}>
                  Week of {formatLongDate(w.week)}: {w.rate30.toFixed(2)}%
                </option>
              ))}
            </select>
          </Field>
          <Field label="Term (years)" id="a-term" chip={<Assumption />}>
            <select id="a-term" className={inputCls} value={a.years} onChange={(e) => setA({ years: Number(e.target.value) })}>
              {[15, 20, 30].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
          <PctField label="Down payment (% of price)" id="a-down" value={a.downPct} onChange={(v) => setA({ downPct: v })} />
          <PctField label="Closing costs (% of price)" id="a-close" value={a.closingPct} onChange={(v) => setA({ closingPct: v })} />
          <Field label="Reserve kept after closing" id="a-res" chip={<Assumption />}>
            <MoneyInput id="a-res" value={a.reserve} onChange={(v) => setA({ reserve: v })} />
          </Field>
          <PctField label="Property tax (% of price per year)" id="a-tax" value={a.taxRate} onChange={(v) => setA({ taxRate: v })} />
          <Field label="Homeowners insurance ($/mo)" id="a-ins" chip={<Assumption />}>
            <MoneyInput id="a-ins" value={a.insuranceMonthly} onChange={(v) => setA({ insuranceMonthly: v })} />
          </Field>
          <PctField label="Mortgage insurance (% of loan per year, below 20% down)" id="a-pmi" value={a.pmiRate} onChange={(v) => setA({ pmiRate: v })} />
          <Field label={`HOA when unpublished ($/mo; range ${formatUSDWhole(HOA_RANGE.low)}–${formatUSDWhole(HOA_RANGE.high)})`} id="a-hoa" chip={<Assumption />}>
            <MoneyInput id="a-hoa" value={a.hoaScenario} onChange={(v) => setA({ hoaScenario: v })} />
          </Field>
          <Field
            label={`Special assessments / Mello-Roos when unknown ($/mo; range ${formatUSDWhole(ASSESSMENT_RANGE.low)}–${formatUSDWhole(ASSESSMENT_RANGE.high)})`}
            id="a-assess"
            chip={<Assumption />}
          >
            <MoneyInput id="a-assess" value={a.assessmentScenario} onChange={(v) => setA({ assessmentScenario: v })} />
          </Field>
          <button className={btnSecondary} onClick={() => dispatch({ type: "resetAssumptions" })}>
            Reset assumptions
          </button>
        </div>
      </details>
    </div>
  );
}

function Field({ label, id, chip, children }: { label: string; id: string; chip?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#4e4033]">
        {label} {chip}
      </label>
      {children}
    </div>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  inputRef,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#6b5a4c]">$</span>
      <input
        id={id}
        ref={inputRef}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className={`${inputCls} pl-6`}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const v = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(Number.isFinite(v) && v >= 0 ? v : 0);
        }}
      />
    </div>
  );
}

function PctField({ label, id, value, onChange }: { label: string; id: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label} id={id} chip={<Assumption />}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="any"
          className={`${inputCls} pr-7`}
          value={Number((value * 100).toFixed(6))}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : Number(e.target.value);
            onChange(Number.isFinite(v) && v >= 0 ? Math.min(v, 100) / 100 : 0);
          }}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-[#6b5a4c]">%</span>
      </div>
    </Field>
  );
}

// ───────────────────────── toolbar, legend ─────────────────────────

function Toolbar({ state, dispatch, onOpen }: { state: AtlasState; dispatch: Dispatch; onOpen: (o: "compare" | "brief") => void }) {
  const { layer, filters } = state;
  const setF = (patch: Partial<typeof filters>) => dispatch({ type: "setFilters", patch });
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-[#d9ccb4] bg-[#fffdf8] px-3 py-2">
      <div role="group" aria-label="Map layer" className="inline-flex rounded-md border border-[#d9ccb4] p-0.5">
        {(
          [
            ["buyer", "Buy or plan ahead"],
            ["future", "Future sites"],
          ] as [Layer, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={layer === id}
            onClick={() => dispatch({ type: "setLayer", layer: id })}
            className={cx(
              "rounded px-3 py-1.5 text-sm font-semibold",
              layer === id ? "bg-[#2b1d14] text-[#fffdf8]" : "text-[#2b1d14] hover:bg-[#f3ead8]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {layer === "buyer" && (
        <>
          <label className="text-xs font-semibold text-[#4e4033]">
            Max monthly estimate
            <select
              className={`${inputCls} mt-0.5 w-36`}
              value={filters.maxMonthly ?? ""}
              onChange={(e) => setF({ maxMonthly: e.target.value === "" ? null : Number(e.target.value) })}
            >
              <option value="">Any</option>
              {[state.inputs.budgetMonthly, 3000, 4000, 5000]
                .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                .map((v) => (
                  <option key={v} value={v}>
                    {formatUSDWhole(v)}
                    {v === state.inputs.budgetMonthly ? " (my budget)" : ""}
                  </option>
                ))}
            </select>
          </label>
          <fieldset className="text-xs font-semibold text-[#4e4033]">
            <legend>Status</legend>
            <div className="mt-0.5 flex gap-2">
              {(["For sale", "Planned or approved"] as const).map((s) => (
                <label key={s} className="inline-flex items-center gap-1 text-sm font-normal">
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(s)}
                    onChange={(e) =>
                      setF({ statuses: e.target.checked ? [...filters.statuses, s] : filters.statuses.filter((x) => x !== s) })
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="inline-flex items-center gap-1.5 self-center text-sm">
            <input type="checkbox" checked={filters.showUnpublished} onChange={(e) => setF({ showUnpublished: e.target.checked })} />
            Show opportunities with unpublished prices
          </label>
        </>
      )}
      <label className="text-xs font-semibold text-[#4e4033]">
        City
        <select
          className={`${inputCls} mt-0.5 w-44`}
          value={filters.city}
          onChange={(e) => setF({ city: e.target.value as typeof filters.city })}
        >
          <option value="all">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {layer === "buyer" && (
        <div className="ml-auto flex gap-2 self-center">
          <button className={btnSecondary} onClick={() => onOpen("compare")} disabled={state.saved.length === 0}>
            Compare ({state.saved.length}/{MAX_SAVED})
          </button>
          <button className={btnSecondary} onClick={() => onOpen("brief")}>
            Buyer brief
          </button>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const items: [Parameters<typeof PinShape>[0]["status"], string][] = [
    ["For sale", "For sale"],
    ["Planned or approved", "Planned or approved"],
    ["Potential site", "Potential site"],
    ["Station", "Rail station"],
  ];
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-[500] rounded-md border border-[#d9ccb4] bg-[#fffdf8]/95 px-2.5 py-2 text-xs shadow-sm">
      <p className="sr-only">Legend</p>
      <ul className="space-y-1">
        {items.map(([s, label]) => (
          <li key={label} className="flex items-center gap-2">
            <PinShape status={s} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── list ─────────────────────────

function commuteLine(c: CommuteResult, stationName: string | null): string {
  if (c.kind === "drive") return `Drive · ${miles(c.straightLineMiles)} straight-line · no drive time estimated`;
  if (c.kind === "unavailable") return `Transit · no cached route · ${miles(c.straightLineMiles)} straight-line`;
  const legs = c.legs.length > 1 ? "train + bus" : "train";
  return `Transit · ${miles(c.homeToStationMiles)} to ${stationName ?? c.station.name} · ${legs} ${c.stationToStationMinutes} min station-to-station (timetable example)`;
}

function ResultsList({
  state,
  results,
  reason,
  onSelect,
  onToggleSave,
  onShowUnpublished,
  onClearFilters,
}: {
  state: AtlasState;
  results: readonly Opportunity[];
  reason: ReturnType<typeof filterOpportunities>["reason"];
  onSelect: (id: string) => void;
  onToggleSave: (id: string) => void;
  onShowUnpublished: () => void;
  onClearFilters: () => void;
}) {
  return (
    <section aria-label="Results list">
      <h2 className="atlas-serif text-lg font-semibold">
        {state.layer === "buyer" ? "Homes to look at" : "Future sites"}{" "}
        <span className="text-sm font-normal text-[#6b5a4c]">({results.length})</span>
      </h2>
      {state.saveNote && (
        <p role="status" className="mt-1 rounded bg-[#efe3c4] px-2 py-1 text-xs">
          {state.saveNote}
        </p>
      )}
      {results.length === 0 && reason && (
        <div className="mt-2 rounded-md border border-[#d9ccb4] p-3 text-sm">
          <p className="font-semibold">{NO_RESULTS_TEXT}</p>
          <p className="text-[#6b5a4c]">{noResultsHint(reason)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!state.filters.showUnpublished && (
              <button className={btnPrimary} onClick={onShowUnpublished}>
                Show unpublished prices
              </button>
            )}
            <button className={btnSecondary} onClick={onClearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      )}
      <ul className="mt-2 space-y-2">
        {results.map((o) => (
          <li key={o.id}>
            <ResultCard o={o} state={state} onSelect={onSelect} onToggleSave={onToggleSave} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultCard({
  o,
  state,
  onSelect,
  onToggleSave,
}: {
  o: Opportunity;
  state: AtlasState;
  onSelect: (id: string) => void;
  onToggleSave: (id: string) => void;
}) {
  const est = monthlyFor(o, state.inputs.cash, state.assumptions);
  const selected = state.selectedId === o.id;
  const saved = state.saved.includes(o.id);
  let line: string;
  if (o.layer === "buyer") {
    const c = commute(o.point, o.stationId, state.inputs.destination, state.inputs.mode);
    line = commuteLine(c, station(o.stationId).name);
  } else {
    line = `Site · ${miles(haversineMiles(o.point, station("sc").point))} from San Clemente Station (straight-line)`;
  }
  return (
    <article
      className={cx(
        "rounded-md border bg-[#fffdf8] p-3",
        selected ? "border-[#2b1d14] ring-2 ring-[#2b1d14]" : "border-[#d9ccb4]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusTag status={o.status} />
        <span className="text-xs text-[#6b5a4c]">{o.city}</span>
      </div>
      <h3 className="atlas-serif mt-1.5 text-base font-semibold">
        <button type="button" onClick={() => onSelect(o.id)} className="text-left underline-offset-2 hover:underline" aria-pressed={selected}>
          {o.name}
        </button>
      </h3>
      <p className="atlas-num mt-1 text-2xl font-bold tracking-tight">
        {o.layer === "future" ? (
          <span className="text-base font-semibold">Not for sale to buyers: a site to investigate</span>
        ) : est ? (
          <>
            {formatUSDWhole(est.monthly)}
            <span className="text-sm font-normal text-[#6b5a4c]">/mo estimated</span>
          </>
        ) : (
          <span className="text-xl">Price unpublished</span>
        )}
      </p>
      <p className="mt-1 text-sm text-[#4e4033]">{line}</p>
      <p className="mt-1 text-sm">
        <span className="font-semibold">Today:</span> {o.todayAction}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[#6b5a4c]">{CHECKED_LABEL}</span>
        <div className="flex gap-2">
          {o.layer === "buyer" && (
            <button type="button" className={cx(btnSecondary, "px-2 py-1 text-xs")} aria-pressed={saved} onClick={() => onToggleSave(o.id)}>
              {saved ? "Saved ✓" : "Save to compare"}
            </button>
          )}
          <button type="button" className={cx(btnPrimary, "px-2 py-1 text-xs")} onClick={() => onSelect(o.id)}>
            {selected ? "Selected" : "Show on map"}
          </button>
        </div>
      </div>
    </article>
  );
}

// ───────────────────────── detail ─────────────────────────

function DetailPanel({
  o,
  state,
  onClose,
  onToggleSave,
  onBrief,
  onCompare,
}: {
  o: Opportunity;
  state: AtlasState;
  onClose: () => void;
  onToggleSave: (id: string) => void;
  onBrief: () => void;
  onCompare: () => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <StatusTag status={o.status} />
          <h2 className="atlas-serif mt-1.5 text-2xl font-semibold leading-tight">{o.name}</h2>
          <p className="text-sm text-[#6b5a4c]">{o.address}</p>
          <p className="text-xs text-[#6b5a4c]">Map point: {o.pointNote}</p>
        </div>
        <button type="button" onClick={onClose} className={cx(btnSecondary, "px-2 py-1 text-xs")} aria-label={`Close details for ${o.name}`}>
          Close
        </button>
      </div>
      {o.layer === "future" ? (
        <>
          <SitePanel site={o} />
          <SourceLinks ids={o.sourceIds} heading="Sources" />
        </>
      ) : (
        <BuyerDetail o={o} state={state} onToggleSave={onToggleSave} onBrief={onBrief} onCompare={onCompare} />
      )}
    </div>
  );
}

function Block({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="border-t border-[#d9ccb4] pt-3">
      <h3 id={id} className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">
        {title}
      </h3>
      <div className="mt-1.5 text-sm">{children}</div>
    </section>
  );
}

function BuyerDetail({
  o,
  state,
  onToggleSave,
  onBrief,
  onCompare,
}: {
  o: BuyerOpportunity;
  state: AtlasState;
  onToggleSave: (id: string) => void;
  onBrief: () => void;
  onCompare: () => void;
}) {
  const { inputs, assumptions: a } = state;
  const est = monthlyFor(o, inputs.cash, a);
  const [showFit, setShowFit] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const saved = state.saved.includes(o.id);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} aria-pressed={saved} onClick={() => onToggleSave(o.id)}>
          {saved ? "Saved to compare ✓" : "Save to compare"}
        </button>
        {state.saved.length > 0 && (
          <button type="button" className={btnSecondary} onClick={onCompare}>
            Compare ({state.saved.length})
          </button>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {o.facts.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-[#6b5a4c]">{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
        <dt className="text-[#6b5a4c]">Affordable-home income category</dt>
        <dd>{o.affordableCategory}</dd>
      </dl>

      <Block title="Project history" id={`${o.id}-hist`}>
        <ol className="space-y-2">
          {o.history.map((h) => (
            <li key={h.record} className="grid grid-cols-[92px_1fr] gap-2">
              <span className="atlas-num font-semibold">{formatLongDate(h.date)}</span>
              <span>
                {h.text}{" "}
                <a className="text-xs underline underline-offset-2" href={sourceUrl(h.sourceId)} target="_blank" rel="noreferrer">
                  {h.record}
                </a>
              </span>
            </li>
          ))}
        </ol>
        {o.id === "camino-twelve" && (
          <p className="mt-2 text-xs text-[#6b5a4c]">
            The 2024 record says &quot;townhome&quot; (building type) and the 2026 record says &quot;condominium&quot; (legal form). A &quot;March 2025 city report&quot; was
            not found; these CEQAnet notices are cited instead. Construction status was not verified.
          </p>
        )}
      </Block>

      <Block title="Buying status" id={`${o.id}-status`}>
        <p>{o.buyingStatus}</p>
        {o.priceNote && <p className="mt-1 text-xs text-[#6b5a4c]">{o.priceNote}</p>}
      </Block>

      <Block title="Monthly cost" id={`${o.id}-cost`}>
        {est ? (
          <CostBreakdown est={est} o={o} a={a} budget={inputs.budgetMonthly} />
        ) : (
          <div>
            <p className="atlas-num text-2xl font-bold">Price unpublished</p>
            <p className="mt-1">{fitSentenceText(null, inputs.budgetMonthly)}</p>
            <button type="button" className={cx(btnPrimary, "mt-2")} aria-expanded={showFit} onClick={() => setShowFit((s) => !s)}>
              What price would fit my budget?
            </button>
            {showFit && <FitRange budget={inputs.budgetMonthly} cash={inputs.cash} a={a} />}
          </div>
        )}
      </Block>

      <Block title="Next step" id={`${o.id}-next`}>
        <p>{o.nextStep}</p>
        <ul className="mt-1 space-y-0.5">
          {o.contacts.map((c) => (
            <li key={c.label}>
              <a className="font-semibold underline underline-offset-2" href={c.url} target="_blank" rel="noreferrer">
                {c.label}
              </a>
              {c.phone && <span className="atlas-num">, {c.phone}</span>} <SourceChip id={c.sourceId} />
            </li>
          ))}
        </ul>
      </Block>

      <Block title={`Commute to ${DESTINATIONS.find((d) => d.id === inputs.destination)!.name}`} id={`${o.id}-commute`}>
        <CommuteBlock o={o} destination={inputs.destination} mode={inputs.mode} />
      </Block>

      <Block title="Guidance" id={`${o.id}-guide`}>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} aria-expanded={showGuidance} onClick={() => setShowGuidance((s) => !s)}>
            Get buying guidance
          </button>
          <button type="button" className={btnSecondary} onClick={onBrief}>
            Copy buyer brief
          </button>
        </div>
        {showGuidance && (
          <ul className="mt-2 space-y-2">
            {GUIDANCE.map((g) => (
              <li key={g.id} className="rounded-md border border-[#d9ccb4] p-2">
                <a className="font-semibold underline underline-offset-2" href={g.url} target="_blank" rel="noreferrer">
                  {g.label}
                </a>
                <p className="text-[#4e4033]">{g.text}</p>
                {g.backupUrl && (
                  <p className="text-xs text-[#6b5a4c]">
                    Backup:{" "}
                    <a className="underline" href={g.backupUrl} target="_blank" rel="noreferrer">
                      HUD counselor search
                    </a>{" "}
                    · <SourceChip id="hud-housing-counseling" />
                  </p>
                )}
              </li>
            ))}
            <li className="rounded-md border border-[#d9ccb4] p-2">
              <a className="font-semibold underline underline-offset-2" href={o.contacts[0]!.url} target="_blank" rel="noreferrer">
                Ask about this development
              </a>
              <span className="text-xs text-[#6b5a4c]"> ({o.contacts[0]!.label})</span>
              <p className="text-[#4e4033]">{ASK_TEXT}</p>
            </li>
          </ul>
        )}
        {o.city === "San Juan Capistrano" && (
          <p className="mt-2 text-xs text-[#6b5a4c]">
            A county down-payment program to ask about: OC&apos;s Mortgage Assistance Program lists San Juan Capistrano among its areas (San Clemente is not listed). This is
            not an eligibility decision.{" "}
            <a className="underline" href="https://housing.oc.gov/housing-development/homeowner-programs" target="_blank" rel="noreferrer">
              OC Homeowner Programs
            </a>
          </p>
        )}
      </Block>

      <Block title="Sources" id={`${o.id}-src`}>
        <SourceLinks ids={o.sourceIds} />
      </Block>
    </>
  );
}

function sourceUrl(id: BuyerOpportunity["history"][number]["sourceId"]): string {
  return FIND_SOURCES[id].url;
}

function fitSentenceText(monthly: number | null, budget: number): string {
  const s = fitSentence(monthly, budget);
  if (s.kind === "unknown") return "We need the price or fees to estimate your fit.";
  if (s.kind === "above") return `This estimate is ${formatUSDWhole(s.amount!)} above your preferred monthly budget.`;
  return `Within your budget by ${formatUSDWhole(s.amount!)}.`;
}

function Line({ label, value, chip, note }: { label: string; value: string; chip?: ReactNode; note?: string }) {
  return (
    <tr className="border-t border-[#ece3d1] align-top">
      <th scope="row" className="py-1 pr-2 text-left font-normal">
        <span className="inline-flex flex-wrap items-center gap-1">
          {label} {chip}
        </span>
        {note && <span className="block text-xs text-[#6b5a4c]">{note}</span>}
      </th>
      <td className="atlas-num py-1 text-right">{value}</td>
    </tr>
  );
}

function CostBreakdown({ est, o, a, budget }: { est: MonthlyEstimate; o: BuyerOpportunity; a: FinanceAssumptions; budget: number }) {
  return (
    <div>
      <p className="atlas-num text-3xl font-bold tracking-tight">
        {formatUSDWhole(est.monthly)}
        <span className="text-sm font-normal text-[#6b5a4c]">/mo all-in estimate</span>
      </p>
      <p className="mt-1 font-semibold">{fitSentenceText(est.monthly, budget)}</p>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">Monthly cost lines</caption>
        <tbody>
          <Line
            label="Principal & interest"
            value={formatUSD(est.principalInterest)}
            chip={<SourceChip id="pmms" />}
            note={`Loan ${formatUSDWhole(est.loan)} at ${a.ratePct.toFixed(2)}% (PMMS week of ${formatLongDate(a.pmmsWeek)}), ${a.years} years`}
          />
          <Line label="Property tax" value={formatUSD(est.tax)} chip={<Assumption />} note={`${formatPercent(a.taxRate, 2)} of price per year`} />
          <Line label="Homeowners insurance" value={formatUSD(est.insurance)} chip={<Assumption />} />
          <Line
            label={est.hoaIsScenario ? "HOA: Unknown, scenario" : "HOA (published)"}
            value={formatUSD(est.hoa)}
            chip={est.hoaIsScenario ? <Assumption /> : <SourceChip id={o.priceSourceId ?? "vista-listing-crmls"} />}
            note={est.hoaIsScenario ? undefined : o.hoaNote}
          />
          {a.downPct < PMI_THRESHOLD && (
            <Line
              label="Mortgage insurance"
              value={formatUSD(est.pmi)}
              chip={<Assumption />}
              note={`${formatPercent(a.pmiRate, 2)} of the loan per year while down payment is below 20%`}
            />
          )}
          <Line
            label={est.assessmentIsScenario ? "Special assessments / Mello-Roos: Unknown, scenario" : "Special assessments (published)"}
            value={formatUSD(est.assessment)}
            chip={est.assessmentIsScenario ? <Assumption /> : undefined}
          />
          <tr className="border-t-2 border-[#2b1d14] font-bold">
            <th scope="row" className="py-1 text-left">
              All-in monthly
            </th>
            <td className="atlas-num py-1 text-right">{formatUSD(est.monthly)}</td>
          </tr>
        </tbody>
      </table>
      <h4 className="mt-3 text-sm font-semibold">Cash at closing</h4>
      <table className="mt-1 w-full text-sm">
        <caption className="sr-only">Cash at closing</caption>
        <tbody>
          <Line label={`Down payment (${formatPercent(a.downPct)})`} value={formatUSD(est.down)} chip={<Assumption />} />
          <Line label={`Closing costs (${formatPercent(a.closingPct)})`} value={formatUSD(est.closing)} chip={<Assumption />} />
          <Line label="Total cash at closing" value={formatUSD(est.cashAtClose)} />
          <Line label="Reserve to keep" value={formatUSD(a.reserve)} chip={<Assumption />} />
          <Line label="Savings left after closing" value={formatUSD(est.left)} />
        </tbody>
      </table>
      <p className={cx("mt-1 font-semibold", est.shortOfReserve > 0 && "text-[#6e2416]")}>
        {est.shortOfReserve > 0
          ? `Short ${formatUSD(est.shortOfReserve)} to keep the ${formatUSDWhole(a.reserve)} reserve.`
          : `Keeps the ${formatUSDWhole(a.reserve)} reserve with ${formatUSD(est.left - a.reserve)} to spare.`}
      </p>
    </div>
  );
}

function FitRange({ budget, cash, a }: { budget: number; cash: number; a: FinanceAssumptions }) {
  const r = fitRange(budget, cash, a);
  if (r.high.price <= 0) {
    return <p className="mt-2 rounded-md bg-[#f7f2e8] p-2.5">No positive price fits these assumptions.</p>;
  }
  const cashBinds = r.low.binding === "cash" || r.high.binding === "cash";
  return (
    <div className="mt-2 rounded-md bg-[#f7f2e8] p-2.5" role="status">
      <p>
        Planning estimate for you, not a price for this property: about{" "}
        <strong className="atlas-num">
          {formatUSDWhole(r.low.price)}–{formatUSDWhole(r.high.price)}
        </strong>
        , assuming HOA {formatUSDWhole(HOA_RANGE.low)}–{formatUSDWhole(HOA_RANGE.high)} and assessments {formatUSDWhole(ASSESSMENT_RANGE.low)}–
        {formatUSDWhole(ASSESSMENT_RANGE.high)} (<Assumption /> ranges). Lender approval and program eligibility are separate.
      </p>
      {cashBinds && <p className="mt-1 text-xs">Your cash for the down payment, closing and reserve limits this range, not the monthly payment.</p>}
      <p className="mt-1 text-xs text-[#6b5a4c]">
        Uses your monthly budget, cash, and the assumptions in the advanced panel (rate {a.ratePct.toFixed(2)}%, {formatPercent(a.downPct)} down).
      </p>
    </div>
  );
}

function CommuteBlock({ o, destination, mode }: { o: BuyerOpportunity; destination: AtlasState["inputs"]["destination"]; mode: Mode }) {
  const c = commute(o.point, o.stationId, destination, mode);
  const destName = DESTINATIONS.find((d) => d.id === destination)!.name;
  if (c.kind === "drive") {
    return (
      <div className="space-y-1">
        <p>
          <span className="atlas-num font-semibold">{miles(c.straightLineMiles)}</span> to {destName} (straight-line, not a driving distance). No drive time is
          shown; we don&apos;t estimate traffic.
        </p>
        <p className="flex flex-wrap gap-3">
          <a className="font-semibold underline underline-offset-2" href={c.directionsUrl} target="_blank" rel="noreferrer">
            Open driving directions
          </a>
          <a className="underline underline-offset-2" href={c.quickMapUrl} target="_blank" rel="noreferrer">
            Caltrans QuickMap (live traffic)
          </a>
        </p>
      </div>
    );
  }
  if (c.kind === "unavailable") {
    return (
      <p>
        No cached route for this trip. Straight-line <span className="atlas-num">{miles(c.straightLineMiles)}</span>.{" "}
        <a className="font-semibold underline underline-offset-2" href={c.tripPlannerUrl} target="_blank" rel="noreferrer">
          Open the official trip planner
        </a>
        .
      </p>
    );
  }
  const st = c.station;
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#6b5a4c]">Weekday morning example from the published timetables.</p>
      <ol className="space-y-1.5">
        <Step n={1}>
          Home → {st.name}: <span className="atlas-num">{miles(c.homeToStationMiles)}</span> straight-line; allow {ACCESS_MINUTES} min <Assumption />
        </Step>
        <Step n={2}>
          Arrive and board: {BOARD_MINUTES} min <Assumption />
        </Step>
        {c.legs.map((l, i) => (
          <Step key={i} n={3 + i}>
            {i > 0 && <span className="block text-xs text-[#6b5a4c]">Transfer at {l.from}: {c.transferMinutes} min scheduled wait.</span>}
            <span className="font-semibold">{l.label}</span>: {l.from} {l.depart} a.m. → {l.to} {l.arrive} a.m. (
            <span className="atlas-num">{l.minutes} min</span>) <SourceChip id={l.sourceId} />
            {l.note && <span className="block text-xs text-[#6b5a4c]">{l.note}</span>}
          </Step>
        ))}
        <Step n={3 + c.legs.length}>
          Last stop → work: {EGRESS_MINUTES} min <Assumption />
        </Step>
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-[#d9ccb4] p-2">
          <p className="text-xs text-[#6b5a4c]">Station-to-station (timetable)</p>
          <p className="atlas-num text-xl font-bold">{c.stationToStationMinutes} min</p>
          <p className="text-xs text-[#6b5a4c]">
            {c.legs[0]!.depart} → {c.legs[c.legs.length - 1]!.arrive} a.m.
          </p>
        </div>
        <div className="rounded-md border border-[#d9ccb4] p-2">
          <p className="text-xs text-[#6b5a4c]">Door-to-door (scenario)</p>
          <p className="atlas-num text-xl font-bold">{c.doorToDoorMinutes} min</p>
          <p className="text-xs text-[#6b5a4c]">
            includes {ACCESS_MINUTES + BOARD_MINUTES + EGRESS_MINUTES} min of assumed allowances
          </p>
        </div>
      </div>
      <p className="text-xs text-[#6b5a4c]">{MORNING_TRAIN_NOTE}</p>
      <p className="text-xs text-[#6b5a4c]">
        Route checked: {formatLongDate(c.checkedDate)} (timetable, not live).{" "}
        <a className="underline" href={METROLINK_URL} target="_blank" rel="noreferrer">
          Metrolink schedule and service alerts
        </a>{" "}
        ·{" "}
        <a className="underline" href={TRIP_PLANNER_URL} target="_blank" rel="noreferrer">
          OCTA trip planner
        </a>{" "}
        ·{" "}
        <a className="underline" href={QUICKMAP_URL} target="_blank" rel="noreferrer">
          Caltrans QuickMap
        </a>
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[22px_1fr] gap-1.5">
      <span className="atlas-num flex h-5 w-5 items-center justify-center rounded-full bg-[#2b1d14] text-[11px] font-bold text-[#fffdf8]">{n}</span>
      <span>{children}</span>
    </li>
  );
}

// ───────────────────────── compare, brief ─────────────────────────

function ComparePanel({ state, onClose }: { state: AtlasState; onClose: () => void }) {
  const homes = state.saved.map((id) => OPP_BY_ID[id]).filter((o): o is BuyerOpportunity => !!o && o.layer === "buyer");
  const { inputs, assumptions: a } = state;
  const [choice, setChoice] = useState<string | null>(null);
  // A single saved home is the choice; with two, the buyer picks one.
  const chosen = homes.find((o) => o.id === choice) ?? (homes.length === 1 ? homes[0]! : null);
  return (
    <section aria-labelledby="compare-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="compare-h" className="atlas-serif text-xl font-semibold">
          Compare saved homes
        </h2>
        <button className={cx(btnSecondary, "px-2 py-1 text-xs")} onClick={onClose}>
          Close
        </button>
      </div>
      {state.saveNote && <p className="mt-1 text-xs">{state.saveNote}</p>}
      {homes.length < 2 && <p className="mt-1 text-sm text-[#6b5a4c]">Save {2 - homes.length} more home to compare side by side.</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Side-by-side comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="w-36 py-1" />
              {homes.map((o) => (
                <th key={o.id} scope="col" className="py-1 pr-2 align-bottom">
                  <span className="atlas-serif block text-base">{o.name}</span>
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="radio"
                      name="compare-choice"
                      value={o.id}
                      checked={chosen?.id === o.id}
                      onChange={() => setChoice(o.id)}
                      className="h-3.5 w-3.5 accent-[#2b1d14]"
                    />
                    Choose this home
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Status", (o: BuyerOpportunity) => o.status],
                [
                  "Monthly estimate",
                  (o: BuyerOpportunity) => {
                    const e = monthlyFor(o, inputs.cash, a);
                    return e ? `${formatUSDWhole(e.monthly)}/mo · ${fitSentenceText(e.monthly, inputs.budgetMonthly)}` : "Price unpublished";
                  },
                ],
                [
                  "Cash at closing",
                  (o: BuyerOpportunity) => {
                    const e = monthlyFor(o, inputs.cash, a);
                    if (!e) return "Unknown";
                    return `${formatUSDWhole(e.cashAtClose)}${e.shortOfReserve > 0 ? ` · short ${formatUSDWhole(e.shortOfReserve)} on reserve` : ""}`;
                  },
                ],
                [
                  "Unknowns",
                  (o: BuyerOpportunity) =>
                    [o.price === null && "price", o.hoaMonthly === null && "HOA", o.assessmentMonthly === null && "assessments"].filter(Boolean).join(", ") ||
                    "none listed",
                ],
                [
                  "Commute",
                  (o: BuyerOpportunity) => commuteLine(commute(o.point, o.stationId, inputs.destination, inputs.mode), station(o.stationId).name),
                ],
                ["Next step", (o: BuyerOpportunity) => o.nextStep],
              ] as [string, (o: BuyerOpportunity) => string][]
            ).map(([label, fn]) => (
              <tr key={label} className="border-t border-[#ece3d1] align-top">
                <th scope="row" className="py-1.5 pr-2 font-semibold text-[#6b5a4c]">
                  {label}
                </th>
                {homes.map((o) => (
                  <td key={o.id} className="atlas-num py-1.5 pr-2">
                    {fn(o)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-[#f7f2e8] p-3">
        {chosen ? (
          <Link href={financeHref(chosen.id, inputs, a)} className={btnPrimary}>
            Finance options →
          </Link>
        ) : (
          <button type="button" className={btnPrimary} disabled>
            Finance options →
          </button>
        )}
        <p className="text-sm text-[#4e4033]">
          {chosen
            ? `See which assistance programs could close the gap for ${chosen.name}. Your inputs go along in the link; nothing is sent.`
            : "Choose a home above to see finance options."}
        </p>
      </div>
      <p className="mt-2 text-xs text-[#6b5a4c]">Future sites can&apos;t be compared with buyer homes. Compare homes with homes.</p>
    </section>
  );
}

const OPP_BY_ID: Record<string, Opportunity> = Object.fromEntries(OPPORTUNITIES.map((o) => [o.id, o]));

function BriefPanel({ state, onClose }: { state: AtlasState; onClose: () => void }) {
  const text = buildBrief(state.saved.length ? state.saved : state.selectedId ? [state.selectedId] : [], state.inputs, state.assumptions);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      setCopied("fail");
      areaRef.current?.select();
    }
  }
  return (
    <section aria-labelledby="brief-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="brief-h" className="atlas-serif text-xl font-semibold">
          Buyer brief (draft)
        </h2>
        <button className={cx(btnSecondary, "px-2 py-1 text-xs")} onClick={onClose}>
          Close
        </button>
      </div>
      <p className="mt-1 text-sm text-[#6b5a4c]">
        Text you can copy. Nothing is sent. {state.saved.length ? "Covers your saved homes." : "Covers the selected home; save homes to include both."}
      </p>
      <label htmlFor="brief-text" className="sr-only">
        {BRIEF_HEADER}
      </label>
      <textarea
        id="brief-text"
        ref={areaRef}
        readOnly
        value={text}
        rows={14}
        className="atlas-num mt-2 w-full rounded-md border border-[#d9ccb4] bg-[#fffaf0] p-2 font-mono text-xs"
      />
      <div className="mt-2 flex items-center gap-3">
        <button className={btnPrimary} onClick={copy}>
          Copy buyer brief
        </button>
        <span role="status" className="text-sm">
          {copied === "ok" && "Copied. Nothing has been sent."}
          {copied === "fail" && "Copy isn't available here; the text is selected so you can copy it."}
        </span>
      </div>
    </section>
  );
}
