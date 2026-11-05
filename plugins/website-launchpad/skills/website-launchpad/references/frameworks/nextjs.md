# Next.js

Verified against Next.js 16.4 (2026-11-05). Before acting, read the bundled
docs for the installed version: `node_modules/next/dist/docs/` (or
`launchpad-docs.mjs search nextjs <topic> --project .`). Docs MCP:
`next-devtools-mcp`.

## Scaffold

```bash
npx create-next-app@latest <name> --yes            # defaults: TypeScript, ESLint, Tailwind, App Router, Turbopack
# explicit: --ts --eslint --tailwind --app --src-dir --use-npm   (or --biome instead of --eslint)
```

Check `npx create-next-app@latest --help` first. The starter writes an
`AGENTS.md` block telling agents to read the bundled docs, and `next dev`
re-adds it. Keep it and add the launchpad rules below it.

## The folders to explain

- `app/`: every folder is a URL segment; `page.tsx` is the page,
  `layout.tsx` wraps pages (the root layout holds `<html lang>`).
- `public/`: files served as-is (`/logo.svg`).
- `next.config.ts`: site-wide settings (headers, redirects, images).
- Server components by default: they render on the server and send HTML.
  `"use client"` marks the small interactive pieces.

## Baseline additions (Mission 2 step 4 and 7)

| Item | How (look up the exact API in the bundled docs) |
|---|---|
| Scripts | add `"typecheck": "tsc --noEmit"`, `"format": "prettier --write ."`; `lint` is plain `eslint` (no `next lint`) |
| Site URL | `metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000')` in the root layout's `metadata` |
| Titles | `title: { default, template: '%s | Brand' }` + `description` in the root `metadata`; per page `export const metadata` or `generateMetadata` |
| Sitemap / robots | `app/sitemap.ts`, `app/robots.ts` (file conventions under Metadata) |
| 404 | `app/not-found.tsx`; call `notFound()` for missing CMS items |
| Images | `next/image`; add CMS image hosts to `images.remotePatterns` |
| Fonts | `next/font/google` or `next/font/local` (self-hosted at build) |
| OG image | `app/opengraph-image.tsx` or a static `opengraph-image.png` |
| Icons | `app/icon.png` / `app/apple-icon.png` |
| Headers | `async headers()` in `next.config.ts`; `poweredByHeader: false` |
| Request interception | `proxy.ts` (renamed from `middleware.ts` in 16; check the docs) |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` components in the root layout |

## Rendering and caching

The area that changes most between versions. Do not rely on memory for
`fetch` caching defaults, `revalidate`, `'use cache'`, `cacheTag`,
`revalidateTag`/`updateTag` or Cache Components. Read "Caching" and
"Revalidating" in the bundled docs, then explain the choice with the bakery
analogy. Marketing pages: static with tag revalidation from Sanity.

## Sanity

- `next-sanity` (one package: client, `defineQuery`, `defineLive`, Studio,
  visual editing). Follow Sanity's "Use Sanity with Next.js" docs section
  and the package README for the installed version.
- Embedded Studio is the default: a catch-all route (for example
  `app/studio/[[...tool]]/page.tsx`) rendering the Studio. Exclude it from
  the sitemap and robots.
- Live content: `defineLive` gives `sanityFetch` + `<SanityLive />`; draft
  mode + `<VisualEditing />` for the Presentation tool.

## Vercel

Zero config. Previews per PR, ISR and image optimisation work out of the
box. `vercel.json` only for extra headers/redirects/crons.

## Common mistakes

- `"use client"` at the top of a layout or page (everything below becomes
  client code; launchpad-check P4).
- Reading secrets in client components, or naming them `NEXT_PUBLIC_*`.
- Forgetting `metadataBase` (relative OG URLs, wrong canonicals).
- Raw `<img>` for content images; missing `remotePatterns`.
- Assuming last year's caching defaults.

## Health-check extras

`launchpad-check` covers P4 (server layouts), E1/E2 (file conventions),
E4 (`metadataBase`). By hand: dynamic routes call `notFound()`, the Studio
route is excluded from indexing, `next build` output shows the intended
static/dynamic split.
