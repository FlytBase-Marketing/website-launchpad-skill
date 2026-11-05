# 09: Health checks (Mission 6)

A health check is read-only. It produces `LAUNCHPAD-HEALTH.md` and a
plain-language summary, and changes nothing else. Fixes come after, one
approved step at a time.

## When

- The user asks ("is this OK?", "audit", "check best practices").
- End of every mission (a quick `launchpad-check.mjs` run, not the full
  report).
- Before a launch or a big campaign.
- After a framework or CMS upgrade, or a large merge.
- First session on an existing project (offer it).

## Procedure

1. **Stack:** `launchpad-detect.mjs`. In a monorepo, check each app folder.
2. **Repo checks:** `launchpad-check.mjs . --online --report <tmp>/check.md --json <tmp>/check.json`.
3. **Live checks** (if deployed): `launchpad-verify-live.mjs <url> --pages 8`,
   with `--psi` for production, `--expect-noindex` for previews.
4. **Build proof:** run `build`, `lint` and `typecheck` if dependencies are
   installed. A failing build is a blocker regardless of other results.
   Do not install dependencies during a health check without asking.
5. **Accounts:** `launchpad-accounts.mjs` (GitHub remote, Vercel link,
   Sanity project, docs MCP).
6. **Manual checks** the scripts can't do well (mark them WARN if not
   verifiable): colour contrast, keyboard navigation on the main menu and
   forms, forms end to end, consent before trackers, legal pages,
   redirects for moved URLs, CMS roles.
7. **Docs cross-check:** for every FAIL whose fix depends on framework
   behaviour, look up the official page and put the link in the Fix column.
8. **Write `LAUNCHPAD-HEALTH.md`** from the template: plain-language
   summary first, then the tables, then "Could not verify".
9. **Update `LAUNCHPAD.md`** (the orchestrator does this, not the
   read-only auditor): health summary line and date in the Health section.

## Judgement on top of the scripts

The scripts are heuristics. Before you report:

- **Confirm every FAIL** by opening the evidence (file:line or URL). Drop
  false positives and note them as such (a comment mentioning `<img>`, an
  intentional `noindex` on a thank-you page).
- **Context changes severity.** A missing CSP on a static brochure site is
  Important, not a Blocker; a secret in code is always a Blocker.
- **Group by root cause.** Fifty raw `<img>` tags are one finding with one
  fix plan, not fifty.
- **Rank by impact for this site:** what costs visitors, leads, rankings or
  safety first.

## Severity mapping

| Status + severity | Say |
|---|---|
| FAIL + blocker | **Blocker** |
| FAIL + important, WARN + important | **Important** |
| FAIL/WARN + nice | **Nice to have** |
| INFO | Mention only if relevant |
| N/A | Don't mention |

## Re-checks

After each fix, re-run the specific check (`--only <area>`) and report the
before/after. At the end, run the full check and update the report with a
new date. Keep earlier results in the change log, so progress is visible.

## CI as the guardian between sessions

`templates/github-ci.yml` runs lint, typecheck, build and
`launchpad-check.mjs` on every pull request. Blockers fail the job; warnings
show in the log. Copy the skill's `scripts/` (and `references/official-sources.json`)
into the project as `scripts/launchpad/` so CI runs the same code (zero
dependencies).
