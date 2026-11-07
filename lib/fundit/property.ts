/**
 * §3.8: the real case, a dated static snapshot of a public listing.
 * Only price, size, status and description are stored. No agent contact details.
 * Never fetch listing sites at runtime.
 */

import deal from "@/public/samples/fund-it/synthetic-example-deal.json";
import { SOURCES } from "./sources";

export type PropertySnapshot = {
  id: string;
  address: string;
  city: string;
  county: string;
  mls: string;
  askingPrice: number;
  lotAcres: number;
  propertyType: string;
  status: string;
  listedDate: string;
  dataLastUpdated: string;
  checkedDate: string;
  sourceUrl: string;
  /** Listing claim, quoted as published. */
  descriptionClaim: string;
  /** ASSUMPTION: homes modeled, based on the listing claim. */
  homesModeled: number;
  openQuestions: readonly string[];
};

const listing = SOURCES["listing-504-avenida-san-juan"];

export const SAN_CLEMENTE: PropertySnapshot = Object.freeze({
  id: "504-e-avenida-san-juan",
  address: "504 E Avenida San Juan",
  city: "San Clemente",
  county: "Orange",
  mls: "OC26039302MR",
  askingPrice: 5_900_000,
  lotAcres: 2.82,
  propertyType: "Land",
  status: "Active (listed Feb 25, 2026), per the listing's 9/28/2026 data date. Re-check before the demo.",
  listedDate: "2026-02-25",
  dataLastUpdated: listing.date!,
  checkedDate: listing.checkedDate,
  sourceUrl: listing.url,
  descriptionClaim: "previously approved for division into 4 parcels",
  homesModeled: 4,
  openQuestions: Object.freeze([
    "Is the 4-parcel approval still current, and can four separate homes be sold? Unknown: ask the City of San Clemente.",
    "Purchase price is Unknown. The listing establishes the asking price only.",
  ]),
});

/** §3.7: the organizers' synthetic one-home bill, used only as an arithmetic check. */
export type SyntheticCheck = {
  costLines: { label: string; value: number }[];
  paidLines: { label: string; value: number }[];
  costTotal: number;
  paidTotal: number;
  statedCostTotal: number;
  statedPaidTotal: number;
  statedBalance: number;
  balance: number;
  balances: boolean;
};

const LABELS: Record<string, string> = {
  land_and_building_purchase: "Land and building purchase",
  time_costs_while_waiting: "Time costs while waiting",
  construction_and_repairs: "Construction and repairs",
  fees_design_legal_sales: "Fees: design, legal, sales",
  family_price: "Family price",
  public_subsidies: "Public subsidies",
  rent_earned_while_waiting: "Rent earned while waiting",
  fundraising_the_gap: "Fundraising the gap",
};

function lines(group: Record<string, { value: number }>) {
  return Object.entries(group)
    .filter(([k]) => k !== "total")
    .map(([k, v]) => ({ label: LABELS[k] ?? k, value: v.value }));
}

export function syntheticCheck(): SyntheticCheck {
  const costLines = lines(deal.cost_to_create);
  const paidLines = lines(deal.paid_by);
  const costTotal = costLines.reduce((a, l) => a + l.value, 0);
  const paidTotal = paidLines.reduce((a, l) => a + l.value, 0);
  const balance = paidTotal - costTotal;
  return {
    costLines,
    paidLines,
    costTotal,
    paidTotal,
    statedCostTotal: deal.cost_to_create.total.value,
    statedPaidTotal: deal.paid_by.total.value,
    statedBalance: deal.balance.value,
    balance,
    balances: balance === 0 && costTotal === deal.cost_to_create.total.value && paidTotal === deal.paid_by.total.value,
  };
}
