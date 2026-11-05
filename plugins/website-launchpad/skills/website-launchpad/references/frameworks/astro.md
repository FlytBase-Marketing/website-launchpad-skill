# Astro

Verified against Astro 7.4 (2026-11-05). Astro has no llms.txt; use the
Astro Docs MCP (`https://mcp.docs.astro.build/mcp`) or
`launchpad-docs.mjs search astro <topic>` (sitemap-based) and `fetch`.

## Scaffold

```bash
npm create astro@latest <name> -- --template minimal --install --git --yes
# templates: minimal, basics, blog, starlight (docs), portfolio; check: npm create astro@latest -- --help
```

The starter writes an `AGENTS.md` with dev-server and docs pointers. Keep
it. It also sets `"engines"`: check the user's Node meets it (`node
--version`) before installing; the Astro 7 starter required a recent Node
22 patch.

## The folders to explain

- `src/pages/`: every file is a URL (`about.astro` is `/about`).
- `src/layouts/`: page shells (`<html lang>`, `<head>`).
- `src/components/`: building blocks; `.astro` files render to HTML with no
  JavaScript unless you add an island (`client:load`, `client:visible`).
- `src/content.config.ts` + content collections: typed Markdown/MDX or
  loaders (Sanity can feed pages instead).
- `public/`: files served as-is.

## Baseline additions

| Item | How (check each in the docs) |
|---|---|
| Integrations | add with `npx astro add <name>` (it edits the config for you): `sitemap`, `mdx`, `react`/`vue`/`svelte` if islands are needed, `vercel` only for on-demand rendering |
| Type check | `npm i -D @astrojs/check typescript`, script `"typecheck": "astro check"` |
| Lint | ESLint flat config with `eslint-plugin-astro` (+ `eslint-plugin-jsx-a11y`) |
| Format | Prettier + `prettier-plugin-astro` |
| Site URL | `site: 'https://<domain>'` in `astro.config.mjs` (sitemap and canonicals need it) |
| Titles / meta | a `BaseHead` component used by every layout: title, description, canonical (`new URL(Astro.url.pathname, Astro.site)`), OG |
| robots.txt | `public/robots.txt` with the sitemap URL, or `src/pages/robots.txt.ts` |
| 404 | `src/pages/404.astro` |
| Images | `<Image>` / `<Picture>` from `astro:assets` (local and remote; configure remote domains) |
| Fonts | Astro's fonts API if available in this version, else `@fontsource/*` |
| Headers | `vercel.json` headers for static output; middleware for on-demand pages |

## Rendering

Static by default (everything built at deploy time). Pages that must be
fresh per request opt in to on-demand rendering and need an adapter
(`@astrojs/vercel`). With Sanity, static + a deploy hook on publish is the
simplest; on-demand or server islands when content must be instant. Check
the "On-demand rendering" docs.

## Sanity

- `npx astro add @sanity/astro` (official integration): client config in
  `astro.config.mjs`, optional embedded Studio route, visual editing
  support. Follow Sanity's "Use Sanity with Astro" docs section.
- Separate Studio (`studio/` folder, `sanity deploy`) is the common setup.
- Portable Text: `astro-portabletext` or the integration's renderer (check
  the Sanity docs for the current recommendation).

## Vercel

Static sites: zero config. On-demand: `npx astro add vercel`. Check the
Astro deploy guide for Vercel and the adapter options (ISR, image service).

## Common mistakes

- No `site` in the config (sitemap fails, canonicals relative).
- Adding `client:load` everywhere (ships JavaScript the page didn't need).
- Using a framework island where a plain `.astro` component would do.
- Raw `<img>` for local images (lose optimisation).

## Health-check extras

`launchpad-check` covers E4 (`site`), E1 (`@astrojs/sitemap`), P1 (Image).
By hand: count of `client:*` directives per page, collections have schemas.
