# 05: Liftoff with Vercel (Mission 4)

Vercel builds the site from GitHub, gives every pull request its own
preview URL, and serves production from a global network. Vercel publishes
an agent playbook, a plugin and an MCP server; use them for platform detail:

- Agent playbook: https://vercel.com/get-started.md
- Docs index: `launchpad-docs.mjs search vercel <topic>`
- Framework pages: search `vercel nextjs`, `vercel astro`, ...

## Explain it first

- **Hosting:** "Renting the shop space. Vercel keeps the doors open, fast,
  everywhere in the world."
- **Deploy:** "Opening the latest version of the shop."
- **Preview deployment:** "A dress rehearsal on a private stage. Every
  proposed change gets its own URL to check before it goes live."
- **Production:** "The real stage, at your domain."
- **Environment variables:** "Keys kept in Vercel's safe, handed to the site
  when it builds and runs. Different keys for rehearsal and the real show."
- **Domain and DNS:** "The street address, and the sign at the post office
  that says which building it points to."

## Steps (one approval each; accounts are the user's)

### 1. GitHub repository

- The user creates the repository (private by default) or approves `gh repo
  create <name> --private --source . --push`. Pushing needs their go in that
  message.
- Explain branches in one line: "`main` is what's live; changes happen on
  branches and arrive by pull request."

### 2. Vercel account and CLI

- Check `vercel --version` and `vercel whoami`. If not logged in, the user
  runs `vercel login` (or signs up) in the browser. Pause and wait.
- Plans: Hobby is for personal, non-commercial projects; a company site
  needs Pro. Say this plainly before they connect a company site.
- Optional, recommended: Vercel's agent plugin (`npx plugins add
  vercel/vercel-plugin`) or the Vercel MCP server
  (`launchpad-docs.mjs mcp-config vercel`), so deploy logs and build errors
  can be read in the chat.

### 3. Import the project

- Preferred: the user imports the GitHub repo in the Vercel dashboard (Git
  integration = automatic previews per PR). Or `vercel link` in the project
  folder, then connect Git in project settings.
- Vercel detects all four frameworks without config. Add a `vercel.json`
  only for what needs it (headers, redirects, crons). For Astro on-demand
  rendering add `@astrojs/vercel`; for SvelteKit `adapter-auto` works,
  `adapter-vercel` gives options; Nuxt and Next.js need nothing. Check the
  framework's deploy page in the docs.

### 4. Environment variables

- Add every name from `.env.example` in Vercel (Project > Settings >
  Environment Variables, or `vercel env add`), per environment:
  Development, Preview, Production.
- Mark tokens as sensitive. Never paste a secret in chat; the user enters it
  in the dashboard or the CLI prompt.
- Pull them for local use with `vercel env pull .env.local`.
- Remember: browser-prefixed variables are baked in at build time and are
  public.

### 5. First preview

- Open a pull request (or `vercel deploy` for a preview, with their go).
- Run `node <skill>/scripts/launchpad-verify-live.mjs <preview-url> --expect-noindex`.
  Previews should be noindex (Vercel adds it); preview protection may ask for
  a login; that is fine.
- Have the user click around the preview. Celebrate: the site is on the
  internet.

### 6. Production and domain

- Merge to `main` (their go) or `vercel deploy --prod`.
- Add the domain in Project > Domains; Vercel shows the exact DNS records.
  The user changes DNS at their registrar (or you guide them screen by
  screen). Choose apex or `www` as primary and redirect the other.
- Set the production site URL env var to the final domain and redeploy, so
  canonicals, sitemap and Open Graph use it.
- Run `launchpad-verify-live.mjs https://<domain> --psi`. Expect 0 blockers.

### 7. Turn on the gauges

- Vercel Web Analytics and Speed Insights (packages from the framework
  section of the docs). Explain Core Web Vitals in plain words (see the
  analogy bank).
- Sanity: add a webhook or confirm the live content setup works on
  production (publish a test change).

## Checks

| ID | Check |
|---|---|
| D1 | `.vercel` git-ignored |
| D2 | `vercel.json` valid, minimal |
| D3 | Build output not committed |
| D5 | Every `.env.example` name exists in Vercel for the right environments |
| D6 | Previews noindex; production indexable (`verify-live` E6) |
| D7 | Domain primary + redirect of the other (apex/www), HTTPS (verify-live L2) |
| D8 | Production site URL env var equals the domain |
| D9 | Plan fits the use (Pro for commercial) |
| D10 | Build passes on Vercel with the same Node major as `.nvmrc` |

## When something breaks

- **Build fails on Vercel but works locally:** Node version mismatch,
  missing env var, case-sensitive import paths (macOS forgives `Header.tsx`
  vs `header.tsx`; Linux does not), or a dev dependency needed at build
  time. Read the build log (Vercel MCP or dashboard), fix, push.
- **Site works, content doesn't update:** Mission 3 step 6.
- **404 on refresh of a deep link:** a client-only router or a static export
  without the right routes; check rendering mode.
