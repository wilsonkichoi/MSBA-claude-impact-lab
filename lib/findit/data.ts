/**
 * FIND_IT.md §3: frozen opportunities, stations, destinations and guidance.
 * A dated static snapshot (checked Nov 7, 2026). Never fetched at runtime.
 * Organizational contacts only: no staff, agent or applicant names.
 */

import { SAN_CLEMENTE } from "@/lib/fundit/property";
import { CHECKED, type FindSourceId } from "./sources";

export type LatLon = { lat: number; lon: number };

export type Station = {
  id: "irvine" | "sjc" | "sc";
  name: string;
  address: string;
  point: LatLon;
  pointNote: string;
  sourceId: FindSourceId;
};

export const STATIONS: readonly Station[] = Object.freeze([
  {
    id: "irvine",
    name: "Irvine Station",
    address: "15215 Barranca Pkwy, Irvine",
    point: { lat: 33.65679, lon: -117.73353 },
    pointNote: "OSM railway station node (the Census Geocoder interpolates the address about 1.2 km away).",
    sourceId: "osm-nominatim",
  },
  {
    id: "sjc",
    name: "San Juan Capistrano Station",
    address: "26701 Verdugo St, San Juan Capistrano",
    point: { lat: 33.50136, lon: -117.66367 },
    pointNote: "Census Geocoder.",
    sourceId: "census-geocoder",
  },
  {
    id: "sc",
    name: "San Clemente Station",
    address: "1850 Avenida Estacion, San Clemente",
    point: { lat: 33.43282, lon: -117.63345 },
    pointNote: "Census Geocoder.",
    sourceId: "census-geocoder",
  },
] as const satisfies readonly Station[]);

export function station(id: Station["id"]): Station {
  return STATIONS.find((s) => s.id === id)!;
}

export type DestinationId = "irvine-station" | "uci";

export type Destination = { id: DestinationId; name: string; point: LatLon; pointNote: string; sourceId: FindSourceId };

export const DESTINATIONS: readonly Destination[] = Object.freeze([
  {
    id: "irvine-station",
    name: "Irvine Station",
    point: { lat: 33.65679, lon: -117.73353 },
    pointNote: "OSM railway station node.",
    sourceId: "osm-nominatim",
  },
  {
    id: "uci",
    name: "UC Irvine",
    point: { lat: 33.64295, lon: -117.84016 },
    pointNote: "OSM campus point.",
    sourceId: "osm-nominatim",
  },
]);

export function destination(id: DestinationId): Destination {
  return DESTINATIONS.find((d) => d.id === id)!;
}

export type BuyerStatus = "For sale" | "Planned or approved";
export type OpportunityStatus = BuyerStatus | "Potential site";
export type City = "San Juan Capistrano" | "San Clemente";

export type Contact = {
  /** Organization or office, never a person. */
  label: string;
  phone?: string;
  url: string;
  sourceId: FindSourceId;
};

export type HistoryEntry = { date: string; record: string; text: string; sourceId: FindSourceId };

export type BuyerOpportunity = {
  id: string;
  layer: "buyer";
  name: string;
  address: string;
  city: City;
  status: BuyerStatus;
  point: LatLon;
  pointNote: string;
  /** Listed price, or null when no source publishes one ("Price unpublished"). */
  price: number | null;
  /** Source of the price; must be a listing when price is set. */
  priceSourceId: FindSourceId | null;
  priceNote?: string;
  /** Published monthly HOA dues, or null (Unknown, use the scenario value). */
  hoaMonthly: number | null;
  hoaNote: string;
  /** Published monthly special assessments / Mello-Roos, or null (Unknown). */
  assessmentMonthly: number | null;
  facts: readonly { label: string; value: string }[];
  history: readonly HistoryEntry[];
  buyingStatus: string;
  nextStep: string;
  /** One short action for the list card. */
  todayAction: string;
  questions: readonly string[];
  stationId: Station["id"];
  contacts: readonly Contact[];
  /** HCD income category of the affordable home, when a source says. */
  affordableCategory: string;
  sourceIds: readonly FindSourceId[];
  checkedDate: string;
};

export type TestStatus = "Supported" | "Conflict found" | "Unknown";
export const TEST_STATUSES: readonly TestStatus[] = ["Supported", "Conflict found", "Unknown"];

export type SiteTest = {
  test: string;
  status: TestStatus;
  reason: string;
  sourceIds: readonly FindSourceId[];
  checkedDate: string;
};

