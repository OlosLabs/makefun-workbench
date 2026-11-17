# Verification — make.fun Workbench v3

Executed in the repository on Node v22.23.1 with installed Playwright, Chromium and axe tooling outside the entry. The test server is PORT=4179 node serve.mjs; the bytes it serves at /main.js hash-match this checkout's app/main.js (confirmed with curl piped to sha256sum against sha256sum of the file). Port 4178 serves different bytes and was left alone; the existing 4186 server and tunnel were not changed.

Results (this checkout, commit 7dc49ea8ad741ee818de85257693f8c96fd917b7):

- node --test tests/*.test.mjs: 31 passing tests (pass 31, fail 0). Covers ETag/304, shared reads, stale expiry/recovery, 429/503 cooldown, cache eviction/null rejection, route and URL safety, compact rows and opening/deadline validity.
- node tests/browser.mjs: 88 assertions, including URL filters/sort/pagination, saved items, theme persistence, comparison capped at three, all five functional tabs, safe Markdown tables/code/lists, inert HTML and unsafe links, projected reward joining, provisional judge records, keyboard focus after tab navigation, four routes at 360/390/768/1280px, malformed/null/network failures and recovery.
- node tests/live.mjs: all four real public views loaded; 16 combinations of route, mobile/desktop and light/dark passed console and page-overflow checks, plus four rich detail tabs. No intercepted live responses. This live evidence belongs to the earlier v3 session; this documentation-only pass did not re-run live.mjs or accessibility.mjs.
- node tests/accessibility.mjs: 16 axe scans across four live routes, two themes and two viewport widths returned zero WCAG 2 A/AA and WCAG 2.1 AA violations (26 checks total: eight route/viewport overflow checks + two skip-link/focus checks). Automated scans are not an exhaustive accessibility audit. This axe evidence belongs to the earlier v3 session; no fresh axe rerun is claimed here.
- node tests/capture.mjs: exactly three genuine live API viewport screenshots, with provenance in shots.json. Desktop light board 1280×900, dark bounty 1280×900, mobile leaderboard 390×844. Current byte sizes: 169,654; 185,124; 68,262 respectively. Each is below 262,144 bytes and has a long side at most 1280px. These bytes are the v3 captures and were not regenerated in this pass.
- node tests/package.mjs: two independent offline runs produced identical relative paths and SHA-256 hashes for all 11 files. Seven local assets total 58,604 raw bytes and 19,179 gzip level-9 bytes. Dossier: 625,026 bytes. All seven local assets are eager-loaded, so this is the complete first-load local code/style/HTML budget; live API JSON and lazy remote image bytes are additional. The supplied server does not negotiate gzip, so gzip figures describe compression potential, not observed HTTP transfer from that server. Re-run read-only in this pass; numbers unchanged.

Defects found and corrected during the earlier v3 session: a profile-expression parse error, a footer link relying on color, a null escrow link exposed by absent-URL resolution, a stale test readiness flag between hash changes, and ambiguous legacy live-test selectors after adding the persistent board. Rich Markdown tests assert rendered content so an error screen cannot satisfy security checks by omission.

API evidence supports prize_rank joined to rewardsNow.place, confidence intervals and provisional judge W/D/L records. Statistical rank ranges do not change ordinal positions. Projected awards are not earned payouts. Missing data remains unknown. Source-withheld entries display that fact; no withheld archive source was fetched. Public research highlighted board/detail continuity and richer metric/reward surfaces in Potboard/Tally; competitor first-load claims remain unverified and are not benchmarks for this implementation.

Limitations: board filters/totals cover loaded records, with cursor load-more when supplied. Persistent board search/scroll is in-memory. Rows paginate rather than virtualize. Profile history is limited to the public response. Markdown is a small safe subset, without nested-list parsing or full CommonMark conformance. Images are limited to make.fun API avatar/submission paths and may be absent or unavailable. Cache is in-memory, data refresh is explicit or navigation-driven, and the cache status describes the most recent API operation rather than per-panel provenance. No account writes, payments or submission occurred.

## Actual parent verification

- Unit tests: 31 (passed)
- Browser assertions: 88
- Identical package files: 11
- Gzip first-load bytes: 19,179
- Dossier bytes: 625,026
- Screenshot bytes: 169,654 / 185,124 / 68,262 (1-board.jpg, 2-bounty.jpg, 3-leaderboard.jpg)
- Recorder ID active (not sealed): current01a1e719-b008-764e-bbfa-5c4f7265e9d0
- Recording IDs: original 01a1e643-1f78-76f1-84b9-910ccdac4100 (original), v2 01a1e677-d2c4-71f6-bfcd-1598e62cda74 (previous build), current 01a1e719-b008-764e-bbfa-5c4f7265e9d0 (active, not sealed).

## v3 limitations corrected

Persistent sidebar metadata filtering/order route/back/reload: the sidebar carries the same filters (category/fee/deadline/sort/dir) as the board; sort order persists across rerenders and route changes; sidebar selection survives a route change and a page refresh. Eight rows fit within the 900px desktop viewport (last bottom 869px); compact rows stay under 90px at 1280px. Grouped exact reward expansion: consecutive identical base/fee share/total collapse into a single group row; expand/collapse restores every reward row. Overview live top five: top five ranked rows capped at five with projected prize from rewardsNow. Shared timestamp-safe freshness and race tests: the API cache never regresses to older publication timestamps; 304 revalidation carries the server stamp; stale fallback is bounded and recovers after network failure; concurrent reads share one pending fetch; a failing read drains the pending map so a retry can fetch again.

## Provenance

Earlier build provenance: this work began in a fresh Hermes CLI session launched by parent orchestration after the person's approval. The approval supplied to this session, verbatim, was: "gass kan sesuai rekomendasimu ya". This session's opening task is an orchestration handoff, not a user-typed top-level prompt. The parent retains responsibility for representing the original top-level request and its initiating context accurately in the final run record.

The authorized scope is building and verifying the original make.fun Workbench entry, authoring its files, committing to dev, merging to main and pushing both branches. Repository creation and remote configuration are authorized and handled by the parent. Fee payment, submission, login and registration are not authorized. The parent reported that recording began before this session and the empty repository. This session never stops or seals the recorder, edits session records, retries a model response, undoes a session or invokes compression.

Observed harness command output: Hermes Agent v0.17.0 (2026.6.19), upstream 46904a3b, local 929dd9c0 (+1 carried commit); Python 3.11.15; OpenAI SDK 2.24.0. Session runtime declaration identifies provider `custom` and model `gpt-6.1-sol`. Effort is the harness default; no explicit effort override was observed. These are declarations and command observations, not a claim of independently inspecting provider internals. Node reports v22.23.1 on aarch64 Linux; the browser is Chromium 156.0.8078.79 snap.

System prompt: withheld because it contains private orchestration and provider instructions. Instruction files and runtime/operator configuration: withheld from run-record collection because they contain private runtime and operator instructions. Public project documentation in this repository describes the entry itself; it does not authorize collecting private harness instructions. The isolated runtime configuration is parent-managed; this session does not alter global configuration or gateways.

MCP servers actually used: none. Browser automation uses Playwright's local Node library through the terminal tool, not an MCP server. File operations, patching, shell execution and the loaded test-driven-development skill use Hermes native tools. No subagents or external coding agents are delegated work.

The three screenshots are genuine live Chromium renders, with routes, dimensions, capture times and byte sizes recorded in shots.json. Unit and fixture tests are separate from screenshot contexts. The only imported entry source is the explicitly allowed, byte-unchanged vendor/makefun-frontend.ts. Application source and main.ts are authored by the recorded write/edit calls. Session usage totals, recording identifiers and final sealing status are intentionally not invented here; the parent obtains them from the actual harness and recorder.

Before any future submission, the parent should inspect the exact public commit (7dc49ea8ad741ee818de85257693f8c96fd917b7), verify both branch pushes (dev and main), finish the existing recorder under its original environment, verify the seal, and prepare makefun-run.json with the actual top-level initiating request and handoff provenance, observed harness/model/provider/effort, withheld reasons and the empty MCP list. This is a nonexecuting preparation note. No fee or entry is sent by this session.

## This recovery session

Current recovery session: custom ganrouter.com oracle-lyraaveline-hermes. Earlier custom gpt-6.1-sol sessions preserved including failed 20261117_012304_037cf2. Opening prompts are orchestration handoffs; user approvals supplied externally. No MCP used. Parent handles seal/run record/payment/submission externally with separate explicit authorization. Recorder PID 803655 remains active. Recording IDs: original 01a1e643-1f78-76f1-84b9-910ccdac4100, v2 01a1e677-d2c4-71f6-bfcd-1598e62cda74, current 01a1e719-b008-764e-bbfa-5c4f7265e9d0 (active not sealed). No transcript edit/retry/undo/compression. This pass updated only the three markdown documents and ran readonly verification commands; application/test/screenshot/vendor bytes are unchanged.
