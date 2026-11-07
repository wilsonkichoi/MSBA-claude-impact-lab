/**
 * Every source the Find it map cites (FIND_IT.md §3). Same idea as lib/fundit/sources.ts:
 * URL, the date that applies to the document (and what kind of date), and the date we checked it.
 * Static snapshot. Never fetched at runtime.
 */

import { SOURCES as FUNDIT_SOURCES } from "@/lib/fundit/sources";

export type FindDateKind =
  | "filed"
  | "effective"
  | "data last updated"
  | "fact sheet dated"
  | "week of"
  | "memo dated"
  | "not stated";

export type FindSource = {
  id: string;
  title: string;
  url: string;
  /** ISO date that applies to the document itself, or null (shown as "Unknown"). */
  date: string | null;
  dateKind: FindDateKind;
  /** Text for a date that is not a full calendar date (e.g. "April 2026"). */
  dateText?: string;
  /** ISO date someone on the team read or queried it. */
  checkedDate: string;
  note: string;
  /** True when seen only in search results, not read in full. */
  searchOnly?: boolean;
  /** True for secondary sources (copies, mirrors, aggregators). */
  secondary?: boolean;
};

export const CHECKED = "2026-11-07";

const list = [
  // Camino Twelve (§3.2)
  {
    id: "ceqa-2024080316",
    title: "CEQAnet SCH 2024080316, Notice of Exemption (City of San Juan Capistrano)",
    url: "https://ceqanet.lci.ca.gov/2024080316",
    date: "2024-08-08",
    dateKind: "filed",
    checkedDate: CHECKED,
    note: "City Council approval of a twelve-unit townhome development on a 0.61-acre parcel (AC 23-008, GPM 23-020, TRP 23-024, VTTM 23-002).",
  },
  {
    id: "ceqa-2026050256",
    title: "CEQAnet SCH 2026050256, Notice of Exemption (Density Bonus Housing Agreement)",
    url: "https://ceqanet.lci.ca.gov/2026050256",
    date: "2026-05-07",
    dateKind: "filed",
    checkedDate: CHECKED,
    note: "Agreement with Camino Twelve, LLC to provide one affordable housing unit in the approved twelve-unit project.",
  },
  {
    id: "ceqa-2026100816",
    title: "CEQAnet SCH 2026100816, Notice of Exemption (Final Tract Map)",
    url: "https://ceqanet.lci.ca.gov/2026100816",
    date: "2026-10-22",
    dateKind: "filed",
    checkedDate: CHECKED,
    note: "Final Tract Map for a 12-unit residential condominium development, to allow individual sales of the units. Lists APN 668-491-32.",
  },
  {
    id: "sjc-planning",
    title: "City of San Juan Capistrano, Planning Division",
    url: "https://sanjuancapistrano.gov/216/Planning-Division",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "The city moved from sanjuancapistrano.org to sanjuancapistrano.gov. Page lists the Planning Division phone 949-443-6331; counter by appointment.",
  },
  {
    id: "sjc-dev-services",
    title: "City of San Juan Capistrano, Development Services (division contacts)",
    url: "https://sanjuancapistrano.gov/176/Development-Services",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Lists office phones: Planning Division 949-443-6331, Housing 949-443-6313.",
  },
  {
    id: "sjc-housing",
    title: "City of San Juan Capistrano, Housing",
    url: "https://sanjuancapistrano.gov/212/Housing",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "City housing programs page, with a first-time home buyer program list (PDF). No Camino Twelve sale information found.",
  },
  {
    id: "census-geocoder",
    title: "U.S. Census Geocoder (onelineaddress, Public_AR_Current)",
    url: "https://geocoding.geo.census.gov/geocoder/",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Street-address interpolation. Used for station points and as a cross-check.",
  },
  {
    id: "osm-nominatim",
    title: "OpenStreetMap Nominatim search",
    url: "https://nominatim.openstreetmap.org/",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Irvine Station (railway station node), UC Irvine (campus), 1046 Calle del Cerro (apartment building footprint).",
  },
  {
    id: "oc-parcels",
    title: "OC Public Works GIS, Parcels FeatureServer",
    url: "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Parcels/FeatureServer",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Two polygons carry APN 668-491-32. No parcel carries the address 504 E Avenida San Juan.",
  },
  // Vista Pacifica (§3.3)
  {
    id: "vista-listing-crmls",
    title: "Listing copy (CRMLS via First Team), 1046 Calle Del Cerro #420, MLS# OC26195508",
    url: "https://marjorietakacs.firstteam.com/home-search/listings/3231452273199411278-1046-Calle-Del-Cerro-420",
    date: "2026-11-05",
    dateKind: "data last updated",
    checkedDate: CHECKED,
    note: "Active, listed Sep 11, 2026, $475,000, 1 bed, 608 sq ft, built 1986. Secondary association fee $168 per quarter.",
    secondary: true,
  },
  {
    id: "vista-listing-claw",
    title: "Listing copy (CLAW via Canyonhaus), 1046 Calle Del Cerro #420",
    url: "https://canyonhaus.com/home-search/listings/1827934056164196275-1046-Calle-Del-Cerro-Unit-420",
    date: "2026-10-30",
    dateKind: "data last updated",
    checkedDate: CHECKED,
    note: "Active, $475,000. Listing map point 33.445529, -117.598482.",
    secondary: true,
  },
  {
    id: "vista-listing-era",
    title: "Listing copy (CRMLS via ERA Brokers), 1046 Calle Del Cerro 420",
    url: "https://erabrokers.com/real-estate/property/2879964/1046-calle-del-cerro-420-san-clemente-ca",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "HOA fee $550.00 monthly (primary association). Search snippets for this page and Realtor.com showed $495,000, an earlier price. MLS change date not supplied.",
    secondary: true,
  },
  {
    id: "vista-listing-redfin",
    title: "Redfin, 1046 Calle Del Cerro #420 (Brianna's source)",
    url: "https://www.redfin.com/CA/San-Clemente/1046-Calle-del-Cerro-92672/unit-420/home/5201350",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Returned HTTP 403 to our check; Brianna's site read $475,000 and HOA $606 (two associations) here on Nov 7.",
    searchOnly: true,
    secondary: true,
  },
  // Stations and commute (§3.1, §3.6)
  {
    id: "metrolink-oc-line",
    title: "Metrolink Orange County Line schedule (Monday–Friday)",
    url: "https://metrolinktrains.com/schedules/?lineName=Orange+County+Line&type=line",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Train 603: San Clemente 5:44, San Juan Capistrano 5:56, Laguna Niguel/Mission Viejo 6:02, Irvine 6:12, Tustin 6:20 a.m. Timetable, not live.",
  },
  {
    id: "octa-473",
    title: "OCTA Route 473, Tustin Metrolink Station to U.C.I. (Monday–Friday)",
    url: "https://octa.net/ebusbook/RoutePDF/route473.pdf",
    date: "2026-08-09",
    dateKind: "effective",
    checkedDate: CHECKED,
    note: "Southbound 6:23 Tustin → 6:29 Harvard & Alton → 6:41 University Center (times marked approximate). The November 2026 bus book URL returned 404.",
  },
  {
    id: "octa-trip-planner",
    title: "OCTA trip planner",
    url: "https://octa.net/getting-around/trip-planner/trip-planner",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Official trip planner for any trip without a cached example.",
  },
  {
    id: "caltrans-quickmap",
    title: "Caltrans QuickMap (live traffic)",
    url: "https://quickmap.dot.ca.gov/",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Live conditions. We never turn miles into a drive time.",
  },
  // Future site (§3.4)
  {
    id: "scag-zoning",
    title: "SCAG LDX Zoning_poly_OR (2024)",
    url: "https://maps.scag.ca.gov/scaggis/rest/services/LDX/Zoning_poly_OR/MapServer/0",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "At the candidate parcel: APN24 69018212, ZN24_CITY RL, ACRES 2.861, SLOPE 20 (units not documented), YEAR 2024.",
  },
  {
    id: "scag-general-plan",
    title: "SCAG LDX GeneralPlan_poly_OR",
    url: "https://maps.scag.ca.gov/scaggis/rest/services/LDX/GeneralPlan_poly_OR/MapServer/0",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "GP24_CITY RL, DEN_MAX 4.5 du/acre at the candidate parcel.",
  },
  {
    id: "scag-existing-land-use",
    title: "SCAG LDX Existinglanduse_poly_OR (2024 annual land use)",
    url: "https://maps.scag.ca.gov/scaggis/rest/services/LDX/Existinglanduse_poly_OR/MapServer/0",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "LU24 = 1800 at the candidate parcel.",
  },
  {
    id: "scag-lu-legend",
    title: "SCAG land use codes legend (2016)",
    url: "https://maps.scag.ca.gov/2016LandUseCodesLegend.pdf",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Code 1800 = Open Space and Recreation. The legend is the 2016 edition; the layer is 2024.",
  },
  {
    id: "scag-housing-element-sites",
    title: "SCAG LDX HousingElementSite_poly_scag",
    url: "https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "No housing-element site at the candidate centroid.",
  },
  {
    id: "oc-fhsz-lra",
    title: "OC GIS, Fire Hazard Severity Zones (LRA)",
    url: "https://www.ocgis.com/arcpub/rest/services/Map_Layers/Fire_Hazard_Severity_Zones_LRA/MapServer/0",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "HAZ_CLASS Very High, LRA, incorporated, at the geocoded point and the candidate. Layer gives no map vintage; CAL FIRE's LRA map effective 2025 was not checked.",
  },
  {
    id: "fema-nfhl",
    title: "FEMA National Flood Hazard Layer, flood hazard zones (layer 28)",
    url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Zone X, area of minimal flood hazard, SFHA false, at one interior point of the candidate.",
  },
  {
    id: "hcd-sb9",
    title: "HCD fact sheet, Duplexes and Lot Splits (SB 9)",
    url: "https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/lot-splits-and-duplexes-sb-9.pdf",
    date: null,
    dateText: "April 2026",
    dateKind: "fact sheet dated",
    checkedDate: CHECKED,
    note: "Gov. Code §§ 65852.21, 66411.7. Paraphrased: single-family zone in an urbanized area; two units per resulting lot; owner-occupancy affidavit does not apply to a nonprofit or community land trust; hazard exclusions by reference to 65913.4(a)(6)(B)–(K).",
  },
  {
    id: "gov-65913-4",
    title: "Gov. Code § 65913.4 (site exclusions referenced by SB 9)",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65913.4",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "NOT READ: leginfo blocks automated fetch, and SB 9 uses the text as of Sept 16, 2021. Read it in a browser before deciding the fire test.",
  },
  {
    id: "sanclemente-planning",
    title: "City of San Clemente, Planning Services",
    url: "https://www.sanclemente.gov/240/Planning-Services",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Asks for email inquiries with the property address. Hours Mon–Thu 7:30–5:30, Fri 8–5.",
  },
  // Guidance (§3.7)
  {
    id: "habitat-oc-orientation",
    title: "Habitat for Humanity of Orange County, attend an orientation",
    url: "https://habitatoc.org/attend-an-orientation/",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "First step for Habitat OC's own homeownership program.",
  },
  {
    id: "cfpb-counselor",
    title: "CFPB, Find a housing counselor (ZIP 92675)",
    url: "https://www.consumerfinance.gov/find-a-housing-counselor/?zipcode=92675",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Searches HUD-approved housing counseling agencies. Backup: https://www.hud.gov/findacounselor (HTTP 200 on Nov 7).",
  },
  {
    id: "osm-copyright",
    title: "OpenStreetMap copyright and tile usage",
    url: "https://www.openstreetmap.org/copyright",
    date: null,
    dateKind: "not stated",
    checkedDate: CHECKED,
    note: "Map tiles © OpenStreetMap contributors. Only runtime request in this feature.",
  },
] as const satisfies readonly FindSource[];

