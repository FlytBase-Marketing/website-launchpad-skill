#!/usr/bin/env node
// launchpad-docs.mjs: look things up in OFFICIAL documentation only.
// Searches docs bundled with the installed package (exact version) first,
// then the vendor's machine-readable index (llms.txt / sitemap), and fetches
// pages as Markdown. Also prints the config to connect each vendor's own docs
// MCP server. Zero dependencies, Node 18+. Part of the website-launchpad skill.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// The registry sits in ../references/ inside the skill; a copy vendored into a
// project (scripts/launchpad/) keeps it next to the scripts.
const REGISTRY_FILE = [path.join(HERE, 'official-sources.json'), path.join(HERE, '..', 'references', 'official-sources.json')].find((f) => fs.existsSync(f))
if (!REGISTRY_FILE) { console.error('error: official-sources.json not found next to this script or in ../references/'); process.exit(1) }
const REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')).sources
const CACHE = path.join(os.homedir(), '.cache', 'website-launchpad', 'docs')
const TTL_MS = 24 * 3600 * 1000

const HELP = `Usage: node launchpad-docs.mjs <command> [args] [options]

Commands
  sources                         List the official sources and their docs MCP servers
  search <source> <words...>      Find the official pages about a topic
  fetch <url>                     Print an official page as Markdown/text
  version <source> [--pkg <name>] Installed vs documented vs latest (e.g. --pkg next-sanity)
  mcp-config <source...>          How to connect the vendor's own docs MCP server

Options
  --project <dir>   Project folder, to use docs bundled with the installed package
                    (Next.js ships its docs in node_modules/next/dist/docs) (default: .)
  --limit <n>       Results for search (default 8)
  --grep <words>    fetch: only print the sections that mention these words
  --max <chars>     fetch: cap the output (default 12000)
  --format <f>      mcp-config: claude | codex | json (default: all three)
  --no-cache        Ignore the 24h cache in ~/.cache/website-launchpad/docs

Sources: ${Object.keys(REGISTRY).join(', ')}
Answers must cite the URL (or bundled file) they came from.
`

const PKG = { nextjs: 'next', react: 'react', astro: 'astro', nuxt: 'nuxt', sveltekit: '@sveltejs/kit', sanity: 'sanity', vercel: 'vercel', tailwind: 'tailwindcss' }
const LOCAL_DOCS = { nextjs: ['node_modules/next/dist/docs'] }
const STOP = new Set('a an and are as at be by can do does for from how i in is it my of on or the to use using with what when where which why you your should vs'.split(' '))

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

// "metadataBase" also searches "metadata" + "base"; "use-cache" stays whole
const terms = (q) => {
  const out = new Set()
  for (const raw of q.split(/[^A-Za-z0-9@.+-]+/)) {
    if (!raw) continue
    out.add(raw.toLowerCase())
    const parts = raw.split(/(?<=[a-z0-9])(?=[A-Z])/)
    if (parts.length > 1) parts.forEach((p) => out.add(p.toLowerCase()))
  }
  return [...out].filter((t) => t.length > 1 && !STOP.has(t))
}

// ---------- fetching with cache ----------

