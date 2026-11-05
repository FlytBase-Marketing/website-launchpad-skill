# Health check: <site name>

Date: <YYYY-MM-DD>   Checked by: launchpad-auditor   Scope: repo | live | both
Stack: <framework version> + <CMS> on <host>
Live URL checked: <url or none>

Read-only check. Nothing was changed.

## In plain words

<One-sentence verdict.>

**Working well**
- 

**Blockers** (fix before launch, or now if live)
1. <problem in plain words> - <why it matters> (<ID>)

**Important** (fix soon)
- 

**Nice to have**
- 

**Suggested plan** (each step needs approval)
1. 
2. 

Good to know: <one teaching line>

## Counts

| | Pass | Fail | Warn | Info | N/A |
|---|---|---|---|---|---|
| Repo (launchpad-check) | | | | | |
| Live (launchpad-verify-live) | | | | | |
| Manual (M-IDs) | | | | | |

Build: pass / fail / not run (<why>)   Lint: ...   Typecheck: ...
N/A rows are counted here and left out of the summary.

## Findings

<!-- Paste the tables from launchpad-check.mjs --report and
     launchpad-verify-live.mjs --report here, after confirming each FAIL.
     Mark false positives as such. Put the official docs link in Fix.
     Add findings the scripts missed as M1, M2... with severity + reason. -->

## Manual checks

| Check | Status | Evidence |
|---|---|---|
| Colour contrast on main pages | | |
| Keyboard: menu, forms, dialogs | | |
| Forms end to end (CRM receives a test lead) | | |
| No trackers before consent | | |
| Legal pages linked | | |
| Moved URLs redirect | | |
| CMS roles and editors | | |

Status: PASS / WARN "needs a person" / N/A (does not exist yet).

## Connections

<!-- TODO/WARN lines from launchpad-accounts.mjs: next steps for the owner,
     not failures. -->

| Service | State | Next step (who) |
|---|---|---|
| GitHub repo | | |
| Vercel project | | |
| Sanity project | | |
| Docs MCP | | |

## Could not verify

- <item>: <why>

## History

Keep earlier rows when re-running; add one row per check.

| Date | Pass | Fail | Warn | Blockers |
|---|---|---|---|---|
