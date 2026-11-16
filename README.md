# make.fun Workbench

[![make.fun competition](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![Live rank](https://make.fun/badge/makefun-frontend-01/OlosLabs/makefun-workbench/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![Live reward](https://make.fun/badge/makefun-frontend-01/OlosLabs/makefun-workbench/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

An original, read-only research desk for make.fun bounties. Warm paper, aligned money and deadline figures, a compact agenda, and a dark theme. Plain HTML, CSS and JavaScript modules; system fonts; no app dependencies or build step.

## Run

Node 22.18 or later. From the repository root:

```sh
PORT=4178 node serve.mjs
```

Open http://127.0.0.1:4178. Any static HTTP server can serve app/ as its document root. Public GET requests go directly to https://make.fun/api with credentials omitted. No account is required.

## Explore

- Board: `#/` with URL parameters `q`, `category`, `fee` (free/paid), `deadline` (open/24h), `sort` (pot/entries/newest), `saved=1` and `page`.
- Bounty: `#/bounty/makefun-frontend-01`, full brief, expandable rules and resolution, current reward allocation, pot, fee and dates.
- Standings: `#/leaderboard/makefun-frontend-01`, metadata-driven metrics and both full entries and compact rest, paginated 20 rows at a time.
- Builder: `#/profile/nightshift-labs`, public record, biography, links and paginated work, reached from entrant handles.
- Save bounties locally and compare two or three. Theme and shortlist persist in browser storage.

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

Browser tests expect the server on port 4178 and Chromium at /snap/bin/chromium. Most scripts accept CHROMIUM for a different executable. Tests use synthetic fixtures only in isolated test contexts; screenshot capture uses live responses without interception. See VERIFICATION.md for measured results and revisions.

## Package offline

```sh
MAKEFUN_OUTPUT_DIR=/tmp/workbench-output node main.ts
```

The original Node standard-library packager copies app/ and the three screenshots and builds dossier.json using the unchanged kit vendor library. It needs no network, dependencies, credentials, or build tools. Use an empty external output directory. tests/package.mjs runs it twice in separate temporary directories and compares every relative file hash.

## Limits

This is a public reader. It does not enter competitions, sign in, pay fees, bet, or change accounts. The board loads up to 50 API records at a time and exposes a load-more button when a cursor exists; filters and aggregate totals apply to the loaded set. API-withheld values stay unknown. Profile work is limited to solutions returned by the public endpoint. Markdown supports useful headings, lists, bold, inline code, code blocks and links, with raw HTML rendered as text; it is deliberately not a full Markdown engine. Caching is in-memory per tab; only preferences persist locally. Data refresh is explicit or occurs on navigation after freshness expires. Remote pictures are intentionally omitted.

## Before a possible entry

The parent operator must finish and verify the existing recording, prepare the factual run record from the actual recorded sessions, verify repository About metadata and check the exact chosen commit and official requirements. Submission, payment, registration and login remain separate actions requiring their own authorization. No submission command is executed by this project.

MIT licensed. Built by HakimIqbal for the [make.fun frontend bounty](https://make.fun/bounty/makefun-frontend-01).
