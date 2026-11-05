# website-launchpad skill

An agent skill (Claude Code and Codex) that takes someone from "we need a
website" to a live, healthy site, and teaches them along the way. It:

- asks a few starter questions and recommends a framework (Next.js, Astro,
  Nuxt, SvelteKit, or honestly a no-code builder) with plain-language reasons
- scaffolds with the framework's official create command and adds a solid
  baseline (strict TypeScript, lint, format, SEO basics, security headers,
  CI, agent rules)
- walks the user through every sign-up and CLI connection: GitHub, Sanity,
  Vercel
- sets up Sanity as the CMS and Vercel for hosting, step by step
- runs health checks against best practices, on the repo and on the live
  site
- checks every technical claim against **official docs** for the installed
  version: docs bundled with the package, the vendor's docs MCP server, or
  its llms.txt
- works one approved step at a time, as a friendly co-pilot with missions,
  small wins and "try it yourself" moments

Sibling of the `website-i18n` skill (same layout and approval style). Hand
off to it when a site needs several languages.

## What's inside

```
website-launchpad-skill/                   # git repo = Claude Code plugin marketplace
├── HANDOVER.md                            # start here if you are new to this
├── .claude-plugin/marketplace.json        # marketplace "flytbase-website-launchpad"
├── plugins/website-launchpad/
│   ├── .claude-plugin/plugin.json
│   ├── skills/website-launchpad/
│   │   ├── SKILL.md                       # missions, rules, model routing
│   │   ├── references/
│   │   │   ├── 01-briefing-questions.md   # the starter questions and what each answer means
│   │   │   ├── 02-choosing-a-stack.md     # scoring, framework profiles, honest "use a builder"
│   │   │   ├── 03-foundation.md           # scaffold + baseline for every framework
│   │   │   ├── 04-cms-sanity.md           # Sanity: schemas, fetching, live content, visual editing
│   │   │   ├── 05-deploy-vercel.md        # GitHub + Vercel: previews, env vars, domains
│   │   │   ├── 06-quality-bar.md          # SEO, a11y, performance, security, analytics (with IDs)
│   │   │   ├── 07-official-docs.md        # docs-first lookup order, MCP servers, citing
│   │   │   ├── 08-teaching-and-tone.md    # step loop, modes, templates, analogies, fun
│   │   │   ├── 09-health-check-guide.md   # running and reporting a health check
│   │   │   ├── 10-accounts-and-cli.md     # guided sign-ups + CLI connections, troubleshooting
│   │   │   ├── official-sources.json      # registry of official docs + docs MCP servers
│   │   │   └── frameworks/                # nextjs, astro, nuxt, sveltekit
│   │   ├── scripts/                       # zero-dependency Node 18+, all read-only
│   │   │   ├── launchpad-detect.mjs       # what is this project built with
│   │   │   ├── launchpad-check.mjs        # ~45 repo checks with evidence and fixes
│   │   │   ├── launchpad-verify-live.mjs  # deployed-site checks (+ PageSpeed/CWV)
│   │   │   ├── launchpad-docs.mjs         # official docs search/fetch/version/mcp-config
│   │   │   └── launchpad-accounts.mjs     # tools, sign-ins and connections, next command
│   │   └── templates/                     # LAUNCHPAD.md, LAUNCHPAD-HEALTH.md, AGENTS.md,
│   │                                      # env.example, github-ci.yml
│   └── agents/
│       ├── launchpad-auditor.md           # read-only health check (sonnet)
│       └── docs-scout.md                  # official-docs fact checker (haiku)
├── codex/                                 # Codex profiles + README
└── install.sh                             # for Codex, or Claude Code without plugins
```

## Install

**Claude Code (recommended): as a plugin.**

```
/plugin install website-launchpad --marketplace FlytBase-Marketing/website-launchpad-skill
```

The repo is private, so your machine needs GitHub access first: `gh auth
login`, then `gh auth setup-git`, once. Updates:
`/plugin marketplace update flytbase-website-launchpad`.

**Codex, or Claude Code without plugins:**

```bash
git clone https://github.com/FlytBase-Marketing/website-launchpad-skill.git
cd website-launchpad-skill && ./install.sh        # --codex or --claude to limit
```

Restart Claude Code or Codex. Then, in an empty folder (or an existing site):

> "I want to start a website for our new product line"
>
> "Is this site following best practices? Run a health check."

## How it works

```
Mission 0 Briefing ─► 1 Blueprint ─► 2 Foundation ─► 3 Content ─► 4 Liftoff ─► 5 Polish ─► 6 Guardian
 questions           stack + why     scaffold,       Sanity         GitHub +      SEO, a11y,   health checks,
                     (approval)      baseline,       schemas,       Vercel,       speed,       CI, upgrades
                                     docs MCP        live content   domain        security
```

Every step: explain (plain words + analogy), ask, do, report with proof and
one "Good to know". Accounts are created just in time, and the user types
browser logins as `!` commands (`! vercel login`). Nothing is committed,
pushed or deployed without an explicit go.

**Docs-first.** Before writing framework, CMS or hosting code the agent
checks the official docs for the installed version:

1. docs bundled with the package (Next.js ships them in
   `node_modules/next/dist/docs/`)
2. the vendor's docs MCP server (Next.js `next-devtools-mcp`, Astro, Nuxt,
   Svelte, Sanity, Vercel)
3. `launchpad-docs.mjs` against the vendor's llms.txt / sitemap

## Using the scripts directly

```bash
S=<repo>/plugins/website-launchpad/skills/website-launchpad/scripts
node $S/launchpad-detect.mjs .                          # stack summary
node $S/launchpad-check.mjs . --online --report health.md
node $S/launchpad-verify-live.mjs https://example.com --psi
node $S/launchpad-accounts.mjs .                        # what's signed in / connected
node $S/launchpad-docs.mjs search nextjs sitemap --project .
node $S/launchpad-docs.mjs fetch https://nextjs.org/docs/app/getting-started/metadata-and-og-images --grep sitemap
node $S/launchpad-docs.mjs mcp-config nextjs sanity vercel
```

Every script prints `--help`.
