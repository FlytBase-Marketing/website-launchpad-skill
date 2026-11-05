#!/usr/bin/env node
// launchpad-check.mjs: best-practice health check for a website repo.
// Foundation, security, SEO, performance, accessibility, CMS (Sanity) and
// deploy (Vercel) checks, each with a status, evidence and a fix hint.
// Read-only, zero dependencies, Node 18+. Part of the website-launchpad skill.
//
// These are fast, file-based checks. They catch the common mistakes; they do
// not replace a build, a type check or a live check (launchpad-verify-live.mjs).

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { detect, readJSON, exists, firstExisting } from './launchpad-detect.mjs'

const HELP = `Usage: node launchpad-check.mjs [dir] [options]

  dir               Project folder (default: current folder)
  --online          Also compare framework/CMS versions with the npm registry
  --only <areas>    Comma list: foundation,security,seo,performance,a11y,cms,deploy
  --report <file>   Write a Markdown report (e.g. LAUNCHPAD-HEALTH.md section)
  --json <file>     Write raw results as JSON
  --quiet           Print only the summary line

Statuses: PASS, FAIL, WARN, INFO, N/A. Severity: blocker, important, nice.
Exit code: 1 if any blocker FAILs, else 0.
`

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.nuxt', '.output', '.svelte-kit', '.astro', '.vercel', '.netlify', 'dist', 'build', 'out', 'coverage', '.turbo', '.cache', '.sanity', 'storybook-static'])
const CODE_EXT = /\.(m?[jt]sx?|vue|svelte|astro|html|mdx)$/
const MAX_FILES = 6000

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

function walk(root, { includePublic = false } = {}) {
  const out = []
  const stack = [root]
  while (stack.length && out.length < MAX_FILES) {
    const dir = stack.pop()
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue
        if (!includePublic && (e.name === 'public' || e.name === 'static') && dir === root) continue
        stack.push(p)
      } else if (e.isFile()) out.push(p)
    }
  }
  return out
}

const cacheRaw = new Map()
const cacheCode = new Map()

function read(file) {
  if (cacheRaw.has(file)) return cacheRaw.get(file)
  let t = ''
  try {
    if (fs.statSync(file).size <= 1_000_000) t = fs.readFileSync(file, 'utf8')
  } catch {}
  cacheRaw.set(file, t)
  return t
}

// Same text with comments blanked out (newlines kept, so line numbers stay right).
// Used for template checks, so "<img>" in a comment is not counted.
function readCode(file) {
  if (cacheCode.has(file)) return cacheCode.get(file)
  const blank = (m) => m.replace(/[^\n]/g, ' ')
  const t = read(file)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:'"`\w\\])\/\/[^\n]*/gm, (m, pre) => pre + blank(m.slice(pre.length)))
  cacheCode.set(file, t)
  return t
}

const rel = (root, f) => path.relative(root, f) || '.'

function lineOf(text, idx) {
  return text.slice(0, idx).split('\n').length
}

function grepFiles(root, files, re, { limit = 10, raw = false } = {}) {
  const hits = []
  for (const f of files) {
    const t = raw ? read(f) : readCode(f)
    if (!t) continue
    re.lastIndex = 0
    let m
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    while ((m = g.exec(t))) {
      // cite the line where the match ends (multi-line tags: the attribute that matched)
      hits.push({ file: rel(root, f), line: lineOf(t, m.index + Math.max(0, m[0].length - 1)), text: m[0].slice(0, 120) })
      if (hits.length >= limit * 20) break
    }
  }
  return hits
}

const GENERATED = /(sanity\.types|\.gen|generated|types\.d)\.[jt]s$/
const fmtHits = (hitsIn, n = 3, hits = [...hitsIn].sort((a, b) => GENERATED.test(a.file) - GENERATED.test(b.file))) => hits.slice(0, n).map((h) => `${h.file}:${h.line}`).join(', ') + (hits.length > n ? ` (+${hits.length - n} more)` : '')

// ---------- checks ----------

