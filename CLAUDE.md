# Preconnect: project briefing for Claude

You're picking up an established project. This file is the memory of a long build conversation. Read it fully before doing anything, then read `TESTING.md` in this repo.

## Who you're working with

**Max**, the owner and sole decision-maker. Paid firefighter (Monitor Township Fire Department, Bay County, Michigan), Stop the Bleed instructor for about two years, and going through AHA BLS Instructor training (instructor course November 7, 2026). Works a demanding full-time job, so development time is limited and precious.

**How Max likes to work:**
- Treat him as a well-briefed colleague. Skip backstory; get to substance.
- Structured, actionable answers with clear takeaways. Short and plain beats long and technical.
- **He's not a developer.** When something needs him to do something (GitHub settings, DNS, testing on his phone), give click-by-click steps, one stage at a time, and say how he'll know it worked.
- Mobile-first: he tests on his phone (iPhone). Everything must work beautifully on a phone.
- Minimize accounts and passwords.
- He tests hands-on and reports real friction ("this feels clunky"). Take those reports seriously: they have found the most important bugs. Reproduce them the way a person uses a phone, not the way a bot does.

## What Preconnect is

A free, independent training platform for fire and EMS skills, made in Bay County, Michigan. **"Ready before the call."** (A preconnect is the hoseline hooked up and ready before the call, so it flows the moment you need it.) **It is currently Max's personal project.** Don't describe it as a nonprofit or connect it to any organization; he may later move it to the 501(c)(3) Firefighters Association he founded, but that's undecided.

The name "Preconnect" was chosen after conflict checks. "Tailboard" was rejected because Fire Engineering's "Tailboard Talk" podcast already uses it; "Jumpseat" belongs to an established fire-training brand; "First Due" is an existing fire-software company.

| Module | Repo | Address | What it is |
|---|---|---|---|
| Home page (hub) | `charge-the-line.github.io` | `/` | Tiles for every module, combined training record (CSV), backup/restore, privacy, feedback |
| Charge the Line | `charge-the-line` | `/charge-the-line/` | Pump panel simulator for Engine 10-2, 10 scenarios including 5 "Real Saves" |
| Patient Contact | `patient-contact` | `/patient-contact/` | Medical first responder calls: 8 calls, cardiac monitor, randomized patients, drills, instructor mode |
| Bleed Control | `bleed-control` | `/bleed-control/` | Bleeding control modeled on the ACS Stop the Bleed® course: lesson, skill stations, scenarios |
| BLS Ready | `bls-ready` | `/bls-ready/` | BLS modeled on the AHA BLS Provider course, 2025 guidelines: lesson, timed skill stations, team scenarios, exam practice |

All live under the GitHub account **`charge-the-line`** at **https://charge-the-line.github.io/**. Each module's address is the home address plus its folder.

## Architecture (all apps)

- **One self-contained `index.html` per app.** No framework, no build step, no server, no dependencies. Plain HTML, CSS, and JavaScript. Keep it that way unless Max decides otherwise.
- **Progressive web app:** `manifest.json`, icons, and `sw.js` for offline use and Add to Home Screen.
- **Saved data lives in the browser (`localStorage`),** one key per app: `e102-pump-trainer` (Charge the Line), `patient-contact`, `bleed-control`, `bls-ready`, plus `preconnect` (hub profile) and `preconnect-stats` (statistics opt-out). All apps share one web address, so the hub can read every module's data. **There is no backend and no accounts.**
- **Deployment:** GitHub Pages from the `main` branch root of each repo. Committing to `main` deploys within a minute or two.
- **Versioning, required on every release:** bump `APP_VERSION` in `index.html` **and** `CACHE` in `sw.js` together (Charge the Line also shows the version in its menu; Patient Contact on its intro screen). Every test suite checks they match. Forgetting means phones keep running the old version.

### Shared-domain rules (every app shares one address)
1. Each app lives in its own folder and registers its own `sw.js`.
2. Each offline helper deletes **only its own** old caches: `k.startsWith('<slug>-v')`. An earlier version deleted every app's caches whenever one app updated.
3. The hub's offline helper handles **only root files** and leaves every folder alone. Its `ownFile` rule is tested.
4. **Offline helpers never cache statistics requests** (goatcounter.com, zgo.at). Each count is unique; caching them would bloat phones forever and lose counts.

### Anonymous statistics (GoatCounter)
- Dashboard: **https://preconnect.goatcounter.com** (Max's account). Free for non-commercial use.
- Every app has the same snippet: `<script data-pca>` in `<head>`, which defines `window.PCA`. Apps call it through a guarded helper `pca('begin'|'end'|'abandon'|'ev', …)`.
- Events are paths like `bls/start/adult`, `bls/finish/adult/recall/attempt-2/score-90-100`, `bc/quit/garage/step-3`, `error/bls/<message>`. Starting something new, leaving the page, or tapping quit records a **quit with the exact step**. Full dictionary in the hub repo's `ANALYTICS.md`.
- **Privacy rules, enforced by tests:** never send names, organizations, crew names, or typed text. Scores only as coarse bands. The Privacy page's switch (`preconnect-stats` = `off`) stops everything, on every module, on that device. `tests/platform_check.py` in the hub repo types a name into the app and fails if it ever appears in an event.
- The snippet uses `<script data-pca>` (with an attribute) on purpose: the test harnesses find the app's main code by the first plain `<script>` tag.

