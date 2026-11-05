#!/usr/bin/env node
// launchpad-verify-live.mjs: check a deployed site the way a crawler sees it
// (no JavaScript). HTTPS, status codes, real 404s, SEO head tags, social
// tags, JSON-LD, robots.txt, sitemap, security headers, caching, page weight,
// and optionally Core Web Vitals from Google PageSpeed Insights.
// Zero dependencies, Node 18+. Part of the website-launchpad skill.

import fs from 'node:fs'
import process from 'node:process'

const HELP = `Usage: node launchpad-verify-live.mjs <url> [options]

  <url>            Home page of the deployed site (production or preview)
  --pages <n>      Also check n pages from the sitemap (default 5, 0 to skip)
  --psi            Add Core Web Vitals + Lighthouse score from PageSpeed Insights
                   (public API; set PSI_API_KEY for more quota)
  --expect-noindex The URL is a preview: noindex is expected, not an error
  --report <file>  Write a Markdown report
  --json <file>    Write raw results as JSON
  --timeout <ms>   Per request (default 20000)

Exit code: 1 if any blocker fails, else 0.
`

function parseArgs(argv) {
  const a = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]
    if (x.startsWith('--')) {
      const n = argv[i + 1]
      if (n === undefined || n.startsWith('--')) a[x.slice(2)] = true
      else { a[x.slice(2)] = n; i++ }
    } else a._.push(x)
  }
  return a
}

const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
let TIMEOUT = 20000

async function get(url, { redirect = 'follow', method = 'GET' } = {}) {
  const t0 = Date.now()
  try {
    const res = await fetch(url, { method, redirect, headers: { 'user-agent': UA, 'accept-encoding': 'br, gzip' }, signal: AbortSignal.timeout(TIMEOUT) })
    const body = method === 'HEAD' || redirect === 'manual' ? '' : await res.text()
    return { ok: true, url: res.url || url, status: res.status, headers: res.headers, body, ms: Date.now() - t0, redirected: res.redirected }
  } catch (e) {
    return { ok: false, url, status: 0, error: e.cause?.code || e.message, headers: new Headers(), body: '', ms: Date.now() - t0 }
  }
}

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(2).find((x) => x !== undefined) ?? null
const decode = (s) => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").trim()

