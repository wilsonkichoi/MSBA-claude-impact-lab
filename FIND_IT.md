# FIND_IT.md: "South OC Home Atlas", a Lane 1 (Find it) map on top of Pencil

> **Implementation brief for a new Kiro / Claude session.**
> Event: Claude Impact Lab, UCI × SoCal Affordable Housing, **Saturday Nov 7, 2026**.
> **Submissions due 2:30 PM PT** (public repo on `main` + video + hub form). Finalists demo live at 3:00.
> Written about 12:00 PM on Nov 7. Inputs: Brianna's prompt and HTML prototype, her ChatGPT site (https://south-oc-home-atlas.briannafaussette.chatgpt.site/, scripts read Nov 7), the lane repo at commit `45a05a5`, and fresh checks of CEQAnet, OC GIS, SCAG, FEMA, the Census Geocoder and OSM run while writing this. Budget time against §10.

---

## 0. Start here

**Repo:** `/Users/wchoi/src/habitatoc` → https://github.com/wilsonkichoi/MSBA-claude-impact-lab (`main`, public). It contains **Pencil** at `/` (Lane 3, the judged demo, 117 tests green) and **HomeStay** at `/homestay`. Read `README.md`, skim `FUND_IT.md` and `lib/fundit/`. Their rules still apply.

**Assignment:** add **South OC Home Atlas** at **`/find`**: an interactive map with two layers.
- **Buy or plan ahead** (first-time buyer): "I work in Irvine. Which South OC communities should I look at, what would I pay each month, how would I get to work, and who can help me next?"
- **Future sites** (nonprofit acquisitions lead, the actual Lane 1 user): "Why investigate this site, which pathway might open it, and what is still unknown?"

The Future-sites parcel is **the same site Pencil models** (504 E Avenida San Juan). That gives the team a Find → Fund story on one parcel: the map says why to look at it, Pencil says what it would take.

**Decided (Nov 7, ~12:05 PM):**
1. **One web app, sections side by side.** Find it and Fund it live in the same UI as sections the presenter can pick from or walk through in order. Build a **shared section nav** on every page: **1 Find it** (`/find`) → **2 Fund it** (`/`, Pencil, unchanged) → **3 Stay** (`/homestay`, unchanged). Keep the existing routes so nothing in Pencil moves; the nav is the only change to the other two pages (§7). The hub form still asks for one lane; pick it at submission time (Lane 3 unless the team says otherwise). That choice does not change the build.
2. **Featured future site: 504 E Avenida San Juan** (vacant 2.82-acre land listing, SB 9 pathway, the parcel Pencil already models). Brianna's 317 Avenida Monterey (7-unit apartment, condo conversion) is a P1 second pin (§3.5).
3. **Map: cheapest working option.** Leaflet 1.9.4 + OSM tiles online; offline fallback is a plain background with the station line and pins (no data download). The Census TIGER basemap file is P2 (§6).

**Rules that do not bend** (event `CLAUDE.md`, ground rules, `PROTOTYPE_PLAN.md`, `FUND_IT.md` §0):
- Never invent a price, fee, address, APN, parcel fact, schedule or contact. If a source does not say, show **"Unknown"** or **"Price unpublished"**.
- Label every assumed number `ASSUMPTION` in code, UI and README.
- Every card shows its source links and a last-checked date. When sources disagree, show both.
- Deterministic TypeScript does all math (full precision, round only for display via `lib/format.ts`). No AI at runtime in this feature.
- **No personal information.** The buyer is fictional and lives only in browser state. Show **organizational contacts only**: no staff names, no agent names or phone numbers, even though CEQAnet and listing pages show them. A city office phone number is fine only if it appears on the city's own page.
- Nothing is sent or applied for. The buyer brief is text the user copies.
- **Never present a rental as a home for sale.** A potential site is never shown as something a buyer can purchase or apply for.
- No routing API. Never turn straight-line miles into a travel time.
- The demo works offline with no API key. Listing and record facts are a dated static snapshot. **Never fetch listing sites at runtime.** The map's online tiles are the only runtime request, and the offline base takes over when they fail.
- Do not break Pencil or HomeStay. `npm run check` stays green after each step; existing tests unchanged. The only allowed edit to Pencil and HomeStay is adding the shared section nav in their `page.tsx` files (§7). One new dependency (`leaflet` + `@types/leaflet`) is approved; nothing else. Commit and push to `main` often. **Do not commit the stray `60` file in the repo root (a curl cookie jar).**

---

## 1. Review of the materials

### 1.1 What the lane asks (lanes/1-find-it)
- Problem: nonprofits find sites by luck. Laws (SB 9, SB 684/SB 1123, AB 2011, SB 4, condo conversion) and parcel data are public, but not connected. A legal site may still be unusable: ownership, willingness, slope, contamination, fire and flood, utilities.
- Users: acquisitions lead with no GIS team, a congregation with a lot, city housing staff. Scenarios F01 (congregation), **F02 (acquisitions lead: "ten sites… and why each one")**, **F03 (city staff: "flag the slope or fire-zone sites first")**.
- Idea 1 in the README is exactly our Future-sites panel: a yes / no / unknown per site test, with the reason.
- Real case: "any publicly listed small building or lot in Orange County, roughly 4 to 12 homes… Label every assumed number."

### 1.2 What Brianna's prompt adds
A buyer-facing map (most of the prompt) plus a Future-sites layer (§7 of her prompt). The buyer side is closer to a homeownership-counseling tool than to Lane 1. That is fine for the demo, but judges score Lane 1 on the acquisitions lead. **Keep the Future-sites panel strong and visible in the demo (at least 25 of the 90 seconds).**

