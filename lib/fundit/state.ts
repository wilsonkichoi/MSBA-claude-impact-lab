/**
 * Pure reducer for the Pencil screen. Nothing is persisted. Reset restores the frozen seeds.
 */

import { catalogTotals, DEFAULT_LEAD_ENTRY, FUNDING_SOURCES, type CatalogTotals, type LeadEntry } from "./catalog";
import { DEFAULT_INPUTS, type PencilInputs } from "./project";
import { SAN_CLEMENTE } from "./property";

export type SiteCity = "San Clemente" | "Dana Point";

export type PencilState = {
  inputs: PencilInputs;
  /** The listing is in San Clemente. "Dana Point" is a what-if that only changes the geography checks. */
  city: SiteCity;
  leads: Record<string, LeadEntry>;
};

type NumericField = {
  [K in keyof PencilInputs]: PencilInputs[K] extends number ? K : never;
}[keyof PencilInputs];

export type PencilAction =
  | { type: "SET_NUMBER"; field: NumericField; value: number }
  | { type: "SET_INPUTS"; patch: Partial<PencilInputs> }
  | { type: "SET_CITY"; city: SiteCity }
  | { type: "SET_LEAD"; id: string; patch: Partial<LeadEntry> }
  | { type: "RESET" };

export function createInitialPencilState(): PencilState {
  return {
    inputs: { ...DEFAULT_INPUTS },
    city: SAN_CLEMENTE.city as SiteCity,
    leads: Object.fromEntries(FUNDING_SOURCES.map((s) => [s.id, { ...DEFAULT_LEAD_ENTRY }])),
  };
}

export function pencilReducer(state: PencilState, action: PencilAction): PencilState {
  switch (action.type) {
    case "SET_NUMBER":
      if (!Number.isFinite(action.value)) return state;
      return { ...state, inputs: { ...state.inputs, [action.field]: action.value } };
    case "SET_INPUTS":
      return { ...state, inputs: { ...state.inputs, ...action.patch } };
    case "SET_CITY":
      return { ...state, city: action.city };
    case "SET_LEAD": {
      const prev = state.leads[action.id] ?? DEFAULT_LEAD_ENTRY;
      return { ...state, leads: { ...state.leads, [action.id]: { ...prev, ...action.patch } } };
    }
    case "RESET":
      return createInitialPencilState();
  }
}

/** Inputs with the catalog's committed totals folded in. */
export function effectiveInputs(state: PencilState): { inputs: PencilInputs; totals: CatalogTotals } {
  const totals = catalogTotals(state.leads, state.city);
  return {
    totals,
    inputs: {
      ...state.inputs,
      committedProjectSources: totals.committedProject,
      committedByLandClose: totals.committedProjectByLandClose,
      committedBuyerAssistancePerHome: totals.committedBuyerPerHome,
    },
  };
}

/** Same inputs, as if every candidate with a stated amount came through. */
export function candidateInputs(inputs: PencilInputs, totals: CatalogTotals): PencilInputs {
  return {
    ...inputs,
    committedProjectSources: inputs.committedProjectSources + totals.candidateProject,
    committedBuyerAssistancePerHome: inputs.committedBuyerAssistancePerHome + totals.candidateBuyerPerHome,
  };
}
