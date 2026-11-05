#!/usr/bin/env node
// launchpad-accounts.mjs: which tools are installed, which accounts are
// signed in, and which services this project is connected to (GitHub,
// Vercel, Sanity, docs MCP). Prints the exact next command for anything
// missing and says who runs it. Read-only: never logs in, never prints a
// token. Zero dependencies, Node 18+. Part of the website-launchpad skill.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const HELP = `Usage: node launchpad-accounts.mjs [dir] [--need github,vercel,sanity] [--json]

  dir       Project folder (default: current folder)
  --need    Only these services (default: all)
  --json    Machine-readable output

"you" in the Next column means a browser sign-in: in Claude Code, type the
command with a leading "!" (for example: ! vercel login) so it runs in your
terminal session and the result lands in the chat.
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

function run(cmd, args, { cwd, timeout = 15000 } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } })
  if (r.error) return { ok: false, missing: r.error.code === 'ENOENT', out: '', err: r.error.message }
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), code: r.status }
}

const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const read = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }

function sanityProjectId(root) {
  const files = ['sanity.cli.ts', 'sanity.cli.js', 'sanity.config.ts', 'sanity.config.js', 'studio/sanity.cli.ts', 'studio/sanity.cli.js', '.env.local', '.env', 'studio/.env', 'src/sanity/env.ts', 'sanity/env.ts']
  for (const f of files) {
    const t = read(path.join(root, f))
    const m = t.match(/projectId\s*[:=]\s*['"]([a-z0-9]{6,})['"]/) || t.match(/SANITY(?:_STUDIO)?(?:_API)?_PROJECT_ID\s*=\s*['"]?([a-z0-9]{6,})/)
    if (m) return { id: m[1], file: f }
  }
  return null
}

