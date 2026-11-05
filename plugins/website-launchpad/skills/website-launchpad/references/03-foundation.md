# 03: Foundation (Mission 2)

The baseline every project gets, whatever the framework. Framework-specific
commands and files are in `references/frameworks/<id>.md`. Each numbered
step below is one approval.

## Before step 1

- Check the tools: `node --version` (must be a current LTS; check
  https://nodejs.org/en/about/previous-releases if unsure), `git --version`,
  `gh --version` (optional), `vercel --version` (optional until Mission 4).
  Missing Node: guide the install (nodejs.org installer or `nvm`), don't
  install it silently.
- Decide the folder: a new empty folder named after the site (kebab-case).
  Never scaffold into a folder that has unrelated files.
- Look up the create command's current flags: run it with `--help` and
  compare with the framework file. Flags change between versions.

## 1. Scaffold

Run the official create command with non-interactive flags (framework file).
Then show the user the folder tree, two levels deep, and explain the 4 or 5
folders that matter in plain words ("`app/` is where pages live; every folder
inside becomes a URL").

## 2. First run (first win)

- Install dependencies if the command did not.
- Start the dev server in the background, wait for the "ready" line, fetch
  the page with `curl -s localhost:<port> | head` to prove it renders.
- Tell the user to open the URL. Offer a **Try it**: change the headline,
  save, watch the page update. This is the moment the project feels real.

## 3. Git and the first commit

- `git init` (if the create command did not), check `.gitignore`, then commit
  "Scaffold <framework> with <create command>" **with the user's go**.
- Explain: "Git is the project's save history. Every commit is a save point
  we can return to."

## 4. Baseline hygiene

| Item | What to do | Why (plain words) |
|---|---|---|
| Node pin | `.nvmrc` with the LTS major; `"engines": {"node": ">=<major>"}` | Everyone, CI and Vercel use the same Node |
| One lockfile | Keep the one from the chosen package manager; set `"packageManager"` | Everyone installs exactly the same versions |
| Scripts | `dev`, `build`, `start`/`preview`, `lint`, `typecheck`, `format` | One command per job, same for humans, CI and AI |
| Strict TypeScript | `"strict": true` (or the framework's strict preset) | Mistakes show up in the editor, not in front of visitors |
| Lint | The framework's recommended config (flat `eslint.config.mjs`, or Biome) | Catches bugs and accessibility slips early |
| Format | Prettier (with the framework plugin for `.astro`/`.svelte`) or Biome, plus `.editorconfig` | Clean diffs; no style debates |
| `.gitignore` | Must cover `node_modules`, build output, `.env*` except `.env.example`, `.vercel` | Secrets and junk never reach GitHub |
| `.env.example` | From `templates/env.example`; every variable name with a comment, no values | New teammates know what to set |
| README | What it is, how to run, where content lives, how to deploy, who owns it | The starter README describes the framework, not this site |

Run `launchpad-check.mjs --only foundation` after this step and show the
before/after counts.

## 5. Agent rules

- Copy `templates/AGENTS.md` to the project root and fill in the
  placeholders. If the framework wrote its own `AGENTS.md` block (Next.js and
  Astro do), keep that block intact at the top and add ours below it.
- Create `CLAUDE.md` containing the single line `@AGENTS.md`, so Claude Code
  reads the same rules as Codex, Cursor and others.
- Explain: "This is the house rules sheet for any AI helper that works on
  this project, including future me."

## 6. Connect the official docs

- Run `node <skill>/scripts/launchpad-docs.mjs mcp-config <framework>` and
  add the framework's docs MCP server at project scope (it writes
  `.mcp.json`; commit it so the team gets it too). For Next.js the server is
  `next-devtools-mcp`, which also reads live errors from the running dev
  server.
- Tell the user it needs a restart of the session (or `/mcp`) to load.
- Explain: "Now I can look up the official manual for your exact version
  instead of relying on memory. When I say 'the docs say', that's where it
  comes from."
- Sanity and Vercel MCP servers come in Missions 3 and 4 (they need a login).

## 7. SEO and quality basics

From the framework file, add:

- the production site URL in one place (env var `SITE_URL` or the
  framework's `site`/`metadataBase`)
- a title template and default description
- `sitemap.xml` and `robots.txt` generated from the routes
- a custom 404 page that links home
- `<html lang>`
- the framework's image component and font loader
- security headers (`references/06-quality-bar.md`, section Security)
- Open Graph defaults and a share image
- Organization + WebSite JSON-LD on the home page

Keep each item small. Teach one concept per item ("A sitemap is the table of
contents we hand to Google").

## 8. CI

Copy the skill's `scripts/` folder into the project as `scripts/launchpad/`,
plus `references/official-sources.json` into that same folder (the docs
script finds it there). Then copy `templates/github-ci.yml` to
`.github/workflows/ci.yml`, set the package manager, and explain: "Every time someone proposes a change, GitHub
runs the same checks. It's a smoke alarm before anything reaches the live
site."

## 9. First health check

Run `node <skill>/scripts/launchpad-check.mjs . --online`. Fix remaining
blockers (each with a yes). Write the summary into `LAUNCHPAD.md` and give the
Mission 2 recap. Green across Foundation, Security and SEO is the target;
Content and Deploy are N/A until Missions 3 and 4.

## Common mistakes to prevent

- Scaffolding in the wrong folder or inside another repo (check `git rev-parse --show-toplevel` first).
- Two package managers (a `package-lock.json` and a `pnpm-lock.yaml`).
- Leaving the starter README, favicon and metadata ("Create Next App" as the page title is a classic).
- Adding a UI kit, animation library, state manager and three fonts before there is a page. Add things when a page needs them.
- Copying config from memory. Look it up for this version.
