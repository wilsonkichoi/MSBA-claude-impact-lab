import type { Metadata } from "next";
import { PencilApp } from "@/components/fundit/pencil-app";
import { SectionNav } from "@/components/section-nav";

export const metadata: Metadata = {
  title: "Pencil — What would it take? (Fund it demo)",
  description:
    "Funding-gap check for one listed OC site: what families can pay, what stays unfunded, what to verify first, and which sources really apply. Hackathon prototype.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <SectionNav current="fund" />
      <PencilApp />
    </>
  );
}
