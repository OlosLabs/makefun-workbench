# make.fun Workbench product requirements

A public read-only bounty research workspace with four linkable hash routes: a searchable board, complete bounty details, a metric-aware leaderboard, and public entrant profiles. The board provides URL-backed category, entry fee, deadline and sorting controls, a local shortlist, comparison of two or three bounties, and a compact deadline agenda. Entry openness is derived from both status and deadline.

The application must support dark mode, mobile screens, keyboard navigation, clear focus, pagination and honest loading, empty and retry states. Public API reads use conditional ETags, shared in-flight requests, bounded stale fallback and respectful retry handling. Untrusted Markdown is rendered with safe DOM elements and allowlisted links. No remote scripts, fonts, images, credentials, writes, bets or payments are permitted.

Delivery includes an offline deterministic Node 22 packager, exactly three genuine live screenshots, executable unit and browser tests, factual verification and recording documentation, MIT licensing, official competition badges and public ownership metadata. Commit to dev and merge to main; parent orchestration owns remote creation and recording sealing.
