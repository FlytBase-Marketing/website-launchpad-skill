# 06: The quality bar (Missions 5 and 6)

What "following best practices" means for a website, with IDs that match
`launchpad-check.mjs` (repo, `F/S/E/P/A/C/D`) and
`launchpad-verify-live.mjs` (live, `L/E/R/S/P/A/V`). Severity words:

- **Blocker:** fix before launch (or now, if live).
- **Important:** fix soon; it costs visitors, rankings or safety.
- **Nice to have:** polish.

Authoritative sources for these rules: Google Search Central (SEO), web.dev
(Core Web Vitals), W3C WCAG 2.2 and MDN (accessibility, headers), OWASP
(security), and each framework's docs for how to implement them. Cite them
when you teach.

## SEO and AI search

| ID | Rule | Severity |
|---|---|---|
| E1 (repo) / R2 (live) | A sitemap lists every public page, final URLs only (no redirects) | Important |
| E2 / R1 | robots.txt exists, points to the sitemap, never `Disallow: /` in production | Important (Blocker if blocking) |
| E3 / E1-E2 | Every page has its own title (30-60 chars) and meta description (70-160) | Important |
| E4 / E3 | Production site URL configured; self-referencing absolute canonical per page | Important |
| E6 / E4 | `<html lang>` set | Important |
| live E6 | Production is indexable; previews are not | Blocker |
| live E12 | The main content is in the server HTML (works without JavaScript) | Important |
| live L3 | Unknown URLs return a real 404, not a 200 | Important |
| E7 / E8-E9 | Open Graph title, description and a 1200x630 image (absolute URL) | Nice |
| E8 / E10 | JSON-LD: Organization + WebSite on home, Article/BlogPosting on posts, valid JSON | Nice |
| live E7 | One H1 per page, headings in order | Nice |
| - | Clean, lowercase, hyphenated URLs; trailing slash policy consistent | Important |
| - | Old URLs redirected (301/308) when anything moves | Blocker on migrations |

Teach: "AI assistants and Google read the HTML the server sends. If the
words only appear after JavaScript runs, many of them never see the words."

## Accessibility (WCAG 2.2 AA as the target)

| ID | Rule | Severity |
|---|---|---|
| A1 | Every image has alt text (alt="" for decoration) | Important |
| A2 | An accessibility lint plugin runs in CI | Nice |
| A3 | Interactive things are `<button>` or `<a href>`, not clickable `<div>`s | Important |
| - | Colour contrast 4.5:1 for body text (3:1 large text) | Important |
| - | Everything works with the keyboard; focus is visible | Important |
| - | Form fields have labels; errors are announced in text, not just colour | Important |
| - | `prefers-reduced-motion` respected for big animations | Nice |
| - | Skip link to main content; landmarks (`header`, `nav`, `main`, `footer`) | Nice |

Teach: "About one in six people has a disability. Accessible sites are also
easier for everyone, and for search engines, to understand."

## Performance (Core Web Vitals)

Targets at the 75th percentile of real visitors: **LCP <= 2.5 s, INP <=
200 ms, CLS <= 0.1** (web.dev). Check the current thresholds at
https://web.dev/articles/vitals before quoting them.

| ID | Rule | Severity |
|---|---|---|
| P1 | Images through the framework image tool: sized, modern formats, lazy below the fold, `priority`/eager for the hero | Important |
| P2 | Fonts self-hosted via the framework font tool, `font-display: swap`, at most 2 families | Nice |
| P3 | No image over ~500 KB, no self-hosted video over ~8 MB in the repo | Important |
| P4 | Next.js: layouts and pages stay server components; `"use client"` only on small leaves | Important |
| P5 | Real-user measurement (Speed Insights) on | Nice |
| live P1 | HTML compressed (br/gzip) | Important |
| live P3 | HTML cached at the edge (static/ISR) where possible | Nice |
| - | Third-party scripts (chat, tag managers, heatmaps) loaded late and few | Important |
| - | Width and height on media so the page doesn't jump (CLS) | Important |

Analogies: LCP is "how long until the main thing on the page shows up";
INP is "how quickly the page reacts when you tap"; CLS is "whether things
jump around while you're trying to click".

## Security

| ID | Rule | Severity |
|---|---|---|
| F10, F11 | `.env*` git-ignored, never committed | Blocker |
| S1 | No secrets in code | Blocker |
| S2 | No secret behind a browser-exposed prefix | Blocker |
| S3 / live S1 | Security headers set | Important |
| S4 | Raw HTML injection only for trusted/sanitised content | Important |
| C3 | CMS tokens only on the server | Blocker |
| - | Forms: server-side validation, rate limit or bot protection (e.g. Turnstile/hCaptcha/Vercel BotID), no secrets in client code | Important |
| - | Dependencies: `npm audit` high/critical fixed; Dependabot or Renovate on | Important |
| - | Admin areas (Studio, previews) behind login | Important |

Baseline headers (check each in MDN before setting; tune the CSP to the
scripts you really load):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: SAMEORIGIN            (or CSP frame-ancestors 'self')
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: start in Report-Only, then enforce
```

The Sanity Studio and visual editing need the Studio origin allowed in
`frame-ancestors` on preview routes; check the Sanity docs.

Teach: "Headers are instructions the site gives the browser, like 'never
let another site put me inside a frame'. They block whole classes of attack
for free."

## Foundation (maintainability)

| ID | Rule | Severity |
|---|---|---|
| F1 | Git | Important |
| F3 | One lockfile | Important |
| F4 | Node pinned | Important |
| F5, F6 | dev/build/lint/typecheck scripts | Important / Nice |
| F7 | Strict TypeScript | Important |
| F8, F9 | Lint + format | Important / Nice |
| F12 | `.env.example` complete | Important |
| F13 | Project README | Nice |
| F14 | AGENTS.md | Nice |
| F15 | CI runs lint + build | Important |
| V-* | Framework on a current major (upgrade with the official guide + codemod) | Important if 2+ majors behind |

## Analytics, privacy and legal

- Privacy-friendly analytics by default (Vercel Web Analytics needs no
  cookies). GA4/GTM or ad pixels need a consent banner in the EU/UK
  (Consent Mode v2 for Google tags).
- Privacy policy and imprint/legal pages where the law needs them; link in
  the footer.
- Cookie banner only when cookies or trackers need consent; don't add one
  "just in case", and don't load trackers before consent.
- Forms: say what happens with the data; double-check the CRM mapping with a
  test submission.

## Launch checklist (Mission 5 finish line)

1. `launchpad-check.mjs . --online`: 0 failing blockers.
2. `launchpad-verify-live.mjs https://<domain> --psi`: 0 failing blockers,
   Lighthouse performance 90+ on the home page (mobile), or a clear reason.
3. Every page in the sitemap returns 200 and has a unique title.
4. 404 page works; old URLs redirect.
5. Forms tested end to end; analytics receiving data.
6. Editors published a change themselves and saw it live.
7. Search Console: domain verified, sitemap submitted (the user does this;
   guide them).
