# FUND_IT.md: "Pencil", a Lane 3 (Fund it) build on top of HomeStay

> **Implementation brief for a new Kiro / Claude session.**
> Event: Claude Impact Lab, UCI × SoCal Affordable Housing, **Saturday Nov 7, 2026**.
> **Submissions due 2:30 PM PT** (public repo on `main` + 30-second video + hub form). Finalists demo live at 3:00.
> This brief was written at about 11:00 AM on Nov 7. Budget your time against that deadline (§10).

---

## 0. Start here

**Repo:** `/Users/wchoi/src/habitatoc`, pushed to https://github.com/wilsonkichoi/MSBA-claude-impact-lab (branch `main`, public).
It currently contains **HomeStay**, a working, tested Next.js app for *post-purchase* homeowner stability (P0–P2 done, 83 tests green). Read `README.md` and skim `PROTOTYPE_PLAN.md` for its rules. They still apply.

**Assignment:** Add a Lane 3 tool called **Pencil** to the same app. It answers the lane's question, *"Does it pencil, and who closes the gap?"*, for a nonprofit finance lead working on one affordable ownership home:

1. **Family price from the law, not a guess.** It derives what the family can pay from the dated HCD 2026 income-limits table, the Health and Safety Code 50052.5 cost cap, the 25 CCR 6920 cost components, and the published Freddie Mac rate. The date of every input is visible.
2. **The gap.** cost to create − family price − subsidies − earned income = fundraising needed. It shows both the gap counting **confirmed** sources only and the gap **if every candidate came through**.
3. **Sensitivity.** It shows how the gap moves when the **rate** moves (published weekly series) and when **homeowners insurance** moves. The insurance case is the bridge to HomeStay: insurance sits inside the statute's housing cost, so a premium shock lowers the affordable price and widens the gap.
4. **The stack.** Candidate funding sources from a small, dated, source-checked catalog. Each one is marked open / verify / closed and is never counted until a person marks it confirmed.
5. **The donor view.** "If I give $25,000, what does that pay for?" maps the gift onto lines of the one-home bill, with every number labeled.
6. **Funder memo.** A copyable plain-text summary with every source URL and check date. This mirrors HomeStay's Copy summary.