export type FutureSite = {
  id: string;
  layer: "future";
  name: string;
  address: string;
  city: City;
  status: "Potential site";
  point: LatLon;
  pointNote: string;
  listing: typeof SAN_CLEMENTE;
  parcel: {
    candidateApn: string;
    caveat: string;
    acresScag: number;
    acresListing: number;
  };
  existingUse: string;
  pathway: { name: string; homesModeled: number; summary: string; sourceIds: readonly FindSourceId[]; alternative: string };
  tests: readonly SiteTest[];
  nextStep: string;
  todayAction: string;
  contacts: readonly Contact[];
  scaleLine: string;
  bridgeLine: string;
  sourceIds: readonly FindSourceId[];
  checkedDate: string;
};

export type Opportunity = BuyerOpportunity | FutureSite;

export const CAMINO_TWELVE: BuyerOpportunity = Object.freeze({
  id: "camino-twelve",
  layer: "buyer",
  name: "Camino Twelve",
  address: "25642 Camino Del Avion, San Juan Capistrano 92675",
  city: "San Juan Capistrano",
  status: "Planned or approved",
  point: { lat: 33.4868, lon: -117.6823 },
  pointNote: "County parcel centroid, APN 668-491-32 (Census Geocoder: 33.48717, −117.68220).",
  price: null,
  priceSourceId: null,
  hoaMonthly: null,
  hoaNote: "HOA dues not published.",
  assessmentMonthly: null,
  facts: Object.freeze([
    { label: "Homes", value: "12 (one affordable under a density bonus agreement)" },
    { label: "Parcel", value: "0.61 acre, APN 668-491-32" },
    { label: "Building type / legal form", value: "Townhomes (2024 record) / condominiums (2026 record)" },
  ]),
  history: Object.freeze([
    {
      date: "2024-08-08",
      record: "SCH 2024080316",
      text: "City Council approved a twelve-unit townhome development on a 0.61-acre parcel (Resolution No. 24-08-06-01).",
      sourceId: "ceqa-2024080316",
    },
    {
      date: "2026-05-07",
      record: "SCH 2026050256",
      text: "Density Bonus Housing Agreement with Camino Twelve, LLC to provide one affordable home in the approved project.",
      sourceId: "ceqa-2026050256",
    },
    {
      date: "2026-10-22",
      record: "SCH 2026100816",
      text: "Final Tract Map for a 12-unit residential condominium development, which allows the homes to be sold individually.",
      sourceId: "ceqa-2026100816",
    },
  ]),
  buyingStatus:
    "Price unpublished. HOA dues, assessments, the sales office, and the affordable-home application window could not be verified as of Nov 7, 2026. The October 2026 final map is the step that allows individual sales.",
  nextStep:
    "Ask the City of San Juan Capistrano planning staff who will administer the affordable home sale and where the application window will be announced.",
  todayAction: "Ask the city about the affordable-home window",
  questions: Object.freeze([
    "Who will administer the affordable home sale, and where will the application window be announced?",
    "What income category and sales price limit apply to the affordable home?",
    "What HOA dues and any special assessments or Mello-Roos are expected?",
  ]),
  stationId: "sjc",
  contacts: Object.freeze([
    {
      label: "City of San Juan Capistrano, Planning Division",
      phone: "949-443-6331",
      url: "https://sanjuancapistrano.gov/216/Planning-Division",
      sourceId: "sjc-dev-services",
    },
    {
      label: "City of San Juan Capistrano, Housing",
      phone: "949-443-6313",
      url: "https://sanjuancapistrano.gov/212/Housing",
      sourceId: "sjc-dev-services",
    },
  ]),
  affordableCategory: "Unknown (the notices do not say)",
  sourceIds: Object.freeze([
    "ceqa-2024080316",
    "ceqa-2026050256",
    "ceqa-2026100816",
    "oc-parcels",
    "sjc-planning",
    "sjc-dev-services",
    "sjc-housing",
  ] as const),
  checkedDate: CHECKED,
}) as BuyerOpportunity;

