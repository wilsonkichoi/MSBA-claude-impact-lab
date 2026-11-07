"use client";

import { useId, useState, type ReactNode } from "react";
import type { Source } from "@/lib/fundit/sources";
import { Badge, cx } from "../ui";

export function AssumptionChip({ title }: { title?: string }) {
  return (
    <Badge tone="amber" className="font-semibold">
      <span title={title}>ASSUMPTION</span>
    </Badge>
  );
}

export function SourceChip({ source, label }: { source: Source; label?: string }) {
  return (
    <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex" title={`${source.title}. Checked ${source.checkedDate}.`}>
      <Badge tone="sky" className="hover:ring-sky-400">
        Source: {label ?? source.title}
        <span className="text-sky-700/80">· checked {source.checkedDate}</span>
      </Badge>
    </a>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-xl bg-canvas p-1 ring-1 ring-line">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cx(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === v ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Number input that keeps a text draft so the user can clear and retype; commits only finite values. */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min,
  chip,
  note,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  chip?: ReactNode;
  note?: ReactNode;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(String(value));
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {chip}
      </div>
      <div className="mt-1 flex items-center rounded-xl bg-white ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-400">
        {prefix && <span className="pl-3 text-sm text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n) && (min === undefined || n >= min)) {
              setSeen(n);
              onChange(n);
            }
          }}
          className="w-full min-w-0 rounded-xl bg-transparent px-3 py-2 text-sm tabular-nums outline-none"
        />
        {suffix && <span className="pr-3 text-sm whitespace-nowrap text-muted">{suffix}</span>}
      </div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}

export function Group({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <fieldset className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {aside}
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
