# tests/

Headless test suite for Patient Contact. Start with `../TESTING.md`.

- `run_all.js` — run everything: `node tests/run_all.js`
- `browser_check.py` — optional real-browser check (needs Playwright)
- `pc_mock.js` — fake browser that loads `../index.html`
- `*_bot.js` — bots that play each call (instant and human-pace)
- `human_bot.js` — plays every call at human speed; options: `sloppy`, `breathEvery`
- `var_test.js`, `var_check.js`, `drill_test.js`, `inst_test.js` — detailed reports for variants, drills, and instructor mode
