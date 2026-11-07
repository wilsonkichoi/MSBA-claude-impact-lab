"use client";

import type { Dispatch } from "react";
import type { CatalogTotals } from "@/lib/fundit/catalog";
import type { PencilInputs } from "@/lib/fundit/project";
import type { PencilAction, PencilState } from "@/lib/fundit/state";

// Filled in by the next step (sources, donor view, memo).
export function SourcesPanel(_props: { state: PencilState; dispatch: Dispatch<PencilAction>; totals: CatalogTotals; inputs: PencilInputs }) {
  void _props;
  return null;
}

export function DonorPanel(_props: { inputs: PencilInputs; dispatch: Dispatch<PencilAction> }) {
  void _props;
  return null;
}

export function MemoPanel(_props: { state: PencilState }) {
  void _props;
  return null;
}