function parseHead(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0])
  const meta = (key) => {
    const t = metas.find((m) => (attr(m, 'name') || attr(m, 'property') || '').toLowerCase() === key)
    return t ? decode(attr(t, 'content')) : null
  }
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
  const canon = links.find((l) => /\brel\s*=\s*["']?canonical/i.test(l))
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || ''
  const jsonld = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  const body = html.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
  return {
    title: decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
    description: meta('description'),
    robots: meta('robots'),
    viewport: meta('viewport'),
    canonical: canon ? attr(canon, 'href') : null,
    lang: attr(htmlTag, 'lang'),
    og: { title: meta('og:title'), description: meta('og:description'), image: meta('og:image'), url: meta('og:url'), type: meta('og:type') },
    twitter: meta('twitter:card'),
    favicon: links.some((l) => /\brel\s*=\s*["']?(icon|shortcut icon|apple-touch-icon)/i.test(l)),
    h1: (body.match(/<h1\b/gi) || []).length,
    imgs: [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]),
    scripts: (html.match(/<script\b[^>]*\bsrc=/gi) || []).length,
    jsonld,
    textWords: body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /\w/.test(w)).length,
  }
}

function checkJsonLd(blocks) {
  const types = []; const bad = []
  blocks.forEach((b, i) => {
    try {
      const j = JSON.parse(b)
      const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x['@type']) types.push([].concat(x['@type']).join('/')); if (x['@graph']) walk(x['@graph']) } }
      walk(j)
    } catch (e) { bad.push(`block ${i + 1}: ${e.message.slice(0, 60)}`) }
  })
  return { types, bad }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  if (a.help || a.h || !a._[0]) { console.log(HELP); return a._[0] ? 0 : (a.help || a.h ? 0 : 2) }
  TIMEOUT = Number(a.timeout || 20000)
  let base = a._[0]
  if (!/^https?:\/\//.test(base)) base = 'https://' + base
  let origin = new URL(base).origin
  const isPreview = !!a['expect-noindex'] || /\.vercel\.app$/.test(new URL(base).host) && /-git-|-[a-z0-9]{9}-/.test(new URL(base).host)
  const R = []
  const add = (id, area, severity, title, status, evidence, fix) => R.push({ id, area, severity, title, status, evidence, fix })

  // --- transport ---
  const home = await get(base)
  if (!home.ok || home.status >= 400) {
    add('L1', 'basics', 'blocker', 'Home page loads', 'FAIL', home.ok ? `HTTP ${home.status}` : home.error, 'check the deployment and domain settings')
    return finish(a, base, R)
  }
  origin = new URL(home.url).origin // follow www <-> apex redirects
  add('L1', 'basics', 'blocker', 'Home page loads', 'PASS', `HTTP ${home.status} in ${home.ms} ms${home.redirected ? ` (redirected to ${home.url})` : ''}`)
  if (base.startsWith('https://')) {
    const http = await get(base.replace('https://', 'http://'), { redirect: 'manual' })
    const loc = http.headers.get('location') || ''
    add('L2', 'basics', 'important', 'http:// redirects to https://', http.status >= 300 && http.status < 400 && loc.startsWith('https://') ? 'PASS' : http.ok ? 'FAIL' : 'WARN', http.ok ? `HTTP ${http.status}${loc ? ` -> ${loc}` : ''}` : http.error, 'Vercel does this automatically; check custom proxies/CDNs')
  }
  const missing = await get(`${origin}/launchpad-check-${Math.random().toString(36).slice(2, 8)}`)
  add('L3', 'basics', 'important', 'Unknown pages return a real 404', missing.status === 404 ? 'PASS' : 'FAIL', `HTTP ${missing.status}`, 'a "soft 404" (200 for missing pages) fills Google with junk pages; return notFound()/404')
  add('L4', 'basics', 'nice', 'Fast first byte', home.ms < 800 ? 'PASS' : home.ms < 1800 ? 'WARN' : 'FAIL', `${home.ms} ms (one sample, from this machine)`, 'cache pages (static/ISR) instead of rendering every request')

  // --- head ---
  const h = parseHead(home.body)
  const tl = h.title?.length || 0
  add('E1', 'seo', 'blocker', 'Title tag', !tl ? 'FAIL' : tl > 65 || tl < 10 ? 'WARN' : 'PASS', tl ? `"${h.title.slice(0, 80)}" (${tl} chars)` : 'missing', 'aim for 30-60 characters, brand at the end')
  const dl = h.description?.length || 0
  add('E2', 'seo', 'important', 'Meta description', !dl ? 'FAIL' : dl > 170 || dl < 50 ? 'WARN' : 'PASS', dl ? `${dl} chars` : 'missing', 'aim for 70-160 characters that make people want to click')
  let canonStatus = 'FAIL'; let canonEv = 'missing'
  if (h.canonical) {
    try {
      const c = new URL(h.canonical, home.url)
      canonEv = c.href
      canonStatus = !/^https?:\/\//.test(h.canonical) ? 'WARN' : c.host !== new URL(home.url).host && !isPreview ? 'WARN' : 'PASS'
      if (/^https?:\/\//.test(h.canonical) && c.host !== new URL(home.url).host) canonEv += ' (points at another host: fine on a preview, wrong in production)'
    } catch { canonEv = `unparseable: ${h.canonical}` }
  }
  add('E3', 'seo', 'important', 'Canonical URL (absolute, this host)', canonStatus, canonEv, 'set the production URL (metadataBase / site) and a self-canonical per page')
  add('E4', 'seo', 'important', 'html lang', h.lang ? 'PASS' : 'FAIL', h.lang || 'missing', 'set <html lang="en">')
  add('E5', 'seo', 'important', 'Mobile viewport', h.viewport ? 'PASS' : 'FAIL', h.viewport || 'missing', 'add <meta name="viewport" content="width=device-width, initial-scale=1">')
  const noindex = /noindex/i.test(h.robots || '') || /noindex/i.test(home.headers.get('x-robots-tag') || '')
  add('E6', 'seo', 'blocker', 'Indexable (no noindex)', noindex ? (isPreview ? 'PASS' : 'FAIL') : (isPreview ? 'WARN' : 'PASS'), noindex ? `noindex via ${h.robots ? 'meta robots' : 'X-Robots-Tag'}` : 'indexable', isPreview ? 'previews should stay out of Google; Vercel adds noindex to preview URLs' : 'remove noindex before launch')
  add('E7', 'seo', 'nice', 'One H1 on the page', h.h1 === 1 ? 'PASS' : 'WARN', `${h.h1} <h1> in the server HTML`, 'one clear main heading per page')
  const ogMiss = ['title', 'description', 'image'].filter((k) => !h.og[k])
  add('E8', 'seo', 'important', 'Social sharing tags (Open Graph)', ogMiss.length ? 'WARN' : 'PASS', ogMiss.length ? `missing og:${ogMiss.join(', og:')}` : `og:image ${h.og.image}`, 'add og:title, og:description and a 1200x630 og:image')
  if (h.og.image) {
    const ogu = new URL(h.og.image, home.url).href
    const img = await get(ogu, { method: 'HEAD' })
    add('E9', 'seo', 'nice', 'Open Graph image loads', img.status === 200 ? 'PASS' : 'FAIL', `HTTP ${img.status} ${ogu}${/^https?:/.test(h.og.image) ? '' : ' (relative URL: many apps cannot read it)'}`, 'og:image must be an absolute URL that returns 200')
  }
  const ld = checkJsonLd(h.jsonld)
  add('E10', 'seo', 'nice', 'Structured data (JSON-LD)', !h.jsonld.length ? 'WARN' : ld.bad.length ? 'FAIL' : 'PASS', !h.jsonld.length ? 'none' : ld.bad.length ? ld.bad.join('; ') : `types: ${[...new Set(ld.types)].join(', ')}`, 'add Organization + WebSite; validate at https://validator.schema.org')
  add('E11', 'seo', 'nice', 'Favicon', h.favicon ? 'PASS' : 'WARN', h.favicon ? 'linked' : 'no icon link in head', 'add an icon (app/icon.png in Next.js, public/favicon.svg elsewhere)')
  add('E12', 'seo', 'important', 'Content is in the server HTML', h.textWords > 80 ? 'PASS' : 'WARN', `${h.textWords} words without running JavaScript`, 'if the page is nearly empty without JS, crawlers and AI tools see nothing: render on the server')
  const noAlt = h.imgs.filter((t) => attr(t, 'alt') === null)
  add('A1', 'a11y', 'important', 'Images have alt text', noAlt.length ? 'FAIL' : 'PASS', `${noAlt.length} of ${h.imgs.length} <img> without alt`, 'describe each image; alt="" for decoration')

  // --- robots + sitemap ---
  const robots = await get(`${origin}/robots.txt`)
  const smLines = robots.status === 200 ? [...robots.body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : []
  const blocksAll = robots.status === 200 && /^\s*user-agent:\s*\*\s*$[\s\S]*?^\s*disallow:\s*\/\s*$/im.test(robots.body)
  add('R1', 'seo', 'important', 'robots.txt', robots.status !== 200 ? 'FAIL' : blocksAll && !isPreview ? 'FAIL' : smLines.length ? 'PASS' : 'WARN', robots.status !== 200 ? `HTTP ${robots.status}` : blocksAll ? 'blocks the whole site (Disallow: /)' : smLines.length ? `Sitemap: ${smLines.join(', ')}` : 'no Sitemap: line', 'serve robots.txt with a Sitemap: line; never Disallow: / in production')
  const smUrl = smLines[0] || `${origin}/sitemap.xml`
  const sm = await get(smUrl)
  let locs = [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]))
  if (/<sitemapindex/.test(sm.body) && locs.length) {
    const child = await get(locs[0])
    locs = [...child.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]))
  }
  add('R2', 'seo', 'important', 'XML sitemap', sm.status !== 200 ? 'FAIL' : locs.length ? 'PASS' : 'FAIL', sm.status !== 200 ? `HTTP ${sm.status} at ${smUrl}` : `${locs.length} URLs in ${smUrl}`, 'generate a sitemap that lists every public page')
  const foreign = locs.filter((u) => { try { return new URL(u).host !== new URL(home.url).host } catch { return true } })
  if (locs.length) add('R3', 'seo', 'important', 'Sitemap URLs use this domain', foreign.length && !isPreview ? 'WARN' : 'PASS', foreign.length ? `${foreign.length} URLs on another host, e.g. ${foreign[0]}` : 'all on this host', 'build sitemap URLs from the production site URL')

  // --- sample pages ---
  const n = Number(a.pages ?? 5)
  if (n > 0 && locs.length) {
    const step = Math.max(1, Math.floor(locs.length / n))
    const sample = locs.filter((_, i) => i % step === 0).slice(0, n)
    const titles = new Map(); const bad = []
    for (const u of sample) {
      const p = await get(u.replace(new URL(u).origin, origin))
      if (p.status !== 200 || p.redirected) { bad.push(`${u} -> ${p.status}${p.redirected ? ' (redirect)' : ''}`); continue }
      const ph = parseHead(p.body)
      if (!ph.title) bad.push(`${u}: no title`)
      if (!ph.description) bad.push(`${u}: no description`)
      titles.set(ph.title, (titles.get(ph.title) || 0) + 1)
    }
    const dup = [...titles].filter(([t, c]) => t && c > 1)
    add('R4', 'seo', 'important', `Sitemap sample (${sample.length} pages): 200, titled, unique`, bad.length || dup.length ? 'WARN' : 'PASS', [...bad.slice(0, 3), ...dup.map(([t, c]) => `"${t}" used ${c}x`)].join('; ') || 'all good', 'sitemap should only list final URLs (no redirects); every page needs its own title')
  }

  // --- headers ---
  const H = home.headers
  const csp = H.get('content-security-policy') || ''
  const sec = {
    'Strict-Transport-Security': H.get('strict-transport-security'),
    'X-Content-Type-Options': H.get('x-content-type-options'),
    'Referrer-Policy': H.get('referrer-policy'),
    'Frame protection': H.get('x-frame-options') || (/frame-ancestors/.test(csp) ? 'CSP frame-ancestors' : null),
    'Content-Security-Policy': csp || null,
  }
  const missingSec = Object.entries(sec).filter(([, v]) => !v).map(([k]) => k)
  add('S1', 'security', 'important', 'Security headers', missingSec.length >= 3 ? 'FAIL' : missingSec.length ? 'WARN' : 'PASS', missingSec.length ? `missing: ${missingSec.join(', ')}` : 'all five present', 'set headers in next.config / vercel.json / hooks (references/06-quality-bar.md)')
  const powered = H.get('x-powered-by')
  if (powered) add('S2', 'security', 'nice', 'No X-Powered-By header', 'WARN', `X-Powered-By: ${powered}`, 'turn it off (Next.js: poweredByHeader: false)')

  // --- performance ---
  const enc = H.get('content-encoding')
  add('P1', 'performance', 'important', 'HTML is compressed', enc ? 'PASS' : 'WARN', enc || 'no content-encoding', 'enable br/gzip (automatic on Vercel)')
  const kb = Math.round(Buffer.byteLength(home.body) / 1024)
  add('P2', 'performance', 'nice', 'HTML size', kb < 300 ? 'PASS' : kb < 800 ? 'WARN' : 'FAIL', `${kb} KB of HTML, ${h.scripts} script files`, 'large HTML is usually inlined data or SVG; trim what the page does not need')
  const cache = H.get('cache-control') || ''
  const cdn = H.get('x-vercel-cache') || H.get('cf-cache-status') || H.get('x-cache') || ''
  add('P3', 'performance', 'nice', 'HTML is cached at the edge', /HIT|STALE|PRERENDER/i.test(cdn) || /s-maxage|max-age=[1-9]/.test(cache) ? 'PASS' : 'INFO', `cache-control: ${cache || 'none'}${cdn ? `; cache: ${cdn}` : ''}`, 'static or ISR pages are served from the edge: faster and cheaper')

  if (a.psi) {
    const key = process.env.PSI_API_KEY ? `&key=${process.env.PSI_API_KEY}` : ''
    const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(home.url)}&strategy=mobile&category=performance&category=accessibility&category=seo${key}`, { signal: AbortSignal.timeout(120000) }).then((x) => x.json()).catch((e) => ({ error: { message: e.message } }))
    if (r.error) add('V0', 'vitals', 'nice', 'PageSpeed Insights', 'WARN', r.error.message?.slice(0, 120), 'try again later or set PSI_API_KEY')
    else {
      const cat = r.lighthouseResult?.categories || {}
      const pct = (c) => (c ? Math.round(c.score * 100) : '?')
      add('V1', 'vitals', 'important', 'Lighthouse (mobile, lab)', pct(cat.performance) >= 90 ? 'PASS' : pct(cat.performance) >= 50 ? 'WARN' : 'FAIL', `performance ${pct(cat.performance)}, accessibility ${pct(cat.accessibility)}, SEO ${pct(cat.seo)}`, 'open the PSI report for the top opportunities')
      const fm = r.loadingExperience?.metrics
      if (fm) {
        const m = (k) => fm[k]?.percentile
        const lcp = m('LARGEST_CONTENTFUL_PAINT_MS'); const inp = m('INTERACTION_TO_NEXT_PAINT'); const cls = m('CUMULATIVE_LAYOUT_SHIFT_SCORE')
        const good = (lcp ?? 0) <= 2500 && (inp ?? 0) <= 200 && (cls ?? 0) <= 10
        add('V2', 'vitals', 'important', 'Core Web Vitals (real Chrome users, p75)', good ? 'PASS' : 'WARN', `LCP ${lcp ?? '?'} ms, INP ${inp ?? '?'} ms, CLS ${cls != null ? cls / 100 : '?'}`, 'targets: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1')
      } else add('V2', 'vitals', 'nice', 'Core Web Vitals (real users)', 'INFO', 'not enough Chrome traffic yet for field data', 'use Vercel Speed Insights to collect your own')
    }
  }
  return finish(a, base, R)
}

function finish(a, base, R) {
  const c = (s) => R.filter((x) => x.status === s).length
  const L = [`## Live check: ${base}`, '', `Run: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, as Googlebot, no JavaScript.`, '', `**${c('PASS')} pass, ${c('FAIL')} fail, ${c('WARN')} warn, ${c('INFO')} info.**`, '', '| ID | Check | Severity | Status | Evidence | Fix |', '|---|---|---|---|---|---|']
  for (const x of R) L.push(`| ${x.id} | ${x.title} | ${x.severity} | ${x.status} | ${String(x.evidence ?? '').replace(/\|/g, '\\|')} | ${x.status === 'PASS' ? '' : String(x.fix ?? '').replace(/\|/g, '\\|')} |`)
  const md = L.join('\n')
  if (a.report) fs.writeFileSync(a.report, md + '\n')
  if (a.json) fs.writeFileSync(a.json, JSON.stringify(R, null, 2))
  console.log(md)
  return R.some((x) => x.status === 'FAIL' && x.severity === 'blocker') ? 1 : 0
}

main().then((code) => process.exit(code), (e) => { console.error(e); process.exit(2) })