export const VISTA_PACIFICA: BuyerOpportunity = Object.freeze({
  id: "vista-pacifica-420",
  layer: "buyer",
  name: "Vista Pacifica #420",
  address: "1046 Calle Del Cerro #420, San Clemente 92672",
  city: "San Clemente",
  status: "For sale",
  point: { lat: 33.445712, lon: -117.59795 },
  pointNote: "Matches the OSM building footprint and the listing map (33.445529, −117.598482). The Census geocode lands on a different 1046 Calle del Cerro.",
  price: 475_000,
  priceSourceId: "vista-listing-crmls",
  priceNote: "Listed $475,000 (CRMLS copy, data updated Nov 5, 2026). Older copies showed $495,000.",
  hoaMonthly: 606,
  hoaNote: "$606/mo published: $550/mo primary association + $168/quarter ($56/mo) secondary association.",
  assessmentMonthly: null,
  facts: Object.freeze([
    { label: "Type", value: "Resale condo, 1 bedroom, 608 sq ft, built 1986" },
    { label: "MLS", value: "OC26195508 (Active, listed Sep 11, 2026)" },
    { label: "Special assessments", value: "Unknown" },
  ]),
  history: Object.freeze([
    {
      date: "2026-09-11",
      record: "MLS OC26195508",
      text: "Listed for sale. Earlier copies show $495,000; current copies show $475,000.",
      sourceId: "vista-listing-crmls",
    },
  ]),
  buyingStatus: "For sale (active listing as of the Nov 5, 2026 data date). Special assessments and the current tax bill are unknown.",
  nextStep: "Confirm availability, HOA disclosures, any special assessment and the current tax bill through the listing brokerage.",
  todayAction: "Confirm HOA disclosures with the listing brokerage",
  questions: Object.freeze([
    "Is the home still available at $475,000?",
    "What do the HOA disclosures show for both associations, and is any special assessment pending?",
    "What is the current property tax bill?",
  ]),
  stationId: "sc",
  contacts: Object.freeze([
    {
      label: "Listing brokerage (via the listing page)",
      url: "https://marjorietakacs.firstteam.com/home-search/listings/3231452273199411278-1046-Calle-Del-Cerro-420",
      sourceId: "vista-listing-crmls",
    },
  ]),
  affordableCategory: "Not an affordable (deed-restricted) home: market-rate resale",
  sourceIds: Object.freeze([
    "vista-listing-crmls",
    "vista-listing-claw",
    "vista-listing-era",
    "vista-listing-redfin",
    "osm-nominatim",
  ] as const),
  checkedDate: CHECKED,
}) as BuyerOpportunity;

