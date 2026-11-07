"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { buildActionPlan } from "@/lib/actions";
import { matchResources } from "@/lib/assistance";
import { buildCounselorSummary } from "@/lib/counselor";
import { SAMPLE_SCENARIOS, type SampleScenarioId } from "@/lib/demo-data";
import { buildInsight } from "@/lib/explain";
import { calculateInsuranceImpact, toMonthly } from "@/lib/finance";
import { cautionsFor } from "@/lib/review";
import { createInitialState, reducer, type Step, type View } from "@/lib/state";
import { ActionPlan } from "./action-plan";
import { AssistanceNavigator } from "./assistance-navigator";
import { CounselorEmptyState, CounselorView } from "./counselor-view";
import { HouseholdBudgetCard } from "./household-budget";
import { ImpactSummary } from "./impact-summary";
import { NoticeInput } from "./notice-input";
import { NoticeReview } from "./notice-review";
import { Button, Card, Icon, cx } from "./ui";

const STEPS: { id: Step; label: string }[] = [
  { id: "welcome", label: "Household" },
  { id: "review", label: "Review notice" },
  { id: "impact", label: "Impact & next steps" },
];

function DemoBanner() {
  return (
    <div className="bg-amber-100 text-amber-950">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-center text-xs font-medium sm:text-sm">
        <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">Demo</span>
        Synthetic data only. Jordan Rivera and every document here are fictional. Hackathon prototype, not an official Habitat for Humanity product.
      </p>
    </div>
  );
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div role="group" aria-label="Choose view" className="inline-flex rounded-xl bg-canvas p-1 ring-1 ring-line">
      {(
        [
          ["homeowner", "Homeowner", "home"],
          ["caseworker", "Caseworker", "users"],
        ] as const
      ).map(([v, label, icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
            view === v ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
          )}
        >
          <Icon name={icon} className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function ScenarioPicker({ value, onChange }: { value: SampleScenarioId; onChange: (id: SampleScenarioId) => void }) {
  const scenarios = Object.values(SAMPLE_SCENARIOS);
  return (
    <div className="mt-6">
      <p id="scenario-picker-label" className="text-sm font-medium">
        Sample scenario <span className="font-normal text-muted">(fictional)</span>
      </p>
      <div role="group" aria-labelledby="scenario-picker-label" className="mt-1.5 inline-flex flex-wrap rounded-xl bg-canvas p-1 ring-1 ring-line">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={value === s.id}
            onClick={() => onChange(s.id)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              value === s.id ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-sm text-muted" aria-live="polite">
        {SAMPLE_SCENARIOS[value].description}
      </p>
    </div>
  );
}

function Stepper({ step, canReview, canImpact, onGo }: { step: Step; canReview: boolean; canImpact: boolean; onGo: (s: Step) => void }) {
  const idx = STEPS.findIndex((s) => s.id === step);
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => {
          const reachable = s.id === "welcome" || (s.id === "review" && canReview) || (s.id === "impact" && canImpact);
          const current = s.id === step;
          const done = i < idx;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!reachable || current}
                onClick={() => onGo(s.id)}
                aria-current={current ? "step" : undefined}
                className={cx(
                  "flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left disabled:cursor-default",
                  reachable && !current && "hover:text-brand-700",
                )}
              >
                <span
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    current ? "bg-brand-600 text-white" : done ? "bg-brand-100 text-brand-800" : "bg-white text-muted ring-1 ring-line",
                  )}
                >
                  {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cx("truncate", current ? "font-semibold text-ink" : "text-muted", "hidden sm:inline")}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cx("h-px flex-1", done ? "bg-brand-300" : "bg-line")} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-xs text-muted sm:hidden">
        Step {idx + 1} of {STEPS.length}: {STEPS[idx]?.label}
      </p>
    </nav>
  );
}

