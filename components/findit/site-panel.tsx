"use client";

/** FIND_IT.md §3.4 / §4: "Why investigate this site?" for the acquisitions lead. Never says buy, apply or price per home. */

import Link from "next/link";
import type { FutureSite, TestStatus } from "@/lib/findit/data";
import { FIND_SOURCES, type FindSourceId } from "@/lib/findit/sources";
import { formatLongDate, formatUSDWhole } from "@/lib/format";
import { Assumption, SourceLinks } from "./bits";

const STATUS_STYLE: Record<TestStatus, string> = {
  Supported: "bg-[#e6efe3] text-[#24421f] ring-[#b9cfb2]",
  "Conflict found": "bg-[#f6e0d9] text-[#6e2416] ring-[#e1b2a4]",
  Unknown: "bg-[#efe9dc] text-[#4e4033] ring-[#d9ccb4]",
};

const STATUS_MARK: Record<TestStatus, string> = { Supported: "✓", "Conflict found": "!", Unknown: "?" };

export function SiteStatus({ status }: { status: TestStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_STYLE[status]}`}>
      <span aria-hidden="true">{STATUS_MARK[status]}</span>
      {status}
    </span>
  );
}

export function SitePanel({ site }: { site: FutureSite }) {
  const counts = site.tests.reduce<Record<TestStatus, number>>(
    (acc, t) => ({ ...acc, [t.status]: acc[t.status] + 1 }),
    { Supported: 0, "Conflict found": 0, Unknown: 0 },
  );
  const l = site.listing;
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-[#2b1d14] px-3 py-2 text-sm font-semibold text-[#fffdf8]">
        Not for sale to buyers: a site for a nonprofit to investigate.
      </p>

      <section aria-labelledby="why-h">
        <h3 id="why-h" className="atlas-serif text-lg font-semibold">
          Why investigate this site?
        </h3>
        <p className="mt-1 text-sm">
          Listed land, {l.lotAcres} acres, {formatUSDWhole(l.askingPrice)} asking (listing data {formatLongDate(l.dataLastUpdated)}). Under{" "}
          <strong>{site.pathway.name}</strong>, {site.pathway.homesModeled} homes <Assumption />.
        </p>
        <p className="mt-1 text-xs text-[#6b5a4c]">
          {counts.Supported} supported · {counts["Conflict found"]} conflicts · {counts.Unknown} unknown
        </p>
      </section>

      <section aria-labelledby="parcel-h" className="rounded-md border border-[#d9ccb4] bg-[#fffaf0] p-3">
        <h4 id="parcel-h" className="text-sm font-semibold">
          Parcel source
        </h4>
        <p className="mt-1 text-sm">
          Candidate APN <strong className="atlas-num">{site.parcel.candidateApn}</strong> (SCAG {site.parcel.acresScag} ac; listing {site.parcel.acresListing} ac).
        </p>
        <p className="mt-1 text-sm text-[#6e2416]">{site.parcel.caveat}</p>
        <p className="mt-2 text-sm">
          <span className="font-semibold">Existing use:</span> {site.existingUse}
        </p>
        <SourceLinks ids={["oc-parcels", "scag-zoning", "scag-existing-land-use", "scag-lu-legend"]} />
      </section>

      <section aria-labelledby="path-h">
        <h4 id="path-h" className="text-sm font-semibold">
          Pathway: {site.pathway.name}
        </h4>
        <p className="mt-1 text-sm">{site.pathway.summary}</p>
        <p className="mt-1 text-sm text-[#6b5a4c]">Also: {site.pathway.alternative}</p>
        <SourceLinks ids={site.pathway.sourceIds} />
      </section>

      <section aria-labelledby="tests-h">
        <h4 id="tests-h" className="text-sm font-semibold">
          Site tests
        </h4>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Each test with its status, reason, source and check date</caption>
            <thead>
              <tr className="border-b border-[#d9ccb4] text-xs uppercase tracking-wider text-[#6b5a4c]">
                <th scope="col" className="py-1.5 pr-2">
                  Test
                </th>
                <th scope="col" className="py-1.5 pr-2">
                  Status
                </th>
                <th scope="col" className="py-1.5">
                  Reason · source · checked
                </th>
              </tr>
            </thead>
            <tbody>
              {site.tests.map((t) => (
                <tr key={t.test} className="border-b border-[#ece3d1] align-top">
                  <th scope="row" className="py-2 pr-2 font-semibold">
                    {t.test}
                  </th>
                  <td className="py-2 pr-2">
                    <SiteStatus status={t.status} />
                  </td>
                  <td className="py-2">
                    <p>{t.reason}</p>
                    <p className="mt-0.5 text-xs text-[#6b5a4c]">
                      {t.sourceIds.map((id: FindSourceId, i: number) => (
                        <span key={id}>
                          {i > 0 && " · "}
                          <a className="underline underline-offset-2" href={FIND_SOURCES[id].url} target="_blank" rel="noreferrer">
                            {shortTitle(FIND_SOURCES[id].title)}
                          </a>
                        </span>
                      ))}{" "}
                      · checked {formatLongDate(t.checkedDate)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="next-h" className="rounded-md border border-[#8a6a2f] bg-[#fffaf0] p-3">
        <h4 id="next-h" className="text-sm font-semibold">
          Next verification step
        </h4>
        <p className="mt-1 text-sm">{site.nextStep}</p>
        {site.contacts.map((c) => (
          <p key={c.url} className="mt-1 text-sm">
            <a className="font-semibold underline underline-offset-2" href={c.url} target="_blank" rel="noreferrer">
              {c.label}
            </a>
          </p>
        ))}
      </section>

      <section aria-labelledby="scale-h">
        <h4 id="scale-h" className="text-sm font-semibold">
          Scale
        </h4>
        <p className="mt-1 text-sm">{site.scaleLine}</p>
      </section>

      <div className="rounded-md bg-[#2b1d14] p-3 text-[#fffdf8]">
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-[#e9d9b4] px-3 py-2 text-sm font-bold text-[#2b1d14] hover:bg-[#f3e7c9]"
        >
          Does it pencil? Open in Pencil →
        </Link>
        <p className="mt-2 text-sm">{site.bridgeLine}</p>
      </div>
    </div>
  );
}

function shortTitle(t: string): string {
  return t.length > 48 ? `${t.slice(0, 46)}…` : t;
}