export const AVENIDA_SAN_JUAN: FutureSite = Object.freeze({
  id: "504-e-avenida-san-juan",
  layer: "future",
  name: "504 E Avenida San Juan",
  address: "504 E Avenida San Juan, San Clemente 92672",
  city: "San Clemente",
  status: "Potential site",
  point: { lat: 33.42212, lon: -117.60095 },
  pointNote:
    "Centroid of the candidate parcel APN 690-182-12 (not confirmed). The Census Geocoder puts the address at 33.42381, −117.60178, among 1965-built homes.",
  listing: SAN_CLEMENTE,
  parcel: {
    candidateApn: "690-182-12",
    caveat:
      "No county parcel carries this address. APN 690-182-12 (\"ADDRESS NOT AVAILABLE\") is a lead matched by size and location only. Confirm it with the County Assessor, the City or the listing before relying on any parcel test.",
    acresScag: 2.861,
    acresListing: 2.82,
  },
  existingUse:
    "SCAG 2024 land-use code 1800, which SCAG's legend defines as Open Space and Recreation. The listing calls it land for sale.",
  pathway: {
    name: "SB 9 urban lot split + two units per lot",
    homesModeled: 4,
    summary:
      "On a lot zoned single-family in an urbanized area, SB 9 allows a split into two lots of roughly equal size and two units on each resulting lot. The owner-occupancy affidavit does not apply when the applicant is a nonprofit or community land trust. Decision within 60 days of a complete application.",
    sourceIds: Object.freeze(["hcd-sb9"] as const),
    alternative:
      "The listing claims a prior approval for division into 4 parcels (a standard subdivision map). Whether it is still valid is Unknown.",
  },
  tests: Object.freeze([
    {
      test: "Publicly offered",
      status: "Supported",
      reason: "Active land listing, $5.9M asking, 2.82 ac (listing data dated 9/28/2026; still active on Nov 7).",
      sourceIds: ["listing-504-avenida-san-juan"],
      checkedDate: CHECKED,
    },
    {
      test: "Parcel identity",
      status: "Unknown",
      reason: "No county parcel carries this address; candidate APN 690-182-12 matched by size and location only.",
      sourceIds: ["oc-parcels", "census-geocoder", "scag-zoning"],
      checkedDate: CHECKED,
    },
    {
      test: "Zoned single-family (SB 9 entry test)",
      status: "Unknown",
      reason: "SCAG 2024 record shows RL on the candidate. Confirm that San Clemente's RL zone is a single-family residential zone (city zoning code).",
      sourceIds: ["scag-zoning", "scag-general-plan"],
      checkedDate: CHECKED,
    },
    {
      test: "Fire hazard",
      status: "Conflict found",
      reason: "County LRA layer: Very High Fire Hazard Severity Zone at the candidate; layer date not stated.",
      sourceIds: ["oc-fhsz-lra"],
      checkedDate: CHECKED,
    },
    {
      test: "SB 9 hazard exclusions",
      status: "Unknown",
      reason: "Excluded lands are listed in Gov. Code 65913.4(a)(6)(B)–(K); that text has not been read. HCD says some cities have misapplied the fire exclusion.",
      sourceIds: ["hcd-sb9", "gov-65913-4"],
      checkedDate: CHECKED,
    },
    {
      test: "Flood",
      status: "Supported",
      reason: "FEMA NFHL Zone X (minimal flood hazard) at one interior point; check the whole boundary.",
      sourceIds: ["fema-nfhl"],
      checkedDate: CHECKED,
    },
    {
      test: "Slope",
      status: "Unknown",
      reason: "SCAG SLOPE field = 20, units not documented. The listing says \"panoramic ocean-view\", so expect grading questions.",
      sourceIds: ["scag-zoning", "listing-504-avenida-san-juan"],
      checkedDate: CHECKED,
    },
    {
      test: "Existing use",
      status: "Conflict found",
      reason: "SCAG land-use code 1800 = Open Space and Recreation (SCAG legend), but the listing offers it as land for sale. Ask whether any open-space designation or easement applies.",
      sourceIds: ["scag-existing-land-use", "scag-lu-legend", "listing-504-avenida-san-juan"],
      checkedDate: CHECKED,
    },
    {
      test: "Prior 4-parcel approval",
      status: "Unknown",
      reason: "Listing claim only; no city record found.",
      sourceIds: ["listing-504-avenida-san-juan"],
      checkedDate: CHECKED,
    },
    {
      test: "Utilities and access",
      status: "Unknown",
      reason: "The listing says utilities are \"easily accessible\" (listing claim); no utility record checked.",
      sourceIds: ["listing-504-avenida-san-juan"],
      checkedDate: CHECKED,
    },
    {
      test: "Owner willingness and terms",
      status: "Unknown",
      reason: "Listed for sale at asking; nonprofit terms, donation or bargain sale unknown. No owner contact made.",
      sourceIds: ["listing-504-avenida-san-juan"],
      checkedDate: CHECKED,
    },
    {
      test: "Not already a housing-element site",
      status: "Supported",
      reason: "SCAG housing-element site layer returns nothing at the candidate.",
      sourceIds: ["scag-housing-element-sites"],
      checkedDate: CHECKED,
    },
  ] satisfies SiteTest[]),
  nextStep:
    "Ask the City of San Clemente Planning Division to confirm the APN, whether RL is a single-family zone for SB 9, how the Very High fire zone affects an SB 9 split here, why SCAG codes the parcel as open space, and whether the 4-parcel approval is still active.",
  todayAction: "Ask San Clemente Planning to confirm the APN and zone",
  contacts: Object.freeze([
    {
      label: "City of San Clemente, Planning Division",
      url: "https://www.sanclemente.gov/240/Planning-Services",
      sourceId: "sanclemente-planning",
    },
  ]),
  scaleLine:
    "Homes modeled: 4 (ASSUMPTION: SB 9 split, two units per lot; also the listing's 4-parcel claim). The SCAG general-plan maximum of 4.5 du/ac × 2.86 ac is about 12.9; that is a ceiling from a regional dataset, not a yield.",
  bridgeLine: "Pencil: even with donated land, 4 homes here still need about $941,157.",
  sourceIds: Object.freeze([
    "listing-504-avenida-san-juan",
    "oc-parcels",
    "census-geocoder",
    "scag-zoning",
    "scag-general-plan",
    "scag-existing-land-use",
    "scag-lu-legend",
    "oc-fhsz-lra",
    "fema-nfhl",
    "scag-housing-element-sites",
    "hcd-sb9",
    "gov-65913-4",
    "sanclemente-planning",
  ] as const),
  checkedDate: CHECKED,
}) as FutureSite;

export const OPPORTUNITIES: readonly Opportunity[] = Object.freeze([CAMINO_TWELVE, VISTA_PACIFICA, AVENIDA_SAN_JUAN]);

export function opportunity(id: string): Opportunity | undefined {
  return OPPORTUNITIES.find((o) => o.id === id);
}

export type Guidance = { id: string; label: string; url: string; text: string; sourceId: FindSourceId; backupUrl?: string };

export const GUIDANCE: readonly Guidance[] = Object.freeze([
  {
    id: "habitat",
    label: "Explore Habitat OC homeownership",
    url: "https://habitatoc.org/attend-an-orientation/",
    text: "Orientation is the first step for Habitat OC's own homeownership program. Habitat OC does not finance the homes on this map.",
    sourceId: "habitat-oc-orientation",
  },
  {
    id: "counselor",
    label: "Find a housing counselor",
    url: "https://www.consumerfinance.gov/find-a-housing-counselor/?zipcode=92675",
    backupUrl: "https://www.hud.gov/findacounselor",
    text: "Search HUD-approved housing counseling agencies for free or low-cost help reviewing your budget and financing options.",
    sourceId: "cfpb-counselor",
  },
]);

export const ASK_TEXT = "For questions about sales, pricing, or an affordable-home application window.";
