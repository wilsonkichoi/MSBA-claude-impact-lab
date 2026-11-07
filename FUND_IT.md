# FUND_IT.md: "Pencil", a Lane 3 (Fund it) build on top of HomeStay

> **Implementation brief for a new Kiro / Claude session.**
> Event: Claude Impact Lab, UCI × SoCal Affordable Housing, **Saturday Nov 7, 2026**.
> **Submissions due 2:30 PM PT** (public repo on `main` + 30-second video + hub form). Finalists demo live at 3:00.
> Written about 11:15 AM on Nov 7 (v2: merges a teammate's proposal; v1 kept at `/tmp/FUND_IT.v1.md`). Budget time against §10.

---

## 0. Start here

**Repo:** `/Users/wchoi/src/habitatoc`, pushed to https://github.com/wilsonkichoi/MSBA-claude-impact-lab (branch `main`, public). It already contains **HomeStay**, a working, tested Next.js app for post-purchase homeowner stability (83 tests green). Read `README.md` and skim `PROTOTYPE_PLAN.md`. Its rules still apply.

**Assignment:** add **Pencil**, a one-screen funding-gap tool for **one user** (a nonprofit finance lead deciding whether to spend staff time on a site), **one real property**, and **one question that leads the screen:**

> **"What would it take?"** It doesn't stop at "the gap is $X". It says something like: *"Even if the land were donated, this four-home project would still need about $941,000 ($235,000 per home). Here is how we calculated it, and here is the assumption to verify first."*

The tool does six things:
1. **What families can pay**: per home, the **lower** of a household-budget estimate and the applicable program cap (Health and Safety Code 50052.5), with every source and effective date shown.
2. **Project gap**: land + development costs − buyer proceeds − committed sources, per home and for the whole project. It also shows the **maximum land price the project can support**. If that is below $0, it says even free land leaves a gap and shows the amount.
3. **Levers**: land price (asking / custom / donated), mortgage rate (published weekly series), donor gift, homeowners insurance (the HomeStay bridge). Each shows the dollar change per home and for the project.
4. **Verify first**: a deterministic sensitivity ranking of the assumptions by how much a fixed step moves the gap.
5. **Who could close it**: candidate sources with recipient, eligible use, geography, amount, timing, check date and status. **Only committed amounts reduce the base gap.** The tool **catches funding mistakes**: the OC Mortgage Assistance Program does not list San Clemente as an eligible area, so it counts $0.
6. **Funder memo**: copyable plain text with the decision signal, every source URL and check date, and every ASSUMPTION.

**Rules that do not bend** (event `CLAUDE.md`, ground rules, our `PROTOTYPE_PLAN.md`):
- Never invent a statute, number, fee, deadline, program term, address or parcel fact. If a source does not say, show **"Unknown"**.
- Label every assumed number `ASSUMPTION` in code, UI and README, and say what it is based on.
- Cite each source with a URL, a section number when relevant, and the date checked. When sources disagree or look stale, show both. Do not pick silently.
- Deterministic TypeScript does all math. AI never computes prices, gaps or eligibility. Round only for display (`lib/format.ts`).
- No personal information. The household is fictional. The listing is public, and we use only its price, size and description, not the agent's contact details.
- Nothing is sent, filed or submitted. The memo is drafted text the user copies.
- The demo works offline with no API key. The listing and program facts are a dated static snapshot; links open the official pages. **Never fetch listing sites at runtime.**
- Do not break or restyle HomeStay. `npm run check` stays green after each step, and existing tests are unchanged. No new dependencies unless necessary. Commit and push to `main` often.

---

## 1. Why this, and how it connects to HomeStay

The event's equation: **family can pay + public subsidies + fundraising − cost to create = $0**. Lanes 1 and 2 shrink cost. Lane 3 closes the gap. Judges score four equal areas: **Impact, Works (live demo on real data with sources shown), Scale, Innovation**. Ties go to Impact. The brief asks teams to test against *"any publicly listed small building or lot in OC (about 4–12 homes)"* with assumed numbers labeled. The San Clemente listing (§3.8) is that real case.

**HomeStay bridge (Innovation):** 25 CCR 6920 counts fire and casualty insurance inside a buyer's housing cost. With the §5.4 inputs, **+$150/month insurance per home (the HomeStay sample renewal) adds $88,569 to the four-home gap** ($22,142 per home). A project that pencils at closing can stop penciling at the first renewal, and HomeStay shows the same renewal from the family's side afterward.

---

## 2. The real user (a role, not a real person)

**The finance lead at an OC affordable-homeownership nonprofit** (Habitat OC-style; do not claim endorsement). A site comes across their desk. They need to know what families can pay, what stays unfunded, and who to approach first, *before* spending staff time.

**Before:** a one-off spreadsheet. Income limits are copied from a PDF that was revised mid-year (May 29 → June 23, 2026), and the rate is typed by hand. Program lists come from search results, so a county program can get counted for a city it doesn't serve.
**After:** one screen gives a decision signal ("does not pencil at asking price; even free land leaves $X"), the assumption to check first, and which sources count (and which don't, and why), with sources and dates throughout.

**Ask the Habitat / nonprofit mentors in the room (first thing):** *"When you decide whether to pursue a property, which number do you need first: the permanent subsidy per home, the cash needed by closing, or the maximum you can offer for the land?"* Make their answer the **largest number on the screen**. Default until answered: **gap per home with free land**.

Lane scenarios (made up, `lanes/3-fund-it/scenarios.json`) still apply as tests: M01 (which sources can I stack, and when does the money arrive?), M02 (rates moved: how much bigger is the gap?), M03 (what does a $25,000 gift pay for?).

---

## 3. Verified data to embed (checked Nov 7, 2026 unless noted)

Store as static typed data with `sourceUrl`, `effectiveDate`, `checkedDate`. Do not change a number without re-reading its source.

### 3.1 HCD 2026 State Income Limits, Orange County (revised memo dated June 23, 2026)
Source: https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf (page 11). The memo "Revised 2026 State Income Limits" is dated June 23, 2026 and replaces the May 29, 2026 limits.
**Orange County AMI: $138,600** (4-person).

| Category | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Acutely Low | 14,550 | 16,650 | 18,700 | 20,800 | 22,450 | 24,150 | 25,800 | 27,450 |
| Extremely Low | 39,100 | 44,700 | 50,300 | 55,850 | 60,350 | 64,800 | 69,300 | 73,750 |
| Very Low Income | 65,150 | 74,450 | 83,750 | 93,050 | 100,500 | 107,950 | 115,400 | 122,850 |
| Low Income | 104,200 | 119,100 | 134,000 | 148,850 | 160,800 | 172,700 | 184,600 | 196,500 |
| **Median Income** | 97,000 | 110,900 | 124,750 | **138,600** | 149,700 | 160,800 | 171,850 | 182,950 |
| Moderate Income | 116,400 | 133,050 | 149,650 | 166,300 | 179,600 | 192,900 | 206,200 | 219,500 |

Show on screen: in OC the Low Income limit (4-person $148,850) is **higher than** the AMI ($138,600). The 50052.5 formula uses AMI for the unit size (the "Median Income" row), not the income limit. The memo says each program's own definitions and effective dates govern.

### 3.2 HCD 2026 State HOME Income Limits, Orange (effective June 1, 2026)
Source: https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/2026-california-HOME-income-limits_0.pdf (page 2). The OC rows for 30% / 50% / 80% **match** §3.1. The HOME table adds a 60% row: 78,180 · 89,340 · 100,500 · 111,660 · 120,600 · 129,540 · 138,480 · 147,420. The two documents have different dates; label which table each number came from.

### 3.3 Same figures republished by OC sources (cross-checks)
- **Habitat for Humanity of Orange County** blog (https://habitatoc.org/why-homeownership-is-becoming-more-difficult-for-orange-county-families/): a family of four earning **$93,050–$148,850** is "low-income". These are the §3.1 very-low and low 4-person limits. The post attributes them to HUD.
  - **Staleness example:** an older Habitat OC post (https://habitatoc.org/surprising-ways-you-might-qualify-for-homeownership/, seen in search results only) gives $78,900–$126,250. Show it only as "older figure; superseded".
  - **Do not cite orangehabitat.org.** That is a different Habitat affiliate (Orange County, NC).
- **City of Santa Ana My First Home** (https://santa-ana.gov/my-first-home) and **OC Housing & Community Development** (§3.9) both list the same 80% / 120% figures "as of June 2026".

### 3.4 Health and Safety Code 50052.5 (owner "affordable housing cost")
Source: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=50052.5 (last amended Stats. 2017, Ch. 418). Paraphrased; re-read the section before changing logic.
- (b) For assistance on or after Jan 1, 1991, annual cost may not exceed:
  - extremely low: 30% × 30% AMI
  - very low: 30% × 50% AMI
  - **lower: 30% × 70% AMI.** For lower-income households at or above 70% AMI, an agency *may* instead require ≤ 30% of actual gross income.
  - moderate: ≥ 28% of gross income and ≤ 35% × 110% AMI. An agency *may* use 35% of gross income above 110% AMI.
- (h) Unit size → persons: studio 1, 1BR 2, 2BR 3, **3BR 4**, 4BR 5.
- (a) assistance before 1991, and (d) tenants and co-ops: out of scope. Show a note.
- (c) and (e): HCD regulations set the max-sales-price method. **We did not read them.** Our solver is our own method, and the screen says so.
- 50052.5 applies **only if the assistance requires it**. Whether this project's funding requires it is **Unknown** until a funder is chosen. Show that as an open question.

**Monthly caps, OC 3BR (AMI $138,600):** extremely low **$1,039.50**, very low **$1,732.50**, lower **$2,425.50**, moderate upper bound **$4,446.75**.

### 3.5 25 CCR 6920 (what a purchaser's "housing cost" includes)
Source: https://www.law.cornell.edu/regulations/california/25-CCR-6920 (Cornell LII, an **unofficial** copy). Housing cost includes:
- principal and interest, plus loan insurance fees
- property taxes and assessments
- **fire and casualty insurance**
- maintenance and repairs
- a reasonable utilities allowance (not telephone)
- HOA fees
- space rent

It is the average estimated cost over the next 12 months. The recurring-cost reserve in §5 is an ASSUMPTION standing in for these lines; the UI lets the user itemize it.

### 3.6 Freddie Mac PMMS 30-year fixed (weekly, national average)
Source: https://www.freddiemac.com/pmms/docs/PMMS_history.csv (read Nov 7, 2026).

| Week | 9/3 | 9/10 | 9/17 | 9/24 | 10/1 | 10/8 | 10/15 | 10/22 | 10/29 | **11/5** |
|---|---|---|---|---|---|---|---|---|---|---|
| 30-yr % | 6.71 | 6.76 | 6.95 | 7.03 | 7.28 | 7.40 | 7.40 | 7.32 | 7.24 | **7.18** |

Label: "national average; the buyer's actual rate and Habitat-style loan terms may differ". The **7.68%** rate in §5.4 is an ASSUMPTION (+0.50 point), not a published value.

### 3.7 The organizers' synthetic one-home bill (arithmetic check only)
Copy `lanes/3-fund-it/data/synthetic-example-deal.json` and `scenarios.json` from https://github.com/travcjohnson/claude-impact-lab-uci into `public/samples/fund-it/`, with credit (the repo is MIT; its text is CC0). Get them via `gh api repos/travcjohnson/claude-impact-lab-uci/contents/lanes/3-fund-it/data/synthetic-example-deal.json -H 'Accept: application/vnd.github.raw'`.
- Cost to create: $535,000 = land $360,000 + time costs $85,000 + construction $40,000 + fees $50,000.
- Paid by: family $285,000 + subsidies $100,000 + rent earned $55,000 + fundraising **$95,000**.
- The balance is $0. Every line is an ASSUMPTION. Show it as "Synthetic example (organizers): arithmetic check", never as a benchmark.

### 3.8 The real case: 504 E Avenida San Juan, San Clemente (public listing)
Source: listing page (IDX mirror of MLS# OC26039302MR) https://canyonhaus.com/home-search/listings/1827937876516032324-504-E-Avenida-San-Juan, fetched Nov 7, 2026. The page says "Data last updated 9/28/2026". Other portals (Redfin, Realtor.com, Crexi) show the same address, but this one is the only page I read in full.

| Fact | Value | Status |
|---|---|---|
| Asking price | **$5,900,000** | Published asking price. **Purchase price unknown.** |
| Lot size | 2.82 acres; land | Per listing |
| Status | Active, listed Feb 25, 2026 | Per listing as of its 9/28 data date. **Re-check before the demo** |
| Description | Says it was "previously approved for division into 4 parcels" | **Listing claim.** Whether the approval is current, and the right to sell four separate homes, are **Unknown** pending the City of San Clemente |
| Homes modeled | **4** | ASSUMPTION based on the listing claim |

Do not store the agent's name or phone number. Store the URL, check date, and the facts above.

### 3.9 Funding-source catalog
Same pattern as HomeStay's `lib/assistance.ts`. Fields: `recipient` (project or buyer), `eligibleUse`, `geography`, `amountText` and `amountMax` (only if stated), `timing`, `status` (open / verify / closed), `officialUrl`, `lastVerified`, `cautions`, `openQuestions`. **The base gap counts only sources the user marks Committed with an amount.**

| id | Source | Recipient | Official page says (paraphrased) | Geography rule | Status |
|---|---|---|---|---|---|
| `oc-map` | **OC Mortgage Assistance Program (MAP)**, OC Housing & Community Development. https://housing.oc.gov/housing-development/homeowner-programs | Buyer | Silent (deferred-payment) down-payment loans for first-time buyers: **up to $120,000 for low-income (80% AMI)** and up to $80,000 for moderate (120% AMI); 3% simple interest, 30-year deferred; 1% minimum down payment; **total sales price ≤ 85% of the OC median sales price for all homes** (the median value is not on the page, so it is Unknown); education and counseling required; participating lenders only | **Eligible areas:** Brea, Cypress, Dana Point, La Palma, Laguna Beach, Laguna Hills, Laguna Woods, Los Alamitos, Placentia, San Juan Capistrano, Seal Beach, Stanton, Villa Park, Yorba Linda, unincorporated OC. **San Clemente and Irvine are not listed** | verify |
| `fhlbsf-wish` | **WISH**, FHLBank San Francisco. https://www.fhlbsf.com/products/community-programs-grants/wish | Buyer | 2026 program has $13M; member banks can request to participate through Mar 12, 2027; **4-to-1 matching grants up to $32,837**; first-time buyer; counseling; **≤ 80% of HUD AMI** (that HUD table was not read); buyer contribution required; open escrow within a year of enrollment; repayment rules during a retention period | Through participating member banks | open (program); per-buyer funds verify |
| `santa-ana-my-first-home` | **My First Home**, City of Santa Ana. https://santa-ana.gov/my-first-home | Buyer | First-time buyer; housing cost 28–40%, total debt ≤ 45%; credit ≥ 640; 3% seasoned funds; currently 80% AMI only. **No loan amount on the page** | Unit in Santa Ana | verify (amount Unknown) |
| `calhfa-myhome` | **MyHome**, CalHFA. https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm | Buyer | First-time buyer, owner-occupied, education, CalHFA income limits, approved lenders. **Amount not on this page.** The lane notes say up to 3.5% FHA / 3% conventional on https://www.calhfa.ca.gov/homebuyer/programs/ | California | verify |
| `calhfa-dream-for-all` | **Dream For All**, CalHFA. https://calhfa.ca.gov/dream/ | Buyer | Up to 20%, not to exceed $150,000; first-generation buyer; **voucher by randomized drawing** (update dated 05/20/2026); shared appreciation on repayment | California | verify; only if the buyer holds a voucher |
| `hcd-calhome` | **CalHome / Homeownership Super NOFA**, HCD. https://www.hcd.ca.gov/grants-and-funding/programs-active/calhome and https://www.hcd.ca.gov/funding/hosn | Project (via nonprofit or agency) | Grants to agencies and nonprofits for development, acquisition and buyer assistance (deferred loans to households). The HOSN page lists only 2024 Tribal NOFA documents. Habitat OC's own post says CalHome funding has been reduced (§3.3 link) | California | verify (no open general round confirmed) |
| `ochft` | **OC Housing Finance Trust**. https://ochft.org/programs | Project | The lane notes (checked Nov 6) say a NOFA is shown; homeownership eligibility is not confirmed | OC | verify (lead) |
| `land-donation` | Landowner contribution | Project | Scenario lever, not a program | n/a | hypothetical |
| `donor-gift` | Individual or corporate gift | Project | Scenario lever; the user picks the budget line it is earmarked for | n/a | hypothetical |

**Conflict to surface (OC MAP):** search results show an OC HCD MAP application package dated Aug 3, 2026 (https://www.ochcd.org/sites/hcd/files/2026-08/map-application-package-08-03-26.pdf) and a County memo with "up to $80,000, not to exceed 20% of purchase price". **Neither was read in full.** The tool shows: "Program page says up to $120,000 (low-income); a program document seen only in search results says up to $80,000 and 20% of price. Verify with the program administrator before counting." Never pick one silently.

Left out (with reasons in the README): CalHFA Forgivable Equity Builder (no official URL), employer-assisted housing (no verified source), LIHTC (rental only). Reuse HomeStay's `hud-housing-counseling` entry. MAP, WISH, MyHome, Dream For All and Santa Ana all require homebuyer education or counseling.

---

## 4. The one screen (route `/`; HomeStay moves to `/homestay`)

**Top: decision card (largest text).**
> **At asking price, 504 E Avenida San Juan does not pencil for 4 homes.**
> Even with donated land, the project still needs **$941,157** (**$235,289 per home**).
> **Verify first:** the $2,000,000 development budget. A 10% miss moves the gap $200,000.
> Next checks: (1) are 4 ownership parcels still approvable (City of San Clemente)? (2) does the development budget survive a preliminary estimate?

Show three number tiles next to it: **gap per home (free land)**, **max land price supported** ("none; −$941,157"), **cash needed at land closing** (= land price − committed sources received by then). Whichever tile the mentors pick (§2) is the big one. Phrase it as a **signal for the finance lead**, never a decision for them, e.g. "Pause at asking price? These inputs say it does not pencil." Add a "Conditional scenario; listing establishes asking price only" chip.

**Left column: inputs, grouped, each with a source chip or an ASSUMPTION chip.**
- **Property:** listing card (§3.8) with price, URL and check date; homes = 4 (ASSUMPTION, city verification needed); land price mode: asking / custom / donated.
- **Development costs:** $2,000,000 total (ASSUMPTION: construction, site work, fees, financing, sales, contingency; no site-specific bids). P1: allow itemizing.
- **Household (fictional):** 4 people, $100,000/yr gross (ASSUMPTION). Show where that falls in §3.1: 72.2% of AMI, between very low ($93,050) and low ($148,850), so lower income.
- **What families can pay:**
  - Household budget = 30% × gross income ÷ 12 = **$2,500** (ASSUMPTION; note Santa Ana uses 28–40%).
  - Program cap, 50052.5 lower income, 3BR = **$2,425.50** (source).
  - Use **the lower**: $2,425.50, with a toggle for "no 50052.5 requirement (cap not applied)". Show both prices side by side.
  - Recurring costs reserve: **$700/mo** (ASSUMPTION: taxes, insurance, utilities, maintenance, any HOA or mortgage insurance; itemize per 25 CCR 6920 if time).
  - Mortgage: 30 years at the PMMS week (default 11/5/2026, 7.18%) or custom (labeled "not published").
  - Buyer cash $10,000 per home (ASSUMPTION; closing costs assumed covered separately; Habitat-style loan terms need verification).
- **Synthetic check** (collapsed): the organizers' $535k bill balances to $0.

**Right column: results.**
- **Breakdown:** monthly budget → − reserve → P&I → mortgage → + buyer cash = price per home → × homes = buyer proceeds. Then land + development − proceeds − committed sources = gap. Every line shows its formula.
- **Levers** (instant deltas, per home and project):
  - land: asking ↔ donated
  - rate: any two PMMS weeks, or +0.50 point (ASSUMPTION)
  - donor gift: amount + earmarked budget line
  - insurance: +$150/mo per home (HomeStay bridge, with a link "See this renewal from the family's side → /homestay")
- **Verify first:** ranking from §5.5, in plain words.
- **Who could close it:** cards for §3.9 with recipient, eligible use, geography, amount, timing, check date, status, and a finance-lead status control (To verify / Not eligible / Applied / Committed) with an amount field.
  - **Geography check runs automatically:** MAP on San Clemente shows a **red "Not in eligible area: counts $0"** card with the eligible-area list and source link. A one-click "Try the same numbers in Dana Point" shows MAP as potential buyer-side assistance, still **not counted** until Committed, with the 85%-of-median cap and the $120k vs $80k/20% conflict listed as checks.
  - Two totals: **base gap (committed only)** and **"if candidates came through"**, which says how many candidates have unknown amounts and are excluded.
- **Donor view:** "$25,000 earmarked to *construction and site work* covers 1.25% of that $2,000,000 line and reduces the free-land gap to $916,157." Note: "Money is pooled; this shows scale, not where the gift is spent." IRS Pub 526 link as general info only.
- **Copy funder memo** (§4.1).

**Footer:** "Prototype. Not legal, financial or lending advice. Listing facts are as published; program terms change; verify with the source."

### 4.1 Funder memo text
Header: "DRAFT · CONDITIONAL SCENARIO · NOT A FINANCING COMMITMENT OR ELIGIBILITY DETERMINATION". Then:
- the decision signal
- property facts with listing URL and check date
- what families can pay (both bases)
- the breakdown and gap per home and for the project
- the levers
- the verify-first ranking
- sources by status (counted / not counted and why, e.g. "OC MAP: San Clemente not in published eligible areas → $0")
- open questions
- every source URL with its check date, and every ASSUMPTION

Must not match `/you qualify|you are eligible|guaranteed|approved for/i`.

---

## 5. Math (pure functions in `lib/fundit/`, all tested)

### 5.1 What families can pay
```
amiForUnit(bedrooms)   = table.median[bedrooms + 1]          // 50052.5(h); >4 BR → Unknown
programCapMonthly(cat) = {extremelyLow:.30*.30, veryLow:.30*.50, lower:.30*.70, moderate:.35*1.10}[cat] * ami / 12
householdBudgetMonthly = budgetShare (ASSUMPTION .30) * grossIncome / 12
usedBudgetMonthly      = applyCap ? min(householdBudgetMonthly, programCapMonthly) : householdBudgetMonthly
incomeCategory(income, persons) from §3.1 rows (show the % of AMI too)
```

### 5.2 Price per home (one general solver)
```
f(rate) = i(1+i)^360 / ((1+i)^360 − 1),  i = rate/100/12
P = (B − R + (C + D)·f) / ((1 − d)·f + t/12)
  B = usedBudgetMonthly            R = recurring reserve $/mo (all non-P&I costs not modeled as % of price)
  C = fixed buyer cash $           d = buyer cash as % of price (0 in the San Clemente case)
  D = deferred buyer assistance $  (only committed, applicable sources)
  t = property-tax rate as % of price (0 when taxes are inside R)
If B − R ≤ 0 (and C + D = 0) → price is $0 and "does not pencil at this budget"; never negative.
```
San Clemente default (d = 0, t = 0, D = 0): `P = (B − R)/f + C`.

### 5.3 Project
```
proceeds        = homes × P
gap             = land + devCost − proceeds − committedProjectSources
maxLandSupported = proceeds + committedProjectSources − devCost     // < 0 → "no land price works; free land leaves −value"
gapPerHome      = gap / homes
cashAtLandClose = land − Σ committed sources with receiptDate ≤ acquisitionDate   (P1: dates are user inputs)
```

### 5.4 Reference results (test anchors; ±$0.01)
Inputs: 4 homes; development $2,000,000; household 4 people, $100,000; reserve $700; buyer cash $10,000; 30 years. All are ASSUMPTIONs except the rate and the cap.

| Scenario | **Cap applied** (budget $2,425.50, P&I $1,725.50) | Cap not applied (budget $2,500, P&I $1,800) |
|---|---:|---:|
| Mortgage per home @ 7.18% | $254,710.85 | $265,708.22 |
| Price per home (+$10k cash) | $264,710.85 | $275,708.22 |
| Buyer proceeds, 4 homes | $1,058,843.39 | $1,102,832.86 |
| Gap, land at asking ($5.9M) | $6,841,156.61 | $6,797,167.14 |
| **Gap, land donated** | **$941,156.61** ($235,289.15/home) | $897,167.14 ($224,291.78/home) |
| Land donated + $25,000 gift | $916,156.61 | $872,167.14 |
| Land donated, rate 7.68% (ASSUMPTION) | $990,047.29 (+$48,890.68) | $948,168.72 (+$51,001.58) |
| Max land price supported | −$941,156.61 → none | −$897,167.14 → none |
| Insurance +$150/mo per home | +$88,569.41 (both bases) | +$88,569.41 |

Land per proposed home at asking: $1,475,000. The cap costs $43,989.47 versus the household budget alone. Show that difference in one line: "If the funder requires the 50052.5 lower-income cap, families can pay less: +$43,989 gap."

Synthetic check: the organizers' file balances to $0 as given (cost $535,000, paid by $535,000).

### 5.5 "Verify first" ranking (deterministic)
Recompute the gap with one assumption moved at a time, using fixed step sizes (themselves ASSUMPTIONs, shown in the UI). Sort by |Δgap|. Default results (cap not applied; with the cap, the rate step is $48,891):

| Assumption | Step | Δ gap |
|---|---|---:|
| Development budget | +10% | **+$200,000.00** |
| Recurring reserve | +$100/mo per home | +$59,046.27 |
| Household budget | −$100/mo per home | +$59,046.27 |
| Mortgage rate | +0.50 point | +$51,001.58 |
| Buyer cash | −$5,000 per home | +$20,000.00 |

Wording: "Verify first: development budget. A 10% miss moves the gap by $200,000." Land is excluded from the ranking because it is an explicit lever (asking vs donated).

---

## 6. Claude inside the tool (P1, only after the core ships)

**"Re-check a program from its page."** The finance lead pastes text from an official program page. The server extracts only stated fields (max amount, recipient, eligible areas, income limit text, deadline, funds-available text), each with a **verbatim quote**. Validate with Zod, drop quotes not found in the text, and have a person confirm each field before it updates the card. Reuse HomeStay's pipeline (`lib/notice-extraction.ts`, `lib/extractor*.ts`, consent text, `EXTRACTOR` backends) with a second schema and prompt. Do not change HomeStay behavior. For the offline demo, add one fixture for the OC MAP page excerpt (short quotes ≤ 30 words: the $120,000 line and the eligible areas), labeled "Demo fixture, no AI call". AI never computes. If time is short, skip it and say so.

## 7. Optional live rate check (P1, small)
`GET /api/pmms-latest` fetches the PMMS CSV once per server start (10 s timeout, in-memory cache) and returns `{date, rate30}`. The UI shows snapshot vs live; on failure it shows "Live check unavailable; using snapshot". Add a stale warning if the chosen week is more than 14 days old (ASSUMPTION). No other runtime fetches.

---

## 8. Files (suggested)
```
app/page.tsx                       → <PencilApp/>   (Fund it, judged demo)
app/homestay/page.tsx              → <HomeStayApp/> (moved unchanged)
components/fundit/pencil-app.tsx   decision card, inputs, results, levers, sources, donor, memo
lib/fundit/sources.ts              every source {id,title,url,effectiveDate,checkedDate,note}
lib/fundit/income-limits.ts        §3.1, §3.2 (frozen)
lib/fundit/rates.ts                §3.6 snapshot (+ CSV parser if §7)
lib/fundit/affordability.ts        §5.1–5.2
lib/fundit/project.ts              §5.3, levers, §5.5 ranking
lib/fundit/catalog.ts              §3.9 + geography check + committed/candidate totals
lib/fundit/property.ts             §3.8 San Clemente snapshot (+ the synthetic deal loader)
lib/fundit/memo.ts                 §4.1
lib/fundit/state.ts                pure reducer: edits, statuses, reset
public/samples/fund-it/            synthetic-example-deal.json, scenarios.json (credited)
tests/fundit-*.test.ts
LICENSE                            MIT
```
Reuse `components/ui.tsx` and `lib/format.ts`; keep HomeStay's look.

## 9. Tests (only these; `npm run check` green after each step)
- Tables: OC AMI 138,600; Low 4-person 148,850; Very Low 4-person 93,050; State vs HOME 30/50/80 rows equal; https URLs and ISO dates on every source.
- Caps: four monthly values from §3.4; 3BR → 4 persons; >4BR → Unknown. $100,000 for 4 people → lower income, 72.2% of AMI.
- Solver and project: every cell of §5.4 within $0.01; max land supported is negative → "none"; P never negative.
- Ranking: order and values of §5.5.
- Catalog: OC MAP for San Clemente → not eligible, $0 counted; for Dana Point → candidate, still $0 in the base gap until Committed with an amount; MAP card lists the $120k vs $80k/20% conflict; no source counts until Committed; unknown amounts are excluded and counted; Santa Ana only for Santa Ana.
- Memo: contains the listing URL, the check dates, "ASSUMPTION", "CONDITIONAL"; does not match the banned phrases.
- Reset restores the initial state; seeds are frozen.
- HomeStay: the existing 83 tests pass unchanged (direct $150→$300 / $400→$250; escrow $150→$270 / $400→$280).

## 10. Time plan (now ≈ 11:15 AM; due 2:30 PM)
| By | Done | Push |
|---|---|---|
| 12:00 | `lib/fundit` data + math + §5.4 / §5.5 tests | yes |
| 12:45 | One screen: decision card, inputs, breakdown, levers; HomeStay at `/homestay`; build passes. **Minimum shippable demo** | yes |
| 1:30 | Sources panel with the MAP geography catch, donor, memo + tests | yes |
| 1:50 | README to the event template (§11), LICENSE, screenshot | yes |
| 2:05 | Optional §7, then §6 only if real slack | yes |
| 2:15 | Fresh clone → `npm ci` → `npm run check` → `npm run build` → `npm start`, offline walk; open the repo signed-out | final |
| 2:25 | Video + hub form (§12) | — |

If behind at 12:45, cut §6, §7, itemized costs, cash-at-closing dates and charts. Ship the decision card, levers, MAP catch and memo.

## 11. README (event `templates/TEAM-README.md` structure)
Lead with Pencil. Move HomeStay below as "Companion: HomeStay (after closing)". Sections:
- name + one sentence
- Team / Members / **Lane 3 Fund it** / Built at
- real user, before/after
- what we built (screenshot, video link)
- how Claude is used: built with Claude Code / Kiro; runtime extraction only if §6 ships; what a person checks
- **Try it**: `npm ci && npm run dev`, Node ≥ 20.9, no key needed
- **Sources and assumptions** table: every row of §3 and every ASSUMPTION in §5.4 / §5.5, with dates
- **What is real and what is mocked**
  - real: listing facts as published, HCD tables, statute, PMMS snapshot, program pages as of Nov 7
  - assumed: development budget, household, reserve, buyer cash, 7.68%, step sizes
  - synthetic: the organizers' deal
- **Where it gets things wrong**
  - the price method is ours, not HCD's regulation
  - flat reserve instead of itemized 12-month costs
  - national average rate
  - listing data dated 9/28 and subdivision status unknown
  - HUD AMI for WISH not read
  - MAP amount conflict unresolved
  - MyHome amount not confirmed
- next steps, including the 100-project path: dated tables, one property file per site, shared source catalog
- data and privacy
- MIT license

**Team:** MSBA
**Members:** Brianna Faussette, Phuong Nguyen, Jake Lwin, Wilson Choi
**Lane:** 3 Fund it
**Built at:** Claude Impact Lab: UCI × SoCal Affordable Housing, November 7, 2026

## 12. Pitch and submission drafts
**Opening line (sourced):** "In Orange County a median home costs about $1.47 million, and only about 15% of households can afford one (C.A.R., Q3 2026, per the event brief)." Do **not** use the Irvine "30,845 cost-burdened renter households" figure from the teammate draft unless someone finds and cites its source. It could not be verified on Nov 7.

**Live demo (about 90 s):**
1. Open San Clemente: $5.9M asking, 4 homes, sources and assumptions visible.
2. Asking → donated land: the gap falls from $6.84M to $941K. Toggle the cap off to show $897K, and say why the two differ.
3. Rate +0.5 point: +$49K. Insurance +$150/mo: +$89K, "the same renewal HomeStay explains to the family".
4. Sources: OC MAP shows $0 and why (San Clemente is not an eligible area), so nobody subtracts $480,000. Apply a $25,000 gift to the construction line.
5. "Verify first: the $2M budget." Copy the memo.

**30-second video:** a compressed version of 1, 2, 4 and the verify-first line.

**One-liner:** For an OC affordable-homeownership finance lead, Pencil shows whether a listed site can work. It covers what families can pay under today's income limits and rate, what stays unfunded even with donated land, which assumption to check first, and which funding sources really apply, with every number sourced or labeled.

## 13. Final report the session must give
What shipped vs. cut; `npm run check` and `npm run build` results; the browser walk (San Clemente decision card, levers, MAP catch, Dana Point variant, memo copy, Reset, `/homestay` still works, no requests outside localhost unless §7 ran); every source URL with its check date; every ASSUMPTION; any placeholders left (the video link is the only expected one).

---

## Appendix: sources reviewed (Nov 7, 2026)
- Event hub https://claudesocal.com/uci-impact-lab; lane repo https://github.com/travcjohnson/claude-impact-lab-uci at `45a05a5` (README, CLAUDE.md, docs, brief and slides PDFs, TEAM-README template, lanes/3-fund-it)
- HCD State Income Limits 2026 (rev. 6/23/2026) and State HOME 2026 (eff. 6/1/2026): URLs in §3.1–3.2
- HSC 50052.5 (leginfo); 25 CCR 6920 (Cornell LII, unofficial)
- Freddie Mac PMMS CSV
- Listing: canyonhaus.com IDX page for MLS# OC26039302MR (URL in §3.8)
- OC HCD Homeowner Programs (MAP): https://housing.oc.gov/housing-development/homeowner-programs
- Habitat OC blog (income range): URL in §3.3
- FHLBank SF WISH; Santa Ana My First Home; CalHFA MyHome and Dream For All; HCD CalHome and HOSN: URLs in §3.9
- Seen only in search results (not read; leads): the OC MAP Aug 2026 application package, the older Habitat OC income post, Redfin/Realtor.com/Crexi copies of the listing, OCHFT programs (lane notes, Nov 6)
