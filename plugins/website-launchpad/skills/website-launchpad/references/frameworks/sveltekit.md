# SvelteKit

Verified against SvelteKit 3.1 with Svelte 5 (2026-11-05). Docs MCP:
`https://mcp.svelte.dev/mcp` (also has a Svelte 5 code autofixer: use it on
every component you write). Index: `https://svelte.dev/docs/kit/llms.txt`
(full docs as text; `launchpad-docs.mjs search sveltekit <topic>`).

## Scaffold

```bash
npx sv@latest create <name> --template minimal --types ts --no-add-ons --install npm
npx sv@latest add eslint prettier tailwindcss sveltekit-adapter    # one at a time if you want to explain each
# check: npx sv@latest create --help ; npx sv@latest add --help (add-ons include vitest, playwright, mdsvex, paraglide, mcp)
```

## The folders to explain

- `src/routes/`: folders are URLs; `+page.svelte` is the page,
  `+layout.svelte` wraps pages, `+page.server.ts` loads data on the server,
  `+server.ts` is an endpoint (good for `sitemap.xml`).
- `src/lib/`: shared code (`$lib` import).
- `src/app.html`: the HTML shell (`<html lang>` lives here).
- `static/`: files served as-is.
- Svelte 5 runes (`$state`, `$derived`, `$props`): look up current syntax;
  old Svelte 4 patterns (`export let`, `$:`) are outdated.

## Baseline additions

| Item | How (check each in the docs) |
|---|---|
| Type check | the starter's `check` script (`svelte-check`); add `"typecheck"` alias if CI expects it |
| Lint / format | `sv add eslint prettier` |
| Site URL | `PUBLIC_SITE_URL` in env (public on purpose), used for canonical and sitemap |
| Titles / meta | `<svelte:head>` per page, or a `Seo.svelte` component in `$lib` |
| Sitemap | `src/routes/sitemap.xml/+server.ts` (prerendered), or `super-sitemap` |
| robots.txt | `static/robots.txt` (starter includes one; add the Sitemap line) |
| 404 / errors | `src/routes/+error.svelte`; `error(404)` from `@sveltejs/kit` in load |
| Images | `@sveltejs/enhanced-img` (`<enhanced:img>`) for local images; CMS images via the CMS URL builder |
| Prerender | `export const prerender = true` in the root `+layout.ts` for content sites |
| Headers | `handle` hook in `src/hooks.server.ts` (`setHeaders`/response headers) or `vercel.json` |

## Sanity

- `@sanity/sveltekit` (official; client, loaders and visual editing). Follow
  the package README and Sanity's docs for the installed versions.
- Separate Studio in `studio/`.
- Server-only tokens: `$env/static/private` or `$env/dynamic/private`, read
  in `+page.server.ts` / hooks only.

## Vercel

`adapter-auto` detects Vercel; switch to `@sveltejs/adapter-vercel` for
options (ISR per route, runtime). Check the SvelteKit Vercel adapter page.

## Common mistakes

- Loading data in `onMount` instead of `load` (not in the server HTML).
- Importing `$env/static/private` in a universal `+page.ts` (build error, or
  a leak if renamed to public).
- Svelte 4 syntax in a Svelte 5 project.
- `<div on:click>` / `onclick` on non-interactive elements (Svelte warns;
  listen).

## Health-check extras

`launchpad-check` covers E1 (`+server.ts` sitemap), E6 (`app.html` lang),
A3 (clickable divs). By hand: `prerender` set where intended, Svelte
compiler warnings at 0.