## Rules learned the hard way (all apps)

Each of these cost a real bug. Don't relearn them.

1. **Two clocks.** Simulation time can run faster than real life. **Anything that measures the person (breath timing, reaction times, pause lengths, compression rate) must use real seconds.** Breaths timed on game time once never counted.
2. **Test the way a finger works, not a bot.** Instant automated clicks miss whole classes of bugs. Every suite plays at human pace (about 1.2 seconds per tap, 2–3 second reactions), and the browser checks use **slow taps** (press, wait 0.26 s, release) and **real taps on buttons found by their visible text.**
3. **Never rebuild buttons on a timer.** Bleed Control once rebuilt every button four times a second; real taps that straddled a rebuild vanished ("Talk to them" registered 0 of 6 taps). Build a screen once and update text and colors in place (`setHTML()` only touches the page when content changes). Shuffle answer order **once**, never on re-render. Every app now rebuilds **zero** buttons while idle; keep it that way.
4. **Momentum taps.** After a step changes, ignore taps for about half a second and dim the new buttons (`.cool`). Overshoot at a steady rhythm (extra compressions after #30) slips past a timer, so mirror the real motion: BLS Ready shows a "30 ✓ — stop, move to the airway" panel where the PUSH pad was, and the breath button sits lower.
5. **Feedback must stay on screen.** A penalty that appears and vanishes as the step advances is worse than none. Keep a persistent "what just happened" line (Bleed Control `g-now`, BLS Ready `run-now`).
6. **Answer length can't give the answer away, in either direction.** The writer's habit (Claude's habit, specifically) is to make the right answer the longest and most explained. It happened in **every** module, and the first fix overcorrected into "right answer is shortest." Each suite's `balance` check limits both to 45%. Run it after writing any question, and shuffle answer order on screen.
7. **Never verify an answer against its own key.** Recalculate independently (drill math, APGAR sums, oxygen durations).
8. **Bots must use the controls a person uses.** A missing "Gate −" button went unnoticed because the bot set valve positions directly.
9. **Escape quotes in HTML attributes.** A button labeled `Tap and shout: "Are you okay?"` broke its data attribute, and the step could never be completed by tapping.
10. **Startup order:** load saved settings in the boot section at the bottom. Earlier, `load()` fails silently and settings stop being remembered.
11. **Randomness makes bugs intermittent.** Run each suite several times before release (`for i in 1 2 3 4 5; do node tests/run_all.js | tail -1; done`). An intermittent failure is usually a real bug in one random variant; it found one.
12. **Prove a test can fail.** For important checks, plant the bug in a scratch copy and confirm the suite catches it.

## Content and legal rules

- **Write everything in your own words.** Official course materials (ACS Stop the Bleed, AHA BLS) are copyrighted. Model the structure and the published science, never their slides, videos, exam questions, or skills-test checklists.
- **Trademarks:** STOP THE BLEED® (U.S. Department of Defense, licensed to ACS) and American Heart Association, BLS Provider, Heartsaver (AHA). Our names stay "Bleed Control" and "BLS Ready." Refer to the official courses and say we're not affiliated. The test suites check the notices.
- **Practice, not certification.** Never imply the platform certifies anyone.
- **Medical content follows current guidelines with protocol caveats.** Bay County MCA (medical control) review is **still pending** for Patient Contact; keep agency and hospital names generic until approved ("Medic 1," "East Side Hospital," "Regional Medical Center").
- **Real Saves** (Charge the Line) follow published accounts with sources cited. Unpublished specifics are modeled and labeled as such.

## How to work in this repo

1. Before changing anything: `node tests/run_all.js`. It should be all green.
2. Make the change. Keep the single-file architecture.
3. Add or update tests for what you changed, especially anything a real person would feel.
4. Run the suite several times; run `python3 tests/browser_check.py` too if Playwright is available.
5. Bump `APP_VERSION` and `sw.js` `CACHE` together.
6. Commit with a plain-English message. Then tell Max in plain language **what changed, and exactly how to check it on his phone.** After a deploy, he may need to refresh once.
7. If you change a module's saved-data format, activity IDs, or add an activity, the **hub** needs updating too: its name table (`L` in the hub's `index.html`) and its test fixture.

## Status and open items (as of October 2026)

**Rollout to the Preconnect structure:** Steps 1–2 done (Charge the Line moved to its own repo; modules updated). **Step 3**, the hub into the root repo, may or may not be done; check the live root. **Steps 4–6 pending:**
- **Step 4:** Max backs up his progress (hub → "Back up to a file").
- **Step 5:** custom domain. Max has the name; he'll add GitHub Pages DNS records (A: 185.199.108.153, .109, .110, .111; `www` CNAME → `charge-the-line.github.io`), set the custom domain on the root repo, then Enforce HTTPS. Project repos follow automatically. **Afterward, update the two `og:` URLs at the top of the hub's `index.html` to the new domain.**
- **Step 6:** restore progress on the new domain; reinstall the home-screen icon.

**Pending from Max:**
- **A feedback email address:** set `FEEDBACK_TO` in the hub's `feedback.html`. Until then, "Send" uses the phone's share sheet.
- Turning statistics off on his own devices (Privacy page switch).

**Backlog, in rough priority:**
1. **Phase 2: shared core.** Every app carries its own copy of the decision cards, lessons, drills, progress/CSV, instructor tools, and the test harness. Extract a shared file once the next module starts. That's also when Charge the Line should get what the others have: randomized scenarios, drills, instructor mode.
2. Medical review: Bay County MCA (Patient Contact); Max's review of BLS Ready against his 2025 instructor materials; Max's review of Bleed Control against the course as he teaches it. Ask ACS whether they'd endorse Bleed Control or allow the name.
3. Patient Contact next calls: pediatric breathing (asthma/croup), carbon monoxide, cold-water hypothermia.
4. Charge the Line: tappable panel photo map (needs photos of Engine 10-2's panel), "find the control" quiz, apparatus profiles for other departments.
5. **Phase 3** (when departments adopt it or grants fund it): accounts, instructor and department dashboards, cross-device sync, one app store listing.

**Grants context:** Bay Area Community Foundation (development) and FEMA AFG (deployment). A **90-day pilot with before-and-after data** is the core of every application. The statistics are designed for it: score bands at attempt 1 vs. attempt 5 show learning.

---

# This repo: Patient Contact (`patient-contact` → `/patient-contact/`)

**Current version: 0.14.0.** Medical First Responder training. **The player is always the MFR**, never the driver: the EMT drives, the medic works the patient, and 1–2 firefighters assist. Calls run at 3× game speed **except** real-time skills (compressions, breath timing, the newborn golden minute).

## Calls (8)
Cardiac arrest (VF or PEA) · Car versus tree (MVA with entrapment) · Overdose (needs 1, 2, or 3 naloxone doses) · Anaphylaxis (draw-up epinephrine syringe mini-game) · Stroke (BE-FAST; found-down vs. wake-up last known well; large-vessel clot reroutes to Regional) · Elderly fall (blood thinner, hidden head strike, hip) · Childbirth (nuchal cord; vigorous vs. limp newborn) · Diabetic emergency (insulin vs. glipizide; can or can't swallow).

## Systems
- **Cardiac monitor:** real ECG canvas (VF, CPR artifact, sinus, A-fib, PEA, SpO₂ pleth); 4-lead and 12-lead **lead-placement mini-game**; 12-lead printouts (inferior STEMI after ROSC, A-fib in stroke, normal for the fall).
- **Randomized patients** (`VARIANTS`, `pickVariant`, text substitution with `vt()`). Tests force a variant with `window.FORCE_V = {callId:{…}}`. A menu toggle switches to standard patients for drill nights.
- **Quick drills:** CPR tempo, lead placement, rhythm ID, med math, oxygen math, APGAR, last known well.
- **Instructor mode:** TV layout, live complication injects (medic delayed, vomiting, LUCAS dies, re-arrest, deterioration, drawbridge up, O₂ out, family interference), freeze and discuss, talking points, crew roster (CSV credits each crew member).
- **Sound** (off by default), call timeline, progress screen, CSV, "Report an issue" (share sheet; could point to the hub's `../feedback.html?from=pc` instead).

## Bay County context (pending MCA review; keep generic until approved)
- MFRs **draw up epinephrine from 1 mg/mL ampules** (no auto-injectors): 0.3 mg IM, filter-needle then IM-needle swap, cross-check required.
- Ambulance partners: Medstar and MMR, shown as generic **"Medic 1."** Hospitals: generic **"East Side Hospital"** (across the drawbridges) and **"Regional Medical Center"** (I-75). Bridge names are real (Independence, Liberty, Veterans Memorial, Lafayette).
- Strokes and fentanyl overdoses are common calls locally.

## Tests
`node tests/run_all.js` (about 15 seconds, 63 checks): syntax/version sync, answer balance (both directions), fast bots, human pace, sloppy and late breathing (`breathEvery: 11`), every forced variant, drills with **independently recalculated answer keys**, instructor injects, fuzz. Bots: `pc_bot`, `mva_bot`, `od_bot`, `ep_bot`, `st_bot`, `fl_bot`, `cb_bot`, `dm_bot`, `human_bot` (options `sloppy`, `breathEvery`, `instChaos`). Optional: `python3 tests/browser_check.py`.

## Open items
MCA protocol review; Medstar/MMR training-coordinator review; real hospital names after sign-off; exact Bay County epi kit specifications; next calls (pediatric breathing, carbon monoxide, cold-water hypothermia).
