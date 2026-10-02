PATIENT CONTACT — HOSTING
Upload these files together: index.html manifest.json sw.js icon-192.png icon-512.png

Easiest: a second repository on the same GitHub account (charge-the-line).
 1. github.com -> "+" -> New repository -> name it patient-contact -> Public -> Create
 2. "uploading an existing file" -> drag in the five files -> Commit changes
 3. Settings -> Pages -> Deploy from a branch -> main, / (root) -> Save
 4. Live in a minute or two at https://charge-the-line.github.io/patient-contact/
(Or create its own account "patient-contact" and a repo named patient-contact.github.io
 for https://patient-contact.github.io)

TESTS (optional, for whoever maintains the app)
The tests/ folder and TESTING.md can live in the same repository.
They don't affect the app. To run them on a computer with Node.js:  node tests/run_all.js
Upload them the same way as the app files: Add file -> Upload files, drag in the tests folder and TESTING.md.
