# Nuxt

Verified against Nuxt 4.6 (2026-11-05). Docs MCP: `https://nuxt.com/mcp`.
Index: `https://nuxt.com/llms.txt` (`launchpad-docs.mjs search nuxt
<topic>`); every page is available as Markdown.

## Scaffold

```bash
npm create nuxt@latest <name> -- --template minimal --packageManager npm --gitInit
# check: npm create nuxt@latest -- --help   (templates and module prompts change)
```

## The folders to explain

- `app/`: the application (Nuxt 4 layout): `app/app.vue`, `app/pages/`
  (each file a URL), `app/components/`, `app/layouts/`, `app/composables/`.
- `server/`: server routes and API endpoints (Nitro).
- `public/`: files served as-is.
- `nuxt.config.ts`: modules, head defaults, route rules.
- Auto-imports: components and composables work without import lines.

## Baseline additions

| Item | How (check each in the docs) |
|---|---|
| Modules | `npx nuxt module add <name>`: `@nuxt/eslint`, `@nuxt/image`, `@nuxt/fonts`, and `@nuxtjs/seo` (sitemap, robots, OG image, schema.org) or the single modules `@nuxtjs/sitemap` / `@nuxtjs/robots` |
| Type check | `npm i -D vue-tsc`, script `"typecheck": "nuxt typecheck"` |
| Lint / format | `@nuxt/eslint` generates the flat config; Prettier or the module's stylistic rules |
| Site URL | `site: { url: 'https://<domain>', name: '<Brand>' }` (used by the SEO modules) |
| `lang` | `app.head.htmlAttrs.lang` in `nuxt.config.ts` |
| Titles / meta | `useSeoMeta()` per page, `titleTemplate` in `app.head` |
| 404 / errors | `app/error.vue`; `throw createError({ statusCode: 404 })` for missing CMS items |
| Images | `<NuxtImg>` / `<NuxtPicture>` (`@nuxt/image`, Vercel provider auto-detected) |
| Headers | `routeRules` headers, or the `nuxt-security` module |
| Rendering per route | `routeRules` (prerender, ISR/SWR, client-only) |

## Sanity

- `@nuxtjs/sanity` module (`useSanityQuery`, image helper, visual editing
  options). Follow Sanity's "Nuxt.js quick start" docs section.
- Separate Studio in `studio/` is the norm.
- Fresh content: ISR route rules + a webhook that purges, or SSR for
  previews; check the module docs for the current visual editing setup.

## Vercel

Zero config (Nitro detects Vercel). ISR via `routeRules` maps to Vercel's
ISR. Check the Nuxt deploy page for Vercel.

## Common mistakes

- Fetching in `onMounted` (client only) instead of `useFetch` /
  `useAsyncData` (server-rendered, SEO-visible).
- Secrets in `runtimeConfig.public`.
- Missing `htmlAttrs.lang`.

## Health-check extras

`launchpad-check` covers E1/E2 (modules), E4 (`site.url`), E6 (lang), P1
(NuxtImg). By hand: data fetched with `useFetch`/`useAsyncData`, server-only
keys in private `runtimeConfig`.
