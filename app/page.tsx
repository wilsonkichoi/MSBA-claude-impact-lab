import type { Metadata } from "next";
import { FinanceApp } from "@/components/finance/finance-app";
import { SectionNav } from "@/components/section-nav";
import { parseFinanceParams, type SearchParams } from "@/lib/buyer-finance";

export const metadata: Metadata = {
  title: "Finance — close the gap (demo)",
  description:
    "Pick a home, see the gap between its monthly cost and your budget, and stack down-payment assistance programs to close it. Hackathon prototype.",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const initial = parseFinanceParams(await searchParams);
  return (
    <>
      <SectionNav current="finance" />
      {/* key: a new link from Find it starts a fresh plan. */}
      <FinanceApp key={JSON.stringify(initial)} {...initial} />
    </>
  );
}
