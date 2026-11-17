# make.fun Workbench

[![make.fun competition](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![Live rank](https://make.fun/badge/makefun-frontend-01/OlosLabs/makefun-workbench/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![Live reward](https://make.fun/badge/makefun-frontend-01/OlosLabs/makefun-workbench/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

An original, read-only workspace for make.fun bounties. A GitHub/Primer-inspired interface uses system sans typography, neutral surfaces, blue links and compact bordered rows. Desktop keeps the bounty board beside details, standings and profiles; mobile provides a return link to the current board filters. Plain HTML, CSS and JavaScript modules; no runtime dependencies or build step. Current v3 code is commit 7dc49ea8ad741ee818de85257693f8c96fd917b7 — "Make bounty comparisons denser and keep live data consistent".

## Run

Node 22.18 or later. From the repository root:

```sh
PORT=4179 node serve.mjs
```

Open http://127.0.0.1:4179. Any static HTTP server can serve app/ as its document root. Public GET requests go directly to https://make.fun/api with credentials omitted. No account is required.

## Explore

- Board: `#/` with URL parameters `q`, `category`, `fee` (free/paid), `deadline` (open/24h), `sort` (pot/entries/newest), `saved=1` and `page`.
- Bounty: `#/bounty/makefun-frontend-01`, shareable Overview, Rules, Rewards, Entries and Standings tabs (?tab=rules, for example), with public escrow, requirements, sponsor, skills, dates and projected allocation.
- Standings: `#/leaderboard/makefun-frontend-01`, metadata-driven metrics and both full entries and compact rest, paginated 20 rows at a time.
- Builder: `#/profile/nightshift-labs`, public record, biography, links and paginated work, reached from entrant handles.
- Save bounties locally and compare two or three. Theme and shortlist persist in browser storage.
- Persistent sidebar metadata: filters (category/fee/deadline/sort/dir), sort order and filter selections survive route changes and a page refresh.

Entry openness uses status, opening date and deadline. A deadline-passed bounty is never advertised as accepting entries. API responses are cached for 30 seconds, conditionally revalidated with ETags, shared in flight and bounded to 40 cached resources. A failed request can use saved data for at most 15 minutes with a visible notice. Retry-After controls 429/503 retry windows; requests time out after 15 seconds.

## Verify

Test-only tooling lives outside the repository and is never packaged:

```sh
npm install --prefix /tmp/workbench-test-tools playwright @axe-core/playwright
node --test tests/*.test.mjs
node tests/browser.mjs
node tests/live.mjs
node tests/accessibility.mjs
node tests/capture.mjs
node tests/package.mjs
```

31 unit tests covering API freshness, shared reads, 304 revalidation, stale data preservation, route safety, compact rows, opening/deadline validity, group rewards exact expansion, and timestamp-safe freshness.

88 browser assertions across board pagination, semantic tables, column exposure (Pot/Fee/Deadline/Entries), deadline UTC rendering, live time-left values, one-line brief clipping, compact rows under 90px at 1280px, eight rows within 900px desktop viewport, board height compact (was 2030px → 1122px), pagination URL-backed, board state restore on back, compare two/three bounties (capped at three), local shortlist saves, theme persistence across reload, fee/category/deadline/sort filter URL-backing, entry-count sorting uses API count, search empty state, XSS inert markup removal, markdown table/code/list safe rendering, rules/rewards/entries/standings tab navigation, keyboard focus retention, live top five capped at five rows with projected prize, grouped reward expansion/collapse, persistent metadata sidebar with pot/entries/UTC metadata, sidebar sort/filter composition and persistence across rerenders/route-changes/refresh, entries tab paginates 20 rows, standings tab renders API leaderboard with prize rank/judge record/provisional status, leaderboard compact rows on later pages, viewport overflow check at 360/390/768/1280px, and invalid route rejection.

Browser/live/capture scripts accept CHROMIUM for a different executable. Tests use synthetic fixtures only in isolated test contexts; screenshot capture uses live responses without interception. See VERIFICATION.md for measured results and revisions.

## Package offline

```sh
MAKEFUN_OUTPUT_DIR=/tmp/workbench-output node main.ts
```

The original Node standard-library packager copies app/ and the three screenshots and builds dossier.json using the unchanged kit vendor library. It needs no network, dependencies, credentials, or build tools. Use an empty external output directory. tests/package.mjs runs it twice in separate temporary directories and compares every relative file hash.

11 identical output files confirmed: app/accessibility.css, app/api.js, app/core.js, app/dom.js, app/index.html, app/main.js, app/style.css, dossier.json, screenshots/1-board.jpg, screenshots/2-bounty.jpg, screenshots/3-leaderboard.jpg.

All application/test/screenshot/vendor bytes remain unchanged between runs.

## Limits

This is a public reader. It does not enter competitions, sign in, pay fees, bet, or change accounts. The board loads up to 50 API records at a time and exposes a load-more button when a cursor exists; filters and aggregate totals apply to the loaded set. API-withheld values stay unknown. Profile work is limited to solutions returned by the public endpoint. Markdown supports useful headings, lists, bold, inline code, code blocks links and tables, with raw HTML rendered as text; it is deliberately not a full Markdown engine. Caching is in-memory per tab; only preferences persist locally. Data refresh is explicit or occurs on navigation after freshness expires. API-provided avatar and submission images on make.fun are allowlisted, anonymous and lazy-loaded; they add network transfer beyond the local asset measurement. Gzip first-load budget: 19179 bytes (level-9 compressed). Dossier: 625026 bytes. Seven local assets total 58604 raw bytes.

Consolidated board: eight rows per page (previously paginated more granularly). Reward expansion: grouped exactly when base/fee share/total all match; consecutive identical rewards collapse into single group rows. Live top five: capped at five ranked rows with projected prize from rewardsNow. Shared timestamp-safe freshness: API cache never regresses to older publication timestamps; 304 revalidation carries server stamp; stale fallback bounded and recovers after network failure. Race conditions: concurrent reads share pending fetch; failing read drains pending map so retry can fetch again.

## Before a possible entry

The parent operator must finish and verify the existing recording, prepare the factual run record from the actual recorded sessions, verify repository About metadata and check the exact chosen commit and official requirements. Submission, payment, registration and login remain separate actions requiring their own authorization. No submission command is executed by this project.

MIT licensed. Built by HakimIqbal for the [make.fun frontend bounty](https://make.fun/bounty/makefun-frontend-01).
