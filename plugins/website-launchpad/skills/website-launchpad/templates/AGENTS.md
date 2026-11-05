# <Site name>: rules for AI helpers and contributors

<!-- Keep any block the framework generated (Next.js, Astro) above this line. -->

Read `LAUNCHPAD.md` first: it holds the stack, the decisions and the
progress.

## Stack

- Framework: <X> (<major>), <router/rendering notes>
- Content: <Sanity project id, dataset; studio location>
- Hosting: Vercel (<project name>), previews per pull request
- Package manager: <npm/pnpm>. Node: see `.nvmrc`.

## Commands

| Job | Command |
|---|---|
| Dev server | `<pm> run dev` |
| Build | `<pm> run build` |
| Lint | `<pm> run lint` |
| Type check | `<pm> run typecheck` |
| Format | `<pm> run format` |
| Health check | `node scripts/launchpad/launchpad-check.mjs .` |
| Live check | `node scripts/launchpad/launchpad-verify-live.mjs <url>` |
| Docs lookup | `node scripts/launchpad/launchpad-docs.mjs search <source> <topic>` |

## Rules

1. **Official docs before code.** Check the docs for the installed version
   (bundled docs, the docs MCP servers in `.mcp.json`, or the docs script)
   before writing framework, CMS or hosting code. Don't trust memory for
   APIs, flags or caching behaviour.
2. **Ask before each step;** explain it in plain words. The owner is
   learning; teach as you go.
3. **Secrets:** only in `.env.local` and Vercel env vars. Never in code,
   commits, logs or chat. Nothing secret behind a browser-exposed prefix.
4. **Never commit, push or deploy without an explicit go** in the current
   message.
5. **Verify every change:** lint, typecheck, build, and the health check.
   Report failures honestly.
6. **Content lives in <Sanity / content folder>,** not hardcoded in
   components.
7. **Keep `LAUNCHPAD.md` current:** decisions, accounts (no secrets),
   change log.

## Project-specific notes

- <conventions, folders, component library, brand rules>
