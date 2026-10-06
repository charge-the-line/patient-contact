# Patient Contact — testing guide

Read this before changing the app. It records how the app is tested **and the lessons that produced each test**. Every rule here exists because a real bug got through without it.

## Run the tests

You need [Node.js](https://nodejs.org) 18 or newer. No install step: the harness loads `index.html` directly.

```
node tests/run_all.js          # everything — about 15 seconds
node tests/run_all.js quick    # syntax, answer balance, drills, instructor, short fuzz
node tests/run_all.js human variants    # pick sections
```

Exit code 0 means every check passed. Run the full suite before every upload.

**Optional real-browser check** (catches layout and JavaScript errors only a browser shows):

```
pip install playwright && playwright install chromium
python3 tests/browser_check.py
```

## What the suite checks

| Section | What it proves |
|---|---|
| `syntax` | The script compiles; the service-worker cache name matches `APP_VERSION` (forgetting to bump it means phones keep the old version) |
| `balance` | The right answer is the longest option in no more than 45% of decisions; every decision links to a guide card |
| `fast` | Six calls complete on every tier with good, partial, and bad answers (instant bots) |
| `human` | Every call completes at human speed (one tap about every 1.2 s, 2 s reactions, a breath every 6 s) and scores 100 when played correctly |
| `sloppy` | Irregular breathing still progresses, and **breaths 11 seconds apart still count** |
| `variants` | Each randomized patient type, forced one at a time, completes with a perfect score |
| `drills` | Every quiz scores 100 when right and 0 when wrong; **answer keys are recalculated independently from the question text**; CPR tempo separates 110/min from 135 and 90 |
| `instructor` | Every injectable complication fires in every call; re-arrest restarts the LUCAS |
| `fuzz` | Random tapping (including menu, instructor, and drill buttons) never crashes or produces NaN |

The suite has been verified to **catch planted bugs**: late breaths not counting, a wrong APGAR answer key, and a forgotten cache bump all fail loudly.

## Rules learned the hard way

1. **Two clocks.** `S.t` is game time and runs 2–7× faster than real life, so calls stay short; use it for physiology (bleeding, drug effects, ETAs). `S.rt` is real time; use it for **anything that measures the player**: breath intervals, reaction times, pause lengths, rhythms. *Bug that taught this:* breaths were timed on game time, so bagging correctly every 6 real seconds never counted.
2. **Test at human speed, not robot speed.** Instant bots never hit timing bugs. Every new call needs a human-pace run, and anything rhythmic needs a deliberately late or irregular run. *Bug:* breaths 11 seconds apart silently didn't count, and only a player found it.
3. **Never test an answer against its own answer key.** Recalculate independently, or a wrong key passes every test.
4. **Don't let length give the answer away — in either direction.** Writers naturally explain the right answer more. Run the `balance` check after writing any decision. *History:* the right answer was longest in 34 of 35 decisions before the first rebalance; the fix then overcorrected until it was the *shortest* 43% of the time. The check now limits both.
5. **Every pause must resume safely.** Overlays (decisions, briefings, lead placement, discussion) stop the clock. When one closes, resume based on what is *actually* open (`DEC_OPEN`, `S.briefing`), never a remembered flag.
6. **Buttons must be safe to double-tap and must never lie.** *Bugs:* a "Start CPR" label stopped a running LUCAS; a fast second tap restarted lead placement after it was finished.
7. **Startup order matters.** Load saved settings in the boot section at the bottom. Calling `load()` earlier fails silently (the error is caught), and settings stop being remembered.
8. **Wait steps.** Steps that wait on an event (the medic arriving, extrication, transport time) need `wait:true` or must be decisions, or Recall mode charges hint penalties while the player is legitimately waiting.
9. **Randomized patients.** Variant text goes through `vt()`. Tests force a specific patient with `window.FORCE_V = {callId: {...}}`, and the test harness must not overwrite `window`.
10. **Randomized patients make bugs intermittent — run the suite several times.** A check that fails now and then almost always means a real bug that only appears with one patient variant. *Bug:* a one-dose overdose patient started breathing on his own before six rescue breaths, so the "6 breaths" step could never finish — it failed about 3 runs in 8. Before a release:
    ```
    for i in 1 2 3 4 5; do node tests/run_all.js | tail -1; done
    ```
11. **Each release:** bump `APP_VERSION`, the `CACHE` name in `sw.js`, and the version on the intro screen. The `syntax` check enforces the first two.

## How the app is organized (one file: `index.html`)

- **Each call is a module:** `freshX()` for starting state, `tickX()` for physiology each tick, `renderX()` for the screen, `M_X` for missions and steps, entries in `DEC` (decisions) and `GUIDE` (protocol cards), and `xDebrief()`. `CALL` picks the module.
- **Shared systems:** the cardiac monitor (`monState`, `drawWave`, lead placement, 12-lead), quick drills, instructor mode, randomized patients (`VARIANTS`, `vt`), and progress/CSV.
- **Clinical content** follows current guidelines with "check your protocol" notes. Bay County MCA review is still pending, so keep agency and hospital names generic until approved.

## Adding a new call — checklist

1. Build the module (fresh, tick, render, missions, decisions, guide cards, debrief) and add it to the menu, `CALLNAME`, and the `MONCFG` monitor table if the medic attaches a monitor.
2. Use `S.rt` for anything the player does on a rhythm or against a reaction clock.
3. Add a bot in `tests/` (copy the closest existing one) and add the call to `run_all.js`.
4. Run `balance` and rewrite answers until it passes.
5. Add variants if the call has meaningful ones, and add forced cases to the `variants` section.
6. Run the full suite plus the browser check; bump the versions.

## Milestone 1 checks (added October 2026)

Foundation fixes: fonts served from this site, screen wake lock, finger-sized buttons. The `syntax` section (the hub: the plain list) now also proves:
- Fonts self-hosted in `fonts/`, no Google reference, every file in the cache list.
- Screen wake lock: requested when a call starts (`brief-go`), released at the menu.
- Intro version text equals `APP_VERSION`.
- Browser check: any visible button under 44 px tall fails the screen.

## Milestone 3 checks (added October 2026)

- Shared core: `preconnect-core.js` is loaded before the app script, listed in the service worker's cache, and its header hash matches its body (edit it, re-stamp with the hub's `node tests/core_hash.js`, copy to every repo).
- Spacing: 1, 3, 7, 14, 30 days after each clear at 70+; a miss resets; overdue reads as due.
- Debrief body: compare line (best, last time, new best), metrics table, what cost points, lesson chips, steps table.
- The call debrief uses Debrief 2.0 (steps table, counted-up score).

