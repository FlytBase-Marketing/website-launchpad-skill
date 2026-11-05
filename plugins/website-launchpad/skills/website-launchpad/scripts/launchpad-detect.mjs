#!/usr/bin/env node
// launchpad-detect.mjs: work out what a website project is built with.
// Framework + version, router, package manager, language, styling, lint,
// tests, CMS, hosting, CI, monorepo apps. Read-only, zero dependencies,
// Node 18+. Part of the website-launchpad skill.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const HELP = `Usage: node launchpad-detect.mjs [dir] [--json] [--out <file>]

  dir          Project folder (default: current folder)
  --json       Print JSON instead of a short Markdown summary
  --out <file> Also write the JSON to a file

Reads files only. Never installs or changes anything.
`

const FRAMEWORKS = [
  // order matters: meta-frameworks before the libraries they use
  { id: 'nextjs', name: 'Next.js', pkg: 'next' },
  { id: 'astro', name: 'Astro', pkg: 'astro' },
  { id: 'nuxt', name: 'Nuxt', pkg: 'nuxt' },
  { id: 'sveltekit', name: 'SvelteKit', pkg: '@sveltejs/kit' },
  { id: 'react-router', name: 'React Router (framework mode)', pkg: '@react-router/dev' },
  { id: 'remix', name: 'Remix', pkg: '@remix-run/react' },
  { id: 'gatsby', name: 'Gatsby', pkg: 'gatsby' },
  { id: 'angular', name: 'Angular', pkg: '@angular/core' },
  { id: 'eleventy', name: 'Eleventy', pkg: '@11ty/eleventy' },
  { id: 'vite-react', name: 'Vite + React (no framework)', pkg: 'vite', also: 'react' },
  { id: 'vite-vue', name: 'Vite + Vue (no framework)', pkg: 'vite', also: 'vue' },
  { id: 'vite', name: 'Vite (no framework)', pkg: 'vite' },
]

const CMS = [
  { id: 'sanity', name: 'Sanity', pkgs: ['sanity', 'next-sanity', '@sanity/client', '@sanity/astro', '@nuxtjs/sanity', '@sanity/svelte-loader'] },
  { id: 'contentful', name: 'Contentful', pkgs: ['contentful'] },
  { id: 'storyblok', name: 'Storyblok', pkgs: ['@storyblok/react', '@storyblok/astro', '@storyblok/nuxt', '@storyblok/js', '@storyblok/svelte'] },
  { id: 'payload', name: 'Payload', pkgs: ['payload'] },
  { id: 'strapi', name: 'Strapi', pkgs: ['@strapi/strapi', '@strapi/client'] },
  { id: 'prismic', name: 'Prismic', pkgs: ['@prismicio/client'] },
  { id: 'tina', name: 'TinaCMS', pkgs: ['tinacms'] },
  { id: 'keystatic', name: 'Keystatic', pkgs: ['@keystatic/core'] },
  { id: 'nuxt-content', name: 'Nuxt Content (Markdown)', pkgs: ['@nuxt/content'] },
  { id: 'mdx', name: 'MDX / Markdown', pkgs: ['@next/mdx', '@astrojs/mdx', 'mdsvex', 'contentlayer', 'contentlayer2', 'velite', '@content-collections/core'] },
]

const GROUPS = {
  styling: { tailwindcss: 'Tailwind CSS', sass: 'Sass', 'styled-components': 'styled-components', '@emotion/react': 'Emotion', '@pandacss/dev': 'Panda CSS', unocss: 'UnoCSS', '@vanilla-extract/css': 'vanilla-extract' },
  ui: { '@radix-ui/react-slot': 'Radix / shadcn/ui', '@headlessui/react': 'Headless UI', '@mui/material': 'MUI', '@chakra-ui/react': 'Chakra UI', '@nuxt/ui': 'Nuxt UI', 'bits-ui': 'Bits UI' },
  lint: { eslint: 'ESLint', '@biomejs/biome': 'Biome', oxlint: 'oxlint', prettier: 'Prettier' },
  test: { vitest: 'Vitest', jest: 'Jest', '@playwright/test': 'Playwright', cypress: 'Cypress', '@testing-library/react': 'Testing Library' },
  i18n: { 'next-intl': 'next-intl', 'react-i18next': 'react-i18next', '@nuxtjs/i18n': '@nuxtjs/i18n', '@inlang/paraglide-js': 'Paraglide', 'astro-i18next': 'astro-i18next', i18next: 'i18next', 'vue-i18n': 'vue-i18n' },
  analytics: { '@vercel/analytics': 'Vercel Analytics', '@vercel/speed-insights': 'Vercel Speed Insights', '@next/third-parties': 'Next third-parties (GA/GTM)', 'posthog-js': 'PostHog', '@sentry/nextjs': 'Sentry', '@sentry/astro': 'Sentry', '@sentry/nuxt': 'Sentry', '@sentry/sveltekit': 'Sentry' },
}

export function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

export function exists(root, ...rel) {
  return rel.some((r) => fs.existsSync(path.join(root, r)))
}

export function firstExisting(root, rels) {
  return rels.find((r) => fs.existsSync(path.join(root, r))) || null
}

function installedVersion(root, pkg) {
  const j = readJSON(path.join(root, 'node_modules', pkg, 'package.json'))
  return j?.version || null
}

function packageManager(root, pj) {
  const field = pj?.packageManager ? String(pj.packageManager).split('@')[0] : null
  const locks = [
    ['pnpm-lock.yaml', 'pnpm'], ['package-lock.json', 'npm'], ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'], ['bun.lockb', 'bun'], ['npm-shrinkwrap.json', 'npm'],
  ].filter(([f]) => fs.existsSync(path.join(root, f)))
  return { name: field || locks[0]?.[1] || null, lockfiles: locks.map(([f]) => f), declared: pj?.packageManager || null }
}

function nodeVersion(root, pj) {
  const file = firstExisting(root, ['.nvmrc', '.node-version', '.tool-versions'])
  let pinned = null
  if (file) {
    const t = fs.readFileSync(path.join(root, file), 'utf8')
    pinned = file === '.tool-versions' ? (t.match(/^nodejs\s+(\S+)/m)?.[1] || null) : t.trim().split(/\s+/)[0]
  }
  return { engines: pj?.engines?.node || null, file, pinned }
}

function nextRouter(root) {
  const app = firstExisting(root, ['app', 'src/app'])
  const pages = firstExisting(root, ['pages', 'src/pages'])
  return { appDir: app, pagesDir: pages, router: app && pages ? 'app + pages' : app ? 'app' : pages ? 'pages' : null }
}

function hosting(root) {
  const h = []
  if (exists(root, 'vercel.json', 'vercel.ts', '.vercel/project.json')) h.push('Vercel')
  if (exists(root, 'netlify.toml')) h.push('Netlify')
  if (exists(root, 'wrangler.toml', 'wrangler.jsonc', 'wrangler.json')) h.push('Cloudflare')
  if (exists(root, 'firebase.json')) h.push('Firebase')
  if (exists(root, 'Dockerfile')) h.push('Docker')
  if (exists(root, 'amplify.yml')) h.push('AWS Amplify')
  return h
}

function ci(root) {
  const out = []
  const gh = path.join(root, '.github/workflows')
  if (fs.existsSync(gh)) for (const f of fs.readdirSync(gh)) if (/\.ya?ml$/.test(f)) out.push(`.github/workflows/${f}`)
  if (exists(root, '.gitlab-ci.yml')) out.push('.gitlab-ci.yml')
  return out
}

function workspaces(root, pj) {
  let globs = []
  if (Array.isArray(pj?.workspaces)) globs = pj.workspaces
  else if (Array.isArray(pj?.workspaces?.packages)) globs = pj.workspaces.packages
  const pnpm = path.join(root, 'pnpm-workspace.yaml')
  if (fs.existsSync(pnpm)) {
    for (const m of fs.readFileSync(pnpm, 'utf8').matchAll(/^\s*-\s*['"]?([^'"\n#]+)['"]?/gm)) globs.push(m[1].trim())
  }
  const dirs = []
  for (const g of globs) {
    if (g.startsWith('!')) continue
    const base = g.replace(/\/?\*.*$/, '')
    const abs = path.join(root, base)
    if (!fs.existsSync(abs)) continue
    if (g.includes('*')) {
      for (const d of fs.readdirSync(abs)) if (fs.existsSync(path.join(abs, d, 'package.json'))) dirs.push(path.join(base, d))
    } else if (fs.existsSync(path.join(abs, 'package.json'))) dirs.push(base)
  }
  return { tool: exists(root, 'turbo.json') ? 'Turborepo' : exists(root, 'nx.json') ? 'Nx' : globs.length ? 'workspaces' : null, apps: [...new Set(dirs)] }
}

function nestedProjects(root) {
  // package.json files one or two levels down, for folders that hold the app in a subfolder
  const skip = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vercel', '.output'])
  const out = []
  const scan = (dir, depth) => {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory() || skip.has(e.name) || e.name.startsWith('.')) continue
      const d = path.join(dir, e.name)
      if (fs.existsSync(path.join(d, 'package.json'))) out.push(path.relative(root, d))
      else if (depth < 2) scan(d, depth + 1)
    }
  }
  scan(root, 1)
  return out.slice(0, 20)
}

function pickGroup(deps, map) {
  return [...new Set(Object.keys(map).filter((k) => deps[k]).map((k) => map[k]))]
}

export function detect(rootIn = '.') {
  const root = path.resolve(rootIn)
  const pj = readJSON(path.join(root, 'package.json'))
  const deps = { ...(pj?.dependencies || {}), ...(pj?.devDependencies || {}) }
  const r = {
    root,
    hasPackageJson: !!pj,
    name: pj?.name || path.basename(root),
    git: fs.existsSync(path.join(root, '.git')),
    framework: null,
    nonNode: null,
    packageManager: packageManager(root, pj),
    node: nodeVersion(root, pj),
    typescript: deps.typescript ? { declared: deps.typescript, tsconfig: firstExisting(root, ['tsconfig.json']) } : (exists(root, 'tsconfig.json') ? { declared: null, tsconfig: 'tsconfig.json' } : null),
    scripts: pj?.scripts || {},
    cms: [],
    hosting: hosting(root),
    ci: ci(root),
    agentsFiles: ['AGENTS.md', 'CLAUDE.md', '.cursorrules', '.github/copilot-instructions.md'].filter((f) => exists(root, f)),
    mcpConfig: firstExisting(root, ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json']),
    workspaces: workspaces(root, pj),
    nested: pj ? [] : nestedProjects(root),
  }
  for (const [k, map] of Object.entries(GROUPS)) r[k] = pickGroup(deps, map)

  for (const f of FRAMEWORKS) {
    if (!deps[f.pkg]) continue
    if (f.also && !deps[f.also]) continue
    r.framework = { id: f.id, name: f.name, pkg: f.pkg, declared: deps[f.pkg], installed: installedVersion(root, f.pkg) }
    break
  }
  if (!r.framework) {
    if (exists(root, 'hugo.toml', 'hugo.yaml', 'hugo.json', 'config.toml') && exists(root, 'content', 'layouts', 'themes')) r.nonNode = 'Hugo'
    else if (exists(root, 'index.html') && !pj) r.nonNode = 'Static HTML'
  }
  if (r.framework?.id === 'nextjs') {
    Object.assign(r.framework, nextRouter(root))
    r.framework.config = firstExisting(root, ['next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.cjs'])
  } else if (r.framework) {
    const cfg = {
      astro: ['astro.config.mjs', 'astro.config.ts', 'astro.config.mts', 'astro.config.js'],
      nuxt: ['nuxt.config.ts', 'nuxt.config.js'],
      sveltekit: ['svelte.config.js', 'svelte.config.ts'],
    }[r.framework.id]
    if (cfg) r.framework.config = firstExisting(root, cfg)
  }
  for (const c of CMS) {
    const hit = c.pkgs.filter((p) => deps[p])
    if (hit.length) r.cms.push({ id: c.id, name: c.name, packages: hit })
  }
  const studio = firstExisting(root, ['sanity.config.ts', 'sanity.config.js', 'studio/sanity.config.ts', 'studio/sanity.config.js', 'sanity/sanity.config.ts'])
  if (studio) {
    const s = r.cms.find((c) => c.id === 'sanity') || (r.cms.push({ id: 'sanity', name: 'Sanity', packages: [] }), r.cms.at(-1))
    s.studioConfig = studio
  }
  if (!r.cms.some((c) => c.id === 'mdx') && exists(root, 'content', 'src/content', 'posts', '_posts')) {
    r.cms.push({ id: 'files', name: 'Content files in the repo', packages: [] })
  }
  return r
}

export function summarize(r) {
  const L = []
  const fw = r.framework ? `${r.framework.name} ${r.framework.installed || r.framework.declared}${r.framework.router ? ` (${r.framework.router} router)` : ''}` : r.nonNode || 'none found'
  L.push(`# Stack: ${r.name}`, '')
  L.push(`- Framework: ${fw}`)
  if (r.framework?.config) L.push(`- Framework config: ${r.framework.config}`)
  L.push(`- Package manager: ${r.packageManager.name || 'unknown'}${r.packageManager.lockfiles.length > 1 ? ` (WARNING: ${r.packageManager.lockfiles.length} lockfiles: ${r.packageManager.lockfiles.join(', ')})` : ''}`)
  L.push(`- Node: ${r.node.pinned ? `${r.node.pinned} (${r.node.file})` : 'not pinned'}${r.node.engines ? `, engines ${r.node.engines}` : ''}`)
  L.push(`- TypeScript: ${r.typescript ? 'yes' : 'no'}`)
  for (const k of ['styling', 'ui', 'lint', 'test', 'i18n', 'analytics']) if (r[k].length) L.push(`- ${k[0].toUpperCase() + k.slice(1)}: ${r[k].join(', ')}`)
  L.push(`- Content: ${r.cms.length ? r.cms.map((c) => c.name + (c.studioConfig ? ` (studio: ${c.studioConfig})` : '')).join(', ') : 'none found'}`)
  L.push(`- Hosting hints: ${r.hosting.join(', ') || 'none'}`)
  L.push(`- CI: ${r.ci.join(', ') || 'none'}`)
  L.push(`- Agent rules: ${r.agentsFiles.join(', ') || 'none'}; MCP config: ${r.mcpConfig || 'none'}`)
  L.push(`- Git: ${r.git ? 'yes' : 'no'}`)
  if (r.workspaces.apps.length) L.push(`- Monorepo (${r.workspaces.tool}): ${r.workspaces.apps.join(', ')}. Run again inside the app folder for details.`)
  if (r.nested?.length) L.push('', `No package.json here, but these subfolders have one: ${r.nested.join(', ')}. Run again inside the app folder.`)
  else if (!r.hasPackageJson && !r.nonNode) L.push('', 'No package.json here. Either a fresh folder (good: we can start here) or a site that is not a Node project.')
  return L.join('\n')
}

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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const a = parseArgs(process.argv.slice(2))
  if (a.help || a.h) { console.log(HELP); process.exit(0) }
  const r = detect(a._[0] || '.')
  if (a.out) fs.writeFileSync(a.out, JSON.stringify(r, null, 2))
  console.log(a.json ? JSON.stringify(r, null, 2) : summarize(r))
}
