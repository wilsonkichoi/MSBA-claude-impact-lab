"use client";

import { useId, useState } from "react";
import { cashBufferMonthly, essentialOutflowMonthly, housingMonthly } from "@/lib/finance";
import { formatUSD } from "@/lib/format";
import type { BudgetMoneyField, HouseholdBudget, PaymentMethod } from "@/lib/schema";
import { Badge, Button, Card, Icon, cx } from "./ui";

type FieldDef = { field: BudgetMoneyField; label: string; hint?: string };

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Income (monthly)",
    fields: [
      { field: "grossMonthlyIncome", label: "Gross income", hint: "Before taxes. Used only for the housing-cost ratio." },
      { field: "netMonthlyIncome", label: "Take-home income", hint: "After taxes. Used for your monthly cushion." },
    ],
  },
  {
    title: "Housing (monthly)",
    fields: [
      { field: "mortgagePrincipalInterest", label: "Mortgage principal + interest", hint: "P&I only. Don't include taxes or insurance here." },
      { field: "propertyTaxMonthly", label: "Property tax" },
      { field: "homeownerInsuranceMonthly", label: "Homeowners insurance" },
      { field: "hoaMonthly", label: "HOA dues" },
    ],
  },
  {
    title: "Other essentials (monthly)",
    fields: [
      { field: "utilitiesMonthly", label: "Utilities" },
      { field: "livingEssentialsMonthly", label: "Food, transport, childcare & other essentials" },
      { field: "minimumDebtPaymentsMonthly", label: "Minimum debt payments" },
    ],
  },
  {
    title: "Savings",
    fields: [{ field: "emergencySavings", label: "Emergency savings (total)", hint: "Context only." }],
  },
];

function MoneyInput({
  label,
  hint,
  value,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const parsed = Number(shown.replace(/[$,\s]/g, ""));
  const invalid = shown.trim() === "" || !Number.isFinite(parsed) || parsed < 0;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={cx(
          "mt-1 flex items-center rounded-lg bg-white ring-1 ring-inset focus-within:ring-2",
          invalid ? "ring-rose-300 focus-within:ring-rose-400" : "ring-line focus-within:ring-brand-400",
        )}
      >
        <span className="pl-3 text-sm text-muted" aria-hidden>
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          className="w-full rounded-lg bg-transparent px-2 py-2 text-sm tabular-nums outline-none"
          value={shown}
          aria-invalid={invalid}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value.replace(/[$,\s]/g, ""));
            if (e.target.value.trim() !== "" && Number.isFinite(n) && n >= 0) onCommit(n);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      {invalid ? (
        <p className="mt-1 text-xs text-rose-700">Enter a number of 0 or more. The last valid value is kept.</p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function HouseholdBudgetCard({
  budget,
  onFieldChange,
  onPaymentMethodChange,
  compact = false,
}: {
  budget: HouseholdBudget;
  onFieldChange: (field: BudgetMoneyField, value: number) => void;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const housing = housingMonthly(budget);
  const outflow = essentialOutflowMonthly(budget);
  const buffer = cashBufferMonthly(budget);

  return (
    <Card className="overflow-hidden" aria-labelledby="household-title">
      <div className="flex flex-col gap-3 border-b border-line bg-gradient-to-br from-brand-50 to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white" aria-hidden>
            JR
          </div>
          <div>
            <h2 id="household-title" className="font-semibold text-ink">
              {budget.name} <span className="font-normal text-muted">(fictional)</span>
            </h2>
            <p className="text-sm text-muted">
              {budget.city} · household of {budget.householdSize}
            </p>
          </div>
        </div>
        <Badge tone="amber" className="self-start">
          Synthetic example — not financial advice
        </Badge>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
        <div className="px-2 py-3">
          <dt className="text-xs text-muted">Housing / mo</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{formatUSD(housing)}</dd>
        </div>
        <div className="px-2 py-3">
          <dt className="text-xs text-muted">Essentials / mo</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{formatUSD(outflow)}</dd>
        </div>
        <div className="px-2 py-3">
          <dt className="text-xs text-muted">Cushion / mo</dt>
          <dd className={cx("mt-0.5 font-semibold tabular-nums", buffer < 0 ? "text-amber-800" : "text-brand-700")}>
            {formatUSD(buffer)}
          </dd>
        </div>
      </dl>

      <div className="px-5 py-4">
        {!editing ? (
          <>
            {!compact && (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {GROUPS.flatMap((g) => g.fields).map((f) => (
                  <div key={f.field} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line/80 pb-1.5">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="font-medium tabular-nums">{formatUSD(budget[f.field])}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line/80 pb-1.5">
                  <dt className="text-muted">Insurance paid</dt>
                  <dd className="font-medium">
                    {budget.insurancePaymentMethod === "direct" ? "Directly" : budget.insurancePaymentMethod === "escrow" ? "Through escrow" : "Not sure"}
                  </dd>
                </div>
              </dl>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">Cushion = take-home income − listed essential expenses.</p>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)} aria-expanded={false} aria-controls="budget-editor">
                <Icon name="edit" className="h-4 w-4" />
                Edit budget
              </Button>
            </div>
          </>
        ) : (
          <div id="budget-editor" className="space-y-5">
            {GROUPS.map((g) => (
              <fieldset key={g.title}>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g.title}</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {g.fields.map((f) => (
                    <MoneyInput
                      key={f.field}
                      label={f.label}
                      hint={f.hint}
                      value={budget[f.field]}
                      onCommit={(n) => onFieldChange(f.field, n)}
                    />
                  ))}
                  {g.title.startsWith("Housing") && (
                    <div>
                      <label htmlFor="pay-method" className="block text-sm font-medium text-ink">
                        Insurance is paid
                      </label>
                      <select
                        id="pay-method"
                        className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-400"
                        value={budget.insurancePaymentMethod}
                        onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
                      >
                        <option value="direct">Directly to the insurer</option>
                        <option value="escrow">Through mortgage escrow</option>
                        <option value="unknown">Not sure</option>
                      </select>
                    </div>
                  )}
                </div>
              </fieldset>
            ))}
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setEditing(false)} aria-controls="budget-editor" aria-expanded>
                <Icon name="check" className="h-4 w-4" />
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
