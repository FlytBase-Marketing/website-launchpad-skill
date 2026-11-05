# 07: Official docs first

Your training data is older than the frameworks. On 2026-11-05 the current
majors were Next.js 16, Astro 7, Nuxt 4, SvelteKit 3, Sanity 6 and Vercel CLI
56, several of them newer than most model knowledge. Assume your memory of
any API, flag or config option may be out of date, and check.

## Lookup order

1. **Docs bundled with the installed package** (exact version).
   - Next.js ships its docs at `node_modules/next/dist/docs/` (Markdown, about
     400 pages). Its generated `AGENTS.md` tells agents to read them.
   - `launchpad-docs.mjs search nextjs <topic> --project .` searches them
     automatically when present.
   - Other packages: read the package README in `node_modules/<pkg>/` and
     its `CHANGELOG.md` for recent changes.
2. **The vendor's docs MCP server**, if connected in this session:

   | Source | Server | Auth |
   |---|---|---|
   | Next.js | `next-devtools-mcp` (stdio, `npx -y next-devtools-mcp@latest`): docs plus live errors, routes and logs from `next dev` | none |
   | Astro | `https://mcp.docs.astro.build/mcp` | none |
   | Nuxt | `https://nuxt.com/mcp` | none |
   | Svelte/SvelteKit | `https://mcp.svelte.dev/mcp` (docs plus a Svelte code autofixer) | none |
   | Sanity | `https://mcp.sanity.io` (docs, schema, GROQ, content) | OAuth sign-in |
   | Vercel | `https://mcp.vercel.com` (docs, projects, deployments, logs) | OAuth sign-in |

   `launchpad-docs.mjs mcp-config <source>` prints the commands for Claude
   Code and Codex and the `.mcp.json` block. Add servers at project scope
   in Mission 2 (framework) and Missions 3 and 4 (Sanity, Vercel).
3. **The machine-readable index online**, via the script:
   - `launchpad-docs.mjs search <source> <words>` finds pages (llms.txt or
     sitemap).
   - `launchpad-docs.mjs fetch <url> --grep "<words>"` prints the page as
     Markdown (Next.js, Nuxt, Sanity and Vercel serve `.md`; Astro and
     Tailwind are HTML, stripped to text).
   - `launchpad-docs.mjs version <source> --project .` compares the
     installed, documented and latest versions. If the online docs are for a
     newer major than the project, say so and prefer bundled or versioned
     docs.
4. **Sources for cross-cutting rules:** Google Search Central (SEO),
   web.dev (Core Web Vitals), MDN (HTML, headers, accessibility), W3C WCAG,
   OWASP. Fetch the page; don't paraphrase from memory.

Never use as authority: blog posts, Medium, Stack Overflow answers, video
transcripts, AI-generated docs mirrors, or third-party "docs as a service"
copies. They can help you find the right official page; they cannot be the
source.

## When to look up (always, for these)

- Any create command, flag or config option.
- Any file convention (`app/sitemap.ts`, `src/pages/404.astro`,
  `+page.server.ts`, `server/routes/`...).
- Caching, rendering and revalidation behaviour (the most frequently changed
  area in every framework).
- Integration packages (`next-sanity`, `@sanity/astro`, adapters): their
  README for the installed version.
- Upgrades: the official upgrade guide and codemod, always, before touching
  a major version.
- Anything the user asks "is this still true?" about.

You may skip a lookup for plain HTML, CSS and JavaScript fundamentals.

## Fact-check in parallel

Before a step that writes several framework-specific things, list the claims
(commands, file names, options) and send them to `docs-scout` agents, one
per source, in parallel. Each returns a verdict per claim with the citation.
Fix the plan before you run it.

## How to cite while teaching

- Short and specific: "Per the Next.js 16.4 docs (Metadata and OG images),
  a `sitemap.ts` file in `app/` generates `/sitemap.xml`."
- Link the page in `LAUNCHPAD.md` decisions and in the health report fixes.
- When you corrected yourself: "I first thought X; the current docs say Y,
  so we'll do Y." This models good practice and builds trust.
- If the docs are unclear or silent, say so and pick the conservative
  option.

## Version drift checklist (Mission 6)

- `launchpad-check.mjs --online` flags packages a major behind.
- For each: `launchpad-docs.mjs version <source> --project .`, then read the
  upgrade guide (`official-sources.json` has the URL), then plan the upgrade
  as its own step with the official codemod and a branch.
