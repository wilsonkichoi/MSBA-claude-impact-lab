/**
 * FIND_IT.md §3.6: commute without a routing API.
 * Drive: straight-line miles and links only, never a time.
 * Transit: a cached weekday timetable example (checked Nov 7, 2026), or the route-unavailable state.
 */

import { haversineMiles } from "./finance";
import { destination, station, type DestinationId, type LatLon, type Station } from "./data";
import { CHECKED, type FindSourceId } from "./sources";

export type Mode = "drive" | "transit";

/** ASSUMPTION: minutes to get from home to the station. */
export const ACCESS_MINUTES = 15;
/** ASSUMPTION: minutes to arrive early and board. */
export const BOARD_MINUTES = 10;
/** ASSUMPTION: minutes from the last stop to the workplace. */
export const EGRESS_MINUTES = 10;

export type Leg = {
  kind: "rail" | "bus";
  label: string;
  from: string;
  depart: string;
  to: string;
  arrive: string;
  minutes: number;
  sourceId: FindSourceId;
  note?: string;
};

export type CachedExample = {
  fromStation: Station["id"];
  to: DestinationId;
  legs: readonly Leg[];
  /** Scheduled wait between legs (minutes). */
  transferMinutes: number;
};

/** Minutes between two "H:MM" a.m. times on the same morning. */
export function minutesBetween(depart: string, arrive: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h! * 60 + m!;
  };
  return toMin(arrive) - toMin(depart);
}

function rail(fromName: string, depart: string, toName: string, arrive: string): Leg {
  return {
    kind: "rail",
    label: "Metrolink Orange County Line, train 603",
    from: fromName,
    depart,
    to: toName,
    arrive,
    minutes: minutesBetween(depart, arrive),
    sourceId: "metrolink-oc-line",
  };
}

const BUS_473: Leg = {
  kind: "bus",
  label: "OCTA Route 473",
  from: "Tustin Station",
  depart: "6:23",
  to: "UCI University Center",
  arrive: "6:41",
  minutes: minutesBetween("6:23", "6:41"),
  sourceId: "octa-473",
  note: "OCTA marks these times approximate; morning buses leave once the train arrives.",
};

/** Cached weekday examples (a.m.). Train 603 times and Route 473 times checked against the published timetables. */
export const CACHED_EXAMPLES: readonly CachedExample[] = Object.freeze([
  { fromStation: "sjc", to: "irvine-station", legs: [rail("San Juan Capistrano", "5:56", "Irvine", "6:12")], transferMinutes: 0 },
  {
    fromStation: "sjc",
    to: "uci",
    legs: [rail("San Juan Capistrano", "5:56", "Tustin", "6:20"), BUS_473],
    transferMinutes: minutesBetween("6:20", "6:23"),
  },
  { fromStation: "sc", to: "irvine-station", legs: [rail("San Clemente", "5:44", "Irvine", "6:12")], transferMinutes: 0 },
  {
    fromStation: "sc",
    to: "uci",
    legs: [rail("San Clemente", "5:44", "Tustin", "6:20"), BUS_473],
    transferMinutes: minutesBetween("6:20", "6:23"),
  },
]);

export const ROUTE_CHECKED = CHECKED;

export type CommuteResult =
  | {
      kind: "drive";
      /** Straight-line, not a driving distance. */
      straightLineMiles: number;
      directionsUrl: string;
      quickMapUrl: string;
      /** Always null: no time is ever shown for driving. */
      minutes: null;
    }
  | {
      kind: "transit";
      station: Station;
      homeToStationMiles: number;
      legs: readonly Leg[];
      transferMinutes: number;
      /** First departure to last arrival, from the timetable. */
      stationToStationMinutes: number;
      /** ASSUMPTION scenario: access + board + timetable + egress. */
      doorToDoorMinutes: number;
      allowances: { access: number; board: number; egress: number };
      checkedDate: string;
    }
  | {
      kind: "unavailable";
      straightLineMiles: number;
      tripPlannerUrl: string;
      message: string;
    };

export function directionsUrl(from: LatLon, to: LatLon): string {
  const p = (x: LatLon) => `${x.lat},${x.lon}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(p(from))}&destination=${encodeURIComponent(p(to))}&travelmode=driving`;
}

export const TRIP_PLANNER_URL = "https://octa.net/getting-around/trip-planner/trip-planner";
export const QUICKMAP_URL = "https://quickmap.dot.ca.gov/";
export const METROLINK_URL = "https://metrolinktrains.com/schedules/?lineName=Orange+County+Line&type=line";

export function findCachedExample(stationId: Station["id"] | null, to: DestinationId): CachedExample | null {
  if (!stationId) return null;
  return CACHED_EXAMPLES.find((c) => c.fromStation === stationId && c.to === to) ?? null;
}

export function commute(
  home: LatLon,
  stationId: Station["id"] | null,
  to: DestinationId,
  mode: Mode,
  examples: readonly CachedExample[] = CACHED_EXAMPLES,
): CommuteResult {
  const dest = destination(to);
  const straightLineMiles = haversineMiles(home, dest.point);
  if (mode === "drive") {
    return {
      kind: "drive",
      straightLineMiles,
      directionsUrl: directionsUrl(home, dest.point),
      quickMapUrl: QUICKMAP_URL,
      minutes: null,
    };
  }
  const ex = stationId ? (examples.find((c) => c.fromStation === stationId && c.to === to) ?? null) : null;
  if (!ex || !stationId) {
    return {
      kind: "unavailable",
      straightLineMiles,
      tripPlannerUrl: TRIP_PLANNER_URL,
      message: "No cached route for this trip.",
    };
  }
  const st = station(stationId);
  const first = ex.legs[0]!;
  const last = ex.legs[ex.legs.length - 1]!;
  const stationToStationMinutes = minutesBetween(first.depart, last.arrive);
  return {
    kind: "transit",
    station: st,
    homeToStationMiles: haversineMiles(home, st.point),
    legs: ex.legs,
    transferMinutes: ex.transferMinutes,
    stationToStationMinutes,
    doorToDoorMinutes: ACCESS_MINUTES + BOARD_MINUTES + stationToStationMinutes + EGRESS_MINUTES,
    allowances: { access: ACCESS_MINUTES, board: BOARD_MINUTES, egress: EGRESS_MINUTES },
    checkedDate: CHECKED,
  };
}

/** On the OC Line weekday timetable checked Nov 7, only trains 601 and 603 stop at SJC / San Clemente in the morning toward Irvine. */
export const MORNING_TRAIN_NOTE =
  "On the Orange County Line weekday timetable, only two morning trains toward Irvine stop at San Clemente and San Juan Capistrano (601 and 603). Other Metrolink lines were not checked.";
