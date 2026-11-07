"use client";

import { useMemo, useState, type Dispatch } from "react";
import { ASSISTANCE_RESOURCES } from "@/lib/assistance";
import { LEAD_STATUS_LABEL, OC_MAP_ELIGIBLE_AREAS, type CatalogTotals, type LeadStatus, type SourceEvaluation } from "@/lib/fundit/catalog";
import { buildMemo } from "@/lib/fundit/memo";
import { computeProject, type GiftLine, type PencilInputs } from "@/lib/fundit/project";
import { SAN_CLEMENTE } from "@/lib/fundit/property";
import { daysBetween, LATEST_PMMS, PMMS_STALE_DAYS } from "@/lib/fundit/rates";
import { SOURCES } from "@/lib/fundit/sources";
import { candidateInputs, type PencilAction, type PencilState, type SiteCity } from "@/lib/fundit/state";
import { formatPercent, formatSignedUSDWhole, formatUSDWhole } from "@/lib/format";
import { Badge, Button, Card, Icon, cx } from "../ui";
import { NumberField, Segmented } from "./bits";

const usd = formatUSDWhole;
const STATUSES: LeadStatus[] = ["to-verify", "not-eligible", "applied", "committed"];

function SourceCard({ ev, dispatch }: { ev: SourceEvaluation; dispatch: Dispatch<PencilAction> }) {
  const s = ev.source;
  const out = ev.geo.inArea === false;
  return (
    <li className={cx("rounded-2xl p-4 ring-1", out ? "bg-rose-50 ring-rose-300" : ev.counted > 0 ? "bg-brand-50 ring-brand-200" : "bg-white ring-line")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{s.name}</p>
          <p className="text-xs text-muted">
            {s.provider} · recipient: <strong>{s.recipient}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {out ? <Badge tone="rose">Not in eligible area: counts $0</Badge> : null}
          <Badge tone={s.status === "open" ? "brand" : s.status === "closed" ? "rose" : "amber"}>Program: {s.status}</Badge>
          <Badge tone={ev.counted > 0 ? "brand" : "neutral"}>
            {ev.counted > 0 ? `Counted ${usd(ev.counted)}${s.recipient === "buyer" ? "/home" : ""}` : "Counts $0"}
          </Badge>
        </div>
      </div>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[7rem_1fr]">
        <dt className="text-muted">Eligible use</dt>
        <dd>{s.eligibleUse}</dd>
        <dt className="text-muted">Geography</dt>
        <dd className={cx(out && "font-semibold text-rose-800")}>
          {ev.geo.text}
          {s.geography.kind === "areas" && (
            <span className="block text-xs font-normal text-muted">Published eligible areas: {OC_MAP_ELIGIBLE_AREAS.join(", ")}.</span>
          )}
        </dd>
        <dt className="text-muted">Amount</dt>
        <dd>{s.amountText}</dd>
        <dt className="text-muted">Timing</dt>
        <dd>{s.timing}</dd>
        <dt className="text-muted">Status</dt>
        <dd>{s.statusNote}</dd>
      </dl>
      {s.requirements.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted">Requirements and checks</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {s.requirements.map((q) => (
              <li key={q}>{q}</li>
            ))}
            {s.cautions.map((q) => (
              <li key={q}>{q}</li>
            ))}
            {s.openQuestions.map((q) => (
              <li key={q}>Open question: {q}</li>
            ))}
          </ul>
        </details>
      )}
      {s.conflicts.map((c) => (
        <p key={c} className="mt-2 rounded-xl bg-amber-50 p-2 text-sm text-amber-950 ring-1 ring-amber-200">
          <strong>Sources disagree.</strong> {c}
        </p>
      ))}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium">Finance-lead status</span>
          <select
            className="mt-1 rounded-xl bg-white px-3 py-2 ring-1 ring-line"
            value={ev.entry.status}
            onChange={(e) => dispatch({ type: "SET_LEAD", id: s.id, patch: { status: e.target.value as LeadStatus } })}
          >
            {STATUSES.map((v) => (
              <option key={v} value={v}>
                {LEAD_STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        {ev.entry.status === "committed" && (
          <div className="w-48">
            <NumberField
              label={s.recipient === "buyer" ? "Committed per home" : "Committed amount"}
              prefix="$"
              min={0}
              step={1000}
              value={ev.entry.amount ?? 0}
              onChange={(v) => dispatch({ type: "SET_LEAD", id: s.id, patch: { amount: v } })}
            />
          </div>
        )}
        {ev.entry.status === "committed" && s.recipient === "project" && (
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={ev.entry.byLandClose}
              onChange={(e) => dispatch({ type: "SET_LEAD", id: s.id, patch: { byLandClose: e.target.checked } })}
            />
            Received by land closing
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        {ev.reason}{" "}
        <a href={s.officialUrl} target="_blank" rel="noreferrer" className="underline">
          Official page
        </a>{" "}
        · checked {s.lastVerified}
      </p>
    </li>
  );
}

export function SourcesPanel({
  state,
  dispatch,
  totals,
  inputs,
}: {
  state: PencilState;
  dispatch: Dispatch<PencilAction>;
  totals: CatalogTotals;
  inputs: PencilInputs;
}) {
  const base = computeProject(inputs);
  const cand = computeProject(candidateInputs(inputs, totals));
  const hud = ASSISTANCE_RESOURCES.find((r) => r.id === "hud-housing-counseling");
  return (
    <Card className="p-4 sm:p-5" aria-labelledby="sources-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sources-title" className="text-base font-semibold">
          Who could close it
        </h2>
        <Segmented<SiteCity>
          label="Site city for geography checks"
          value={state.city}
          onChange={(c) => dispatch({ type: "SET_CITY", city: c })}
          options={[
            ["San Clemente", "San Clemente (listing)"],
            ["Dana Point", "Try the same numbers in Dana Point"],
          ]}
        />
      </div>
      <p className="mt-1 text-sm text-muted">
        Only sources you mark <strong>Committed</strong> with an amount reduce the base gap. Buyer-side amounts are per home and raise what a buyer can pay.
        Geography is checked against each program&apos;s published areas.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Base gap (committed only)</p>
          <p className="text-2xl font-bold tabular-nums">{usd(base.gap)}</p>
          <p className="text-xs text-muted">
            Committed: project {usd(totals.committedProject)}, buyer {usd(totals.committedBuyerPerHome)}/home
          </p>
        </div>
        <div className="rounded-2xl bg-canvas p-3 ring-1 ring-line">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">If candidates came through</p>
          <p className="text-2xl font-bold tabular-nums">{usd(cand.gap)}</p>
          <p className="text-xs text-muted">
            Adds candidates with stated maximums: buyer {usd(totals.candidateBuyerPerHome)}/home, project {usd(totals.candidateProject)}. {totals.unknownCount}{" "}
            candidate{totals.unknownCount === 1 ? "" : "s"} with Unknown or conditional amounts excluded. Not counted until Committed.
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-3">
        {totals.evaluations.map((ev) => (
          <SourceCard key={ev.source.id} ev={ev} dispatch={dispatch} />
        ))}
        {hud && (
          <li className="rounded-2xl bg-white p-4 text-sm ring-1 ring-line">
            <p className="font-semibold">{hud.name}</p>
            <p className="text-xs text-muted">{hud.provider} · not a funding source</p>
            <p className="mt-1">
              MAP, WISH, MyHome, Dream For All and My First Home all require homebuyer education or counseling. {hud.benefitDescription}
            </p>
            <p className="mt-1 text-xs text-muted">
              <a href={hud.officialUrl} target="_blank" rel="noreferrer" className="underline">
                Official page
              </a>{" "}
              · checked {hud.lastVerified} (from HomeStay&apos;s catalog)
            </p>
          </li>
        )}
        <li className="rounded-2xl bg-white p-4 text-sm ring-1 ring-line">
          <p className="font-semibold">Landowner contribution and donor gifts</p>
          <p className="mt-1 text-muted">Scenario levers, not programs. Use the land lever (asking / donated) and the donor view.</p>
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted">
        Left out: CalHFA Forgivable Equity Builder (no official URL found), employer-assisted housing (no verified source), LIHTC (rental only).
      </p>
    </Card>
  );
}

const GIFT_LINES: readonly (readonly [GiftLine, string])[] = [
  ["development", "Development budget (construction and site work)"],
  ["land", "Land"],
];

export function DonorPanel({ inputs, dispatch }: { inputs: PencilInputs; dispatch: Dispatch<PencilAction> }) {
  const x = inputs;
  const free = computeProject({ ...x, landMode: "donated" });
  const lineTotal = x.giftLine === "development" ? x.devCost : computeProject(x).land;
  const lineName = x.giftLine === "development" ? "construction and site work (development budget)" : "land";
  return (
    <Card className="p-4 sm:p-5" aria-labelledby="donor-title">
      <h2 id="donor-title" className="text-base font-semibold">
        Donor view: what does a gift pay for?
      </h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Gift amount"
          prefix="$"
          min={0}
          step={5000}
          value={x.donorGift}
          onChange={(v) => dispatch({ type: "SET_NUMBER", field: "donorGift", value: v })}
          note="Scenario lever; counts as a committed project source."
        />
        <label className="text-sm">
          <span className="block font-medium">Earmarked budget line</span>
          <select
            className="mt-1 w-full rounded-xl bg-white px-3 py-2 ring-1 ring-line"
            value={x.giftLine}
            onChange={(e) => dispatch({ type: "SET_INPUTS", patch: { giftLine: e.target.value as GiftLine } })}
          >
            {GIFT_LINES.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-sm">
        {x.donorGift <= 0 ? (
          "Enter a gift amount (try $25,000) to see what it covers."
        ) : lineTotal > 0 ? (
          <>
            {usd(x.donorGift)} earmarked to <em>{lineName}</em> covers <strong>{formatPercent(x.donorGift / lineTotal, 2)}</strong> of that {usd(lineTotal)} line
            and reduces the free-land gap to <strong>{usd(free.gap)}</strong> ({formatSignedUSDWhole(-x.donorGift)}).
          </>
        ) : (
          <>
            The {lineName} line is $0 in this scenario. The gift still reduces the free-land gap to <strong>{usd(free.gap)}</strong>.
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-muted">
        Money is pooled; this shows scale, not where the gift is spent.{" "}
        <a href={SOURCES["irs-pub-526"].url} target="_blank" rel="noreferrer" className="underline">
          IRS Publication 526
        </a>{" "}
        (general information only, not tax advice).
      </p>
    </Card>
  );
}

export function MemoPanel({ state }: { state: PencilState }) {
  const text = useMemo(() => buildMemo(state), [state]);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
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
  };
  return (
    <Card className="p-4 sm:p-5" aria-labelledby="memo-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="memo-title" className="text-base font-semibold">
          Funder memo (draft text)
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted" aria-live="polite">
            {copied === "ok" ? "Copied to clipboard" : copied === "fail" ? "Copy failed. Select the text manually." : ""}
          </span>
          <Button onClick={copy}>
            <Icon name="copy" className="h-4 w-4" />
            Copy funder memo
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">Nothing is sent. You copy the text and decide what to do with it. Site: {SAN_CLEMENTE.address}.</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-muted">Preview</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-canvas p-3 text-xs whitespace-pre-wrap ring-1 ring-line">{text}</pre>
      </details>
    </Card>
  );
}

type LiveState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "fail" }
  | { kind: "ok"; week: string; rate30: number; today: string };

/** Optional §7 live check. Runs only on click; the snapshot stays in use either way. */
export function LiveRateCheck({ chosenWeek }: { chosenWeek: string | null }) {
  const [live, setLive] = useState<LiveState>({ kind: "idle" });
  const run = async () => {
    setLive({ kind: "loading" });
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch("/api/pmms-latest", { cache: "no-store" });
      const j = (await res.json()) as { ok: boolean; week?: string; rate30?: number };
      if (j.ok && j.week && typeof j.rate30 === "number") setLive({ kind: "ok", week: j.week, rate30: j.rate30, today });
      else setLive({ kind: "fail" });
    } catch {
      setLive({ kind: "fail" });
    }
  };
  const age = live.kind === "ok" && chosenWeek ? daysBetween(chosenWeek, live.today) : null;
  return (
    <div className="mt-2 rounded-xl bg-canvas p-2 text-xs ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          Snapshot: {LATEST_PMMS.week}, {LATEST_PMMS.rate30.toFixed(2)}% (read {SOURCES.pmms.checkedDate}).
        </span>
        <Button size="sm" variant="secondary" onClick={run} disabled={live.kind === "loading"}>
          {live.kind === "loading" ? "Checking…" : "Check latest PMMS"}
        </Button>
      </div>
      <p className="mt-1 text-muted" aria-live="polite">
        {live.kind === "idle" && "Optional. Asks our server to read Freddie Mac's CSV once; the calculation keeps using the snapshot."}
        {live.kind === "fail" && "Live check unavailable; using snapshot."}
        {live.kind === "ok" &&
          (live.week === LATEST_PMMS.week && Math.abs(live.rate30 - LATEST_PMMS.rate30) < 1e-9
            ? `Live: ${live.week}, ${live.rate30.toFixed(2)}%. Matches the snapshot.`
            : `Live: ${live.week}, ${live.rate30.toFixed(2)}%. Differs from the snapshot (${LATEST_PMMS.week}, ${LATEST_PMMS.rate30.toFixed(2)}%); the calculation still uses the snapshot.`)}
      </p>
      {age !== null && age > PMMS_STALE_DAYS && (
        <p className="mt-1 font-medium text-amber-900">
          Stale: the chosen week ({chosenWeek}) is {age} days old (warning threshold {PMMS_STALE_DAYS} days, ASSUMPTION).
        </p>
      )}
    </div>
  );
}