async function getText(url, { noCache = false, markdown = true } = {}) {
  const key = crypto.createHash('sha1').update(url).digest('hex')
  const file = path.join(CACHE, key)
  if (!noCache && fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < TTL_MS) {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'))
    return j
  }
  const res = await fetch(url, {
    headers: { accept: markdown ? 'text/markdown, text/plain;q=0.9, text/html;q=0.5' : '*/*', 'user-agent': 'website-launchpad-docs/1.0 (+official docs lookup)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })
  const out = { url: res.url || url, status: res.status, type: res.headers.get('content-type') || '', body: res.ok ? await res.text() : '' }
  if (res.ok) {
    fs.mkdirSync(CACHE, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(out))
  }
  return out
}

function htmlToText(html) {
  let t = html
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, ' ')
  const main = t.match(/<main\b[\s\S]*?<\/main>/i) || t.match(/<article\b[\s\S]*?<\/article>/i)
  if (main) t = main[0]
  t = t
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => '\n\n' + '#'.repeat(Number(n)) + ' ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<(p|div|br|tr|pre|section)[^>]*>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
  return t.trim()
}

async function fetchPage(url, opts) {
  let r = await getText(url, opts)
  if (r.status === 200 && !/html/.test(r.type)) return { ...r, text: r.body }
  if (!/\.md(\?|$)/.test(url) && !/\.txt$/.test(url)) {
    const md = await getText(url.replace(/\/$/, '').replace(/(\?.*)?$/, '.md$1'), opts).catch(() => null)
    if (md?.status === 200 && !/html/.test(md.type) && md.body.length > 200) return { ...md, text: md.body }
  }
  if (r.status !== 200) throw new Error(`HTTP ${r.status} for ${url}`)
  return { ...r, text: htmlToText(r.body) }
}

// ---------- indexes ----------

function slugToTitle(u) {
  const p = new URL(u).pathname.replace(/\/$/, '').split('/').filter(Boolean)
  return p.slice(-2).join(' / ').replace(/[-_]/g, ' ')
}

function parseIndex(text, base) {
  if (/^\s*(<\?xml|<urlset|<sitemapindex)/.test(text)) {
    return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => ({ title: slugToTitle(m[1]), url: m[1], desc: '' }))
  }
  const links = [...text.matchAll(/^\s*[-*]\s*\[([^\]]+)\]\(([^)\s]+)\)\s*:?\s*(.*)$/gm)].map((m) => ({ title: m[1], url: new URL(m[2], base).href, desc: m[3] || '' }))
  if (text.length < 60000 && (links.length >= 10 || text.length < 30000)) return links
  // full-text file (e.g. svelte llms.txt): split into sections by heading
  const out = []
  const parts = text.split(/\n(?=#{1,3} )/)
  for (const p of parts) {
    const h = p.match(/^#{1,3} (.+)/)
    if (!h) continue
    out.push({ title: h[1].trim(), url: base, desc: '', text: p.slice(0, 4000) })
  }
  return out
}

async function loadIndex(id, opts) {
  const src = REGISTRY[id]
  let entries = []
  for (const u of src.index || []) {
    const r = await getText(u, opts)
    if (r.status !== 200) { console.error(`warn: ${u} returned ${r.status}`); continue }
    let e = parseIndex(r.body, u)
    if (src.indexFilter) e = e.filter((x) => x.url.includes(src.indexFilter))
    if (src.followIndexes) {
      const subs = e.filter((x) => /\.txt$/.test(new URL(x.url).pathname) && new URL(x.url).host === new URL(u).host).slice(0, 40)
      for (const s of subs) {
        const rr = await getText(s.url, opts).catch(() => null)
        if (rr?.status === 200) e = e.concat(parseIndex(rr.body, s.url).map((x) => ({ ...x, section: s.title })))
      }
      e = e.filter((x) => !/\.txt$/.test(new URL(x.url).pathname))
    }
    entries = entries.concat(e)
  }
  return entries
}

function walkMd(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkMd(p, out)
    else if (/\.mdx?$/.test(e.name)) out.push(p)
  }
  return out
}

function localEntries(id, project) {
  const out = []
  for (const d of LOCAL_DOCS[id] || []) {
    const abs = path.join(project, d)
    if (!fs.existsSync(abs)) continue
    for (const f of walkMd(abs)) {
      const t = fs.readFileSync(f, 'utf8')
      const title = t.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '') || t.match(/^# (.+)$/m)?.[1] || path.basename(f)
      const desc = t.match(/^description:\s*(.+)$/m)?.[1] || ''
      out.push({ title, url: path.relative(project, f), desc, text: t.slice(0, 20000), local: true })
    }
  }
  return out
}

function score(e, q) {
  const T = (e.title || '').toLowerCase(); const U = (e.url || '').toLowerCase(); const D = (e.desc || '').toLowerCase(); const X = (e.text || '').toLowerCase()
  let s = 0; let hit = 0
  for (const t of q) {
    let h = 0
    if (T.includes(t)) h += 6
    if (U.includes(t)) h += 3
    if (D.includes(t)) h += 2
    if (X) h += Math.min(4, X.split(t).length - 1) * 0.5
    if (h) hit++
    s += h
  }
  return hit === q.length ? s * 2 : s * (hit / q.length)
}

function snippet(e, q) {
  if (e.desc) return e.desc
  const X = e.text || ''
  const low = X.toLowerCase()
  const i = Math.max(0, ...q.map((t) => low.indexOf(t)).filter((n) => n >= 0).slice(0, 1))
  return X.slice(Math.max(0, i - 80), i + 200).replace(/\s+/g, ' ').trim()
}

// ---------- commands ----------

async function cmdSearch(a) {
  const [id, ...words] = a._.slice(1)
  if (!REGISTRY[id]) throw new Error(`unknown source "${id}". Try: ${Object.keys(REGISTRY).join(', ')}`)
  const q = terms(words.join(' '))
  if (!q.length) throw new Error('give some words to search for')
  const project = path.resolve(a.project || '.')
  const limit = Number(a.limit || 8)
  const opts = { noCache: !!a['no-cache'] }
  const local = localEntries(id, project)
  let entries = local
  let from = local.length ? `bundled docs in ${path.relative(process.cwd(), path.join(project, LOCAL_DOCS[id][0])) || '.'} (matches the installed version)` : null
  if (!local.length) {
    entries = await loadIndex(id, opts)
    from = (REGISTRY[id].index || []).join(', ')
  }
  if (!entries.length) {
    console.log(`No machine-readable index for ${REGISTRY[id].name}. Use its docs MCP server (mcp-config ${id}) or fetch pages from ${REGISTRY[id].home}`)
    return
  }
  const ranked = entries.map((e) => ({ e, s: score(e, q) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, limit)
  console.log(`# ${REGISTRY[id].name}: "${words.join(' ')}"\nSearched: ${from}\n`)
  if (!ranked.length) { console.log(`No match. Try broader or other words (the index has titles and summaries, not full text), fetch a likely page with --grep, or use the docs MCP server.${local.length ? '' : ' Install dependencies to search the bundled docs, where they exist.'}`); return }
  for (const { e } of ranked) {
    console.log(`- ${e.title}${e.section ? ` [${e.section}]` : ''}\n  ${e.url}\n  ${snippet(e, q).slice(0, 220)}`)
  }
  console.log(`\nNext: node ${fileURLToPath(import.meta.url)} fetch <url or bundled path>${local.length ? ` --project ${project}` : ''} --grep "${words.join(' ')}"`)
}

function sections(text, q) {
  const parts = text.split(/\n(?=#{1,4} )/)
  const keep = parts.filter((p) => q.some((t) => p.toLowerCase().includes(t)))
  return { keep, total: parts.length }
}

async function cmdFetch(a) {
  const target = a._[1]
  if (!target) throw new Error('fetch needs a URL or a bundled docs path')
  const max = Number(a.max || (a.grep ? 20000 : 12000))
  let text; let where
  const local = path.resolve(a.project || '.', target)
  if (!/^https?:/.test(target) && fs.existsSync(local)) {
    text = fs.readFileSync(local, 'utf8'); where = `bundled file ${target}`
  } else {
    if (!/^https?:/.test(target)) throw new Error(`not a URL and no such file: ${target}`)
    const r = await fetchPage(target, { noCache: !!a['no-cache'] })
    text = r.text; where = r.url
  }
  let note = ''
  if (a.grep) {
    const { keep, total } = sections(text, terms(String(a.grep)))
    if (!keep.length) {
      console.log(`Source: ${where}\nNO MATCH: none of the ${total} sections mention "${a.grep}". Do not treat this page as evidence. Try other words or another page.`)
      return
    }
    note = `Matched ${keep.length} of ${total} sections for "${a.grep}".\n`
    text = keep.join('\n\n[...]\n\n')
  }
  console.log(`Source: ${where}\nFetched: ${new Date().toISOString().slice(0, 10)}\n${note}`)
  console.log(text.length > max ? text.slice(0, max) + `\n\n[... cut at ${max} chars; use --grep or --max]` : text)
}

async function cmdVersion(a) {
  const id = a._[1]
  const pkg = a.pkg || PKG[id]
  if (!pkg) throw new Error(`no package known for "${id}"`)
  const project = path.resolve(a.project || '.')
  let installed = null
  try { installed = JSON.parse(fs.readFileSync(path.join(project, 'node_modules', pkg, 'package.json'), 'utf8')).version } catch {}
  let latest = null
  try { latest = (await (await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2F')}/latest`, { signal: AbortSignal.timeout(10000) })).json()).version } catch {}
  let documented = null
  if (REGISTRY[id]?.index?.[0]) {
    const r = await getText(REGISTRY[id].index[0], { noCache: !!a['no-cache'] }).catch(() => null)
    documented = r?.body?.match(/@doc-version:\s*(\S+)/)?.[1] || r?.body?.match(/\b(?:Next\.js|version)\s+(\d+\.\d+\.\d+)/i)?.[1] || null
  }
  console.log(`${REGISTRY[id]?.name || pkg}\n  installed:  ${installed || 'not installed here'}\n  docs index: ${documented || 'not stated'}\n  npm latest: ${latest || 'unknown'}`)
  console.log(`  package:    ${pkg}${a.pkg ? '' : '  (another package of this source? use --pkg <name>)'}`)
  if (installed && latest && installed.split('.')[0] !== latest.split('.')[0]) console.log(`  Note: the online docs describe ${latest.split('.')[0]}.x; your project is on ${installed.split('.')[0]}.x. Prefer bundled docs, local --help output and the package README for the installed version. Upgrade guide: ${REGISTRY[id]?.upgrade || `search with: launchpad-docs.mjs search ${id} upgrade migration`}`)
}

function cmdMcp(a) {
  const ids = a._.slice(1).length ? a._.slice(1) : Object.keys(REGISTRY).filter((k) => REGISTRY[k].mcp)
  const fmt = a.format || 'all'
  const json = { mcpServers: {} }
  const claude = []; const codex = []
  for (const id of ids) {
    const m = REGISTRY[id]?.mcp
    if (!m) { console.error(`${id}: no official MCP server listed`); continue }
    if (m.type === 'http') {
      json.mcpServers[m.name] = { type: 'http', url: m.url }
      claude.push(`claude mcp add --scope project --transport http ${m.name} ${m.url}`)
      codex.push(`[mcp_servers.${m.name}]\nurl = "${m.url}"`)
    } else {
      json.mcpServers[m.name] = { command: m.command, args: m.args }
      claude.push(`claude mcp add --scope project ${m.name} -- ${m.command} ${m.args.join(' ')}`)
      codex.push(`[mcp_servers.${m.name}]\ncommand = "${m.command}"\nargs = ${JSON.stringify(m.args)}`)
    }
    console.error(`${id}: ${m.note}`)
  }
  if (fmt === 'all' || fmt === 'claude') console.log(`# Claude Code (writes .mcp.json in the project; commit it so the team shares it)\n${claude.join('\n')}\n`)
  if (fmt === 'all' || fmt === 'codex') console.log(`# Codex (~/.codex/config.toml)\n${codex.join('\n\n')}\n`)
  if (fmt === 'all' || fmt === 'json') console.log(`# .mcp.json\n${JSON.stringify(json, null, 2)}`)
}

function cmdSources() {
  for (const [id, s] of Object.entries(REGISTRY)) {
    console.log(`${id.padEnd(14)} ${s.name}\n${' '.repeat(15)}docs: ${s.home}${s.index?.length ? `\n${' '.repeat(15)}index: ${s.index.join(', ')}` : ''}${s.mcp ? `\n${' '.repeat(15)}mcp: ${s.mcp.url || [s.mcp.command, ...s.mcp.args].join(' ')} (${s.mcp.note})` : ''}${LOCAL_DOCS[id] ? `\n${' '.repeat(15)}bundled: ${LOCAL_DOCS[id].join(', ')}` : ''}`)
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  const cmd = a._[0]
  if (!cmd || a.help || a.h) { console.log(HELP); return }
  if (cmd === 'sources') return cmdSources()
  if (cmd === 'search') return cmdSearch(a)
  if (cmd === 'fetch') return cmdFetch(a)
  if (cmd === 'version') return cmdVersion(a)
  if (cmd === 'mcp-config') return cmdMcp(a)
  throw new Error(`unknown command "${cmd}"`)
}

main().catch((e) => { console.error(`error: ${e.message}`); process.exit(1) })