### 1.3 Two prototypes, compared
| | HTML prototype (pasted) | ChatGPT site (newer) | Use in this build |
|---|---|---|---|
| Map | Hand-drawn SVG, "not to scale" | Projected raster base (Census / USGS / NOAA / Mapzen), pan/zoom | Real Leaflet map (§6) |
| Camino Twelve position | 33.4890, −117.6620 (**~1.9 km east of the parcel**) | 33.486834, −117.682386 (matches county parcel) | 33.4868, −117.6823 |
| Irvine Station | 33.6869, −117.8230 (**~9 km off**) | 33.6568, −117.7335 (matches OSM) | 33.65679, −117.73353 |
| Priced home | Invented $650,000 practice scenario | Real listing, Vista Pacifica #420, $475,000, HOA $606 | Vista Pacifica, rechecked (§3.3) |
| Future site | 504 E Avenida San Juan, coordinates ~1.2 km off, 7 tests | 317 Avenida Monterey, APN 692-043-07, 10 tests | 504 E Avenida San Juan (§3.4), Monterey P1 |
| Commute | Links only | Cached weekday timetable example (train 603, OCTA 473) | Her cached example, rechecked (§3.6) |
| Fit-price math | `fit()` has unused variables and a muddled cash rule | Clean closed form, payment cap and cash cap | Her method, our dated rate (§5) |
| Rate | 7.18% (PMMS 11/5/2026) | 6.5%, undated | 7.18% from `lib/fundit/rates.ts` |
| Guidance links | habitatoc.org/home-ownership, hud.gov/findacounselor | habitatoc.org/attend-an-orientation, CFPB counselor finder | Orientation + CFPB (HUD link as backup) |
| Hazard note | "Norte Fire, Oct 2026" via CBS LA | none | **Drop** unless someone reads the article and the city's evacuation page |

---

## 2. Users and the 90-second question

- **Buyer (fictional):** two-person household, $100,000 gross/yr, $25,000 saved, prefers $2,500/mo all-in, works near Irvine Station (or UC Irvine). Editable. Sample mode needs no personal details. Nothing leaves the browser.
- **Acquisitions lead (role, not a real person):** at an OC affordable-homeownership nonprofit with no GIS staff. Before: luck, plus a dozen map tabs for zoning, fire, flood and the listing. After: one panel with each test marked Supported / Conflict found / Unknown, with source and date, and the next call to make.

Show the buyer's income against HCD's 2026 state limits for **2 persons** using `lib/fundit/income-limits.ts`: $100,000 is above Very Low ($74,450) and at or below Low ($119,100), so it falls in the **Low Income** row, about **90.2% of the 2-person median ($110,900)**. Label it "HCD income category, not a program eligibility decision". The Camino Twelve affordable home's income category is **Unknown** (the NOE doesn't say).

---

## 3. Verified data to embed (checked Nov 7, 2026 unless noted)

Static typed data with `sourceUrl`, `checkedDate` and, where a document has one, `documentDate`. Extend `lib/fundit/sources.ts` or add `lib/findit/sources.ts` with the same shape.

### 3.1 Map anchors
| Place | Lat, Lon | Source |
|---|---|---|
| Irvine Station, 15215 Barranca Pkwy | 33.65679, −117.73353 | OSM Nominatim (railway station node). Census Geocoder interpolates the address to 33.66172, −117.74466; prefer OSM |
| San Juan Capistrano Station, 26701 Verdugo St | 33.50136, −117.66367 | Census Geocoder |
| San Clemente Station, 1850 Avenida Estacion | 33.43282, −117.63345 | Census Geocoder |
| UC Irvine | 33.64295, −117.84016 | OSM Nominatim (campus). Brianna used the Student Center, 33.6488, −117.8425; either is fine if labeled |

### 3.2 Camino Twelve (featured, "Planned or approved")
25642 Camino Del Avion, San Juan Capistrano 92675. **APN 668-491-32** (CEQAnet SCH 2026100816; OC Parcels layer returns two polygons with this APN). Map point **33.4868, −117.6823** (parcel centroid; Census Geocoder 33.48717, −117.68220).