## Milestone 4 checks (added October 2026)

- First-run card under 120 words, the full guide under How to play, the settings sheet wired, and the menu's Sound button follows the shared setting.
- Browser check opens the Settings sheet from the menu.

## Milestone 5 part one checks (added October 2026)

- No new checks; the core moved to 1.2.0 (lesson and quiz engines) and Patient Contact does not use them yet.

## Milestone 7 checks (added October 2026)

- `drill` section: with a session on, eight loads of the arrest call give the same patient, `RANDOM` is off, instructor mode is effective without the switch, both menu buttons say Drill Night, the bar reads "Up: Jo", and the saved call is stamped with who, instructor and night.
- Browser check: with a session in storage the picker opens on load and the bar shows after a pick.

## Milestone 6 checks (added October 2026)

- `drill` section: a penalty plays the bad tone and buzzes, finishing a call chimes.

## Home list and lesson checks (added October 2026)

- `home` section: readiness counts 16 activities; chips show the best score, Due and Again from the shared spacing; the empty phone reads 0 of 16 and points at the lesson. The lesson scores 100 when every check is right first try and 0 when every first answer is wrong, cannot be skipped, saves under `drillRuns` as `lesson`, and lights its chip; right answers are the longest in no more than 45% of slides and the shortest in no more than 45%; every check has one right answer and three distinct options; the text names the Medical Control Authority and no real agency or hospital.
- The first-run check now asserts the menu Sound button is gone (`b-sound`), since the settings sheet owns sound.
- Browser check: home list and lesson rows at 320 and 390 px.

