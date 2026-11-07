/**
 * Every source Pencil cites. Each entry records the URL, the date that applies
 * to the document (and what kind of date it is), and the date we checked it.
 * Do not change a number elsewhere without re-reading its source here.
 */

export type DateKind =
  | "memo dated"
  | "effective"
  | "last amended"
  | "data last updated"
  | "week of"
  | "update dated"
  | "not stated";

export type Source = {
  id: string;
  title: string;
  url: string;
  /** ISO date that applies to the document itself, or null when the source gives none (shown as "Unknown"). */
  date: string | null;
  dateKind: DateKind;
  /** ISO date someone on the team read the page. */
  checkedDate: string;
  /** How we used it, and any caveat (unofficial copy, search results only, etc.). */
  note: string;
  /** True when the page was seen only in search results and not read in full. */
  searchOnly?: boolean;
};

export const CHECKED = "2026-11-07";

const list = [
  {
    id: "hcd-state-2026",
    title: "HCD, Revised 2026 State Income Limits (page 11, Orange County)",
    url: "https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf",
    date: "2026-06-23",
    dateKind: "memo dated",
    checkedDate: CHECKED,
    note: "Revised memo replaces the May 29, 2026 limits. The memo says each program's own definitions and effective dates govern.",
  },
  {
    id: "hcd-home-2026",
    title: "HCD, 2026 State HOME Income Limits (page 2, Orange)",
    url: "https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/2026-california-HOME-income-limits_0.pdf",
    date: "2026-06-01",
    dateKind: "effective",
    checkedDate: CHECKED,
    note: "30% / 50% / 80% rows match the State table; adds a 60% row. Different document date from the State table.",
  },
  {
    id: "hsc-50052-5",
    title: "California Health and Safety Code § 50052.5 (owner affordable housing cost)",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=50052.5",
    date: null,
    dateKind: "last amended",
    checkedDate: CHECKED,
    note: "Last amended Stats. 2017, Ch. 418. Paraphrased in the app. Applies only if the project's assistance requires it.",
  },
  {
    id: "ccr-25-6920",
    title: "25 CCR § 6920 (what a purchaser's housing cost includes)",
    url: "https://www.law.cornell.edu/regulations/california/25-CCR-6920",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Cornell LII, an unofficial copy. Housing cost includes fire and casualty insurance, taxes, maintenance, utilities allowance, HOA fees.",
  },
  {
    id: "pmms",
    title: "Freddie Mac Primary Mortgage Market Survey, 30-year fixed (weekly history CSV)",
    url: "https://www.freddiemac.com/pmms/docs/PMMS_history.csv",
    date: "2026-11-05",
    dateKind: "week of",
    checkedDate: CHECKED,
    note: "National average. The buyer's actual rate and Habitat-style loan terms may differ.",
  },
  {
    id: "listing-504-avenida-san-juan",
    title: "Public listing, 504 E Avenida San Juan, San Clemente (IDX mirror of MLS# OC26039302MR)",
    url: "https://canyonhaus.com/home-search/listings/1827937876516032324-504-E-Avenida-San-Juan",
    date: "2026-09-28",
    dateKind: "data last updated",
    checkedDate: CHECKED,
    note: "Asking price, lot size, status and description only. No agent contact details stored. Re-check before relying on it.",
  },
  {
    id: "organizers-synthetic-deal",
    title: "Claude Impact Lab organizers, synthetic one-home bill (lanes/3-fund-it, commit 45a05a5)",
    url: "https://github.com/travcjohnson/claude-impact-lab-uci/tree/45a05a5c65ba5e3ae7b15e991c8fedf3a29d3ebf/lanes/3-fund-it",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Made-up deal; every line is an ASSUMPTION. Used only as an arithmetic check, never as a benchmark.",
  },
  {
    id: "habitat-oc-difficult",
    title: "Habitat for Humanity of Orange County blog: why homeownership is becoming more difficult",
    url: "https://habitatoc.org/why-homeownership-is-becoming-more-difficult-for-orange-county-families/",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Cross-check: a family of four earning $93,050–$148,850 is 'low-income' (the post attributes the figures to HUD). Also says CalHome funding has been reduced.",
  },
  {
    id: "habitat-oc-older",
    title: "Habitat for Humanity of Orange County, older post: surprising ways you might qualify",
    url: "https://habitatoc.org/surprising-ways-you-might-qualify-for-homeownership/",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Older figure, superseded: $78,900–$126,250. Seen in search results only.",
    searchOnly: true,
  },
  {
    id: "oc-hcd-homeowner-programs",
    title: "OC Housing & Community Development, Homeowner Programs (Mortgage Assistance Program)",
    url: "https://housing.oc.gov/housing-development/homeowner-programs",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "MAP terms and eligible areas. Also lists the 80% / 120% income figures 'as of June 2026'.",
  },
  {
    id: "oc-map-application-2026-08",
    title: "OC HCD, MAP application package dated Aug 3, 2026",
    url: "https://www.ochcd.org/sites/hcd/files/2026-08/map-application-package-08-03-26.pdf",
    date: "2026-08-03",
    dateKind: "memo dated",
    checkedDate: CHECKED,
    note: "Seen in search results only, not read in full. Search results also show a County memo with 'up to $80,000, not to exceed 20% of purchase price'.",
    searchOnly: true,
  },
  {
    id: "fhlbsf-wish",
    title: "FHLBank San Francisco, WISH",
    url: "https://www.fhlbsf.com/products/community-programs-grants/wish",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "2026 program terms. The HUD AMI table WISH uses was not read.",
  },
  {
    id: "santa-ana-my-first-home",
    title: "City of Santa Ana, My First Home",
    url: "https://santa-ana.gov/my-first-home",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "No loan amount on the page. Lists the 80% / 120% income figures 'as of June 2026'.",
  },
  {
    id: "calhfa-myhome",
    title: "CalHFA, MyHome Assistance Program",
    url: "https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Amount not on this page. Lane notes say up to 3.5% FHA / 3% conventional on https://www.calhfa.ca.gov/homebuyer/programs/ (not confirmed by us).",
  },
  {
    id: "calhfa-dream-for-all",
    title: "CalHFA, Dream For All",
    url: "https://calhfa.ca.gov/dream/",
    date: "2026-05-20",
    dateKind: "update dated",
    checkedDate: CHECKED,
    note: "Voucher by randomized drawing (update dated 05/20/2026).",
  },
  {
    id: "hcd-calhome",
    title: "HCD, CalHome",
    url: "https://www.hcd.ca.gov/grants-and-funding/programs-active/calhome",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Grants to agencies and nonprofits; no open general round confirmed.",
  },
  {
    id: "hcd-hosn",
    title: "HCD, Homeownership Super NOFA",
    url: "https://www.hcd.ca.gov/funding/hosn",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "The page lists only 2024 Tribal NOFA documents.",
  },
  {
    id: "ochft",
    title: "Orange County Housing Finance Trust, programs",
    url: "https://ochft.org/programs",
    date: null,
    dateKind: "not stated",
    checkedDate: "2026-11-06",
    note: "From the event lane notes (checked Nov 6): a NOFA is shown; homeownership eligibility not confirmed. Not read by us.",
  },
  {
    id: "hud-housing-counseling",
    title: "HUD, About Housing Counseling",
    url: "https://www.hud.gov/hud-partners/single-family-about-housing-counseling",
    date: null,
    dateKind: "not stated",
    checkedDate: "2026-11-06",
    note: "Reused from HomeStay's catalog. MAP, WISH, MyHome, Dream For All and My First Home require homebuyer education or counseling.",
  },
  {
    id: "irs-pub-526",
    title: "IRS Publication 526 (2025), Charitable Contributions",
    url: "https://www.irs.gov/publications/p526",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "General information only. Not tax advice.",
  },
] as const satisfies readonly Source[];

export type SourceId = (typeof list)[number]["id"];

export const SOURCES: Readonly<Record<SourceId, Source>> = Object.freeze(
  Object.fromEntries(list.map((s) => [s.id, Object.freeze({ ...s })])) as Record<SourceId, Source>,
);

export const SOURCE_LIST: readonly Source[] = Object.freeze(list.map((s) => SOURCES[s.id]));

/** "memo dated 2026-06-23" / "last amended: Unknown" style label. */
export function sourceDateLabel(s: Source): string {
  if (s.dateKind === "not stated") return "Document date: Unknown";
  return `${s.dateKind[0]!.toUpperCase()}${s.dateKind.slice(1)} ${s.date ?? "Unknown"}`;
}
