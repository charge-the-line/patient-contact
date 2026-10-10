PATIENT CONTACT — a Preconnect module (https://charge-the-line.github.io/patient-contact/)
This folder is the whole app:
  index.html, preconnect-core.js, manifest.json, sw.js, icon-192.png, icon-512.png, fonts/
(plus tests/, TESTING.md and CLAUDE.md, which do not affect the app).
Every one of those files must be uploaded together: the page loads preconnect-core.js first, and the type comes from fonts/.

GitHub Pages serves the main branch root of the charge-the-line/patient-contact repository. Committing to main deploys within a minute or two.
Every release bumps APP_VERSION in index.html, the "Version x" literal on the first-run card, and CACHE in sw.js together; the "Current version" line in CLAUDE.md must match (the tests check all of them).

Install on a phone: open the link -> iPhone: Share -> Add to Home Screen; Android: menu -> Install app.
Tests (Node.js 18 or newer): node tests/run_all.js
