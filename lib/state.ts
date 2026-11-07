/**
 * App state as a pure reducer so view switching, applying, and reset are
 * testable without a browser. Household values are only changed by explicit
 * budget edits; applying a notice stores the reviewed change separately.
 */
import {
  createDemoHousehold,
  createScenarioExtraction,
  createScenarioHousehold,
  DEFAULT_SCENARIO_ID,
  SAMPLE_SCENARIOS,
  type SampleScenarioId,
} from "./demo-data";
import { checkApplicable, draftFromExtraction, emptyManualDraft } from "./review";
import type { BudgetMoneyField, ExtractedNotice, HouseholdBudget, PaymentMethod, ReviewedChange } from "./schema";

export type Step = "welcome" | "review" | "impact";
export type View = "homeowner" | "caseworker";

export type NoticeSource = {
  kind: "sample" | "pasted" | "upload";
  fileName?: string;
  text: string;
};

export type ResourceStatus = "to-verify" | "not-eligible" | "applied" | "confirmed";

export type AppState = {
  step: Step;
  view: View;
  /** Which fictional sample scenario "Try sample scenario" loads. */
  scenarioId: SampleScenarioId;
  budget: HouseholdBudget;
  notice: NoticeSource | null;
  extraction: ExtractedNotice | null;
  draft: ReviewedChange | null;
  /** Snapshot taken when the homeowner pressed "Apply this change". */
  applied: ReviewedChange | null;
  /** Message explaining why extraction fell back to manual entry, if it did. */
  analysisNote: string | null;
  checklist: Record<number, boolean>;
  resourceStatus: Record<string, ResourceStatus>;
};

export function createInitialState(): AppState {
  return {
    step: "welcome",
    view: "homeowner",
    scenarioId: DEFAULT_SCENARIO_ID,
    budget: createDemoHousehold(),
    notice: null,
    extraction: null,
    draft: null,
    applied: null,
    analysisNote: null,
    checklist: {},
    resourceStatus: {},
  };
}

export type Action =
  | { type: "SELECT_SCENARIO"; id: SampleScenarioId }
  | { type: "LOAD_SAMPLE" }
  | { type: "LOAD_EXTRACTION"; notice: NoticeSource; extraction: ExtractedNotice | null; note?: string }
  | { type: "UPDATE_DRAFT"; draft: ReviewedChange }
  | { type: "APPLY_CHANGE" }
  | { type: "SET_BUDGET_FIELD"; field: BudgetMoneyField; value: number }
  | { type: "SET_BUDGET_PAYMENT_METHOD"; value: PaymentMethod }
  | { type: "GO_TO_STEP"; step: Step }
  | { type: "SWITCH_VIEW"; view: View }
  | { type: "TOGGLE_CHECKLIST"; index: number }
  | { type: "SET_RESOURCE_STATUS"; id: string; status: ResourceStatus }
  | { type: "RESET" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SELECT_SCENARIO": {
      if (action.id === state.scenarioId) return state;
      // Each scenario has its own matching fictional budget; switching starts that scenario fresh.
      return {
        ...createInitialState(),
        scenarioId: action.id,
        budget: createScenarioHousehold(action.id),
      };
    }
    case "LOAD_SAMPLE": {
      const scenario = SAMPLE_SCENARIOS[state.scenarioId];
      const extraction = createScenarioExtraction(scenario.id);
      return {
        ...state,
        step: "review",
        view: "homeowner",
        notice: { kind: "sample", fileName: scenario.fileName, text: scenario.text },
        extraction,
        draft: draftFromExtraction(extraction),
        applied: null,
        analysisNote: null,
        checklist: {},
      };
    }
    case "LOAD_EXTRACTION":
      return {
        ...state,
        step: "review",
        view: "homeowner",
        notice: action.notice,
        extraction: action.extraction,
        draft: action.extraction ? draftFromExtraction(action.extraction) : emptyManualDraft(),
        applied: null,
        analysisNote: action.note ?? null,
        checklist: {},
      };
    case "UPDATE_DRAFT":
      return { ...state, draft: action.draft };
    case "APPLY_CHANGE": {
      if (!state.draft) return state;
      const check = checkApplicable(state.draft, state.extraction);
      if (!check.ok) return state;
      return { ...state, applied: structuredClone(state.draft), step: "impact" };
    }
    case "SET_BUDGET_FIELD": {
      const v = action.value;
      if (!Number.isFinite(v) || v < 0) return state;
      return { ...state, budget: { ...state.budget, [action.field]: v } };
    }
    case "SET_BUDGET_PAYMENT_METHOD":
      return { ...state, budget: { ...state.budget, insurancePaymentMethod: action.value } };
    case "GO_TO_STEP":
      if (action.step === "impact" && !state.applied) return state;
      if (action.step === "review" && !state.draft) return state;
      return { ...state, step: action.step };
    case "SWITCH_VIEW":
      return { ...state, view: action.view };
    case "TOGGLE_CHECKLIST":
      return { ...state, checklist: { ...state.checklist, [action.index]: !state.checklist[action.index] } };
    case "SET_RESOURCE_STATUS":
      return { ...state, resourceStatus: { ...state.resourceStatus, [action.id]: action.status } };
    case "RESET":
      return createInitialState();
  }
}