export function HomeStayApp() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [showInput, setShowInput] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Move focus and scroll to the top when the screen changes (keyboard + screen-reader friendly).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    mainRef.current?.focus({ preventScroll: true });
  }, [state.step, state.view]);

  const derived = useMemo(() => {
    const change = state.applied;
    if (!change || change.newAmount === null) return null;
    const newMonthly = toMonthly(change.newAmount, change.period);
    if (newMonthly === null) return null;
    try {
      const impact = calculateInsuranceImpact(state.budget, newMonthly);
      return {
        change,
        impact,
        cautions: cautionsFor(change, state.budget),
        actions: buildActionPlan(state.budget, change, impact),
        insight: buildInsight(change, impact),
        summary: buildCounselorSummary(state.budget, change, state.extraction, impact),
      };
    } catch {
      return null;
    }
  }, [state.applied, state.budget, state.extraction]);

  const matches = useMemo(
    () => matchResources(state.budget, derived ? { change: derived.change, impact: derived.impact } : null),
    [state.budget, derived],
  );

  const startSample = () => {
    setShowInput(false);
    dispatch({ type: "LOAD_SAMPLE" });
  };

  const reset = () => {
    setShowInput(false);
    dispatch({ type: "RESET" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />

      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => dispatch({ type: "SWITCH_VIEW", view: "homeowner" })} className="flex items-center gap-2.5 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Icon name="home" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight tracking-tight">HomeStay</span>
              <span className="hidden text-xs text-muted sm:block">Homeownership Stability Copilot</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <ViewSwitch view={state.view} onChange={(v) => dispatch({ type: "SWITCH_VIEW", view: v })} />
            <Button variant="ghost" size="sm" onClick={reset} title="Reset demo to the original synthetic scenario">
              <Icon name="reset" className="h-4 w-4" />
              <span className="hidden sm:inline">Reset demo</span>
              <span className="sr-only sm:hidden">Reset demo</span>
            </Button>
          </div>
        </div>
      </header>

      <main ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:py-8">
        {state.view === "caseworker" ? (
          derived ? (
            <CounselorView
              summary={derived.summary}
              insight={derived.insight}
              actions={derived.actions}
              checklist={state.checklist}
              onToggleChecklist={(i) => dispatch({ type: "TOGGLE_CHECKLIST", index: i })}
              matches={matches}
              resourceStatus={state.resourceStatus}
              onResourceStatusChange={(id, status) => dispatch({ type: "SET_RESOURCE_STATUS", id, status })}
            />
          ) : (
            <CounselorEmptyState onStart={startSample} />
          )
        ) : (
          <>
            <Stepper
              step={state.step}
              canReview={state.draft !== null}
              canImpact={derived !== null}
              onGo={(s) => dispatch({ type: "GO_TO_STEP", step: s })}
            />

            {state.step === "welcome" && (
              <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
                <div className="animate-fade-up">
                  <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">Stay ahead of homeownership cost changes.</h1>
                  <p className="mt-4 text-lg text-muted">Understand a notice. See the impact. Know what to do next.</p>

                  <ScenarioPicker value={state.scenarioId} onChange={(id) => dispatch({ type: "SELECT_SCENARIO", id })} />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button size="lg" onClick={startSample}>
                      Try sample scenario
                      <Icon name="arrow-right" className="h-4 w-4" />
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => setShowInput(true)} aria-expanded={showInput}>
                      <Icon name="upload" className="h-4 w-4" />
                      Upload or paste a notice
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-muted">No sign-up. The sample works offline with no API key.</p>

                  <ol className="mt-8 grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        ["doc", "Read the notice", "See exactly what the letter says, with the source text highlighted."],
                        ["chart", "See the impact", "Before-and-after numbers for your monthly budget."],
                        ["users", "Get next steps", "Concrete actions, plus a summary to share with a counselor."],
                      ] as const
                    ).map(([icon, title, body]) => (
                      <li key={title} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                        <Icon name={icon} className="h-5 w-5 text-brand-600" />
                        <p className="mt-2 font-semibold">{title}</p>
                        <p className="mt-1 text-sm text-muted">{body}</p>
                      </li>
                    ))}
                  </ol>

                  <blockquote className="mt-8 border-l-4 border-brand-300 pl-4 text-sm italic text-muted">
                    Habitat helps families become homeowners. HomeStay helps families stay homeowners.
                  </blockquote>
                </div>

                <div className="space-y-4">
                  {showInput ? (
                    <NoticeInput
                      sampleText={SAMPLE_SCENARIOS[state.scenarioId].text}
                      onCancel={() => setShowInput(false)}
                      onLoaded={(notice, extraction, note) => {
                        setShowInput(false);
                        dispatch({ type: "LOAD_EXTRACTION", notice, extraction, note });
                      }}
                    />
                  ) : (
                    <HouseholdBudgetCard
                      budget={state.budget}
                      onFieldChange={(field, value) => dispatch({ type: "SET_BUDGET_FIELD", field, value })}
                      onPaymentMethodChange={(value) => dispatch({ type: "SET_BUDGET_PAYMENT_METHOD", value })}
                    />
                  )}
                </div>
              </div>
            )}

            {state.step === "review" && state.notice && state.draft && (
              <NoticeReview
                key={`${state.notice.kind}-${state.notice.text.length}-${state.extraction?.extractionMode ?? "manual"}`}
                notice={state.notice}
                extraction={state.extraction}
                draft={state.draft}
                analysisNote={state.analysisNote}
                onDraftChange={(draft) => dispatch({ type: "UPDATE_DRAFT", draft })}
                onApply={() => dispatch({ type: "APPLY_CHANGE" })}
                onBack={() => dispatch({ type: "GO_TO_STEP", step: "welcome" })}
              />
            )}

            {state.step === "impact" && derived && (
              <div className="space-y-10">
                <ImpactSummary budget={state.budget} change={derived.change} impact={derived.impact} cautions={derived.cautions} />
                <ActionPlan actions={derived.actions} />
                <AssistanceNavigator matches={matches} statuses={state.resourceStatus} />

                <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white ring-0 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-lg font-semibold">Want help with this?</p>
                    <p className="mt-1 text-sm text-brand-100">See the summary a housing counselor would receive. Nothing is sent anywhere.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => dispatch({ type: "GO_TO_STEP", step: "review" })}>
                      Review notice again
                    </Button>
                    <Button className="bg-white !text-brand-800 hover:bg-brand-50" onClick={() => dispatch({ type: "SWITCH_VIEW", view: "caseworker" })}>
                      <Icon name="users" className="h-4 w-4" />
                      Open caseworker view
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-line bg-white">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-muted">
          Prototype only. Not a lender, insurance advisor, or financial counselor. Verify information with relevant professionals and official sources.
        </p>
      </footer>
    </div>
  );
}
