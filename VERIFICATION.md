# Verification results

Executed on 16 November 2026 using Node v22.23.1, Linux aarch64 and Chromium 156.0.8078.79 snap. Playwright and axe-core are test-only packages installed under /tmp/workbench-test-tools, outside app/ and the repository.

## Executed checks

- `node --test tests/*.test.mjs`: 10 tests passed, zero failures. Covers deadline/opening logic, route validation, URL allowlist, primary metric formatting, compact leaderboard rows, in-flight deduplication, conditional ETag/304 reuse, cache eviction, bounded stale fallback and recovery, malformed null responses and Retry-After cooldown/recovery for both 429 and 503.
- `node tests/browser.mjs`: 50 assertions passed. Covers a 105-bounty fixture, 91 leaderboard rows including compact rest, board and leaderboard pagination, back navigation, fee/category/deadline/sort URL state, comparison of two and three with a hard three-item cap, shortlist and theme persistence, search empty state, expandable rules, entrant/profile links, raw HTML and JavaScript-link XSS fixtures, invalid routes, null/malformed responses, 429/503/network retry UI, loading readiness and successful retry after network failure. No browser exceptions in the tested contexts.
- The same browser suite verifies all four routes without horizontal overflow at 360, 390, 768 and 1280 pixels.
- `node tests/live.mjs`: all four real public surfaces rendered in desktop Chromium with no page exceptions. Board showed 8 paginated rows; the bounty title was Build the best make.fun frontend; leaderboard reported 257 returned rows in Development; the first entrant linked to @nightshift-labs and rendered its public work.
- `node tests/accessibility.mjs`: 14 checks passed: eight axe WCAG A/AA scans (four live routes, light and dark), four live mobile overflow checks, and two keyboard skip-link/focus checks. All eight scans reported zero violations. These automated scans are not a claim of exhaustive manual accessibility certification.
- `node tests/capture.mjs`: exactly three genuine live viewport JPEGs, no intercepted API responses, no synthetic screenshot data or postprocessing. Board and bounty at 1280×900; leaderboard at 390×844. Captured at 21:47:59–21:48:00 UTC. shots.json contains exact timestamps and routes.
- `node tests/package.mjs`: two separate external output directories, /tmp/workbench-a-mFkUgK and /tmp/workbench-b-V8yYIL, produced identical SHA-256 hashes for every one of 11 relative output files. Dossier SHA-256: 51c1d385af90c757aaf7e79591e4752bbc575590498227716a94b0c691262be2. Dossier size: 443,985 bytes. The packager performs only local standard-library file operations and the unchanged vendor dossier call.
- `cmp` verified vendor/makefun-frontend.ts is byte-identical to the kit copy. `git diff --check` passed.

## Measured application size

All seven app files are loaded locally on first load; there are no deferred imports, remote runtime assets or app dependencies. Gzip values are measured independently per file at level 9.

| File | Raw bytes | Gzip-9 bytes |
| --- | ---: | ---: |
| accessibility.css | 287 | 226 |
| api.js | 2,426 | 1,136 |
| core.js | 2,575 | 1,164 |
| dom.js | 1,940 | 946 |
| index.html | 1,188 | 635 |
| main.js | 18,807 | 6,553 |
| style.css | 13,518 | 3,509 |
| Total | 40,741 | 14,169 |

Screenshot sizes: 1-board.jpg 110,406 bytes; 2-bounty.jpg 143,769 bytes; 3-leaderboard.jpg 46,693 bytes. Each is below 262,144 bytes and meets the dimension constraints.

## Defects caught and revised

The first browser run hit an occupied port 8080; the app server and tests moved to isolated port 4178. A future-opening fixture caught Array.filter passing its index as the deadline predicate's optional clock parameter; the board now explicitly wraps that predicate. Retry-After recovery tests caught synchronous cleanup before a promise was registered; the client now defers request execution until registration. The accessibility audit caught muted/accent contrast, links relying on color and a nonfocusable mobile reward scroll region; colors, underlines and keyboard focus were revised and rescanned. Mobile rewards are visible rather than hidden. The skip link focuses the main landmark without changing hash routes.

## Practical boundaries

No official sealed scorer or finalist review was run. Public responses change over time. Cache failure cases use deterministic test responses; the four live surfaces and screenshots use real GET responses. The cache is per-tab memory and the board's totals/filters cover the currently loaded API pages. No fee, submission, login, registration, betting or credential access occurred. Recording sealing and final run-record preparation remain the parent operator's responsibility.
