import type { Metadata } from "next";
import { AtlasApp } from "@/components/findit/atlas-app";
import { SectionNav } from "@/components/section-nav";

export const metadata: Metadata = {
  title: "South OC Home Atlas (Find it demo)",
  description:
    "Where could a home go in South OC? A buyer layer with dated listing and city records, and a future-sites layer with yes / no / unknown site tests. Hackathon prototype.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <SectionNav current="find" />
      <AtlasApp />
    </>
  );
}
