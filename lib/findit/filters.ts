/**
 * FIND_IT.md §4: layer / budget / city / status / unpublished-price filtering,
 * with a reason when nothing matches.
 */

import { OPPORTUNITIES, type BuyerStatus, type City, type Opportunity } from "./data";
import { estimateMonthly, type FinanceAssumptions, type MonthlyEstimate } from "./finance";

export type Layer = "buyer" | "future";

export type Filters = {
  /** Max monthly estimate; null = any. */
  maxMonthly: number | null;
  city: City | "all";
  statuses: readonly BuyerStatus[];
  showUnpublished: boolean;
};

export const DEFAULT_FILTERS: Readonly<Filters> = Object.freeze({
  maxMonthly: null,
  city: "all",
  statuses: Object.freeze(["For sale", "Planned or approved"] as BuyerStatus[]),
  showUnpublished: true,
});

export const CITIES: readonly City[] = ["San Juan Capistrano", "San Clemente"];

/** Monthly estimate for a buyer pin with a published price; null otherwise (unpublished, or a future site). */
export function monthlyFor(o: Opportunity, cash: number, a: FinanceAssumptions): MonthlyEstimate | null {
  if (o.layer !== "buyer" || o.price === null) return null;
  return estimateMonthly(o.price, o.hoaMonthly, o.assessmentMonthly, cash, a);
}

export type NoResultsReason = "unpublished-hidden" | "over-budget" | "filters";

export type FilterResult = {
  results: readonly Opportunity[];
  /** Why nothing matched (null when there are results). */
  reason: NoResultsReason | null;
};

export function filterOpportunities(
  layer: Layer,
  f: Filters,
  cash: number,
  a: FinanceAssumptions,
  all: readonly Opportunity[] = OPPORTUNITIES,
): FilterResult {
  if (layer === "future") {
    const results = all.filter((o) => o.layer === "future" && (f.city === "all" || o.city === f.city));
    return { results, reason: results.length ? null : "filters" };
  }
  let hiddenUnpublished = 0;
  let hiddenBudget = 0;
  const results = all.filter((o) => {
    if (o.layer !== "buyer") return false;
    if (f.city !== "all" && o.city !== f.city) return false;
    if (!f.statuses.includes(o.status)) return false;
    const est = monthlyFor(o, cash, a);
    if (est === null) {
      if (!f.showUnpublished) {
        hiddenUnpublished++;
        return false;
      }
      return true;
    }
    if (f.maxMonthly !== null && est.monthly > f.maxMonthly) {
      hiddenBudget++;
      return false;
    }
    return true;
  });
  if (results.length) return { results, reason: null };
  const reason: NoResultsReason = hiddenUnpublished > 0 ? "unpublished-hidden" : hiddenBudget > 0 ? "over-budget" : "filters";
  return { results, reason };
}

export const NO_RESULTS_TEXT = "No opportunities match these filters.";

export function noResultsHint(reason: NoResultsReason): string {
  switch (reason) {
    case "unpublished-hidden":
      return "Homes with unpublished prices are hidden. Turn on unpublished prices to see planned homes.";
    case "over-budget":
      return "Every priced home is above your monthly limit.";
    case "filters":
      return "Try another city or status.";
  }
}