/** Pencil sources reused as-is (not duplicated). */
const REUSED = ["listing-504-avenida-san-juan", "hcd-state-2026", "pmms", "hud-housing-counseling"] as const;

export type FindSourceId = (typeof list)[number]["id"] | (typeof REUSED)[number];

function fromFundit(id: (typeof REUSED)[number]): FindSource {
  const s = FUNDIT_SOURCES[id];
  const kind: FindDateKind =
    s.dateKind === "memo dated" || s.dateKind === "effective" || s.dateKind === "data last updated" || s.dateKind === "week of"
      ? s.dateKind
      : "not stated";
  return { id: s.id, title: s.title, url: s.url, date: s.date, dateKind: kind, checkedDate: s.checkedDate, note: s.note };
}

export const FIND_SOURCES: Readonly<Record<FindSourceId, FindSource>> = Object.freeze(
  Object.fromEntries([
    ...list.map((s) => [s.id, Object.freeze({ ...s })] as const),
    ...REUSED.map((id) => [id, Object.freeze(fromFundit(id))] as const),
  ]) as Record<FindSourceId, FindSource>,
);

export const FIND_SOURCE_LIST: readonly FindSource[] = Object.freeze(Object.values(FIND_SOURCES));

export function findSourceDateLabel(s: FindSource): string {
  const d = s.date ?? s.dateText;
  if (s.dateKind === "not stated" || !d) return "Document date: Unknown";
  return `${s.dateKind[0]!.toUpperCase()}${s.dateKind.slice(1)} ${d}`;
}
