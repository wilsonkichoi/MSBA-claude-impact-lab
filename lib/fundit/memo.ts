/**
 * §4.1 funder memo: copyable plain text. Drafted for a person to review; nothing is sent.
 * Built only from the deterministic results and the static source catalog.
 */

import { formatPercent, formatSignedUSDWhole, formatUSDCents, formatUSDWhole } from "@/lib/format";
import { LEAD_STATUS_LABEL, type CatalogTotals } from "./catalog";
import { computeProject, decisionSignal, levers, rateFor, sensitivityRanking, SENSITIVITY_STEPS, type PencilInputs } from "./project";
import { SAN_CLEMENTE } from "./property";
import { RATE_STEP_ASSUMPTION } from "./rates";
import { SOURCE_LIST, sourceDateLabel } from "./sources";
import { candidateInputs, effectiveInputs, type PencilState } from "./state";

const usd = formatUSDWhole;

export const MEMO_HEADER = "DRAFT · CONDITIONAL SCENARIO · NOT A FINANCING COMMITMENT OR ELIGIBILITY DETERMINATION";

/** Every assumed number, with what it is based on. Used by the memo and the README. */
export function assumptionList(x: PencilInputs): string[] {
  return [
    `Homes modeled: ${x.homes} (based on the listing's 4-parcel claim; City verification needed).`,
    `Land price mode: ${x.landMode}${x.landMode === "custom" ? ` at ${usd(x.customLandPrice)}` : ""} (asking price is published; purchase price Unknown).`,
    `Development budget: ${usd(x.devCost)} total (construction, site work, fees, financing, sales, contingency; no site-specific bids).`,
    `Household: ${x.persons} people, ${usd(x.grossIncome)}/yr gross (fictional).`,
    `Housing budget share: ${formatPercent(x.budgetShare)} of gross income (50052.5's own formulas use 30%; Santa Ana's My First Home uses a 28–40% range).`,
    `Unit size: ${x.bedrooms} bedrooms (sets the 50052.5(h) household size).`,
    `Recurring costs reserve: ${usd(x.reserveMonthly)}/mo per home (stands in for 25 CCR 6920 non-P&I lines; not itemized).`,
    `Buyer cash: ${usd(x.buyerCash)} per home (closing costs assumed covered separately).`,
    `Loan term: ${x.years} years (matches the PMMS 30-year series).`,
    `Rate step: +${RATE_STEP_ASSUMPTION.toFixed(2)} point (not a published value).`,
    `Verify-first step sizes: development +${formatPercent(SENSITIVITY_STEPS.devCostPct, 0)}, reserve +$${SENSITIVITY_STEPS.reserveMonthly}/mo, budget −$${Math.abs(SENSITIVITY_STEPS.budgetMonthly)}/mo, rate +${SENSITIVITY_STEPS.ratePoints.toFixed(2)} point, buyer cash −$${Math.abs(SENSITIVITY_STEPS.buyerCash).toLocaleString("en-US")}.`,
    ...(x.rateMode === "custom" ? [`Mortgage rate: ${x.customRate.toFixed(2)}% custom (not published).`] : []),
    ...(x.insuranceExtraMonthly > 0 ? [`Insurance lever: +${usd(x.insuranceExtraMonthly)}/mo per home (the HomeStay sample renewal).`] : []),
    ...(x.donorGift > 0 ? [`Donor gift: ${usd(x.donorGift)} (scenario lever, not a pledge).`] : []),
  ];
}