function buildChecks(ctx) {
  const { root, r, pj, files, code, fw } = ctx
  const deps = { ...(pj?.dependencies || {}), ...(pj?.devDependencies || {}) }
  const scripts = pj?.scripts || {}
  const C = []
  const add = (id, area, severity, title, fn) => C.push({ id, area, severity, title, fn })

  // ----- Foundation -----
  add('F1', 'foundation', 'important', 'Git repository initialised', () =>
    r.git ? ['PASS', '.git found'] : ['FAIL', 'no .git folder', 'git init, then commit the starter as the first commit'])
  add('F2', 'foundation', 'blocker', 'package.json present', () =>
    pj ? ['PASS', 'package.json'] : ['FAIL', 'no package.json at the project root', 'scaffold with the framework\'s official create command'])
  add('F3', 'foundation', 'important', 'Exactly one lockfile', () => {
    const l = r.packageManager.lockfiles
    if (!pj) return ['N/A', 'no package.json']
    if (l.length === 1) return ['PASS', l[0]]
    if (!l.length) return ['FAIL', 'no lockfile', 'run the install once and commit the lockfile, so every machine and Vercel install the same versions']
    return ['FAIL', `several lockfiles: ${l.join(', ')}`, 'pick one package manager, delete the other lockfiles, set "packageManager" in package.json']
  })
  add('F4', 'foundation', 'important', 'Node version pinned', () => {
    const n = r.node
    if (!pj) return ['N/A', 'no package.json']
    if (n.pinned || n.engines) return ['PASS', [n.pinned && `${n.file}: ${n.pinned}`, n.engines && `engines.node: ${n.engines}`].filter(Boolean).join('; ')]
    return ['WARN', 'no .nvmrc/.node-version and no engines.node', 'add .nvmrc with the current Node LTS major and "engines": {"node": ">=<major>"} so local and Vercel match']
  })
  add('F5', 'foundation', 'important', 'Standard scripts: dev, build, lint', () => {
    if (!pj) return ['N/A', 'no package.json']
    const miss = ['dev', 'build', 'lint'].filter((s) => !scripts[s])
    return miss.length ? ['WARN', `missing scripts: ${miss.join(', ')}`, 'add them so humans, CI and agents run the same commands'] : ['PASS', 'dev, build, lint']
  })
  add('F6', 'foundation', 'nice', 'Type-check script', () => {
    if (!r.typescript) return ['N/A', 'not a TypeScript project']
    const s = Object.entries(scripts).find(([k, v]) => /typecheck|type-check|check-types|^check$/.test(k) || /tsc\b|astro check|svelte-check|nuxi typecheck|nuxt typecheck|vue-tsc/.test(v))
    return s ? ['PASS', `"${s[0]}": ${s[1]}`] : ['WARN', 'no type-check script', 'add "typecheck" (tsc --noEmit, astro check, svelte-check or nuxi typecheck)']
  })
  add('F7', 'foundation', 'important', 'TypeScript strict mode', () => {
    if (!r.typescript?.tsconfig) return ['N/A', 'no tsconfig.json']
    const raw = read(path.join(root, 'tsconfig.json'))
    if (/"strict"\s*:\s*true/.test(raw)) return ['PASS', 'tsconfig.json strict: true']
    if (/"strict"\s*:\s*false/.test(raw)) return ['FAIL', 'tsconfig.json sets strict: false', 'turn strict on; fix errors file by file']
    if (/"extends"\s*:\s*"(astro\/tsconfigs\/strict|astro\/tsconfigs\/strictest|\.\/\.svelte-kit\/tsconfig\.json|\.\/\.nuxt\/tsconfig\.json)"/.test(raw) || /\.nuxt\/tsconfig/.test(raw) || /astro\/tsconfigs\/strict/.test(raw)) return ['PASS', 'strict comes from the framework preset (extends)']
    if (/"extends"/.test(raw)) return ['WARN', 'strict not set here; it may come from "extends"', 'confirm with: npx tsc --showConfig | grep strict']
    return ['WARN', 'strict not set', 'add "strict": true to compilerOptions']
  })
  add('F8', 'foundation', 'important', 'Linter configured', () => {
    if (!pj) return ['N/A', 'no package.json']
    const cfg = firstExisting(root, ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.ts', 'eslint.config.cjs', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc', 'biome.json', 'biome.jsonc', '.oxlintrc.json'])
    if (cfg) return [/^\.eslintrc/.test(cfg) ? 'WARN' : 'PASS', cfg + (/^\.eslintrc/.test(cfg) ? ' (legacy ESLint config format)' : ''), /^\.eslintrc/.test(cfg) ? 'migrate to eslint.config.mjs (flat config)' : undefined]
    return ['WARN', 'no ESLint/Biome/oxlint config', 'add the framework\'s recommended lint setup']
  })
  add('F9', 'foundation', 'nice', 'Formatter configured', () => {
    if (!pj) return ['N/A', 'no package.json']
    const cfg = firstExisting(root, ['.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.mjs', 'prettier.config.js', 'prettier.config.mjs', 'biome.json', 'biome.jsonc', '.editorconfig'])
    return cfg || pj.prettier ? ['PASS', cfg || 'package.json "prettier"'] : ['WARN', 'no Prettier/Biome/.editorconfig', 'add one so diffs stay clean']
  })
  add('F10', 'foundation', 'blocker', '.gitignore covers secrets and build output', () => {
    const gi = read(path.join(root, '.gitignore'))
    if (!gi) return ['FAIL', 'no .gitignore', 'add one: node_modules, build folders, .env*, .vercel']
    const need = { node_modules: /node_modules/, '.env files': /^\s*\.env/m }
    const miss = Object.entries(need).filter(([, re]) => !re.test(gi)).map(([k]) => k)
    return miss.length ? ['FAIL', `.gitignore missing: ${miss.join(', ')}`, 'add .env* (keep !.env.example) and node_modules'] : ['PASS', '.gitignore covers node_modules and .env*']
  })
  add('F11', 'foundation', 'blocker', 'No real .env file committed', () => {
    if (!r.git) return ['N/A', 'not a git repo']
    const envs = fs.readdirSync(root).filter((f) => /^\.env(\..+)?$/.test(f) && !/\.(example|sample|template)$/.test(f))
    if (!envs.length) return ['PASS', 'no .env files at the root']
    const tracked = envs.filter((f) => {
      try { return fs.readFileSync(path.join(root, '.git', 'index')).includes(Buffer.from(f)) } catch { return false }
    })
    return tracked.length ? ['FAIL', `tracked by git: ${tracked.join(', ')}`, 'git rm --cached <file>, rotate every key in it, add to .gitignore'] : ['PASS', `${envs.join(', ')} present but not tracked`]
  })
  add('F12', 'foundation', 'important', '.env.example documents the variables', () => {
    const used = new Set()
    for (const h of grepFiles(root, code, /process\.env\.([A-Z0-9_]+)|import\.meta\.env\.([A-Z0-9_]+)|\$env\/(?:static|dynamic)\/(?:public|private)/, { limit: 50 })) {
      const m = h.text.match(/(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/)
      if (m && !['NODE_ENV', 'DEV', 'PROD', 'SSR', 'MODE', 'BASE_URL', 'SITE', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL', 'CI', 'NEXT_RUNTIME'].includes(m[1])) used.add(m[1])
    }
    const ex = firstExisting(root, ['.env.example', '.env.sample', '.env.template', '.env.local.example'])
    if (!used.size) return ['N/A', 'no environment variables used in code']
    if (!ex) return ['WARN', `${used.size} variables used (${[...used].slice(0, 5).join(', ')}${used.size > 5 ? ', ...' : ''}), no .env.example`, 'add .env.example with every name and a comment, no values']
    const doc = read(path.join(root, ex))
    const miss = [...used].filter((v) => !doc.includes(v))
    return miss.length ? ['WARN', `${ex} is missing: ${miss.slice(0, 8).join(', ')}`, 'add the missing names'] : ['PASS', `${ex} lists all ${used.size} variables`]
  })
  add('F13', 'foundation', 'nice', 'README explains how to run it', () => {
    const f = firstExisting(root, ['README.md', 'readme.md', 'README'])
    if (!f) return ['WARN', 'no README', 'add what it is, how to run it, where content lives, how to deploy']
    const t = read(path.join(root, f))
    if (/create-next-app|This is a \[Next\.js\]|Astro Starter Kit|Look at the \[Nuxt|sv create|Everything you need to build a Svelte project/i.test(t)) return ['WARN', `${f} is still the framework's starter text`, 'replace it with this project\'s own README']
    return ['PASS', f]
  })
  add('F14', 'foundation', 'nice', 'Agent rules file (AGENTS.md / CLAUDE.md)', () =>
    r.agentsFiles.length ? ['PASS', r.agentsFiles.join(', ')] : ['WARN', 'none', 'add AGENTS.md from the launchpad template so every AI helper follows the same rules'])
  add('F15', 'foundation', 'important', 'CI runs lint and build on every PR', () => {
    if (!r.ci.length) return ['WARN', 'no CI workflow', 'add templates/github-ci.yml (lint, typecheck, build, launchpad-check)']
    const t = r.ci.map((f) => read(path.join(root, f))).join('\n')
    const has = (re) => re.test(t)
    const miss = [!has(/\blint\b/) && 'lint', !has(/\bbuild\b/) && 'build'].filter(Boolean)
    return miss.length ? ['WARN', `${r.ci.join(', ')} does not run: ${miss.join(', ')}`, 'add the missing steps'] : ['PASS', r.ci.join(', ')]
  })

  // ----- Security -----
  add('S1', 'security', 'blocker', 'No secrets written in the code', () => {
    const re = /(sk_live_[0-9a-zA-Z]{16,}|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{40,}|xox[bpa]-[0-9A-Za-z-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk[A-Za-z0-9]{75,}\b|AIza[0-9A-Za-z_-]{35}|sk-(?:proj-|ant-)[A-Za-z0-9_-]{20,})/
    const all = files.filter((f) => !/\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|mp4|webm|pdf|lock|lockb)$/.test(f) && !/(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(f) && !/\.env(\.local|\.development|\.production)?$/.test(f))
    const hits = grepFiles(root, all, re, { raw: true })
    return hits.length ? ['FAIL', `possible secret at ${fmtHits(hits)}`, 'move it to an environment variable, then rotate the key: anything once committed counts as leaked'] : ['PASS', `${all.length} files scanned`]
  })
  add('S2', 'security', 'blocker', 'No secret-looking variable exposed to the browser', () => {
    const re = /\b(NEXT_PUBLIC_|PUBLIC_|NUXT_PUBLIC_|VITE_)[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|WRITE_TOKEN|API_TOKEN|_TOKEN|SERVICE_ROLE)[A-Z0-9_]*\b/
    const hits = grepFiles(root, [...code, ...['.env.example', '.env.local.example'].map((f) => path.join(root, f)).filter((f) => fs.existsSync(f))], re)
    return hits.length ? ['FAIL', `${hits[0].text} at ${fmtHits(hits)}`, 'browser-exposed prefixes ship the value to every visitor. Rename without the public prefix and read it on the server only'] : ['PASS', 'no public-prefixed secrets']
  })
  add('S3', 'security', 'important', 'Security headers configured', () => {
    const sources = [fw?.config, 'vercel.json', 'netlify.toml', 'public/_headers', 'src/hooks.server.ts', 'src/hooks.server.js', 'src/middleware.ts', 'middleware.ts', 'proxy.ts', 'src/proxy.ts', 'nuxt.config.ts'].filter(Boolean)
    const hit = sources.find((f) => /X-Content-Type-Options|Strict-Transport-Security|Content-Security-Policy|Referrer-Policy|X-Frame-Options|frame-ancestors|nuxt-security/i.test(read(path.join(root, f))))
    if (!pj) return ['N/A', 'no project yet']
    return hit ? ['PASS', `headers set in ${hit}`] : ['WARN', 'no security headers found in config', 'add X-Content-Type-Options, Referrer-Policy, a frame-ancestors/X-Frame-Options rule and a CSP (see references/06-quality-bar.md)']
  })
  add('S4', 'security', 'nice', 'Raw HTML injection reviewed', () => {
    const hits = grepFiles(root, code, /dangerouslySetInnerHTML|v-html=|\{@html |set:html=/)
    if (!hits.length) return ['PASS', 'none']
    const jsonld = hits.filter((h) => /ld\+json/.test(read(path.join(root, h.file)).split('\n').slice(Math.max(0, h.line - 4), h.line + 3).join('\n')))
    return hits.length === jsonld.length ? ['PASS', `${hits.length} uses, all JSON-LD`] : ['INFO', `${hits.length} uses: ${fmtHits(hits)}`, 'fine for trusted or sanitised content; never for user input']
  })

  // ----- SEO -----
  const isSite = !!fw
  const sitemapSrc = {
    nextjs: () => firstExisting(root, ['app/sitemap.ts', 'app/sitemap.js', 'src/app/sitemap.ts', 'src/app/sitemap.js', 'app/sitemap.xml', 'src/app/sitemap.xml', 'public/sitemap.xml']) || (deps['next-sitemap'] && 'next-sitemap'),
    astro: () => (deps['@astrojs/sitemap'] && '@astrojs/sitemap') || firstExisting(root, ['src/pages/sitemap.xml.ts', 'src/pages/sitemap.xml.js', 'public/sitemap.xml']),
    nuxt: () => (deps['@nuxtjs/sitemap'] && '@nuxtjs/sitemap') || (deps['@nuxtjs/seo'] && '@nuxtjs/seo') || firstExisting(root, ['server/routes/sitemap.xml.ts', 'public/sitemap.xml']),
    sveltekit: () => firstExisting(root, ['src/routes/sitemap.xml/+server.ts', 'src/routes/sitemap.xml/+server.js', 'static/sitemap.xml']) || (deps['super-sitemap'] && 'super-sitemap'),
  }[fw?.id]
  add('E1', 'seo', 'important', 'Sitemap generated', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    if (!sitemapSrc) return ['INFO', `no rule for ${fw.name}`, 'check that /sitemap.xml exists after build']
    const s = sitemapSrc()
    return s ? ['PASS', s] : ['FAIL', 'no sitemap source found', 'add the framework\'s sitemap (references/frameworks/<framework>.md)']
  })
  add('E2', 'seo', 'important', 'robots.txt generated', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const s = firstExisting(root, ['app/robots.ts', 'app/robots.js', 'src/app/robots.ts', 'src/app/robots.js', 'public/robots.txt', 'static/robots.txt', 'app/robots.txt', 'src/app/robots.txt', 'src/pages/robots.txt.ts', 'src/routes/robots.txt/+server.ts', 'server/routes/robots.txt.ts']) || ((deps['@nuxtjs/robots'] || deps['@nuxtjs/seo']) && '@nuxtjs/robots') || (deps['next-sitemap'] && 'next-sitemap')
    return s ? ['PASS', s] : ['FAIL', 'no robots source found', 'add robots.txt that points at the sitemap']
  })
  add('E3', 'seo', 'important', 'Page titles and descriptions set', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const re = { nextjs: /export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/, astro: /<title>|<SEO|<Seo|<Head|title=\{/, nuxt: /useSeoMeta|useHead|definePageMeta\(\{[^}]*title/, sveltekit: /<svelte:head>/ }[fw.id] || /<title>/
    const hits = grepFiles(root, code, re, { limit: 100 })
    const desc = grepFiles(root, code, /description/, { limit: 5 })
    if (!hits.length) return ['FAIL', 'no title/metadata found', 'set a unique title and description per page']
    const starter = grepFiles(root, code, /Create Next App|Generated by create next app|<title>Astro<\/title>|Welcome to SvelteKit|Welcome to Nuxt/)
    if (starter.length) return ['WARN', `starter placeholder text still in use: "${starter[0].text}" at ${fmtHits(starter, 2)}`, 'replace the starter title and description with the site\'s own']
    return desc.length ? ['PASS', `${new Set(hits.map((h) => h.file)).size} files set metadata`] : ['WARN', 'titles found but no description', 'add a meta description per page']
  })
  add('E4', 'seo', 'important', 'Production site URL configured', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    if (fw.id === 'nextjs') {
      const hits = grepFiles(root, code, /metadataBase/)
      return hits.length ? ['PASS', `metadataBase at ${fmtHits(hits, 1)}`] : ['WARN', 'no metadataBase', 'set metadataBase in the root layout so canonical and Open Graph URLs are absolute']
    }
    if (fw.id === 'astro') return /\bsite\s*:/.test(read(path.join(root, fw.config || ''))) ? ['PASS', `site set in ${fw.config}`] : ['FAIL', 'no "site" in astro config', 'set site: "https://your-domain" (sitemap and canonical need it)']
    if (fw.id === 'nuxt') return /site\s*:\s*\{[^}]*url|siteUrl|NUXT_PUBLIC_SITE_URL/.test(read(path.join(root, fw.config || '')) + read(path.join(root, '.env.example'))) ? ['PASS', 'site url configured'] : ['WARN', 'no site.url', 'set site: { url } (used by @nuxtjs/seo modules)']
    return ['INFO', 'check that canonical URLs use the production domain']
  })
  add('E5', 'seo', 'nice', 'Custom 404 page', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const s = files.map((f) => rel(root, f)).find((f) => /(^|\/)(not-found\.(t|j)sx?|404\.(t|j)sx?|404\.astro|404\.md|error\.vue|\+error\.svelte)$/.test(f)) || firstExisting(root, ['public/404.html'])
    return s ? ['PASS', s] : ['WARN', 'no custom 404', 'add one with a way back home']
  })
  add('E6', 'seo', 'important', 'html lang attribute set', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const hits = grepFiles(root, [...code, ...['src/app.html', 'index.html'].map((f) => path.join(root, f)).filter((f) => fs.existsSync(f))], /<html[^>]*\slang=|htmlAttrs\s*:\s*\{[^}]*lang/)
    if (fw.id === 'nuxt' && !hits.length) return ['WARN', 'no htmlAttrs.lang', "set app.head.htmlAttrs.lang in nuxt.config"]
    return hits.length ? ['PASS', fmtHits(hits, 1)] : ['FAIL', 'no <html lang>', 'set lang on <html>: screen readers and search engines use it']
  })
  add('E7', 'seo', 'nice', 'Open Graph / social image', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const s = firstExisting(root, ['app/opengraph-image.tsx', 'app/opengraph-image.png', 'app/opengraph-image.jpg', 'src/app/opengraph-image.tsx', 'src/app/opengraph-image.png'])
    const hits = s ? [] : grepFiles(root, code, /og:image|openGraph\s*:|ogImage|defineOgImage/)
    return s || hits.length ? ['PASS', s || fmtHits(hits, 1)] : ['WARN', 'no Open Graph image', 'add a 1200x630 share image so links look good in Slack, LinkedIn, WhatsApp']
  })
  add('E8', 'seo', 'nice', 'Structured data (JSON-LD)', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const hits = grepFiles(root, code, /application\/ld\+json|useSchemaOrg|defineOrganization|schema-dts/)
    return hits.length ? ['PASS', fmtHits(hits, 2)] : ['WARN', 'no JSON-LD', 'add Organization + WebSite on the home page, Article on posts']
  })

  // ----- Performance -----
  add('P1', 'performance', 'important', 'Images go through the framework image tool', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const tool = { nextjs: 'next/image', astro: 'astro:assets <Image>/<Picture>', nuxt: '@nuxt/image <NuxtImg>', sveltekit: '@sveltejs/enhanced-img' }[fw.id]
    const tpl = code.filter((f) => /\.(jsx|tsx|vue|svelte|astro)$/.test(f))
    const raw = grepFiles(root, tpl, /<img\b/, { limit: 100 })
    if (!tool) return ['INFO', `${raw.length} raw <img> tags`]
    if (!raw.length) return ['PASS', `no raw <img>; using ${tool}`]
    return [raw.length > 5 ? 'WARN' : 'INFO', `${raw.length} raw <img> tags: ${fmtHits(raw)}`, `use ${tool} for resizing, modern formats and lazy loading (SVG icons and CMS image URLs with width params are fine)`]
  })
  add('P2', 'performance', 'nice', 'Fonts self-hosted, not a render-blocking link', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const hits = grepFiles(root, code, /fonts\.googleapis\.com\/css|@import\s+url\(['"]?https:\/\/fonts\.googleapis/)
    const tool = { nextjs: 'next/font', astro: 'Astro fonts API or @fontsource', nuxt: '@nuxt/fonts', sveltekit: '@fontsource' }[fw.id] || '@fontsource'
    return hits.length ? ['WARN', `Google Fonts stylesheet at ${fmtHits(hits)}`, `use ${tool}: self-hosted, no layout shift, no extra request to Google (also a GDPR point)`] : ['PASS', 'no external font stylesheet']
  })
  add('P3', 'performance', 'important', 'No oversized files in public assets', () => {
    const dirs = ['public', 'static', 'src/assets', 'assets'].map((d) => path.join(root, d)).filter((d) => fs.existsSync(d))
    const big = []
    for (const d of dirs) for (const f of walk(d, { includePublic: true })) {
      const s = fs.statSync(f).size
      if ((/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f) && s > 500_000) || (/\.(mp4|webm|mov)$/i.test(f) && s > 8_000_000) || s > 20_000_000) big.push(`${rel(root, f)} (${(s / 1e6).toFixed(1)} MB)`)
    }
    if (!dirs.length) return ['N/A', 'no asset folders']
    return big.length ? ['WARN', `${big.length} large files: ${big.slice(0, 3).join(', ')}${big.length > 3 ? ', ...' : ''}`, 'compress images (WebP/AVIF, under ~300 KB), host video on a video service or Vercel Blob/Mux'] : ['PASS', 'no image over 500 KB, no video over 8 MB']
  })
  add('P4', 'performance', 'important', 'Next.js: layouts are server components', () => {
    if (fw?.id !== 'nextjs' || !fw.appDir) return ['N/A', 'not the Next.js App Router']
    const lay = files.filter((f) => /[\\/](layout|page)\.(t|j)sx?$/.test(f) && rel(root, f).startsWith(fw.appDir))
    const client = lay.filter((f) => /^\s*['"]use client['"]/.test(read(f)))
    const layouts = client.filter((f) => /layout\./.test(f))
    if (layouts.length) return ['FAIL', `"use client" in ${layouts.map((f) => rel(root, f)).slice(0, 3).join(', ')}`, 'keep layouts and pages on the server; move interactive bits into small client components']
    if (client.length > Math.max(2, lay.length * 0.3)) return ['WARN', `${client.length}/${lay.length} pages are client components`, 'push "use client" down to the leaf components that need it']
    return ['PASS', `${client.length}/${lay.length} pages/layouts are client components`]
  })
  add('F16', 'foundation', 'important', 'Next.js: no deprecated middleware file', () => {
    if (fw?.id !== 'nextjs') return ['N/A', 'not Next.js']
    const v = Number(String(fw.installed || fw.declared || '').replace(/^[^\d]*/, '').split('.')[0])
    const mw = firstExisting(root, ['middleware.ts', 'middleware.js', 'src/middleware.ts', 'src/middleware.js'])
    if (!mw) return ['PASS', 'no middleware.ts']
    if (v >= 16) return ['WARN', `${mw} on Next.js ${v}: the middleware convention is deprecated and renamed to proxy`, 'rename to proxy.ts with the official codemod; read file-conventions/proxy in the bundled docs (node_modules/next/dist/docs) first']
    return ['PASS', `${mw} is correct for Next.js ${v}`]
  })
  add('P5', 'performance', 'nice', 'Real-user performance measured', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    return r.analytics.length ? ['PASS', r.analytics.join(', ')] : ['WARN', 'no Speed Insights / analytics package', 'add @vercel/speed-insights (Core Web Vitals from real visitors) once deployed']
  })

  // ----- Accessibility -----
  add('A1', 'a11y', 'important', 'Images have alt text', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const tpl = code.filter((f) => /\.(jsx|tsx|vue|svelte|astro|html|mdx)$/.test(f))
    const miss = []
    for (const f of tpl) {
      const t = readCode(f)
      // read the tag up to its closing > while skipping => and > inside {...}
      for (const m of t.matchAll(/<(img|Image|NuxtImg|NuxtPicture|Picture|enhanced:img)\b/g)) {
        let i = m.index + m[0].length; let depth = 0; let q = null
        for (; i < t.length && i < m.index + 3000; i++) {
          const ch = t[i]
          if (q) { if (ch === q) q = null; continue }
          if (ch === '"' || ch === "'" || ch === '`') q = ch
          else if (ch === '{') depth++
          else if (ch === '}') depth--
          else if (ch === '>' && depth <= 0) break
        }
        const tag = t.slice(m.index, i + 1)
        if (!/\salt\b|:alt=|\{\s*\.\.\./.test(tag)) miss.push({ file: rel(root, f), line: lineOf(t, m.index) })
      }
    }
    return miss.length ? ['FAIL', `${miss.length} images without alt: ${fmtHits(miss)}`, 'add alt text that says what the image shows (alt="" only for pure decoration)'] : ['PASS', 'every image tag has alt']
  })
  add('A2', 'a11y', 'nice', 'Accessibility lint rules on', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const a11y = ['eslint-plugin-jsx-a11y', 'eslint-config-next', 'eslint-plugin-vuejs-accessibility', 'eslint-plugin-astro', 'eslint-plugin-svelte'].find((p) => deps[p])
    if (a11y) return ['PASS', `${a11y} declared in package.json${a11y === 'eslint-config-next' ? ' (bundles jsx-a11y rules)' : ''}`]
    if (fw.id === 'sveltekit') return ['PASS', 'Svelte compiler emits a11y warnings']
    return ['WARN', 'no a11y lint plugin', 'add eslint-plugin-jsx-a11y (React) or eslint-plugin-vuejs-accessibility (Vue) or eslint-plugin-astro (with jsx-a11y)']
  })
  add('A3', 'a11y', 'nice', 'Clickable divs (keyboard users cannot reach them)', () => {
    if (!isSite) return ['N/A', 'no framework detected']
    const hits = grepFiles(root, code.filter((f) => /\.(jsx|tsx|vue|svelte|astro)$/.test(f)), /<(div|span)\b[^>]*\s(onClick|@click|on:click|onclick)=/)
    return hits.length ? ['WARN', `${hits.length} clickable div/span: ${fmtHits(hits)}`, 'use <button> or <a href>; they work with keyboard and screen readers for free'] : ['PASS', 'none']
  })

  // ----- CMS (Sanity) -----
  const sanity = r.cms.find((c) => c.id === 'sanity')
  const sanityFiles = sanity ? code.filter((f) => /sanity|createClient|groq/i.test(read(f))) : []
  add('C1', 'cms', 'important', 'Sanity: apiVersion pinned', () => {
    if (!sanity) return ['N/A', 'no Sanity']
    const hits = grepFiles(root, sanityFiles, /apiVersion\s*[:=]/)
    const bad = hits.filter((h) => /['"]v?1['"]|['"]vX['"]/.test(h.text))
    if (!hits.length) return ['WARN', 'no apiVersion found', "pin apiVersion to a date, e.g. '2025-10-01', in one shared env/config file"]
    return bad.length ? ['WARN', `apiVersion uses v1/vX at ${fmtHits(bad)}`, 'pin a dated apiVersion'] : ['PASS', fmtHits(hits, 1)]
  })
  add('C2', 'cms', 'nice', 'Sanity: useCdn set on purpose', () => {
    if (!sanity) return ['N/A', 'no Sanity']
    const hits = grepFiles(root, sanityFiles, /useCdn\s*:/)
    return hits.length ? ['PASS', fmtHits(hits, 1)] : ['WARN', 'useCdn not set', 'set useCdn explicitly (true for public reads; false with a token, in drafts or right after webhooks)']
  })
  add('C3', 'cms', 'blocker', 'Sanity: tokens stay on the server', () => {
    if (!sanity) return ['N/A', 'no Sanity']
    const clientFiles = sanityFiles.filter((f) => /^\s*['"]use client['"]/.test(read(f)) || /\.(vue|svelte)$/.test(f) && !/server/.test(f))
    const hits = grepFiles(root, clientFiles, /SANITY_[A-Z_]*TOKEN|token\s*:\s*process\.env/)
    return hits.length ? ['FAIL', `token referenced in browser code: ${fmtHits(hits)}`, 'read tokens only in server code (server components, route handlers, server load functions)'] : ['PASS', 'no token in client components']
  })
  add('C4', 'cms', 'nice', 'Sanity: TypeGen for typed queries', () => {
    if (!sanity) return ['N/A', 'no Sanity']
    const ok = exists(root, 'sanity-typegen.json', 'sanity.types.ts', 'src/sanity.types.ts', 'studio/sanity.types.ts') || Object.values(scripts).some((s) => /sanity (typegen|schema extract)/.test(s)) || /typegen/.test(read(path.join(root, firstExisting(root, ['sanity.cli.ts', 'studio/sanity.cli.ts']) || 'x')))
    return ok ? ['PASS', 'typegen configured'] : ['WARN', 'no Sanity TypeGen', 'run sanity schema extract + sanity typegen generate; queries become typed']
  })
  add('C5', 'cms', 'important', 'Sanity: published content reaches the site without a redeploy', () => {
    if (!sanity) return ['N/A', 'no Sanity']
    const hits = grepFiles(root, code, /defineLive|<SanityLive|revalidateTag\(|revalidatePath\(|updateTag\(|cacheTag\(|isValidSignature|parseBody\(|useLiveQuery|useQuery\(|export const revalidate\s*=/)
    return hits.length ? ['PASS', fmtHits(hits, 2)] : ['WARN', 'no live content API, revalidation or webhook handler', 'use the Live Content API (defineLive) or a webhook that revalidates by tag']
  })
  add('C6', 'cms', 'nice', 'Sanity: schemas use validation', () => {
    if (!sanity) return ['N/A', 'no Sanity']
    const schemaFiles = code.filter((f) => /defineType|defineField/.test(read(f)))
    if (!schemaFiles.length) return ['INFO', 'no schema files found here (separate studio repo?)']
    const v = grepFiles(root, schemaFiles, /validation\s*:/)
    return v.length ? ['PASS', `${v.length} validation rules in ${schemaFiles.length} schema files`] : ['WARN', `${schemaFiles.length} schema files, no validation`, 'add Rule.required() and length limits on titles, slugs and SEO fields']
  })

  // ----- Deploy (Vercel) -----
  const onVercel = r.hosting.includes('Vercel') || r.analytics.some((a) => a.startsWith('Vercel'))
  add('D1', 'deploy', 'important', '.vercel folder ignored by git', () => {
    if (!exists(root, '.vercel')) return ['N/A', 'not linked locally']
    return /\.vercel/.test(read(path.join(root, '.gitignore'))) ? ['PASS', '.gitignore has .vercel'] : ['FAIL', '.vercel not in .gitignore', 'add .vercel to .gitignore']
  })
  add('D2', 'deploy', 'important', 'vercel.json is valid JSON', () => {
    const f = path.join(root, 'vercel.json')
    if (!fs.existsSync(f)) return ['N/A', 'no vercel.json (fine: zero-config works for most frameworks)']
    return readJSON(f) ? ['PASS', 'parses'] : ['FAIL', 'vercel.json does not parse', 'fix the JSON; a broken file fails every deploy']
  })
  add('D3', 'deploy', 'nice', 'Build output not committed', () => {
    const outs = ['.next', 'dist', '.output', 'build', '.svelte-kit', 'out'].filter((d) => exists(root, d))
    if (!outs.length || !r.git) return ['N/A', 'no build folders']
    const gi = read(path.join(root, '.gitignore'))
    const miss = outs.filter((d) => !new RegExp(`(^|/)${d.replace('.', '\\.')}/?\\s*$`, 'm').test(gi))
    return miss.length ? ['WARN', `not in .gitignore: ${miss.join(', ')}`, 'ignore build output; Vercel builds it fresh'] : ['PASS', 'build folders ignored']
  })
  add('D4', 'deploy', 'nice', 'Hosting chosen', () => (r.hosting.length || onVercel ? ['PASS', r.hosting.join(', ') || 'Vercel packages'] : ['INFO', 'no hosting config yet', 'Mission 4 (Liftoff) connects the repo to Vercel']))

  return C
}

// ---------- online version check ----------

async function npmLatest(pkg) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2F')}/latest`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return (await res.json()).version
  } catch { return null }
}

const major = (v) => Number(String(v || '').replace(/^[^\d]*/, '').split('.')[0]) || null

async function versionChecks(root, r, pj) {
  const deps = { ...(pj?.dependencies || {}), ...(pj?.devDependencies || {}) }
  const pkgs = [r.framework?.pkg, deps.sanity && 'sanity', deps['next-sanity'] && 'next-sanity', deps.react && 'react', deps.tailwindcss && 'tailwindcss', deps.typescript && 'typescript', deps.eslint && 'eslint'].filter(Boolean)
  const out = []
  for (const p of pkgs) {
    const latest = await npmLatest(p)
    const have = readJSON(path.join(root, 'node_modules', p, 'package.json'))?.version || deps[p]
    let status = 'PASS'; let fix
    if (!latest) { status = 'WARN'; fix = 'registry not reachable' } else if (major(have) && major(latest) && major(have) < major(latest)) {
      status = p === r.framework?.pkg && major(latest) - major(have) >= 2 ? 'FAIL' : 'WARN'
      fix = `read the official upgrade guide for ${p} ${major(latest)} before upgrading (use the docs MCP or launchpad-docs.mjs)`
    }
    const src = readJSON(path.join(root, 'node_modules', p, 'package.json')) ? 'installed' : 'declared'
    out.push({ id: `V-${p}`, area: 'foundation', severity: p === r.framework?.pkg ? 'important' : 'nice', title: `${p} is on a current major`, status, evidence: `${src} ${have}, npm registry latest ${latest || '?'}`, fix })
  }
  return out
}

// ---------- report ----------

const ICON = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN', INFO: 'INFO', 'N/A': 'N/A' }
const AREA_NAME = { foundation: 'Foundation', security: 'Security', seo: 'SEO', performance: 'Performance', a11y: 'Accessibility', cms: 'Content (CMS)', deploy: 'Deploy' }

function toMarkdown(r, results) {
  const count = (s) => results.filter((x) => x.status === s).length
  const blockers = results.filter((x) => x.status === 'FAIL' && x.severity === 'blocker')
  const L = []
  L.push(`## Health check: ${r.name}`, '')
  L.push(`Stack: ${r.framework ? `${r.framework.name} ${r.framework.installed || r.framework.declared}` : r.nonNode || 'none detected'}${r.cms.length ? ` + ${r.cms.map((c) => c.name).join(', ')}` : ''}${r.hosting.length ? ` on ${r.hosting.join(', ')}` : ''}`)
  L.push(`Run: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, '')
  L.push(`**${count('PASS')} pass, ${count('FAIL')} fail, ${count('WARN')} warn, ${count('INFO')} info, ${count('N/A')} n/a.** Blockers failing: ${blockers.length}.`, '')
  for (const area of Object.keys(AREA_NAME)) {
    const rows = results.filter((x) => x.area === area)
    if (!rows.length) continue
    L.push(`### ${AREA_NAME[area]}`, '', '| ID | Check | Severity | Status | Evidence | Fix |', '|---|---|---|---|---|---|')
    for (const x of rows) L.push(`| ${x.id} | ${x.title} | ${x.severity} | ${ICON[x.status]} | ${String(x.evidence || '').replace(/\|/g, '\\|')} | ${String(x.fix || '').replace(/\|/g, '\\|')} |`)
    L.push('')
  }
  L.push('_File-based checks. Confirm with a build, a type check and launchpad-verify-live.mjs on a deployed URL._')
  return L.join('\n')
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  if (a.help || a.h) { console.log(HELP); return 0 }
  const root = path.resolve(a._[0] || '.')
  const r = detect(root)
  const pj = readJSON(path.join(root, 'package.json'))
  const files = walk(root)
  const code = files.filter((f) => CODE_EXT.test(f) && !/\.(test|spec|stories)\.[jt]sx?$/.test(f) && !/\.d\.ts$/.test(f))
  const ctx = { root, r, pj, files, code, fw: r.framework }
  const only = a.only ? new Set(String(a.only).split(',')) : null
  let results = []
  for (const c of buildChecks(ctx)) {
    if (only && !only.has(c.area)) continue
    let res
    try { res = c.fn() } catch (e) { res = ['WARN', `check crashed: ${e.message}`] }
    const [status, evidence, fix] = res
    results.push({ id: c.id, area: c.area, severity: c.severity, title: c.title, status, evidence, fix })
  }
  if (a.online && (!only || only.has('foundation'))) results = results.concat(await versionChecks(root, r, pj))
  const md = toMarkdown(r, results)
  if (a.report) fs.writeFileSync(a.report, md + '\n')
  if (a.json) fs.writeFileSync(a.json, JSON.stringify({ stack: r, results }, null, 2))
  const failsBlocker = results.some((x) => x.status === 'FAIL' && x.severity === 'blocker')
  if (a.quiet) {
    const c = (s) => results.filter((x) => x.status === s).length
    console.log(`${c('PASS')} pass, ${c('FAIL')} fail, ${c('WARN')} warn. Blockers failing: ${results.filter((x) => x.status === 'FAIL' && x.severity === 'blocker').map((x) => x.id).join(', ') || 'none'}`)
  } else console.log(md)
  return failsBlocker ? 1 : 0
}

main().then((code) => process.exit(code), (e) => { console.error(e); process.exit(2) })