**Working rules (from the event's `CLAUDE.md`, ground rules and our own `PROTOTYPE_PLAN.md`):**

- **Never invent** a statute, section number, dollar amount, fee, deadline, program term, address or parcel fact. If the source does not say, the tool says **"Unknown"**.
- **Label assumptions** as `ASSUMPTION` in code, UI and README, saying what each is based on.
- **Cite sources** with a URL, a section number when relevant, and the date checked. When two sources disagree or one looks stale, show it. Do not pick silently.
- **Deterministic TypeScript does all math.** No AI in any calculation. Calculate on unrounded numbers and round only for display (reuse `lib/format.ts`).
- **Synthetic data only.** No personal information about real buyers, tenants or residents. The example deal is synthetic and must be labeled that way wherever it appears.
- **Prototype only.** Nothing sends, files or submits anything. The memo is drafted text the user copies.
- **Offline demo.** The core demo must work with no network and no API key. Live data refresh is optional and must fall back to the dated snapshot.
- **Do not break HomeStay.** Do not restyle or rebuild it. `npm run check` stays green after every step, and the existing tests must not change (only additions).
- No new dependencies unless necessary. Commit and push to `main` often (§10).

---

## 1. Why this lane, and how it connects to what we built

The event frames every home as one equation (challenge brief, `docs/background.md`):

> **What the family can afford to pay + public subsidies + fundraising − the cost to create the home = $0**

Lanes 1 and 2 shrink the cost. **Lane 3 closes the gap.** The family's share is "fixed by income". Pencil computes that share honestly, then shows what closes the rest.

HomeStay showed that an insurance renewal from $1,800 to $3,600 a year costs a household +$150/month. Under 25 CCR 6920, insurance is **part of** the housing cost that 50052.5 caps. With our labeled assumptions, the same +$150/month lowers a lower-income family's affordable price by about **$20,033**, and that becomes **$20,033 more fundraising per home** (§5.4). This is the angle no other team is likely to have: *a home that pencils at closing can stop penciling at the first renewal, and the same number hits the family's budget afterward.* HomeStay covers the family after closing. Pencil covers the deal before it.

**Judging (4 equal areas, ties go to Impact):** Impact (a nonprofit would use it next month), Works (live demo on real data with sources shown), Scale (a believable path to 100 projects), Innovation. Design every screen so a judge can see a **source and date next to each number**.

---

## 2. The real user (no real person; a role)

**A finance lead at a small OC affordable-homeownership nonprofit** (Habitat-style; do not claim any organization endorses this). The lane scenarios in `lanes/3-fund-it/scenarios.json` (made up) are our test cases:

| ID | In their words | What good looks like (from the lane file) |
|---|---|---|
| M01 | "I'm $95k short per home. Which sources could I still stack, and when would the money arrive?" | Candidate sources with eligibility, deadlines and timing shown; funds marked unconfirmed until checked; gap recalculated |
| M02 | "Rates went up. How much bigger is the gap now?" | Family price recomputed from a dated income-limits table and a published rate; gap change in dollars |
| M03 | "If I give $25,000, what does that actually pay for?" | Gift mapped to lines of the one-home bill; every number labeled assumption or sourced |

**Before:** a spreadsheet per project. Income limits are copied from a PDF that was revised mid-year (May 29 → June 23, 2026). The rate is typed in by hand. The program list was last checked months ago, and the donor ask is a round number.
**After:** one screen shows the price the law allows today, the gap, how it moves with rate and insurance, which sources might close it (and which are unconfirmed), and a memo with sources and dates.

---

## 3. Verified data to embed (checked Nov 7, 2026 unless noted)

Store these as static, typed data with `sourceUrl`, `publishedOrEffectiveDate`, and `checkedDate`. Do not change a number without re-reading its source.

### 3.1 HCD 2026 State Income Limits, Orange County (revised memo dated June 23, 2026)

Source: https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf. Memo "Revised 2026 State Income Limits", dated June 23, 2026, replaces the May 29, 2026 limits; the PDF's server Last-Modified header is June 25, 2026. Read from page 11.

- **Orange County Area Median Income: $138,600** (4-person).

| Category | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Acutely Low | 14,550 | 16,650 | 18,700 | 20,800 | 22,450 | 24,150 | 25,800 | 27,450 |
| Extremely Low | 39,100 | 44,700 | 50,300 | 55,850 | 60,350 | 64,800 | 69,300 | 73,750 |
| Very Low Income | 65,150 | 74,450 | 83,750 | 93,050 | 100,500 | 107,950 | 115,400 | 122,850 |
| Low Income | 104,200 | 119,100 | 134,000 | 148,850 | 160,800 | 172,700 | 184,600 | 196,500 |
| **Median Income** | 97,000 | 110,900 | 124,750 | **138,600** | 149,700 | 160,800 | 171,850 | 182,950 |
| Moderate Income | 116,400 | 133,050 | 149,650 | 166,300 | 179,600 | 192,900 | 206,200 | 219,500 |

Truths to surface in the UI:
- In OC, the **Low Income limit (4-person $148,850) is higher than the AMI ($138,600)**. The income limit is not the AMI. The 50052.5 cost formula uses **AMI adjusted for family size appropriate for the unit** (the "Median Income" row), **not** the household's income limit and not its actual income.
- The memo itself says use of the limits is subject to each program's own definitions of income, family size and effective dates.

### 3.2 HCD 2026 State HOME Income Limits, Orange (effective June 1, 2026)

Source: https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/2026-california-HOME-income-limits_0.pdf (page 2, "Orange").

| Category | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 30% Limits | 39,100 | 44,700 | 50,300 | 55,850 | 60,350 | 64,800 | 69,300 | 73,750 |
| Very Low Income 50% | 65,150 | 74,450 | 83,750 | 93,050 | 100,500 | 107,950 | 115,400 | 122,850 |
| 60% Limits | 78,180 | 89,340 | 100,500 | 111,660 | 120,600 | 129,540 | 138,480 | 147,420 |
| Low Income 80% | 104,200 | 119,100 | 134,000 | 148,850 | 160,800 | 172,700 | 184,600 | 196,500 |

Show as a cross-check: for OC, the State and State HOME 30/50/80% rows **match**. The 60% row exists only in the HOME table. These are two documents with **different dates** (June 1 vs June 23). The UI says which one each number came from.

Cross-check (also verified Nov 7): the City of Santa Ana's My First Home page (https://santa-ana.gov/my-first-home) lists the same 80% and 120% figures "as of June 2026" (4-person $148,850 / $166,300).

### 3.3 Health and Safety Code 50052.5 (owner "affordable housing cost")

Source: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=50052.5 (fetched Nov 7, 2026; last amended Stats. 2017, Ch. 418, effective Jan 1, 2018). Paraphrased; read the section before changing logic:

- (a) Assistance **before** Jan 1, 1991: lower-income cost ≤ 25% of gross income. **Out of scope**; show a note.
- (b) Assistance **on or after** Jan 1, 1991, annual affordable housing cost may not exceed:
  - (1) extremely low: 30% × 30% of AMI adjusted for family size appropriate for the unit
  - (2) very low: 30% × 50% of that AMI
  - (3) lower (above very low, up to 70% AMI): 30% × 70% of that AMI. *Optional:* for lower-income households at or above 70% AMI, a funding agency may instead require ≤ 30% of the household's gross income.
  - (4) moderate: **not less than 28% of the household's gross income**, and not more than 35% × 110% of that AMI. *Optional:* above 110% AMI, an agency may require ≤ 35% of gross income.
- (c) and (e): HCD regulations define gross income and housing cost, and a method for maximum sales price. **We did not read the sales-price method regulation.** Our price solver (§5.2) is *our method*, labeled as such.
- (h) "Adjusted for family size appropriate to the unit": studio → 1 person, 1BR → 2, **2BR → 3, 3BR → 4**, 4BR → 5.
- (d) Co-ops and tenants use the rent definition (50053). Out of scope.

**Reference caps (OC, 2026, from the table above). These are tests:**

| Category, 3BR (4-person AMI $138,600) | Formula | Annual | Monthly |
|---|---|---:|---:|
| Extremely low | 0.30 × 0.30 × 138,600 | 12,474.00 | 1,039.50 |
| Very low | 0.30 × 0.50 × 138,600 | 20,790.00 | 1,732.50 |
| **Lower** | 0.30 × 0.70 × 138,600 | **29,106.00** | **2,425.50** |
| Moderate (upper bound) | 0.35 × 1.10 × 138,600 | 53,361.00 | 4,446.75 |

### 3.4 25 CCR 6920 (what "housing cost" includes for a purchaser)

Source: https://www.law.cornell.edu/regulations/california/25-CCR-6920. Cornell LII, an **unofficial** copy (the official CCR is on Westlaw); fetched Nov 7, 2026. Housing cost includes: (a) principal and interest on the mortgage (including rehab loans) and loan insurance fees; (b) property taxes and assessments; (c) fire and casualty insurance at replacement value; (d) maintenance and repairs; (e) a reasonable utilities allowance (not telephone); (f) HOA fees; (g) space rent if on rented land. Monthly cost is an **average of estimated costs for the next 12 months**.

This is why the insurance line matters. The solver must subtract every component, and each non-P&I component is an input with an `ASSUMPTION` label.

### 3.5 Freddie Mac PMMS 30-year fixed (weekly)

Source CSV: https://www.freddiemac.com/pmms/docs/PMMS_history.csv (columns `date,pmms30,...`; read Nov 7, 2026). Embed this snapshot:

| Week | 30-yr % |
|---|---:|
| 2026-09-03 | 6.71 |
| 2026-09-10 | 6.76 |
| 2026-09-17 | 6.95 |
| 2026-09-24 | 7.03 |
| 2026-10-01 | 7.28 |
| 2026-10-08 | 7.40 |
| 2026-10-15 | 7.40 |
| 2026-10-22 | 7.32 |
| 2026-10-29 | 7.24 |
| **2026-11-05** | **7.18** (latest) |

Label: "Freddie Mac PMMS national average for a 30-year fixed; your buyer's actual rate will differ." FRED series MORTGAGE30US (https://fred.stlouisfed.org/series/MORTGAGE30US) carries the same data. The lane notes the Nov 5 value 7.18%.

### 3.6 The synthetic one-home bill (from the lane repo)

Copy `lanes/3-fund-it/data/synthetic-example-deal.json` from https://github.com/travcjohnson/claude-impact-lab-uci verbatim into `public/samples/fund-it/synthetic-example-deal.json` and credit the source (that repo is MIT; its lane text is CC0). A copy is at `/tmp/cil/lanes/3-fund-it/data/` if that folder still exists; otherwise use `gh api repos/travcjohnson/claude-impact-lab-uci/contents/lanes/3-fund-it/data/synthetic-example-deal.json -H 'Accept: application/vnd.github.raw'`. Copy `scenarios.json` too.

- Cost to create: land and building $360k, time costs $85k, construction and repairs $40k, fees/design/legal/sales $50k, **total $535k**.
- Paid by: family price $285k, public subsidies $100k, rent earned while waiting $55k, fundraising gap $95k, **total $535k**.
- Every number is labeled `ASSUMPTION` in the file. Keep its `SYNTHETIC` notice on screen and never present it as a benchmark.

### 3.7 Funding-source catalog (all checked Nov 7, 2026 unless noted)

Same rules as HomeStay's `lib/assistance.ts`: official URL, what the page says, status, cautions, `lastVerified`. **Never count a source in the "confirmed" gap until the user marks it Confirmed.** Level = whether it pays the **project** (nonprofit/developer) or the **buyer** (raises what the family can pay without raising monthly cost if it is deferred).

| id | Name / provider | Level | What the official page says (paraphrased) | Status | Model it as |
|---|---|---|---|---|---|
| `fhlbsf-wish` | WISH, FHLBank San Francisco | Buyer | 2026 program has $13M; member banks can request to participate through **Mar 12, 2027**; **4-to-1 matching grants up to $32,837** (current FHFA max); buyer must complete homebuyer counseling, be a first-time buyer, be **≤ 80% of HUD AMI**, contribute savings/gift/sweat equity, and open escrow within a year of enrollment; repayment rules apply on sale or refinance during a retention period. https://www.fhlbsf.com/products/community-programs-grants/wish | **open** (program); per-buyer funds **verify** via a participating member bank | Deferred buyer assistance up to $32,837, needs a buyer contribution ≥ grant ÷ 4. "80% of **HUD** AMI" is a HUD table we did **not** read, so show an open question |
| `santa-ana-my-first-home` | My First Home, City of Santa Ana | Buyer | First-time buyer, 8-hour HUD-approved course, housing cost 28–40% and total debt ≤ 45%, credit ≥ 640, 3% seasoned funds, unit in Santa Ana; "currently only accepting applications for 80% AMI households"; income table as of June 2026. **No loan amount or terms on the page.** https://santa-ana.gov/my-first-home | **verify** | Amount **Unknown** (user enters it from the city, labeled). Only suggested if the deal's city is Santa Ana |
| `calhfa-myhome` | MyHome Assistance, CalHFA | Buyer | MyHome page: first-time buyer, owner-occupied, homebuyer education, CalHFA income limits; through approved lenders only. **The amount is not on the MyHome page.** The lane notes say the programs page states up to 3.5% (FHA) / 3% (conventional). https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm and https://www.calhfa.ca.gov/homebuyer/programs/ | **verify** | Re-fetch the programs page and record the % with its quote, or leave the amount Unknown. Income limit is CalHFA's own table (not read) |
| `calhfa-dream-for-all` | Dream For All, CalHFA | Buyer | Up to 20% for down payment/closing costs, not to exceed $150,000; first-generation buyer; voucher with a **randomized drawing**; update dated 05/20/2026 says the next round of vouchers was released; repayment includes a share of appreciation. https://calhfa.ca.gov/dream/ | **verify** (not available on demand) | **Never** in the confirmed gap; show as "only if the buyer holds a voucher" |
| `hcd-calhome` | CalHome via the Homeownership Super NOFA, HCD | Project + buyer | Grants to local public agencies and nonprofits (not individuals) for first-time buyer and rehab assistance, predevelopment, site acquisition, development; assistance to households is deferred-payment loans; funded through HOSN. HOSN page lists only **2024** CalHome Tribal NOFA documents. https://www.hcd.ca.gov/grants-and-funding/programs-active/calhome and https://www.hcd.ca.gov/funding/hosn | **verify** (no open general round confirmed on the page) | Amount Unknown; open question "Is a HOSN round open, and does the timing fit closing?" |
| `ochft-nofa` | Orange County Housing Finance Trust | Project | Lane notes (checked Nov 6): programs page shows a NOFA; homeownership eligibility not confirmed. https://ochft.org/programs | **verify** (lead, not fact) | Amount Unknown |

Leave out, with the reason shown in the README: CalHFA Forgivable Equity Builder (no official URL; a 2022 board handout said it was winding down), employer-assisted housing (no verified source), LIHTC (rental only).

Also reuse HomeStay's catalog entry `hud-housing-counseling`. WISH, MyHome, Dream For All and Santa Ana all require homebuyer education from a HUD-approved agency, so link to it from those cards.

---

## 4. Product: screens (one page, `/`)

Keep it one route with stacked sections and a sticky summary bar. The judge should see the answer in the first 10 seconds.

**Header bar (sticky):** `Family price $257,152 · Gap $122,848 (confirmed sources) · $93,140 if candidates come through`, then `Inputs as of: income limits Jun 23, 2026 · rate Nov 5, 2026`. Add a "Synthetic deal" badge and a link to "HomeStay (after closing) →" at `/homestay`.

**A. The deal (one-home bill).** Two columns, Cost to create and Paid by, loaded from the synthetic JSON with an `ASSUMPTION` chip on every line. Lines are editable. The "Family price" line is **replaced by the derived value from B**, and the deal file's original $285k is shown struck through with: "Deal file assumed $285,000. The statute + today's rate + the listed assumptions give $257,152 for a lower-income 3BR. Difference: $27,848 more gap." The balance check (paid by − cost = $0) is shown live.

Optional: a "Use a real listing" box with listing price, listing URL and date checked (all required to save). Pencil never fetches listing sites. Without a URL it says "Hypothetical".

**B. What the family can pay (the law).** Inputs:
- Income category (extremely low / very low / **lower** / moderate), bedrooms (→ persons per 50052.5(h)), county fixed to Orange with its table date.
- Table selector: State Income Limits (Jun 23, 2026) is the default. HOME (Jun 1, 2026) shows the cross-check.
- Rate: the PMMS week (default latest) or a custom value labeled "Custom (not published)". Term 30 years.
- `ASSUMPTION` inputs per 25 CCR 6920: down payment %, property tax rate % of price, insurance $/mo, maintenance $/mo, utilities allowance $/mo, HOA $/mo, mortgage insurance $/mo (default 0, flagged "verify with lender").
- For moderate: a gross household income input, because (b)(4) sets a 28%-of-income floor. Show the floor and the cap.

Output, as a breakdown everyone can check: annual cap → monthly cap → minus each component → P&I budget → max first loan → max price. Every step names its formula and source.

**C. What moves the gap.** Two small controls with instant deltas, plus a chart if time allows:
- **Rate:** pick any two PMMS weeks. Default: Oct 8, 2026 (7.40%) vs Nov 5, 2026 (7.18%). "The rate fell 0.22 points; the family price rises $4,884; the gap shrinks $4,884." Also show "each +0.01 point ≈ −$225 of family price" (computed, not hard-coded).
- **Insurance:** $150 → $300/mo (the HomeStay sample's renewal). "Insurance is part of housing cost under 25 CCR 6920(c). +$150/mo lowers the family price by $20,033 and raises the gap by $20,033." Link: "See this renewal from the family's side → HomeStay".

**D. Who could close it (the stack).** Cards from §3.7, reusing the HomeStay navigator card pattern: why it may apply (cites a deal fact), still unknown (exact questions), what the source says, official link, source checked date, status badge. A **Finance-lead status** control: To verify / Not eligible / Applied / Confirmed, plus an **amount** field (prefilled only when the source states a number, e.g., WISH up to $32,837; otherwise blank "Unknown"). Gap math:
- **Confirmed gap** counts only sources set to Confirmed, with an amount.
- **If candidates came through** counts To verify + Applied + Confirmed with a known amount, and says how many have **unknown** amounts and are not counted.
- Buyer-level deferred assistance is applied through the price solver (§5.3), not added 1:1. The card explains why.

**E. Donor view (M03).** Gift amount (default $25,000). Output: "% of this home's remaining gap", "≈ X% of the `construction and repairs` line ($40,000, ASSUMPTION)" for each line the gift fits, and "homes' worth of gap: gift ÷ gap". A fixed note: "Money is pooled. This shows scale, not where your gift is spent." No tax advice; link IRS Pub 526 (https://www.irs.gov/pub/irs-pdf/p526.pdf, verified by the lane on Nov 6) as general info only.

**F. Funder memo (Copy).** Plain text like HomeStay's `summaryToText`: deal summary, family-price derivation with each source and date, assumptions list, gap (confirmed / candidates), sensitivity lines, stack with status, open questions, URL and check date, and the donor line. Header: "DRAFT, SYNTHETIC DEAL, NOT A FINANCING COMMITMENT OR ELIGIBILITY DETERMINATION." Must never contain "you qualify", "eligible" as a conclusion, "guaranteed", or "approved".

**Footer:** "Prototype only. Not legal, financial or lending advice. Program terms change; read the source before relying on it."

---

## 5. Math (pure functions in `lib/fundit/`, all tested)

Units in names. No rounding inside functions.

### 5.1 Cap
```
personsForBedrooms(b) = b + 1   (0→1 … 4→5; >4 → "Unknown, ask")
amiForPersons(n)      = table.median[n]                 // §3.1 "Median Income" row
annualCap(category)   = { extremelyLow: .30*.30, veryLow: .30*.50, lower: .30*.70, moderate: .35*1.10 }[category] * ami
monthlyCap            = annualCap / 12
moderateFloorMonthly  = 0.28 * grossHouseholdIncome / 12  // (b)(4); shown, and price must not be set below it (show warning)
```

### 5.2 Max price (our method, labeled; ASSUMPTION inputs)
```
f(rate, n=360)  = i(1+i)^n / ((1+i)^n − 1),  i = rate/100/12
fixedMonthly    = insurance + maintenance + utilities + hoa + mortgageInsurance
// price P, down payment d·P, first loan (1−d)·P − deferredAssistance
// (1−d)·P·f − deferred·f + taxRate·P/12 + fixedMonthly = monthlyCap
P = (monthlyCap − fixedMonthly + deferred·f) / ((1−d)·f + taxRate/12)
```
If the numerator ≤ 0, the price is **$0 and "does not pencil at this cap"**. Do not return negative prices.

### 5.3 Gap
```
gap = costToCreateTotal − familyPrice − publicSubsidies − earnedIncome − confirmedProjectSources
```
Buyer-level deferred sources enter through `deferred` in 5.2. Negative gap → show "surplus" without hiding it (moderate category does this: see 5.4).

### 5.4 Reference results (default assumptions; these are test anchors)

Default `ASSUMPTION`s: 3BR (4 persons), lower income, State table Jun 23 2026, PMMS 7.18% (Nov 5), 30 years, **3% down**, **property tax 1.1% of price/yr** (the lane notes say about 1% plus local assessments; ASSUMPTION), **insurance $150/mo** (the HomeStay sample's pre-renewal figure), **maintenance $100/mo**, **utilities allowance $250/mo**, HOA $0, mortgage insurance $0 (flag). Other deal lines from the synthetic file.

| Case | Family price | Gap |
|---|---:|---:|
| Lower, 7.18% (default) | **$257,152.16** | **$122,847.84** |
| Lower, 7.40% (Oct 8) | $252,268.16 | $127,731.84 (+$4,884.00) |
| Lower, 6.71% (Sep 3) | $268,089.66 | $111,910.34 |
| Lower, insurance $300/mo | $237,119.54 | $142,880.46 (+$20,032.62, ±$0.01) |
| Lower + WISH $32,837 deferred | $286,860.45 | $93,139.55 |
| Very low, 7.18% | $164,601.42 | $215,398.58 |
| Moderate cap, 7.18% | $527,091.82 | −$147,091.82 (surplus) |

Sanity check (lower, 7.18%): first loan $249,437.60 → P&I $1,689.78 + tax $235.72 + fixed $500 = **$2,425.50** = monthly cap. f(7.18%) ≈ 0.00677435.
Donor (gift $25,000 on the $122,847.84 gap): 20.4% of the gap; 62.5% of the $40,000 construction-and-repairs line.

Note why WISH adds $29,708 of price and not $32,837: a higher price raises the down payment and property tax. The card says this in one line.

---

## 6. Using Claude inside the tool (P1, after the core works)

**"Re-check a program from its page."** Program lists go stale. The finance lead pastes text from a program's official page or NOFA. The server extracts **only** fields stated in the text (`maxAmount`, `amountType` (grant / deferred loan / % of price), `incomeLimitText`, `deadline`, `fundsAvailableText`, `firstTimeBuyerRequired`, `geography`), each with a **verbatim quote**. It validates with Zod, drops quotes not found in the text, and loads the result into a review card. A person confirms each field before it updates the catalog entry for this session. Reuse HomeStay's pipeline (`lib/notice-extraction.ts`, `lib/extractor.ts`, `lib/extractor-backends.ts`, consent prompt, `EXTRACTOR` backends). Do not change their behavior for HomeStay; add a second schema and prompt. The prompt says the text is untrusted data, no math, no inferring amounts or dates.

Offline demo: one **fixture** for the WISH page excerpt (the facts in §3.7, quotes ≤ 30 words each) so the review card works with no key, labeled "Demo fixture, no AI call". AI never computes the gap, the price or eligibility.

If time is short, skip §6 entirely and say so in the README. "How Claude is used" can honestly be "built with Claude Code; HomeStay's notice extraction uses Claude".

---

## 7. Optional live refresh (P1, small)

`GET /api/pmms-latest`: a server route that fetches the PMMS CSV **once per server start** (in-memory cache, 10 s timeout, no retries in a loop), parses the last row, and returns `{date, rate30}`. The UI shows "Snapshot: Nov 5, 2026 7.18% · Live check: <date> <rate>". If they differ, it shows a notice and lets the user switch. On any failure it says "Live check unavailable; using snapshot". Stale warning: if the chosen rate week is more than 14 days before today, say so (14 days is an ASSUMPTION; PMMS is weekly). No other live fetches. Do not touch listing or city sites.

---

## 8. Files (suggested)

```
app/page.tsx                         → renders <PencilApp/> (Fund it, the judged demo)
app/homestay/page.tsx                → renders <HomeStayApp/> (moved, unchanged)
app/api/pmms-latest/route.ts         (P1)
app/api/analyze-program/route.ts     (P1, §6)
components/fundit/pencil-app.tsx     page shell, sticky summary, sections A–F
components/fundit/*.tsx              deal-bill, family-price, sensitivity, stack, donor, memo
lib/fundit/sources.ts                every source {id, title, url, effectiveDate, checkedDate, note}
lib/fundit/income-limits.ts          §3.1 + §3.2 tables (typed, frozen)
lib/fundit/rates.ts                  §3.5 snapshot + parser for the CSV format
lib/fundit/affordability.ts          §5.1–5.2 (pure)
lib/fundit/deal.ts                   Zod schema + loader for the synthetic deal JSON; gap (§5.3)
lib/fundit/stack.ts                  §3.7 catalog, matching, confirmed/candidate totals
lib/fundit/donor.ts                  §4E
lib/fundit/memo.ts                   §4F text
lib/fundit/state.ts                  pure reducer (edits, statuses, reset); same pattern as lib/state.ts
public/samples/fund-it/synthetic-example-deal.json, scenarios.json   (copied, credited)
tests/fundit-*.test.ts
LICENSE                              MIT (event encourages an open license)
```
Reuse `components/ui.tsx` (Card, Badge, Button, Icon) and `lib/format.ts`. Keep the HomeStay visual style. Moving HomeStay to `/homestay` must not change its tests. Its "Reset demo" stays inside HomeStay.

---

## 9. Tests (only what this needs; `npm run check` green after each step)

- Income tables: OC 4-person AMI 138,600; Low 148,850; State and HOME 30/50/80 rows equal for OC; every table has an https source URL and valid ISO dates.
- 50052.5 caps: the four monthly values in §3.3; bedrooms → persons per (h); 5+ bedrooms → Unknown.
- Price solver: every row of §5.4 within $0.01; sanity breakdown sums to the cap; numerator ≤ 0 → 0 + "does not pencil".
- Gap: synthetic deal file balances to $0 as given; with derived price, the gap = §5.4; deal inputs are not mutated.
- Rate sensitivity Oct 8 → Nov 5 = −$4,884.00 gap. Insurance +$150 = +$20,032.62 gap (±0.01).
- Stack: no source counts in the confirmed gap until Confirmed with an amount; unknown amounts are excluded and counted; Dream For All never enters the confirmed gap without a user-entered amount; Santa Ana appears only when the deal city is Santa Ana; every entry has an https URL, lastVerified date and status.
- Donor: $25,000 → 20.4% of the default gap; 62.5% of the construction line.
- Memo: contains every source URL and check date used; contains "ASSUMPTION" for each assumed input; contains "SYNTHETIC"; does not match `/you qualify|you are eligible|guaranteed|approved/i`.
- Reset returns the exact initial state; editing does not mutate the frozen seed.
- HomeStay: existing 83 tests unchanged and passing; the direct $150→$300 / $400→$250 and escrow $150→$270 / $400→$280 results still hold.

---

## 10. Time plan (it is about 11:00 AM; due 2:30 PM)

| By | Done | Commit + push |
|---|---|---|
| 11:45 | `lib/fundit` data + affordability + gap + tests for §5.4 | yes |
| 12:30 | Page: sections A, B, C with sources/dates on screen; HomeStay moved to `/homestay`; `npm run build` passes | yes. **This is the minimum shippable demo.** |
| 1:15 | D stack + E donor + F memo + tests | yes |
| 1:45 | README rewritten to the event template (§11); LICENSE; screenshots | yes |
| 2:00 | Optional: §7 live PMMS check, then §6 if there is real slack | yes |
| 2:10 | Fresh-clone check: `git clone` → `npm ci` → `npm run check` → `npm run build` → `npm start`, offline walk of M01/M02/M03; repo opened signed-out | yes, final |
| 2:25 | Video recorded (§12) and hub form submitted (§12) | — |

If behind at 12:30: cut §6, §7, the real-listing box and charts. Ship A–C plus the memo. A working rough tool beats a polished pitch.

---

## 11. README (must follow `templates/TEAM-README.md` from the lane repo)

Rewrite the top of `README.md` for the judged project. Keep the HomeStay material below it as "Companion: HomeStay (after closing)".

Required sections, in order: project name + one sentence · Team / Members / **Lane: 3 Fund it** / Built at · The real user (before/after) · What we built (+ screenshot, video link) · How Claude is used (building it with Claude Code and Kiro; what Claude does at runtime, if §6 ships; what a person checks) · **Try it** with exact commands (`npm ci`, `npm run dev`, Node ≥ 20.9; no key needed) · **Sources and assumptions** table (item, source or ASSUMPTION, date checked) covering every row in §3 and every default in §5.4 · **What is real and what is mocked** (real: HCD tables, statute text, PMMS snapshot, program pages as of Nov 7; mocked/synthetic: the deal, all ASSUMPTION inputs, the AI fixture) · **Where it gets things wrong** (price method is ours, not HCD's regulation; one county; national average rate; program terms change; HUD AMI for WISH not read; MyHome amount not confirmed; no mortgage insurance; 12-month averaging simplified to flat monthly values) · Next steps (100-project path below) · Data and privacy · License (MIT).

Ask the user for the **team name and members**. Until then, leave `[team name]` placeholders and say so in the final report. Do not invent names.

**Scale story (for the README and the pitch):** inputs are dated tables, not hard-coded numbers. A mid-year revision is one data entry with its date, and the tool warns when a table or rate is stale. HCD's PDF covers all 58 counties, so another county is a table row. A deal is one JSON file, so 100 projects are 100 files on the same engine. The source catalog is shared across a nonprofit's whole pipeline. Combining with Lane 1/2 tools works because every number carries its source and date (the event's closing question).

---

## 12. Submission drafts (fill in, don't send anything automatically)

**One-liner:** For a nonprofit finance lead in Orange County, Pencil computes the price a family can legally pay today from dated state income limits, the statute and this week's mortgage rate, then shows the gap, what moves it (rate and insurance), and which funding sources could close it, with every number sourced or labeled.

**30-second video script:**
1. (0–5s) "Every affordable home has to hit $0. This one is $122,848 short, not the $95,000 the spreadsheet said."
2. (5–15s) Show B: "HCD's June 23 income limits, Health and Safety Code 50052.5, Freddie Mac's Nov 5 rate. Every number has a source and a date."
3. (15–22s) Show C: "Rates fell 0.22 points: the gap shrank $4,884. An insurance renewal like the one in HomeStay: the gap grows $20,033."
4. (22–28s) Show D/E: "WISH could close $29,708, still unconfirmed. A $25,000 gift covers 20% of what's left."
5. (28–30s) "Copy the funder memo. Sources and dates included."

**Sources and assumptions field:** paste the README table.

---

## 13. Final report the session must give

What shipped vs. cut, `npm run check` + `npm run build` results, the browser walk (M01/M02/M03, Copy memo, Reset, `/homestay` still works, no requests outside localhost unless the live PMMS check was used), every source URL with the date checked, every ASSUMPTION, and anything left as a placeholder (team name, video link).

---

## Appendix: sources reviewed for this brief (Nov 7, 2026)

- Event hub: https://claudesocal.com/uci-impact-lab (lanes, judging, submission checklist)
- Lane repo: https://github.com/travcjohnson/claude-impact-lab-uci at commit `45a05a5` (README, CLAUDE.md, docs/*, challenge-brief.pdf, kickoff-slides.pdf, templates/TEAM-README.md, lanes/3-fund-it/*)
- HCD 2026 State Income Limits (rev. June 23, 2026): https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf
- HCD 2026 State HOME Income Limits (eff. June 1, 2026): https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/2026-california-HOME-income-limits_0.pdf
- HSC 50052.5: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=50052.5
- 25 CCR 6920 (unofficial copy): https://www.law.cornell.edu/regulations/california/25-CCR-6920
- Freddie Mac PMMS CSV: https://www.freddiemac.com/pmms/docs/PMMS_history.csv
- FHLBank SF WISH: https://www.fhlbsf.com/products/community-programs-grants/wish
- Santa Ana My First Home: https://santa-ana.gov/my-first-home
- CalHFA MyHome: https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm
- CalHFA Dream For All: https://calhfa.ca.gov/dream/
- HCD CalHome: https://www.hcd.ca.gov/grants-and-funding/programs-active/calhome
- HCD Homeownership Super NOFA: https://www.hcd.ca.gov/funding/hosn
- Lane notes (checked Nov 6 by the organizers; leads, not re-verified here): OCHFT https://ochft.org/programs, CalHFA programs page https://www.calhfa.ca.gov/homebuyer/programs/, IRS Pub 526 https://www.irs.gov/pub/irs-pdf/p526.pdf