export function buildMemo(state: PencilState): string {
  const { inputs: x, totals } = effectiveInputs(state);
  const r = computeProject(x);
  const free = computeProject({ ...x, landMode: "donated" });
  const d = decisionSignal(x, usd);
  const lv = levers(x);
  const rank = sensitivityRanking(x, usd);
  const capOff = computeProject({ ...x, landMode: "donated", applyCap: false });
  const cand = computeProject(candidateInputs(x, totals));
  const L: string[] = [];
  const h = (t: string) => L.push("", t.toUpperCase());

  L.push(MEMO_HEADER);
  L.push(`Pencil funding-gap memo · ${SAN_CLEMENTE.address}, ${SAN_CLEMENTE.city} · drafted for review`);
  if (state.city !== SAN_CLEMENTE.city) L.push(`WHAT-IF: geography checks run as if the site were in ${state.city}. The listing is in ${SAN_CLEMENTE.city}.`);

  h("Decision signal (for the finance lead; not a decision)");
  L.push(d.headline, d.freeLandLine, d.verifyFirst);
  L.push(`Max land price supported: ${r.maxLandSupported < 0 ? `none (${usd(r.maxLandSupported)}; even free land leaves a gap)` : usd(r.maxLandSupported)}.`);
  L.push(`Cash needed at land closing: ${usd(r.cashAtLandClose)}.`);
  d.nextChecks.forEach((c, i) => L.push(`Next check ${i + 1}: ${c}`));

  h("Property (public listing)");
  L.push(`${SAN_CLEMENTE.address}, ${SAN_CLEMENTE.city} · MLS# ${SAN_CLEMENTE.mls} · ${SAN_CLEMENTE.lotAcres} acres, ${SAN_CLEMENTE.propertyType.toLowerCase()}`);
  L.push(`Asking price ${usd(SAN_CLEMENTE.askingPrice)}. Purchase price: Unknown.`);
  L.push(`Listing describes a prior approval to divide the lot into 4 parcels (listing claim). Whether it is current, and the right to sell 4 separate homes: Unknown.`);
  L.push(`Listing: ${SAN_CLEMENTE.sourceUrl} (data last updated ${SAN_CLEMENTE.dataLastUpdated}; checked ${SAN_CLEMENTE.checkedDate})`);

  h("What families can pay (per home, monthly)");
  L.push(`Household budget: ${formatUSDCents(r.householdBudget)} (${formatPercent(x.budgetShare)} × ${usd(x.grossIncome)} ÷ 12; ASSUMPTION).`);
  L.push(`50052.5 program cap: ${r.capMonthly !== null ? formatUSDCents(r.capMonthly) : "Unknown"} (${r.capCategory ?? "no category"}, 3BR AMI ${r.ami !== null ? usd(r.ami) : "Unknown"}).`);
  L.push(`Used: ${formatUSDCents(r.usedBudget)} (${x.applyCap ? "lower of the two; cap applied" : "cap not applied"}). Whether the funding requires 50052.5: Unknown.`);
  L.push(`Gap with donated land on each basis: cap applied ${usd(computeProject({ ...x, landMode: "donated", applyCap: true }).gap)}; cap not applied ${usd(capOff.gap)}.`);
  if (r.placement) L.push(`Household income is ${formatPercent(r.placement.pctOfAmi)} of AMI for ${x.persons} people.`);

  h("Breakdown");
  L.push(`Budget ${formatUSDCents(r.usedBudget)} − reserve ${formatUSDCents(r.reserveTotal)} = P&I ${formatUSDCents(r.price.principalInterest)}/mo`);
  L.push(`Mortgage ${formatUSDCents(r.price.mortgage)} at ${rateFor(x).toFixed(2)}%, ${x.years} yr (${x.rateMode === "pmms" ? `PMMS week of ${x.pmmsWeek}, national average` : "custom, not published"})`);
  L.push(`+ buyer cash ${usd(x.buyerCash)}${x.committedBuyerAssistancePerHome > 0 ? ` + committed buyer assistance ${usd(x.committedBuyerAssistancePerHome)}` : ""} = price per home ${formatUSDCents(r.price.price)}`);
  L.push(`× ${x.homes} homes = buyer proceeds ${formatUSDCents(r.proceeds)}`);
  L.push(`Land ${usd(r.land)} + development ${usd(r.devCost)} − proceeds − committed ${usd(r.committedProject)} = gap ${formatUSDCents(r.gap)} (${formatUSDCents(r.gapPerHome)} per home)`);
  L.push(`With donated land: gap ${formatUSDCents(free.gap)} (${formatUSDCents(free.gapPerHome)} per home)`);

  h("Levers (change in gap)");
  L.push(`Land asking → donated: ${formatSignedUSDWhole(lv.landAskingToDonated.project)} (${formatSignedUSDWhole(lv.landAskingToDonated.perHome)} per home)`);
  L.push(`Rate +${RATE_STEP_ASSUMPTION.toFixed(2)} point (ASSUMPTION): ${formatSignedUSDWhole(lv.ratePlusStep.project)} (${formatSignedUSDWhole(lv.ratePlusStep.perHome)} per home)`);
  L.push(`Insurance +$150/mo per home (HomeStay renewal): ${formatSignedUSDWhole(lv.insurance.project)} (${formatSignedUSDWhole(lv.insurance.perHome)} per home)`);
  L.push(`Removing the 50052.5 cap: ${formatSignedUSDWhole(lv.capOff.project)}`);
  if (x.donorGift > 0) L.push(`Donor gift ${usd(x.donorGift)} earmarked to ${x.giftLine === "development" ? "the development budget" : "land"}: ${formatSignedUSDWhole(lv.gift.project)}. Money is pooled; this shows scale, not where the gift is spent.`);

  h("Verify first (fixed steps; steps are ASSUMPTIONS)");
  rank.forEach((row, i) => L.push(`${i + 1}. ${row.label} (${row.step}): ${formatSignedUSDWhole(row.delta)}`));

  h("Sources by status");
  L.push(...sourceLines(totals));
  L.push(
    `Base gap counts only Committed amounts: ${usd(r.gap)}. If candidates with stated amounts came through: ${usd(cand.gap)} (${totals.unknownCount} candidate${totals.unknownCount === 1 ? "" : "s"} with Unknown or conditional amounts excluded).`,
  );

  h("Open questions");
  const qs = new Set<string>([
    ...SAN_CLEMENTE.openQuestions,
    "Does this project's assistance require the 50052.5 affordable housing cost? Unknown until a funder is chosen.",
    "Does the development budget survive a preliminary estimate?",
    ...totals.evaluations.filter((e) => e.geo.inArea !== false).flatMap((e) => e.source.openQuestions.map((q) => `${e.source.name}: ${q}`)),
    ...totals.evaluations.flatMap((e) => e.source.conflicts.map((c) => `${e.source.name}: ${c}`)),
  ]);
  for (const q of qs) L.push(`- ${q}`);

  h("Assumptions (every one labeled ASSUMPTION)");
  for (const a of assumptionList(x)) L.push(`- ASSUMPTION: ${a}`);

  h("Sources (URL · document date · checked)");
  for (const s of SOURCE_LIST) L.push(`- ${s.title}: ${s.url} · ${sourceDateLabel(s)} · checked ${s.checkedDate}${s.searchOnly ? " · seen in search results only" : ""}`);

  L.push("", "Prototype. Not legal, financial or lending advice. Program terms change; verify with each source. This memo was not sent anywhere.");
  return L.join("\n");
}

function sourceLines(totals: CatalogTotals): string[] {
  return totals.evaluations.map((e) => {
    const amt = e.counted > 0 ? `counted ${usd(e.counted)}${e.source.recipient === "buyer" ? " per home" : ""}` : "counts $0";
    return `- ${e.source.name} (${e.source.provider}; ${e.source.recipient}): ${LEAD_STATUS_LABEL[e.entry.status]} · ${amt} · ${e.reason} · ${e.source.officialUrl} (checked ${e.source.lastVerified})`;
  });
}
