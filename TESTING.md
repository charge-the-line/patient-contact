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