function sanityLoggedIn() {
  const candidates = [
    path.join(os.homedir(), '.config', 'sanity', 'config.json'),
    path.join(process.env.XDG_CONFIG_HOME || '', 'sanity', 'config.json'),
    path.join(os.homedir(), '.config', 'sanity-staging', 'config.json'),
  ]
  for (const f of candidates) {
    const j = readJSON(f)
    if (j && typeof j.authToken === 'string' && j.authToken.length > 10) return { ok: true, where: f.replace(os.homedir(), '~') }
  }
  if (process.env.SANITY_AUTH_TOKEN) return { ok: true, where: 'SANITY_AUTH_TOKEN env var' }
  return { ok: false }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  if (a.help || a.h) { console.log(HELP); return }
  const root = path.resolve(a._[0] || '.')
  const need = a.need ? new Set(String(a.need).split(',')) : null
  const want = (s) => !need || need.has(s)
  const rows = []
  const add = (group, item, status, detail, next = '', who = '') => rows.push({ group, item, status, detail, next, who })

  // ---- tools ----
  const nodeMajor = Number(process.versions.node.split('.')[0])
  add('Tools', 'Node.js', nodeMajor >= 20 && nodeMajor % 2 === 0 ? 'ok' : nodeMajor >= 20 ? 'warn' : 'missing',
    `v${process.versions.node}${nodeMajor % 2 ? ' (odd major: not an LTS line)' : ''}`,
    nodeMajor >= 20 && nodeMajor % 2 === 0 ? '' : 'install the current LTS from https://nodejs.org (or: nvm install --lts)', nodeMajor >= 20 && nodeMajor % 2 === 0 ? '' : 'you')
  const git = run('git', ['--version'])
  add('Tools', 'Git', git.ok ? 'ok' : 'missing', git.ok ? git.out.replace('git version ', 'v') : 'not installed', git.ok ? '' : 'macOS: xcode-select --install; Windows: https://git-scm.com', git.ok ? '' : 'you')
  if (git.ok) {
    const name = run('git', ['config', '--get', 'user.name']).out
    const email = run('git', ['config', '--get', 'user.email']).out
    add('Tools', 'Git identity', name && email ? 'ok' : 'missing', name && email ? `${name} <${email}>` : 'name/email not set (commits need them)', name && email ? '' : 'git config --global user.name "Your Name" && git config --global user.email "you@company.com"', name && email ? '' : 'agent (with your name and email)')
  }

  // ---- GitHub ----
  if (want('github')) {
    const gh = run('gh', ['--version'])
    if (!gh.ok) add('GitHub', 'GitHub CLI (gh)', 'missing', 'not installed', 'macOS: brew install gh; others: https://cli.github.com', 'you')
    else {
      add('GitHub', 'GitHub CLI (gh)', 'ok', gh.out.split('\n')[0].replace('gh version ', 'v'))
      const st = run('gh', ['auth', 'status'])
      const txt = st.out + '\n' + st.err
      const acct = txt.match(/account\s+(\S+)/)?.[1]
      add('GitHub', 'Signed in', st.ok ? 'ok' : 'missing', st.ok ? `as ${acct || '?'}` : 'not signed in', st.ok ? '' : '! gh auth login --web   (no account yet? sign up at https://github.com/signup first)', st.ok ? '' : 'you')
      if (st.ok) {
        const helper = run('git', ['config', '--get-all', 'credential.https://github.com.helper']).out
        add('GitHub', 'Git uses gh for passwords', /gh/.test(helper) ? 'ok' : 'warn', /gh/.test(helper) ? 'credential helper set' : 'git may ask for a password on push', /gh/.test(helper) ? '' : 'gh auth setup-git', /gh/.test(helper) ? '' : 'agent')
      }
    }
    if (fs.existsSync(path.join(root, '.git'))) {
      const rem = run('git', ['remote', 'get-url', 'origin'], { cwd: root })
      add('GitHub', 'Project repository', rem.ok ? 'ok' : 'missing', rem.ok ? rem.out.replace(/https:\/\/[^@]+@/, 'https://') : 'no "origin" remote', rem.ok ? '' : 'gh repo create <name> --private --source . --remote origin --push   (needs your go: it publishes the code to GitHub)', rem.ok ? '' : 'agent, after your go')
    } else add('GitHub', 'Project repository', 'n/a', 'no git repo in this folder yet (Mission 2 step 3)')
  }

  // ---- Vercel ----
  if (want('vercel')) {
    const v = run('vercel', ['--version'])
    if (!v.ok) add('Vercel', 'Vercel CLI', 'missing', 'not installed', 'npm install --global vercel@latest', 'agent, after your go')
    else {
      add('Vercel', 'Vercel CLI', 'ok', 'v' + (v.out + v.err).match(/(\d+\.\d+\.\d+)/)?.[1])
      const who = run('vercel', ['whoami'], { timeout: 20000 })
      const user = (who.out || '').split('\n').filter(Boolean).pop()
      add('Vercel', 'Signed in', who.ok ? 'ok' : 'missing', who.ok ? `as ${user}` : 'not signed in', who.ok ? '' : '! vercel login   (also creates an account; choose "Continue with GitHub")', who.ok ? '' : 'you')
    }
    const pj = readJSON(path.join(root, '.vercel', 'project.json'))
    add('Vercel', 'Project linked', pj ? 'ok' : 'missing', pj ? `${pj.projectName || pj.projectId}` : 'this folder is not linked to a Vercel project', pj ? '' : 'vercel link --yes   (or import the GitHub repo at https://vercel.com/new)', pj ? '' : 'agent, after your go')
    if (pj && fs.existsSync(path.join(root, '.git'))) {
      const gi = read(path.join(root, '.gitignore'))
      if (!/\.vercel/.test(gi)) add('Vercel', '.vercel ignored by git', 'warn', 'not in .gitignore', 'echo .vercel >> .gitignore', 'agent')
    }
    const envLocal = fs.existsSync(path.join(root, '.env.local'))
    const example = read(path.join(root, '.env.example'))
    if (pj) add('Vercel', 'Env vars pulled locally', envLocal ? 'ok' : 'warn', envLocal ? '.env.local present' : 'no .env.local', envLocal ? '' : 'vercel env pull .env.local', envLocal ? '' : 'agent')
    else if (example && !envLocal) add('Vercel', 'Env vars', 'n/a', '.env.example exists; create .env.local or link Vercel and pull')
  }

  // ---- Sanity ----
  if (want('sanity')) {
    const s = sanityLoggedIn()
    add('Sanity', 'Signed in (CLI)', s.ok ? 'ok' : 'missing', s.ok ? `token stored in ${s.where}` : 'not signed in', s.ok ? '' : '! npx sanity@latest login --provider github   (also creates an account; google and vercel work too)', s.ok ? '' : 'you')
    const pid = sanityProjectId(root)
    const hasSanity = pid || ['sanity.config.ts', 'sanity.config.js', 'studio/sanity.config.ts'].some((f) => fs.existsSync(path.join(root, f)))
    add('Sanity', 'Project connected', pid ? 'ok' : hasSanity ? 'warn' : 'n/a', pid ? `projectId ${pid.id} (${pid.file})` : hasSanity ? 'Sanity config found but no projectId' : 'no Sanity in this project yet (Mission 3)', pid ? '' : hasSanity ? 'set SANITY project ID in .env.local (find it with: npx sanity@latest projects list)' : '', pid || !hasSanity ? '' : 'agent')
  }

  // ---- docs MCP ----
  const mcp = readJSON(path.join(root, '.mcp.json'))
  const servers = Object.keys(mcp?.mcpServers || {})
  add('Docs', 'Project docs MCP servers', servers.length ? 'ok' : 'warn', servers.length ? servers.join(', ') : 'no .mcp.json in the project', servers.length ? '' : 'node <skill>/scripts/launchpad-docs.mjs mcp-config <framework>', servers.length ? '' : 'agent, after your go')

  if (a.json) { console.log(JSON.stringify(rows, null, 2)); return }
  const mark = { ok: 'OK  ', warn: 'WARN', missing: 'TODO', 'n/a': 'N/A ' }
  let group = ''
  console.log(`# Accounts and connections: ${path.basename(root)}\n`)
  for (const r of rows) {
    if (r.group !== group) { group = r.group; console.log(`\n## ${group}`) }
    console.log(`${mark[r.status]}  ${r.item}: ${r.detail}${r.next ? `\n      next (${r.who || 'agent'}): ${r.next}` : ''}`)
  }
  const todo = rows.filter((r) => r.status === 'missing' || r.status === 'warn')
  console.log(`\n${todo.length ? `${todo.length} to do. Browser sign-ins are yours: type them with a leading "!" in Claude Code.` : 'All connected.'}`)
}

main().catch((e) => { console.error(e); process.exit(2) })