## Milestone 9 checks (added October 2026)

- `?drill=apgar` on load opens the APGAR drill with the intro hidden; an unknown id is ignored. Browser check adds a daily-link row.

## Milestone 10 checks (added October 2026)

- Browser check: landscape, Daylight and landscape-settings rows.

## Bay County arrest protocol (0.23.0, October 4, 2026)
The arrest call was redesigned around Bay County practice (see CLAUDE.md; pending MCA review). What the suite now proves, and why:
- **`protocol` section (32 checks).** The 25 minutes is one setting (`COUNTY.torMin`); a planted "about 25 minutes into the arrest" in arrest text fails the check. The consult starts at the county time with CPR running (the share of the consult with compressions is measured), the stop order comes about two minutes later, and the patient is never loaded; changing the setting to 20 moves the consult. ROSC happens only on scene (`S.roscPh`), then the 12-lead, a cath lab alert and transport. A ROSC patient whose pulse never comes (`roscAt: 99`) ends in the consult, not the ambulance. **Perfect care that ends in termination scores 100, and the debrief says so.**
- **Signs of death and DNRs.** Withholding CPR without definite signs (found down and warm, the hypothermia trap, a DNR nobody can produce) costs 50 and the partner starts CPR anyway; starting on an obvious death costs 5; a valid DNR in hand means no CPR; the DNR mid-code is verified by the medic.
- **The human bot plays every one of the eleven arrest patients on every tier to 100.** Arrest runs now take 8 to 13 real minutes at human pace (the long on-scene stretch runs at 4× game time), so the bot's 150-second "stalled" marker appears during the on-scene wait and is not a failure.
- **Bugs found while building it:** the monitor panel hid itself after mission 4 (`S.mission<=3`), so a 12-lead after a long first-look call could never be taken; the browser check read the score mid count-up (it counts from 0) and now reads `data-final`.

## Fast-forward (0.24.0, October 6, 2026)
Max asked for a skip-ahead for the waiting (the ride, the medic) that stops the moment anything happens. What the `ff` section proves (`tests/ff_test.js`, 36 checks):
- **Greedy play.** The human bot taps Fast-forward every time it is offered, at human pace, in all eight calls (four arrest patients) on Guided and Chaos. Every run still finishes at 100 and skips 2 to 20 minutes of game time; no hint penalty, and no skip ever runs to the cap.
- **Never during a real-time skill.** Not offered while CPR runs (every arrest patient), while the overdose patient needs breaths, during the delivery and the golden minute, or while any step marked `rt` is pending.
- **The physics keep running.** A skip ends exactly where the same number of ordinary ticks would (blood loss identical to the millilitre). The overdose patient still renarcotizes in the ambulance and stops the skip at the decision; a diabetic's blood sugar keeps moving during a skip.
- **It stops for things:** radio calls (arrivals, Chaos delays), decisions and the end of a part, a change in the patient (banded per call by `FFC[call].sig`), and a reassessment coming due (before the five-minute penalty in the trauma transport). Every instructor inject posts to the radio, so no skip can pass one silently.
- **Edge cases found while building it:** a step already done but waiting its turn in the list blocked the skip for most of the trauma ride (now counted as waiting); arriving at the doors with a reassessment owed made a skip run forever (now due); waiting for Medic 1 behind the 4-lead step is waiting (the `gate`), and no longer earns a "Stuck?" hint in Recall.
- **Proved it can fail:** planting each of "offer it while bagging", "ignore the patient changing", "ignore an owed reassessment at the doors" and "offer it during CPR" in a scratch copy fails the section.
- **Browser check:** no Fast-forward at the start of any call; the trauma transport at 320 and 390 px with real slow taps (check the tourniquet, tap Fast-forward, it stops with "Time to reassess", reassess, repeat to the handoff) finishes at 100 with no missed-reassessment penalty.

