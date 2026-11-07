import Link from "next/link";

/**
 * Shared section nav (FIND_IT.md §0, §7): 1 Find it → 2 Fund it → 3 Stay.
 * Slim bar above each app's own header. Inline styles only, so no page's CSS changes.
 */

export type SectionId = "find" | "fund" | "stay";

const SECTIONS: readonly { id: SectionId; n: number; href: string; name: string; question: string }[] = [
  { id: "find", n: 1, href: "/find", name: "Find it", question: "where could a home go?" },
  { id: "fund", n: 2, href: "/", name: "Fund it", question: "what would it take?" },
  { id: "stay", n: 3, href: "/homestay", name: "Stay", question: "keep the home affordable" },
];

export function SectionNav({ current }: { current: SectionId }) {
  return (
    <nav
      aria-label="Demo sections"
      style={{ background: "#1f1712", color: "#f7f2e8", fontSize: 13, lineHeight: 1.3 }}
    >
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "2px 4px",
          margin: "0 auto",
          maxWidth: 1400,
          padding: "4px 12px",
          listStyle: "none",
        }}
      >
        {SECTIONS.map((s) => {
          const active = s.id === current;
          return (
            <li key={s.id}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 999,
                  color: active ? "#1f1712" : "#f7f2e8",
                  background: active ? "#e9d9b4" : "transparent",
                  textDecoration: "none",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.8 }}>{s.n}</span>{" "}
                <strong style={{ fontWeight: 700 }}>{s.name}:</strong> {s.question}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