**Project history (all CEQAnet notices of exemption, lead agency City of San Juan Capistrano):**
| Date | Record | What it says |
|---|---|---|
| 2024-08-08 | [SCH 2024080316](https://ceqanet.lci.ca.gov/2024080316) | City Council approved AC 23-008, GPM 23-020, TRP 23-024 and Vesting Tentative Tract Map 23-002 for a **twelve-unit townhome development on a 0.61-acre parcel**. Resolution No. 24-08-06-01 (cited in the 2026 notice) |
| 2026-05-07 | [SCH 2026050256](https://ceqanet.lci.ca.gov/2026050256) | Density Bonus Housing Agreement with Camino Twelve, LLC "to provide one affordable housing unit as a part of the approved twelve unit residential project" |
| 2026-10-22 | [SCH 2026100816](https://ceqanet.lci.ca.gov/2026100816) | **Final Tract Map for a 12-unit residential condominium development**, plus subdivision improvement and landscape maintenance agreements. "The purpose of the subdivision map is to allow for individual sales of the residential units" |

Leads, not read: Brianna's site cites a June 2026 City Manager Weekly Update for "construction began by June" (https://sanjuancapistrano.org/DocumentCenter/View/5728/City-Manager-Weekly-Update---26-0604). Read it before showing that claim. An HCD Housing Accountability Unit letter dated July 8, 2024 appears in search results (https://hcd.ca.gov/sites/default/files/docs/planning-and-community/HAU/san-juan-capistrano-hau-951-070824.pdf). **The "March 2025 city report" in the prompt was not found.** Say so, and cite the CEQAnet records instead. Note that the 2024 record says "townhome" and the 2026 record says "condominium". These describe the building type and the legal form; show both.

**Buying status:** "Price unpublished. HOA dues, assessments, the sales office, and the affordable-home application window could not be verified as of Nov 7, 2026. The October 2026 final map is the step that allows individual sales."
**Next step:** "Ask the City of San Juan Capistrano planning staff who will administer the affordable home sale and where the application window will be announced." Link to the city's planning / development services page (find the exact URL on sanjuancapistrano.org; Brianna shows (949) 443-6313, so show it only if the city page lists it).
**Buyer questions (brief):** (1) "Who will administer the affordable home sale, and where will the application window be announced?" (2) "What income category and sales price limit apply to the affordable home?" (3) "What HOA dues and any special assessments or Mello-Roos are expected?"
**Do not store:** the staff and applicant names that CEQAnet lists.

### 3.3 Vista Pacifica #420 (priced comparison, "For sale")
1046 Calle Del Cerro #420, San Clemente 92672. From Brianna's site (checked Nov 7): one-bedroom resale condo, 608 sq ft, built 1986, **listed $475,000** (CRMLS OC26195508), **HOA $606/mo** (two associations), special assessments unknown. Source: https://www.redfin.com/CA/San-Clemente/1046-Calle-del-Cerro-92672/unit-420/home/5201350.
- **Recheck before building.** My search on Nov 7 found the listing on Redfin, Realtor.com, First Team and Canyonhaus. One First Team copy says "A GREAT condo at even a Better Price!", so the price may have changed. I did not read the price myself. Use whatever a listing page shows today, with its date. If no active listing can be confirmed, switch the card to a **"Practice scenario, not a listing"** outside the live inventory, as the prompt requires.
- Map point: Brianna has 33.445712, −117.597950; the Census Geocoder puts 1046 Calle Del Cerro at 33.44290, −117.60729 (~0.9 km apart). The county parcel layer did not match the address. Use the Census point and label "approximate (street-address geocode)", or confirm with the listing map.
- Store only price, HOA, beds, size, year built, MLS number, URL and check date. IDX pages say their data is for "personal, non-commercial use". This is a non-commercial demo that links out; no photos, no copied description, no agent name.
- Next step: "Confirm availability, HOA disclosures, any special assessment and the current tax bill through the listing brokerage." Link to the listing.

### 3.4 Future site: 504 E Avenida San Juan, San Clemente ("Potential site")
Listing facts are already in `lib/fundit/property.ts` (FUND_IT.md §3.8): $5,900,000 asking, 2.82 acres, land, active (listed Feb 25, 2026; data updated 9/28/2026), "previously approved for division into 4 parcels" (listing claim). **Reuse that module. Do not duplicate the facts.** Re-read the listing page (https://canyonhaus.com/home-search/listings/1827937876516032324-504-E-Avenida-San-Juan) for status before the demo.

**GIS checks run Nov 7, 2026 (all free public services):**
- Census Geocoder matched "504 E AVE SAN JUAN" at **33.42381, −117.60178**. That point falls among 1965-built homes (522, 524, 606 E Ave San Juan, etc.). **The county parcel layer has no parcel with this site address.**
- **Candidate parcel (lead, not fact): APN 690-182-12**, "ADDRESS NOT AVAILABLE", centroid **33.42212, −117.60095**, just south of the 500 block. Matched by size and location only: SCAG gives 2.86 acres; the listing says 2.82. **Confirm the APN with the County Assessor, the City or the listing before relying on it.** Every parcel-level test below is for this candidate.
- [SCAG Zoning_poly_OR](https://maps.scag.ca.gov/scaggis/rest/services/LDX/Zoning_poly_OR/MapServer/0) at the candidate: `APN24 69018212`, `ZN24_CITY` **RL**, `ACRES` 2.861, `SLOPE` **20** (units not documented in what we read), `YEAR` 2024.
- [SCAG GeneralPlan_poly_OR](https://maps.scag.ca.gov/scaggis/rest/services/LDX/GeneralPlan_poly_OR/MapServer/0): `GP24_CITY` RL, `DEN_MAX` **4.5** (du/acre).
- [SCAG Existinglanduse_poly_OR](https://maps.scag.ca.gov/scaggis/rest/services/LDX/Existinglanduse_poly_OR/MapServer/0): `LU24` **1800**. Find SCAG's land-use code table and decode it before showing a label. Until then show "SCAG code 1800 (decode pending)". If the code means open space, that conflicts with the listing's "land for sale" and must be shown as a conflict.
- [OC Fire_Hazard_Severity_Zones_LRA](https://www.ocgis.com/arcpub/rest/services/Map_Layers/Fire_Hazard_Severity_Zones_LRA/MapServer/0): **HAZ_CLASS "Very High"**, LRA, incorporated, at both the geocoded point and the candidate. The service gives no map vintage. CAL FIRE's LRA map effective 2025 (CNRA hub) was not checked.
- [FEMA NFHL layer 28](https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28): **Zone X, "AREA OF MINIMAL FLOOD HAZARD"**, SFHA false, at the candidate centroid. One point, not the whole parcel.
- [SCAG HousingElementSite_poly_scag](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer/0): no site at the candidate centroid.

**Pathway: SB 9 urban lot split + two units per lot = 4 homes (ASSUMPTION).** Source: [HCD fact sheet "Duplexes and Lot Splits (SB 9)", April 2026](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/lot-splits-and-duplexes-sb-9.pdf), Gov. Code §§ 65852.21, 66411.7 (read in full Nov 7). Paraphrased:
- p.1: applies to a lot zoned single-family residential within an urbanized area; split into two lots of roughly equal size; local standards cannot preclude two 1,200 sq ft lots or units of at least 800 sq ft.
- p.2: with an urban lot split, the agency must allow two units on each resulting lot. The owner-occupancy affidavit for a lot split does not apply when the applicant is a community land trust or nonprofit organization. 60-day decision on a complete application.
- p.3: SB 9 does not apply to environmentally sensitive, hazardous or protected lands listed in Gov. Code 65913.4(a)(6)(B)–(K) as it read on Sept 16, 2021. The fact sheet does not list them. HCD's Sept 19, 2024 letter to Laguna Beach says that city "misapplied site exclusion criteria for fire and fault hazard zones". **Read 65913.4(a)(6) in a browser (leginfo blocks automated fetch) before writing the fire test's reason.** Until then, the SB 9 hazard test stays **Unknown**.
- p.3: parcels created by an earlier SB 9 split cannot be split again.
- Alternative path to name, not model: the listing's claimed prior 4-parcel approval (a standard subdivision map). Whether it is still valid is **Unknown**.

**"Why investigate this site?" tests (status · reason · source · date):**
| Test | Status | Reason |
|---|---|---|
| Publicly offered | Supported | Active land listing, $5.9M asking, 2.82 ac (listing data dated 9/28/2026) |
| Parcel identity | **Unknown** | No county parcel carries this address; candidate APN 690-182-12 matched by size and location only |
| Zoned single-family (SB 9 entry test) | Unknown | SCAG 2024 record shows RL on the candidate. Confirm that San Clemente's RL zone is a single-family residential zone (city zoning code) |
| Fire hazard | **Conflict found** | County LRA layer: Very High Fire Hazard Severity Zone at the candidate; layer date not stated |
| SB 9 hazard exclusions | Unknown | Excluded lands are in 65913.4(a)(6)(B)–(K); text not yet read; HCD says cities have misapplied the fire exclusion |
| Flood | Supported | FEMA NFHL Zone X (minimal) at one interior point; check the whole boundary |
| Slope | Unknown | SCAG SLOPE field = 20, units not documented; the listing says "panoramic ocean-view", so expect grading questions |
| Existing use | Unknown | SCAG land-use code 1800, decode pending; the listing says land |
| Prior 4-parcel approval | Unknown | Listing claim only; no city record found |
| Utilities and access | Unknown | The listing says utilities are "easily accessible" (listing claim); no utility record checked |
| Owner willingness and terms | Unknown | Listed for sale at asking; nonprofit terms, donation or bargain sale unknown. No owner contact made |
| Not already a housing-element site | Supported | SCAG housing-element site layer returns nothing at the candidate |

**Next verification step:** "Ask the City of San Clemente Planning Division to confirm the APN, whether RL is a single-family zone for SB 9, how the Very High fire zone affects an SB 9 split here, and whether the 4-parcel approval is still active." Link: https://www.sanclemente.gov/240/Planning-Services (from Brianna's site; open it once to confirm).
**Scale line:** "Homes modeled: 4 (ASSUMPTION: SB 9 split, two units per lot; also the listing's 4-parcel claim). The SCAG general-plan maximum of 4.5 du/ac × 2.86 ac is about 12.9; that is a ceiling from a regional dataset, not a yield."
**Bridge:** a button **"Does it pencil? Open in Pencil →"** to `/`. One line: "Pencil: even with donated land, 4 homes here still need about $941,157."

### 3.5 P1 second site: 317 Avenida Monterey, San Clemente (Brianna's)
7-unit apartment building, APN 692-043-07, SCAG RM on 0.21 ac, condo-conversion pathway (San Clemente Municipal Code ch. 16.40; Gov. Code 66427.1 tenant notices and purchase rights). Marketing says partially occupied, so a scenario that needs vacant delivery is a **Conflict found**, and displacement must be named. Port her 10 tests from `site-data.js` only after re-running each query and opening each link. Her code-library links (gocodebook.com, findlaw.com) are secondary sources; label them that way.

### 3.6 Commute (no routing API)
- **Drive:** straight-line miles (labeled "straight-line, not a driving distance") + "Open driving directions" link (Google Maps `dir` URL with origin and destination, no key) + Caltrans QuickMap link. **No time.**
- **Transit:** a cached weekday example from Brianna's `routes.js`, **to be checked against the current Metrolink Orange County Line timetable** (https://metrolinktrains.com/schedules/?lineName=Orange+County+Line&type=line) and the OCTA November 2026 bus book for Route 473 (https://octa.net/eBusbook/CompleteBusBook_November2026.pdf). Her values: OC Line train 603 departs San Clemente 5:44, San Juan Capistrano 5:56, Laguna Niguel/Mission Viejo 6:02; arrives Irvine 6:12 and Tustin 6:20; OCTA 473 from Tustin at 6:48, due University Center about 7:06. If a time can't be confirmed, show the timetable link and "Example time not verified" instead of the number.
- Show it as everyday steps: home → station (straight-line miles plus an **ASSUMPTION** access allowance, e.g. 15 min to reach the station and 10 min to board), train segment (station-to-station minutes, labeled as such), transfer, final leg. Then **door-to-door total (scenario)**, kept separate from station-to-station time. Show "Route checked: Nov 7, 2026 (timetable, not live)" plus Metrolink service alerts and the OCTA trip planner (https://octa.net/getting-around/trip-planner/trip-planner).
- Station per pin: Camino Twelve → San Juan Capistrano (1.47 mi straight-line); Vista Pacifica → San Clemente (2.19 mi with Brianna's point).
- **Routing unavailable state:** any pin, destination or mode without a cached example shows "No cached route for this trip. Straight-line X mi. Open the official trip planner." That is also the test for "unavailable routing".

### 3.7 Guidance ("Get buying guidance", buyer layer only)
| Button | URL (HTTP 200 on Nov 7) | Plain-language text |
|---|---|---|
| Explore Habitat OC homeownership | https://habitatoc.org/attend-an-orientation/ | "Orientation is the first step for Habitat OC's own homeownership program. Habitat OC does not finance the homes on this map." |
| Find a housing counselor | https://www.consumerfinance.gov/find-a-housing-counselor/?zipcode=92675 (backup https://www.hud.gov/findacounselor) | "Search HUD-approved housing counseling agencies for free or low-cost help reviewing your budget and financing options." Reuse HomeStay's `hud-housing-counseling` entry in `lib/assistance.ts` for the source and date |
| Ask about this development | Camino Twelve: city planning page (§3.2). Vista Pacifica: listing page | "For questions about sales, pricing, or an affordable-home application window." |

P1: a geography chip from Pencil's catalog (`lib/fundit/catalog.ts`): OC MAP lists **San Juan Capistrano** as an eligible area and **does not list San Clemente**. Phrase it as "a county down-payment program to ask about", never as eligibility.

---

## 4. The screen (`/find`)

**Look:** a private consultation in a Southern California real-estate office (inspired by the Oppenheim Group's editorial style; the identity is our own). Warm ivory `#f7f2e8`, card `#fffdf8`, espresso ink `#2b1d14`, muted `#6b5a4c`, restrained brass `#8a6a2f`, rule `#d9ccb4`. Serif headings from a local font stack (`Georgia, "Times New Roman", serif`); **no Google Fonts fetch**. Tabular numerals for all money (`font-variant-numeric: tabular-nums`). Scope all styles to the `/find` tree (a wrapper class or CSS module). Don't touch `globals.css` rules used by Pencil and HomeStay.

**Desktop:** slim buyer panel on the left (~360 px), large map on the right, detail panel overlaid or docked so **the map stays visible when a pin is selected**. No hero photo.

**Mobile (<860 px):** full-width map; a bottom results sheet with a toggle button (`aria-expanded`) that expands to a list. The list view is the accessible, keyboard-first path: every pin has a card, every card selects its pin.

**Left panel:**
- H1 **"Where could you buy in South OC?"** Buttons **"Explore with a sample buyer"** (loads §2 defaults and selects Camino Twelve) and **"Set my budget"** (focuses the budget input).
- Inputs: annual income, cash available, preferred all-in monthly payment, work destination (Irvine Station / UC Irvine), commute mode (Drive / Transit). Under the budget: "$2,500 is 30.0% of gross monthly income. This is your choice; a lender decides approval separately, and program eligibility is a separate question."
- HCD income-category line (§2).
- `<details>` **Advanced financing assumptions**, collapsed: rate (PMMS week picker, default 11/5/2026 7.18%, reuse `lib/fundit/rates.ts`), term, down payment %, closing cost %, reserve, property-tax %, insurance $/mo, PMI %, unknown-HOA scenario, unknown-assessment scenario. Each shows its ASSUMPTION or source chip.
- Footer: "Prototype. Not financial, legal or lending advice. Fictional sample buyer; inputs stay in your browser."

**Map area:**
- Layer switch: **Buy or plan ahead** / **Future sites**.
- Filters: max monthly budget, city, commute mode, status (For sale / Planned or approved), **"Show opportunities with unpublished prices"** (default on).
- Legend: ● For sale · ■ Planned or approved · ▲ Potential site · ◆ Rail station. Attribution always visible (§6). Zoom +/− and a reset-view button.
- **No results state:** "No opportunities match these filters." Show a button that turns on unpublished prices, and one that clears filters. Sample-buyer case: budget $2,500 with unpublished prices off hides everything (Vista estimates $4,643), which is the honest point.

**List card (one per pin), leading with three things:**
1. **Estimated monthly cost** in large type, or **"Price unpublished"**. Future sites say "Not for sale to buyers: a site to investigate".
2. **Commute line:** mode, straight-line miles, cached example time if any.
3. **What you can do today:** one short action (e.g. "Ask the city about the affordable-home window").
Plus the status tag, city, Save to compare, and "Checked Nov 7, 2026".

**Detail panel (buyer pin):**
- Three labeled blocks: **Project history**, **Buying status**, **Next step** (§3.2 / §3.3).
- Priced home: the all-in monthly figure in large type, then lines for P&I, property tax, insurance, HOA (published or "Unknown, scenario $X"), mortgage insurance (when down < 20%), special assessments / Mello-Roos (published or "Unknown, scenario $X"). Every assumption is editable inline or in the advanced panel. Cash at closing shown separately: down payment, closing costs, total, reserve kept, and the shortfall or remaining savings. One sentence: "This estimate is $2,143 above your preferred monthly budget." / "Within your budget by $X." / "We need the price or fees to estimate your fit."
- Unpriced home: **"What price would fit my budget?"** → "Planning estimate for you, not a price for this property: about **$219,497–$269,667**, assuming HOA $200–$500 and assessments $0–$100 (ASSUMPTION ranges). Lender approval and program eligibility are separate."
- Commute block (§3.6). **Get buying guidance** (§3.7) and **Copy buyer brief**.
- Sources with last-checked dates.

**Detail panel (future site):** a compact **"Why investigate this site?"** panel: parcel source (with the candidate-APN caveat), existing use, the pathway (SB 9, with its fact-sheet citation), the test table (§3.4), the next verification step, and "Does it pencil? → Pencil". Nothing on this panel says buy, apply or price per home.

**Compare (two saved):** side-by-side columns for status, monthly estimate or "Price unpublished", unknowns, straight-line miles and cached commute, next step. Saving a third replaces the oldest, with a note. Future sites can't be compared with buyer homes; show "Compare homes with homes".

**Buyer brief (copy, nothing sent):** header "BUYER BRIEF · DRAFT · FICTIONAL SAMPLE · NOTHING HAS BEEN SENT". Then saved communities, preferred monthly payment and its % of income, commute destination and mode, unresolved costs (price, HOA, assessments, mortgage insurance as relevant), the three tailored questions, and source URLs with dates. The user decides whether to share it. It must not match `/you qualify|you are eligible|guaranteed|approved for|pre-?approved/i`. Clipboard fallback: a read-only textarea.

---

## 5. Math (pure functions in `lib/findit/`, all tested)

```
f(rate) = i / (1 − (1+i)^−n),  i = rate/100/12, n = 12·years      (same as Pencil; reuse if exported)
down  = P·d            closing = P·c            loan = P − down
pi    = loan·f         tax = P·t/12            pmi = d < 0.20 ? loan·m/12 : 0
monthly = pi + tax + ins + hoa + assess + pmi
cashAtClose = down + closing      left = cash − cashAtClose      short = max(0, reserve + cashAtClose − cash)
fit (payment cap) = (B − ins − hoa − assess) / ((1−d)·f + t/12 + (d<0.2 ? (1−d)·m/12 : 0))
fit (cash cap)    = (cash − reserve) / (d + c)
fitPrice = max(0, min(payment cap, cash cap))      // 0 → "No positive price fits these assumptions"
budgetShare = B·12 / income                         // income ≤ 0 → no percentage, ask for income
fitSentence(monthly, B): > B → "This estimate is $X above…"; ≤ B → "within your budget by $X"; price null → "We need the price or fees…"
haversine miles, R = 3958.8
```
The down-payment default is a percentage of price, so savings are not all spent on the down payment. The sentence and the fit price only use known numbers plus labeled scenario values; unknown HOA or assessment lines stay visibly "Unknown, scenario".

**Defaults (ASSUMPTION unless noted):** rate **7.18%** (Freddie Mac PMMS, week of 11/5/2026, national average: source), 30 years, down **3%**, closing **2%**, reserve **$5,000**, property tax **1.1%** of price, insurance **$150/mo** (matches HomeStay and Pencil), PMI **0.6%/yr** of loan below 20% down, unknown-HOA scenario **$350** (range $200–$500), unknown-assessment scenario **$100** (range $0–$100).

### 5.1 Reference results (test anchors, ±$0.01; computed Nov 7 with the defaults)
| Case | Value |
|---|---|
| Budget share, $2,500 of $100,000 | 30.0% |
| Vista Pacifica @ $475,000, HOA $606 published, assessment scenario $100: P&I | $3,121.28 |
| · property tax / insurance / PMI | $435.42 / $150.00 / $230.38 |
| · **all-in monthly** | **$4,643.07** ($4,543.07 without the assessment scenario) |
| · vs $2,500 budget | "$2,143 above your preferred monthly budget" |
| · cash at closing: down / closing / total | $14,250.00 / $9,500.00 / $23,750.00 |
| · savings left vs $5,000 reserve | $1,250.00 left → **short $3,750.00** to keep the reserve |
| Fit price, HOA $350 + assessment $100 | **$238,310.72** (cash cap $400,000.00 doesn't bind) |
| Fit price range, HOA $500 + $100 / HOA $200 + $0 | $219,496.71 / $269,667.39 |
| Fit price, no HOA or assessment | $294,752.73 |
| Straight-line: Camino Twelve → Irvine Station / UCI / SJC Station | 12.11 / 14.11 / 1.47 mi |
| Straight-line: Vista Pacifica (Brianna's point) → Irvine Station / SC Station | 16.54 / 2.19 mi |
| Straight-line: 504 candidate → Irvine Station / SC Station | 17.92 / 1.95 mi |

If the Vista price or coordinates change after the recheck, recompute these anchors with the same functions and record the new inputs in the test file.

---

## 6. Map implementation

- `npm i leaflet@1.9.4` and `npm i -D @types/leaflet` (Leaflet is BSD-2-Clause). No react-leaflet.
- `components/findit/atlas-map.tsx` (`"use client"`): create the map in `useEffect` with `const L = (await import("leaflet")).default` so nothing touches `window` during SSR. Import `leaflet/dist/leaflet.css` in that component. Destroy the map on unmount.
- **Online base:** OSM standard tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution `© OpenStreetMap contributors` linking to https://www.openstreetmap.org/copyright. That is light, interactive use within the OSM tile policy. Never prefetch or bundle OSM tiles.
- **Offline fallback (P0, no download):** when tiles fail, keep the Leaflet map with its pins, zoom and legend on a plain ivory background. Add a dashed polyline through the three station points labeled "Rail line (schematic, through stations)" and text labels for the cities. Banner: "Offline: street map unavailable; pin positions are still to scale."
- **P2 only if there is slack:** a bundled public-domain basemap `public/find-it/basemap.geojson`, made once by `scripts/fetch-basemap.mjs` from Census TIGERweb (https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/): incorporated places, the county boundary, primary roads, railroads. Use `f=geojson`, `outSR=4326`, and `maxAllowableOffset` ≈ 0.0003 to keep it under ~1 MB. Credit it in `CREDITS.md` with the fetch date.
- **Switching:** start on OSM tiles. After 3 `tileerror` events, or when `navigator.onLine` is false, switch to the offline fallback and show the banner. Add a manual toggle.
- **Pins:** `L.divIcon` with CSS shapes: circle (For sale), square (Planned or approved), triangle (Potential site), diamond (station, not selectable as an opportunity). Shape plus text label, so color is never the only cue. Markers get `keyboard: true`, `title`, and an `alt`/aria label "Camino Twelve, Planned or approved". Enter selects. Selection pans the map without hiding the pin.
- The default view fits San Juan Capistrano with Irvine Station in frame (bounds about 33.41, −117.86 to 33.67, −117.58). The 504 candidate parcel polygon is a P1 overlay (the county query returns rings in 4326).
- Map tests: none in Vitest (jsdom has no layout). Test everything else in `lib/findit/` and check the map in the browser walk (§9).

---

## 7. Files (suggested)
```
app/find/page.tsx                    → <AtlasApp/> (metadata title "South OC Home Atlas (Find it demo)")
components/findit/atlas-app.tsx      panel, filters, list, detail, compare, brief, mobile sheet
components/findit/atlas-map.tsx      Leaflet map, online/offline base, pins, legend
components/findit/site-panel.tsx     "Why investigate this site?" table
lib/findit/data.ts                   frozen opportunities (§3.2–3.4), stations (§3.1), guidance (§3.7)
lib/findit/commute.ts                straight-line, cached transit examples, route-unavailable state (§3.6)
lib/findit/finance.ts                §5 (reuse f() from lib/fundit if exported)
lib/findit/filters.ts                layer/budget/city/mode/status/unpublished filtering, no-results reason
lib/findit/brief.ts                  buyer brief text
lib/findit/state.ts                  pure reducer: inputs, layer, filters, selection, saved (max 2), sample reset
components/section-nav.tsx           shared nav: 1 Find it (/find) · 2 Fund it (/) · 3 Stay (/homestay), current one marked aria-current
public/find-it/basemap.geojson       P2 only: offline base (TIGER), + CREDITS.md
scripts/fetch-basemap.mjs            P2 only: one-time fetch (not run at build or runtime)
tests/findit-*.test.ts
```
**Section nav:** a slim bar at the top of all three pages, small enough to sit above each app's own header without restyling it. Render `<SectionNav current="…"/>` from each `app/*/page.tsx` (Pencil's and HomeStay's page files get one line each; their components stay untouched). Each label says what the section answers: "Find it: where could a home go?", "Fund it: what would it take?", "Stay: keep the home affordable". The presenter can click any section in any order.

---

## 8. Tests (only these; `npm run check` green after each step)
- **Finance:** every §5.1 cell within $0.01; fit price never negative; cash cap binds when reserve > cash; income 0 → no percentage; PMI is 0 at 20% down.
- **Data:** every opportunity has an https source and an ISO `checkedDate`. No opportunity has a `price` unless its source is a listing. Camino Twelve `price === null`, and its card renders "Price unpublished". The future site has `layer: "future"`, can't be saved into the buyer compare, and has no monthly estimate. Status values are only "Supported" / "Conflict found" / "Unknown", and each test has a reason, source and date. No `contact` field holds a person's name (simple check against the CEQAnet names and "agent").
- **Filters:** sample buyer, budget $2,500, unpublished off → zero results with the "turn on unpublished prices" reason. Unpublished on → Camino Twelve is listed. Layer switch → only the 504 site.
- **Commute:** Drive never returns a time. A Transit pair without a cached example returns the route-unavailable state. Station-to-station minutes and door-to-door total are separate fields.
- **Brief:** contains the Camino Twelve question, the budget and %, the destination, unresolved costs, "NOTHING HAS BEEN SENT"; does not match the banned regex.
- **State:** sample reset restores defaults; saving a third drops the oldest.
- Pencil and HomeStay: all 117 existing tests pass unchanged.

---

## 9. Verification walk (the prompt's §8, run in a browser before the final push)
1. `/find` opens on the map; tiles and attribution visible; pins in the right places (Camino Twelve sits at Camino Del Avion near Del Obispo, not in the hills).
2. Explore with a sample buyer → Camino Twelve selected: history (3 dated records), buying status, next step. "What price would fit my budget?" → $219,497–$269,667.
3. Transit → San Juan Capistrano Station → Irvine; switch to UC Irvine → the onward leg appears; station-to-station time is labeled apart from the door-to-door scenario.
4. Save Camino Twelve and Vista Pacifica → Compare. Vista: $4,643/mo, $2,143 above budget, short $3,750 on reserve.
5. Get buying guidance → each of the three links opens the right page. Copy buyer brief.
6. Future sites → 504 E Avenida San Juan → the test table, candidate-APN caveat, fire conflict → "Does it pencil?" opens Pencil.
7. Keyboard only: Tab through panel, filters, list cards, map pins; visible focus everywhere.
8. Mobile width 390 px: full map, sheet toggles, list reachable.
9. Edge cases: no matching results; Camino's missing price; route unavailable (e.g., Vista + UC Irvine if not cached); offline base (DevTools offline, reload; the map still renders).
10. `/` (Pencil) and `/homestay` still work, and the section nav moves between all three pages in any order.

---

## 10. Time plan (session starts ≈ 12:10 PM; due 2:30 PM)
| By | Done | Push |
|---|---|---|
| 12:35 | Recheck Vista listing + Metrolink/OCTA times + SJC planning URL; `lib/findit` data, finance, filters, commute + §8 tests | yes |
| 1:15 | `/find` with Leaflet (online tiles), pins, legend, list cards, detail for Camino and Vista. **Minimum shippable demo** | yes |
| 1:40 | Future-sites panel, guidance, brief, compare, Pencil links | yes |
| 1:55 | Section nav on all three pages; offline fallback switch; mobile sheet; keyboard pass | yes |
| 2:10 | README section, CREDITS, presenter script; `npm run check && npm run build` | yes |
| 2:20 | Fresh clone → `npm ci` → check → build → `npm start` → §9 walk; repo opens signed out | final |

**Cut order if behind:** TIGER basemap file (already P2) → Monterey pin → parcel polygon → OC MAP chip → compare → mobile sheet polish. Never cut the section nav; it is how the presenter moves between Find it and Fund it. Never cut: sources and dates on cards, "Price unpublished", the site test table, and attribution.

---

## 11. README and presenter script

**README:** keep Pencil first if the team stays in Lane 3. Add **"Find it: South OC Home Atlas (`/find`)"** after "What we built", with: who it's for (buyer + acquisitions lead), the run command (`npm run dev` → http://localhost:3000/find), a sources table (every §3 URL with document date and check date), an ASSUMPTION table (§5 defaults, 4 homes, access allowance, scenario ranges), what is real vs mocked (real: CEQAnet records, listing facts as published, GIS query results, timetable example; assumed: financing defaults, HOA and assessment scenarios, access allowance, 4 homes; fictional: the buyer), and where it gets things wrong:
- candidate APN not confirmed
- fire layer vintage unknown
- SB 9 exclusions not read from statute
- SCAG slope units and land-use code not decoded
- timetable is an example, not live
- a national average rate
- listing data can change at any time

Update the test count and the file tree.

**Presenter script (≈90 s; adjust the words to the finished UI):**
1. (0–10 s) "Two people start every affordable home: a buyer who needs a place, and a nonprofit that needs land. This map serves both, starting in San Juan Capistrano."
2. (10–30 s) Click **Explore with a sample buyer**. "A fictional household: $100,000, $25,000 saved, $2,500 a month, a job at Irvine Station. Camino Twelve: the city approved 12 townhomes in August 2024, signed for one affordable home in May, and filed the final map for individual sales on October 22. Price unpublished, so we don't invent one." Click **What price would fit my budget?**: "About $220,000 to $270,000, a planning number for this family, not a price for this home."
3. (30–45 s) Transit: "Train from San Juan Capistrano to Irvine: station-to-station time shown separately from the door-to-door estimate, from the published timetable, dated." Switch to UC Irvine to show the extra leg.
4. (45–55 s) Compare with Vista Pacifica: "A real $475,000 condo is $4,643 a month, $2,143 over budget, and closing would eat the reserve. That gap is why the affordable home matters." Click **Get buying guidance**: Habitat orientation, a HUD-approved counselor, the city for the application window. Copy brief: "nothing is sent."
5. (55–85 s) **Future sites** → 504 E Avenida San Juan. "For the acquisitions lead: SB 9 could turn this lot into four homes, and a nonprofit skips the owner-occupancy affidavit. Flood: minimal. Fire: Very High, which is a conflict to check first. The APN, the slope and the old 4-parcel approval are unknown, and we say so. Next call: San Clemente Planning." Click **Does it pencil?**: "Pencil shows that even with donated land, these four homes still need about $941,000."
6. (85–90 s) "Every pin has a source and a date. Unknowns stay unknown."

**30-second video:** steps 2, 5 and the Pencil hand-off.

---

## 12. Final report the session must give
What shipped vs. cut; `npm run check` and `npm run build` output; the §9 walk results (with any failures); every source URL with its check date; what was rechecked and changed (Vista price, timetable times, planning URL); every ASSUMPTION; any placeholder left.

---

## Appendix: sources reviewed for this brief (Nov 7, 2026)
- Lane repo https://github.com/travcjohnson/claude-impact-lab-uci at `45a05a5`: `lanes/1-find-it/README.md`, `scenarios.json`, `data/DATA-SOURCES.md`, `data/pathways.json`, `CLAUDE.md`, `docs/ground-rules.md`, `docs/judging.md`, `docs/submission.md`
- Brianna's prompt and pasted HTML prototype; her site https://south-oc-home-atlas.briannafaussette.chatgpt.site/ (`buyer-data.js`, `site-data.js`, `routes.js`, `finance.js`, `map.js` read)
- CEQAnet SCH 2024080316, 2026050256, 2026100816 (read)
- HCD SB 9 fact sheet, April 2026 (read in full). The combined Housing Law Fact Sheets PDF returned an HTML page to curl; open it in a browser
- OC Parcels FeatureServer, SCAG Zoning / General Plan / Existing Land Use / Housing Element Sites, OC LRA Fire Hazard Severity Zones, FEMA NFHL layer 28 (queried)
- Census Geocoder (5 addresses), OSM Nominatim (2 lookups)
- HTTP 200 checks: habitatoc.org/attend-an-orientation, consumerfinance.gov housing-counselor finder, hud.gov/findacounselor
- Search results only (leads): Vista Pacifica listing copies; the HCD HAU letter of July 8, 2024; the SJC June 2026 City Manager update
