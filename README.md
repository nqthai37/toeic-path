# TOEIC Path

Independent TOEIC Listening & Reading practice companion. Buildless HTML, CSS and JavaScript; serve `dist/` with any static web server. Study history is stored in localStorage, with JSON export and import in Study preferences.

Includes flexible 4/8/12-week study plans, 46 original questions across all seven parts, learning sessions, timed mixed and reading mini-tests, explanations, a mistake notebook, 24 English/Vietnamese vocabulary cards, and real practice history. There are no fabricated scores or history records. Browser speech synthesis supplies listening audio. Part 1 scenes use illustrations. Mini-tests reuse the starter question bank and are not full-length official exams. Official resources are linked within the app.

The site requires no backend, API key, account integration, or build dependencies. Google Fonts is optional; system sans-serif fonts are used when unavailable.

Validation: JavaScript syntax checks; all eight views rendered; question-bank integrity; 100 randomized balanced selections; scoring; completed-session recording; mistake clearing after correct review. Browser checks: desktop dashboard, eight-question learning flow, answer explanations, correct 25% result, and persistence after reload.

Hosting identity: `.openai/hosting.json`. Deployment helpers live in the installed Sites plugin; keep credentials out of files and pass them through stdin.
