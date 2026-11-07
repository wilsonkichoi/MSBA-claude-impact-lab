import { HomeStayApp } from "@/components/homestay-app";
import { SectionNav } from "@/components/section-nav";

export default function Page() {
  return (
    <>
      <SectionNav current="stay" />
      <HomeStayApp />
    </>
  );
}
