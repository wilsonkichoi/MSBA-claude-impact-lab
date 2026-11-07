/**
 * FIND_IT.md §4/§7: pure reducer for the /find screen. Lives only in browser memory.
 * The buyer is fictional; nothing is sent anywhere.
 */

import { opportunity, type DestinationId } from "./data";
import type { Mode } from "./commute";
import { DEFAULT_ASSUMPTIONS, type FinanceAssumptions } from "./finance";
import { DEFAULT_FILTERS, type Filters, type Layer } from "./filters";

export type BuyerInputs = {
  annualIncome: number;
  cash: number;
  budgetMonthly: number;
  persons: number;
  destination: DestinationId;
  mode: Mode;
};

/** §2: the fictional sample buyer. */
export const SAMPLE_BUYER: Readonly<BuyerInputs> = Object.freeze({
  annualIncome: 100_000,
  cash: 25_000,
  budgetMonthly: 2_500,
  persons: 2,
  destination: "irvine-station",
  mode: "transit",
});

export const MAX_SAVED = 2;

export type AtlasState = {
  inputs: BuyerInputs;
  assumptions: FinanceAssumptions;
  layer: Layer;
  filters: Filters;
  selectedId: string | null;
  saved: readonly string[];
  /** Note shown after a save is refused or replaces the oldest. */
  saveNote: string | null;
};

export const INITIAL_STATE: Readonly<AtlasState> = Object.freeze({
  inputs: SAMPLE_BUYER,
  assumptions: DEFAULT_ASSUMPTIONS,
  layer: "buyer",
  filters: DEFAULT_FILTERS,
  selectedId: null,
  saved: Object.freeze([]) as readonly string[],
  saveNote: null,
});

export type Action =
  | { type: "loadSample" }
  | { type: "setInput"; patch: Partial<BuyerInputs> }
  | { type: "setAssumption"; patch: Partial<FinanceAssumptions> }
  | { type: "resetAssumptions" }
  | { type: "setLayer"; layer: Layer }
  | { type: "setFilters"; patch: Partial<Filters> }
  | { type: "clearFilters" }
  | { type: "select"; id: string | null }
  | { type: "toggleSave"; id: string }
  | { type: "clearSaveNote" };

export function reducer(state: AtlasState, action: Action): AtlasState {
  switch (action.type) {
    case "loadSample":
      return {
        ...state,
        inputs: { ...SAMPLE_BUYER },
        assumptions: { ...DEFAULT_ASSUMPTIONS },
        layer: "buyer",
        filters: { ...DEFAULT_FILTERS },
        selectedId: "camino-twelve",
        saveNote: null,
      };
    case "setInput":
      return { ...state, inputs: { ...state.inputs, ...action.patch } };
    case "setAssumption":
      return { ...state, assumptions: { ...state.assumptions, ...action.patch } };
    case "resetAssumptions":
      return { ...state, assumptions: { ...DEFAULT_ASSUMPTIONS } };
    case "setLayer": {
      const sel = state.selectedId ? opportunity(state.selectedId) : undefined;
      return { ...state, layer: action.layer, selectedId: sel && sel.layer === action.layer ? sel.id : null };
    }
    case "setFilters":
      return { ...state, filters: { ...state.filters, ...action.patch } };
    case "clearFilters":
      return { ...state, filters: { ...DEFAULT_FILTERS } };
    case "select":
      return { ...state, selectedId: action.id };
    case "toggleSave": {
      if (state.saved.includes(action.id)) {
        return { ...state, saved: state.saved.filter((s) => s !== action.id), saveNote: null };
      }
      const o = opportunity(action.id);
      if (!o) return state;
      if (o.layer !== "buyer") {
        return { ...state, saveNote: "Compare homes with homes. A potential site can't be compared with homes a buyer can purchase." };
      }
      if (state.saved.length >= MAX_SAVED) {
        const dropped = opportunity(state.saved[0]!);
        return {
          ...state,
          saved: [...state.saved.slice(1), action.id],
          saveNote: `Compare holds two. Replaced ${dropped?.name ?? "the oldest"} with ${o.name}.`,
        };
      }
      return { ...state, saved: [...state.saved, action.id], saveNote: null };
    }
    case "clearSaveNote":
      return { ...state, saveNote: null };
  }
}
