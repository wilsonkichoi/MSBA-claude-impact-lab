"use client";

/** Small shared pieces for /find: ASSUMPTION chip, source links with dates, status tag. */

import type { OpportunityStatus } from "@/lib/findit/data";
import { FIND_SOURCES, findSourceDateLabel, type FindSourceId } from "@/lib/findit/sources";
import { formatLongDate } from "@/lib/format";
import { PinShape } from "./atlas-map";

export function Assumption({ title }: { title?: string }) {
  return (
    <span
      title={title ?? "Assumed number, not from a source. Editable."}
      className="inline-block rounded bg-[#efe3c4] px-1 py-px align-middle text-[10px] font-bold uppercase tracking-wider text-[#5c4515] ring-1 ring-[#d8c18a]"
    >
      ASSUMPTION
    </span>
  );
}

export function SourceChip({ id }: { id: FindSourceId }) {
  const s = FIND_SOURCES[id];
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      title={`${s.title}. ${findSourceDateLabel(s)}. Checked ${formatLongDate(s.checkedDate)}.`}
      className="inline-block rounded bg-[#e8eef2] px-1 py-px align-middle text-[10px] font-bold uppercase tracking-wider text-[#2f4250] ring-1 ring-[#c3d0d9] hover:underline"
    >
      Source
    </a>
  );
}

export function SourceLinks({ ids, heading }: { ids: readonly FindSourceId[]; heading?: string }) {
  return (
    <div className="mt-2">
      {heading && <p className="text-xs font-semibold uppercase tracking-wider text-[#6b5a4c]">{heading}</p>}
      <ul className="mt-1 space-y-1 text-xs text-[#6b5a4c]">
        {ids.map((id) => {
          const s = FIND_SOURCES[id];
          return (
            <li key={id}>
              <a className="font-medium text-[#2b1d14] underline underline-offset-2" href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              {" · "}
              {findSourceDateLabel(s)} · checked {formatLongDate(s.checkedDate)}
              {s.searchOnly && " · seen in search results / not read in full"}
              {s.secondary && " · secondary copy"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatusTag({ status }: { status: OpportunityStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9ccb4] bg-[#fffdf8] px-2 py-0.5 text-xs font-semibold">
      <PinShape status={status} />
      {status}
    </span>
  );
}
