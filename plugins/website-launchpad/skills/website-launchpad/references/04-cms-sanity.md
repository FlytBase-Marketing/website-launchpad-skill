# 04: Content with Sanity (Mission 3)

Sanity stores content as structured data (the Content Lake) and gives
editors a customisable editing app (Sanity Studio). The website fetches
content with GROQ queries. Sanity publishes its own agent quickstart, skills
and MCP server; use them. This file is the journey and the checks; the
official docs are the source for every API detail:

- Agent quickstart: https://www.sanity.io/docs/getting-started/ai-coding-agents
- Docs index: `launchpad-docs.mjs search sanity <topic>`
- Framework guides: Next.js, Astro, Nuxt and SvelteKit sections in the docs
  index (search `sanity nextjs`, `sanity astro`, ...)

## Explain it first (plain words)

- **CMS:** "The shop's back office. Your team changes the products on the
  shelves without calling a builder."
- **Schema:** "The form your editors fill in. We design it around how your
  team talks about the content, not around pages."
- **Studio:** "The back-office app where editors work."
- **GROQ query:** "A shopping list the website hands to Sanity: 'all blog
  posts, newest first, with title, date and author name'."
- **Dataset:** "A separate stockroom. `production` is the live one."
- **Drafts and publishing:** "Editors can work on a draft; visitors only see
  what's published."

## Steps (one approval each)

### 1. Decide the shape (ask the user only the business parts)

- **Embedded or separate Studio?** Embedded (Studio at `/studio` inside the
  site, one repo, one deploy) is the default for Next.js. Separate (`studio/`
  folder, deployed to `<name>.sanity.studio`) is the default for Astro, Nuxt
  and SvelteKit and for monorepos. Decide yourself; mention it.
- **What content types?** Ask in their words: "What kinds of things will
  your team publish? Blog posts, case studies, team members, jobs, FAQs?" Then
  propose the types and fields as a short table. Separate *content* from
  *layout*: a `post` has title, slug, excerpt, body, author, date, SEO; it
  does not have "hero block 2".
- **Page builder?** Only if marketers must assemble landing pages from
  blocks. It is powerful and easy to overdo; start with 4 to 6 block types.

### 2. Create the project and Studio

- Follow Sanity's agent quickstart. The user signs in in the browser (pause
  and wait). `sanity init` creates the project and dataset, scaffolds the
  Studio and installs Sanity's own agent skills and MCP server.
- If the user does not want an account yet, Sanity offers projects without
  an account (sanity.new) that they claim later.
- Note the project ID and dataset in `.env.local` and `.env.example`
  (names only in the example). The project ID is not secret; tokens are.

### 3. Model the schemas with the user

- Write schemas with `defineType` / `defineField` and validation on
  everything that matters: required titles, slug from title, length limits on
  SEO title (60) and description (160), alt text required on images.
- Use clear titles and descriptions on fields; editors read them.
- Deploy the schema so tools and the MCP server see it (`sanity schema
  deploy`, check the current command in the docs).
- Add 3 to 5 sample documents so nothing is empty (Sanity MCP
  `create_documents`, or a seed script). Ask before writing content.

### 4. Typed queries

- Set up Sanity TypeGen (schema extract + typegen generate; check the
  current commands) so every query result has types.
- Keep queries in one file per area (`queries.ts`) with `defineQuery`.

### 5. Fetch content in the site

- Use the official integration for the framework (`next-sanity`,
  `@sanity/astro`, `@nuxtjs/sanity`, `@sanity/sveltekit`). Check each
  package's README and the docs for the installed version.
- One client config in one file: project ID, dataset, a **dated
  `apiVersion`**, and `useCdn` set on purpose.
- Tokens only in server code. A read token is needed for drafts/preview; a
  write token only for scripts and webhooks, never in the site's runtime.
- Images through Sanity's image pipeline (`@sanity/image-url` or the
  integration's helper) with width, format and hotspot; always render alt
  text from the schema.
- Rich text (Portable Text) through the official renderer; map custom blocks
  to components.

### 6. Published content shows up without a redeploy

The classic beginner surprise: "I published, why is the site unchanged?"
Choose one, from the docs for the framework:

- **Live Content API** (Next.js: `defineLive` from `next-sanity`): content
  updates live; preferred where supported.
- **Tag-based revalidation via a GROQ-powered webhook** to a route that
  revalidates by tag/path (verify the signature with the webhook secret).
- **Static sites:** a Vercel deploy hook triggered by a Sanity webhook.

Explain with the bakery analogy: "We restock the shelf when a new batch is
ready, instead of baking every loaf for every customer."

### 7. Visual editing (if editors want it)

- Presentation tool + draft mode + overlays: editors click on the page to
  edit the field behind it. Follow the official "Visual Editing with
  <framework>" guide for the installed versions.
- Restrict draft mode to authenticated Studio users; never expose drafts
  publicly.

### 8. CORS, access and handover

- Add the site's local and production origins to the project's CORS
  origins (with credentials only where the Studio or preview needs it).
- Invite editors with the right roles; explain roles in one line each.
- Hand the user a 5-line "how to publish" guide and have **them** publish a
  test post and see it live. This is the Mission 3 finish line.

## Checks (launchpad-check C1 to C6 plus these by hand)

| ID | Check |
|---|---|
| C1 | `apiVersion` pinned to a date in one place |
| C2 | `useCdn` set on purpose |
| C3 | No token in browser code; no `NEXT_PUBLIC_`/`PUBLIC_` token names |
| C4 | TypeGen configured, types generated |
| C5 | Published content reaches the site (live API, revalidation or deploy hook) |
| C6 | Schemas have validation (required, lengths, alt text) |
| C7 | CORS origins: localhost and production only, no wildcard |
| C8 | Webhook secret verified in the handler |
| C9 | Drafts never visible without draft mode |
| C10 | Every image rendered with alt text from the schema |

## When not Sanity

- Only developers edit, rarely: Markdown/MDX in the repo (Astro content
  collections, Nuxt Content, MDX in Next.js). Free, versioned, simple. Say
  when they will outgrow it: "when someone who doesn't use Git needs to
  publish".
- The organisation already runs another CMS: use it; the same checks apply
  (pinned API version, server-only tokens, revalidation, typed content).
