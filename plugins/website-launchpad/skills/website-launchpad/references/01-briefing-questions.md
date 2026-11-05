# 01: Briefing questions (Mission 0)

Goal: learn enough to recommend a stack, in **two short rounds at most**.
Every question must change what you recommend or build. If it doesn't, don't
ask it.

## Before asking

Infer first, from:

- the user's message ("a blog for our drone team" already answers Q1)
- `launchpad-detect.mjs` (an existing repo answers the framework, CMS and
  hosting questions)
- `LAUNCHPAD.md` from an earlier session
- the organisation: inside FlytBase the house stack is Next.js + Sanity +
  Vercel, so Q4 and Q8 are mostly answered

State what you inferred in one line ("Sounds like a marketing site your
team will edit, so I'll skip those questions") so they can correct you.

## How to ask

- Use `AskUserQuestion` when available: max 4 questions per call, 2 to 4
  options each, your recommended option first with "(Recommended)". The user
  can always type "Other".
- Without it: a numbered list, lettered options, "reply like 1b 2a 3c".
- Open with one friendly line: what you're about to do and why. Example:
  "Four quick questions so I recommend the right tools, not just the popular
  ones. Pick whatever is closest; there are no wrong answers."
- After the answers, play them back in one or two sentences before Mission 1.

## Round 1: the site

**Q1. What are we building?** (header: "Site type")
- Company / marketing site: pages about the product, team, contact, maybe a blog
- Content hub: blog, guides, resources, news
- Documentation site
- Web app: logins, dashboards, user data
- Online store
- Landing page or portfolio (a few pages)

**Q2. Who will change the content after launch?** (header: "Editors")
- Non-developers (marketing, content team), often: CMS with visual editing
- Both developers and non-developers
- Only developers, rarely: Markdown in the repo is fine

**Q3. How interactive is it?** (header: "Interaction")
- Mostly reading: pages, articles, images, forms
- Some interactive pieces: calculators, configurators, animations, filters
- App-like: logged-in areas, personalised data, real-time updates

**Q4. What does the team already know?** (header: "Team")
- React (or "we want the biggest ecosystem and hiring pool")
- Vue
- Svelte
- Nobody codes yet / we're learning

## Round 2: the context

**Q5. How big will it get in a year?** (header: "Size")
- Under 20 pages
- 20 to 200 pages
- Hundreds or thousands (programmatic pages, large blog, many locales)

**Q6. Languages?** (header: "Languages")
- One language
- Several, from launch
- One now, more later

(Several or later: plan the URL structure now; hand off to the
`website-i18n` skill after Foundation.)

**Q7. Must-haves?** (header: "Must-haves", multiSelect)
- Ranking on Google / AI search is critical
- Forms that send leads to a CRM (HubSpot, Salesforce)
- Heavy animation or 3D
- Search across the site
- A/B tests or personalisation
- Gated content or member logins

**Q8. How do you want to work with me?** (header: "Mode")
- Co-pilot (Recommended): we build it together, I explain as we go
- Autopilot: you mostly build, I keep notes short, still ask before each step
- Deep dive: more detail and small hands-on challenges

Ask about **hosting** only if something suggests a constraint (an existing
host, a company policy, self-hosting, China). Default: Vercel.

Ask about **budget** only if a paid tier is likely (big team on Sanity,
Vercel Pro for commercial use: the Hobby plan is for non-commercial use).
Say it plainly when it applies.

## What each answer means (signals for Mission 1)

| Answer | Signal |
|---|---|
| Q1 marketing / content hub, Q3 mostly reading | Content-first: Astro scores high, Next.js also fine |
| Q1 documentation | Astro with Starlight is the strongest default |
| Q1 web app, or Q3 app-like | Next.js (React), Nuxt (Vue) or SvelteKit; not Astro as the main framework |
| Q1 online store | Usually Shopify (hosted or Hydrogen) beats building a store; say so |
| Q1 landing page, Q4 nobody codes, Q2 non-developers | A no-code builder (Webflow, Framer) may be the honest answer |
| Q2 non-developers | Sanity with visual editing; plan schemas around their words |
| Q2 only developers | Markdown/MDX in the repo; a CMS can come later |
| Q4 React | Next.js (or Astro with React islands) |
| Q4 Vue | Nuxt |
| Q4 Svelte | SvelteKit (or Astro with Svelte islands) |
| Q4 nobody codes | Pick the one with the gentlest learning curve and best docs for the site type: Astro for content sites, Next.js if they will grow into apps or join a React team |
| Q5 hundreds+ | Static generation with incremental rebuilds (ISR / on-demand), sitemap index, programmatic SEO care |
| Q6 several | Choose URL shape now (`/fr/...`); framework i18n support matters |
| Q7 SEO critical | Server-rendered HTML is mandatory (all four frameworks do this by default; avoid client-only SPAs) |
| Q7 CRM forms | Server-side form handling (route handlers / actions / endpoints), spam protection, consent |
| Q7 heavy animation | Any framework; plan performance budgets early; Astro islands keep the rest light |
| Q7 A/B or personalisation | Next.js or Nuxt with edge middleware; Vercel flags; mind caching |
| Q7 gated content | Needs auth: Next.js / Nuxt / SvelteKit with an auth library, or the CMS's own access rules |
| Q8 mode | Sets explanation depth and whether to offer "Try it" challenges |

## Recording

Write the answers into the Briefing table in `LAUNCHPAD.md`, including what
you inferred and the user confirmed. Future sessions read it instead of
asking again.
