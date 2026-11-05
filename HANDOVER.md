# Handover: website-launchpad

This repo holds an AI assistant setup that helps you start a website the
right way and keep it healthy. You run it inside **Claude Code** or
**Codex**, in the folder where the website lives (or will live). Think of it
as an experienced friend who builds with you: it asks what you need,
recommends the tools and explains why, sets everything up, shows you how
each part works, and checks the work against the official manuals.

## What it does

1. **Asks a few questions** about the site, who edits it and what the team
   knows.
2. **Recommends a framework** (Next.js, Astro, Nuxt or SvelteKit, or a
   no-code builder if that fits better) and explains the trade-offs in plain
   words.
3. **Sets up the project** with the official tools, plus the basics a good
   site needs (search engine setup, security, quality checks).
4. **Guides every account and connection:** GitHub, Sanity (content) and
   Vercel (hosting). You sign in in your browser; it tells you exactly what
   to type and checks that it worked.
5. **Puts the site online** with a preview link for every change.
6. **Runs health checks** whenever you ask, and writes
   `LAUNCHPAD-HEALTH.md`: what's fine, what's broken, how to fix it.
7. **Teaches as it goes.** Every step ends with a "Good to know", and you
   can try things yourself if you like.

It keeps a journey log, `LAUNCHPAD.md`, in the project: decisions, accounts
(never passwords or keys), progress. A new session picks up from there.

## One-time setup (about 5 minutes)

You need:

- **Claude Code** (or Codex), signed in.
- **Node.js** (current LTS). Check with `node --version`.
- **Access to this GitHub repo.** Ask the repo owner to add you.

Once per computer:

```bash
gh auth login        # sign in to GitHub
gh auth setup-git    # lets Claude Code download private repos
```

**Install in Claude Code** (inside a session):

```
/plugin install website-launchpad --marketplace FlytBase-Marketing/website-launchpad-skill
```

**Install in Codex:**

```bash
git clone https://github.com/FlytBase-Marketing/website-launchpad-skill.git
cd website-launchpad-skill && ./install.sh --codex
```

Restart Claude Code or Codex after installing.

## First run

1. Make an empty folder for the new site and open it in Claude Code.
2. Say what you want, for example:
   > I want to build a website for our drone services. Our marketing team
   > will update it.
3. Answer the questions. Pick "Co-pilot" if you want to learn as you go.
4. Read the recommendation. Say yes, ask questions, or push back.

**Tips**

- Ask "why?" any time. Explaining is part of its job.
- When it asks you to type something starting with `!` (like
  `! vercel login`), type it exactly; a browser window opens for you to sign
  in. It never needs your passwords.
- A yes to one step is not a yes to the next. It will ask again.
- It never commits, pushes or deploys unless you say so in that message.
- "Switch to autopilot" makes it faster and quieter; "explain more" does the
  opposite.

## Getting updates

```
/plugin marketplace update flytbase-website-launchpad
```

Or open `/plugin`, Marketplaces, `flytbase-website-launchpad`, Enable
auto-update. For Codex, `git pull` in your clone.

## Changing the skill

| To change | Edit |
|---|---|
| Missions, rules, approvals | `plugins/website-launchpad/skills/website-launchpad/SKILL.md` |
| Starter questions | `.../references/01-briefing-questions.md` |
| How the framework is chosen | `.../references/02-choosing-a-stack.md` |
| Tone, analogies, fun | `.../references/08-teaching-and-tone.md` |
| Sign-up and CLI steps | `.../references/10-accounts-and-cli.md` |
| Which docs count as official | `.../references/official-sources.json` |
| Health check rules | `.../scripts/launchpad-check.mjs`, `launchpad-verify-live.mjs` |
| Agent behaviour | `plugins/website-launchpad/agents/*.md` |
| Codex models | `codex/*.config.toml` |

Make changes on a branch and open a pull request. Before merging, run
`claude plugin validate .` from the repo root, and run the scripts against a
real project.

## Known gaps

- **Health checks are heuristics.** They read files and HTML, so they catch
  common mistakes, not everything. The auditor confirms each failure by
  hand; contrast, keyboard use and forms still need a person.
- **Docs move.** `official-sources.json` was checked on 2026-11-05. If a
  vendor changes its llms.txt or MCP address, `launchpad-docs.mjs` warns
  (non-200); update the file.
- **Astro has no llms.txt;** search uses its sitemap (titles from URLs).
  Its docs MCP server is better; connect it in Mission 2.
- **Model names change.** Update `model:` in `agents/*.md` and
  `codex/*.config.toml` when Haiku/Sonnet or the Codex models are renamed.
- **FlytBase context.** The house stack note (Next.js + Sanity + Vercel)
  is FlytBase-specific. Edit it in `SKILL.md` and `02-choosing-a-stack.md`
  before sharing outside the company.
