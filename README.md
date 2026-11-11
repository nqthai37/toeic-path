# TOEIC Path

Independent TOEIC Listening & Reading practice companion. Buildless HTML, CSS and JavaScript; serve `dist/` with any static web server. Study history is stored in localStorage, with JSON export and import in Study preferences.

Includes flexible 4/8/12-week study plans, 246 original questions across all seven parts, learning sessions, timed mixed and reading mini-tests, explanations, a mistake notebook, 24 English/Vietnamese vocabulary cards, and real practice history. The practice library has 10 themed tests of 20 questions with no overlap between those tests. Every themed test includes all seven parts and supports timed or learning mode. Custom sessions support 10, 20, 30, or 50 questions, listening/reading/mixed focus, and timed/learning mode. Random sessions prioritize untried questions, then least recently practiced questions within the chosen parts. Timed tests include a question navigator. Test completion and best practice accuracy are derived from session history. Original question IDs and the storage key are retained for existing progress and backups.

There are no fabricated scores or history records. Browser speech synthesis supplies listening audio. Part 1 scenes use illustrations. These mini-tests are not full-length official exams. Official resources are linked within the app.

The site requires no backend, API key, account integration, or build dependencies. Google Fonts is optional; system sans-serif fonts are used when unavailable.

Run `node checks.cjs` for question-bank integrity, disjoint sets, balanced and fresh-first selection, custom sessions, timed expiry, scoring, notebook clearing, storage, and legacy history retention. Syntax-check the four JavaScript files with `node --check`. Browser QA also covers the library, learning flow, timed navigation/submission, custom builder, and progress persistence.

Hosting identity: `.openai/hosting.json`. Deployment helpers live in the installed Sites plugin; keep credentials out of files and pass them through stdin.