## Every deterioration needs a response, pass 1 (0.25.0, October 6, 2026)
The `deter` section (`tests/det_test.js`, 30 checks) holds the approved audit as `PLAN` (call, id, sources, pass) and checks the app's response table `DET` against it:
- **Completeness.** Every audited item for the passes built so far (`PASS = 1`: car versus tree) is in `DET`; every entry answers with a decision card, or with two or more actions including one that changes the patient, a finding and penalties for ignoring it; every instructor inject that can fire in any call (found by playing every call on Guided and Chaos) has a planned response. Items left for passes 2 and 3 are counted in the report, not hidden.
- **Car versus tree, the shock on the cot,** five ways (on its own and as an inject; recent or heavier bleeding; with and without an unstable pelvis; Guided, Recall, Chaos). From the moment it fires, the state is snapshotted and played to the doors twice: once doing nothing, once tapping the shock care a person would tap, about one tap per 1.2 seconds. Checks: a cue appears and reassessing finds the cause ("bleeding into the thigh"); at least two actions can be tapped right then (button present, handler, not hidden, its group on screen) and fast-forward is held until it's handled; responding raises her pressure at the doors by at least 8 and loses less blood, and doing nothing scores lower; on the pelvic patients the binder (helping the medic) is found on the recheck and its absence costs. The binder waits for the recheck and a stable pelvis gets none.
- **Cards:** the delay inject, the bystander inject and the Chaos fuel leak each open a card; the right call costs nothing and the wrong one 10. Two cards raised at once are both answered, one after the other.
- **Proved it can fail:** making the shock care change nothing, hiding the Shock care group, removing the penalties for ignoring her, and removing the bystander card each fail the section in a scratch copy.
- **Browser check:** the shock worsening in the back on an unstable-pelvis patient at 320 and 390 px, handled with slow real taps on the shock care by visible text (reassess, recheck, tell, pad the thigh, binder, heat, IV setup), answering the cards, to the debrief: the cause found, the binder on, the fluids running, and none of the ignoring penalties.
- The human-pace and fast bots now give shock care when she gets worse (`noDet: true` turns it off for the twin runs).

## Every deterioration needs a response, pass 2 (0.26.0, October 6, 2026)
The `deter` section grows to 70 checks (`PASS = 2`). Thirteen scenarios cover every pass-2 entry: the overdose re-sedating (on its own, and as an inject on Recall), the allergic reaction coming back (in the ambulance, where the medic gives the second dose, and on scene before the medic, where you draw it up through the whole kit with no cross-check or needle penalty), the stroke worsening (on its own without large-vessel signs, and as a Chaos inject), the stroke patient vomiting on scene, the fall patient declining (Chaos, with vomiting; and as an inject on Recall), mom bleeding again (on scene and in the ambulance) and the baby going dusky (on scene: skin-to-skin; in the ambulance: blankets, hat and heat in the restraint). Each is snapshotted at the moment it happens and played twice for a fixed stretch of game time: once doing nothing, once tapping what a person would (one tap about every 1.2 s, breaths every 6 s), **only on buttons that are on screen**. Checks: it happens and reassessing finds the cause; at least two actions are tappable right then and fast-forward is held; responding measurably changes the patient (lowest SpO₂, reaction severity, SpO₂, blood lost, destination, the baby pink again) and doing nothing scores lower; a final check fails if any non-card entry has no scenario.
- **Proved it can fail:** hiding the fundal massage in the ambulance (the old dead end), making a second epinephrine dose do nothing, making the stroke report not divert, and never flagging the overdose re-sedation each fail the section in a scratch copy.
- **Browser check:** a real-tap row per call (overdose bagging at 6-second intervals, the second dose drawn up through the kit at 320 px, the medic's dose in the back, the stroke diversion, the fall diversion, and mom then baby in the ambulance), each checked for the finding, the fix, and none of the ignoring penalties. Two harness fixes came out of it: taps now go to **visible** buttons only (several calls share labels such as "Tell the medic what changed" and "Breath"), and a Fast-forward tap that misses because the button just hid is a missed tap, not a failure.
