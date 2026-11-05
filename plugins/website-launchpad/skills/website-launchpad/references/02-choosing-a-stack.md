# 02: Choosing the stack (Mission 1)

Recommend **one** framework, name a runner-up, say why not the others in
one line each. Then the supporting stack (CMS, hosting, styling). Facts about
versions and features must come from the official docs at run time
(`references/07-official-docs.md`); this file holds the judgement, not the
version numbers.

## Step 1: rule out the wrong category

Before comparing frameworks, check whether a framework is the right answer.

| Situation | Honest recommendation |
|---|---|
| Few pages, no developers now or later, marketers want to design pages themselves | A no-code builder (Webflow, Framer). Say it, even though it means no code journey. Offer to help them evaluate one. |
| A shop is the main thing | Shopify (hosted theme, or Hydrogen if they have React devs). Building checkout yourself is rarely worth it. |
| Docs for a product | Astro + Starlight (or the docs tool their product already uses). |
| An internal tool or dashboard with no public pages | A web app framework; SEO features do not matter, auth and data do. |
| The organisation has a house stack | Use it unless there is a strong reason not to. Shared people, components, design system and know-how beat a small technical edge. |

## Step 2: score the four frameworks

Give each framework 0 to 3 points per row that applies to this project. Sum
them. Do this quietly; show the user only the result and the reasons.

| Signal from the briefing | Next.js | Astro | Nuxt | SvelteKit |
|---|---|---|---|---|
| Content-first: mostly reading pages, blog, marketing | 2 | 3 | 2 | 2 |
| Docs site | 1 | 3 (Starlight) | 2 (Docus / Nuxt Content) | 1 |
| App-like features: logins, dashboards, personalisation | 3 | 1 | 3 | 3 |
| Team knows React / wants the biggest hiring pool | 3 | 2 (React islands) | 0 | 0 |
| Team knows Vue | 0 | 2 (Vue islands) | 3 | 0 |
| Team knows Svelte | 0 | 2 (Svelte islands) | 0 | 3 |
| Beginners, content site | 1 | 3 | 2 | 2 |
| Beginners who will grow into apps or a React team | 3 | 1 | 2 | 2 |
| Fastest pages with least effort (little JavaScript shipped) | 1 | 3 | 2 | 3 |
| Sanity visual editing depth (Presentation, live preview) | 3 | 2 | 2 | 2 |
| Vercel features on day one (ISR, image optimisation, middleware) | 3 | 2 | 2 | 2 |
| A/B tests, edge personalisation | 3 | 1 | 2 | 2 |
| Heavy interactivity on many pages | 3 | 1 | 3 | 3 |
| Many pages, mostly static, rebuilt often | 2 | 3 | 2 | 2 |
| Several languages | 3 (next-intl) | 2 (built-in routing) | 3 (@nuxtjs/i18n) | 2 (Paraglide) |

Tie-breakers, in order: house stack, team skills, the main page type, the
ecosystem they need (component libraries, integrations), then personal
preference after you have explained the trade-off.

## Framework profiles (for the explanation)

Use these one-liners to explain. Verify any specific feature claim in the
docs before you state it.

**Next.js** (React; by Vercel)
- Shines: sites that are part content, part app; the biggest ecosystem and
  hiring pool; first-class Sanity visual editing; every Vercel feature first.
- Costs: the most concepts to learn (server vs client components, caching
  rules); moves fast, so docs must be checked per version.
- Analogy: **a fully equipped professional kitchen.** It can cook anything,
  but there are more knobs to learn.

**Astro** (content-first; any UI library)
- Shines: content and marketing sites, docs (Starlight), blogs; ships almost
  no JavaScript by default, so pages are fast without effort; gentle for
  beginners (HTML-like files); can use React, Vue or Svelte components where
  needed ("islands").
- Costs: app-like features (logins, dashboards everywhere) are not its home
  turf; fewer people know it than React.
- Analogy: **a print shop that can add a few interactive stickers.** Pages
  arrive finished; only the bits that need to move get JavaScript.

**Nuxt** (Vue)
- Shines: Vue teams; very good conventions and modules (SEO, images, fonts,
  content, i18n) that turn features on with one line; strong docs.
- Costs: smaller ecosystem than React; some Sanity and Vercel features arrive
  after Next.js.
- Analogy: **a well-organised kitchen with labelled drawers.** Most things
  are where you expect them.

**SvelteKit** (Svelte)
- Shines: small, fast, pleasant to write; little code for a lot; excellent
  for interactive sites built by a small team that likes Svelte.
- Costs: the smallest ecosystem of the four; fewer ready-made components and
  integrations; fewer people to hire.
- Analogy: **a compact, sharp chef's knife.** Light and precise; fewer
  attachments.

**No-code builders** (Webflow, Framer)
- Shines: marketers own design and pages; no deploy pipeline; fast to start.
- Costs: lock-in, monthly cost per site/seat, harder custom logic, limited
  version control, scaling content models gets clunky.

## The supporting stack (defaults and when to change them)

| Layer | Default | Why | Choose differently when |
|---|---|---|---|
| Language | TypeScript (strict) | Catches mistakes before visitors do; editors autocomplete | Never for new projects; maybe for a one-page experiment |
| Styling | Tailwind CSS | Fast, consistent, works with every framework, great with design tokens | The team has a design system in CSS/another tool, or strongly prefers CSS modules |
| Components | shadcn/ui (React), Nuxt UI (Vue), Bits UI / shadcn-svelte (Svelte) | Accessible building blocks you own as code | Heavy custom design: build your own on Radix/Headless UI primitives |
| CMS | Sanity | Structured content, real-time Studio, visual editing, GROQ, generous free tier, official agent tooling | Developers only: Markdown/MDX in the repo. Org already on another CMS: use it |
| Hosting | Vercel | Zero-config for all four frameworks, preview URL per pull request, global CDN, Speed Insights | Company policy, existing host, self-hosting, China, or cost at very high traffic |
| Package manager | npm (or pnpm if the team uses it) | npm ships with Node; fewer surprises for beginners | Monorepos: pnpm |
| Lint/format | The framework's default lint setup + Prettier, or Biome | Same rules for humans, CI and AI helpers | Team already standardised on one |
| Analytics | Vercel Web Analytics + Speed Insights | Privacy-friendly, real Core Web Vitals | Marketing needs GA4/GTM: add with consent mode |

## The blueprint explanation

When you present the recommendation (template in
`references/08-teaching-and-tone.md`):

1. The recommendation and the one main reason, in their words ("because your
   team will mostly publish articles and you want fast pages without
   tuning").
2. Two or three more reasons, each tied to a briefing answer.
3. The honest cost of this choice (one line).
4. The runner-up and when it would win.
5. One line each for the others ruled out.
6. The supporting stack, one line each.
7. "Does this fit how you imagined it? Happy to compare any two in more
   depth."

Then record it all in the Blueprint section of `LAUNCHPAD.md`, including
what was ruled out and why, so a later session (or a new teammate) can see
the reasoning.
