# 10: Accounts and CLI connections (signup to connected)

A beginner's most common stall is not code: it's "which account, which
button, why is the terminal asking me something". Guide every sign-up and
connection like a patient friend sitting next to them. Commands verified on
2026-11-05 (Vercel CLI 56, gh 2.87, Sanity CLI with `sanity@latest`); check
`<cli> <command> --help` before relying on a flag.

## The rules for this part

1. **Just in time.** Ask for an account only when the mission needs it:
   GitHub at Mission 2 (first push) or 4, Sanity at Mission 3, Vercel at
   Mission 4. Never front-load "create five accounts".
2. **The user signs in; you never do.** Sign-ups and logins happen in their
   browser. You never ask for a password, token or 2FA code, and you never
   paste one into a command. If they paste a token into the chat by
   accident, tell them to revoke it and create a new one.
3. **Interactive commands run as `!` commands.** Browser logins need a real
   terminal. In Claude Code, ask the user to type the command with a leading
   `!` (for example `! vercel login`), so it runs in their session and the
   output lands in the chat. In Codex or elsewhere, they run it in their own
   terminal and tell you when done. The Vercel CLI switches to
   non-interactive mode when it detects an agent, so a login run by you will
   not work anyway.
4. **One identity.** Recommend signing up for Vercel and Sanity **with
   GitHub** ("Continue with GitHub"). One login, fewer passwords, and Vercel
   can see the repositories straight away. For a company, use the company
   GitHub account or organisation, not a personal one.
5. **Check, don't guess.** Before and after each connection, run
   `node <skill>/scripts/launchpad-accounts.mjs`. It shows what is installed,
   signed in and linked, and the exact next command, without printing any
   secret.
6. **Say what it costs.** GitHub free is enough. Sanity has a free plan.
   Vercel Hobby is free but for personal, non-commercial use; a company site
   needs Pro. Say this before they connect a company site.

## The connection map (explain this once)

```
 Your computer ──push──► GitHub (code + history)
                              │
                              │ every push / pull request
                              ▼
                         Vercel (builds + hosts the site) ◄── env vars (keys)
                              ▲
                              │ content at build time and live
 Editors ──► Sanity Studio ──► Sanity Content Lake (content)
```

"Three services, three jobs: GitHub keeps the code, Sanity keeps the
content, Vercel turns both into the live site."

## Step template (use for every account)

```
Next up: connect <service>.
What it is: <one line + analogy>
What you'll do: <sign up / log in in the browser, ~2 minutes>
What I'll do after: <link the project / set env vars / ...>
Cost: <free / note about plans>

1. <If no account> Open <signup URL> and choose "Continue with GitHub".
2. Then type this here, with the "!" at the start:
   ! <login command>
3. A browser tab opens. Approve it, then come back and tell me "done".

Shall we?
```

After "done": run `launchpad-accounts.mjs`, confirm in one line ("Signed in
to Vercel as maria-acme. Next I'll link this folder."), then ask before the
connect step.

## GitHub

| Step | Who | Command / place |
|---|---|---|
| Install CLI | you (or agent with go) | macOS `brew install gh`; Windows `winget install --id GitHub.cli`; Linux: https://cli.github.com |
| Account | you | https://github.com/signup (skip if they have one). Company: ask to be added to the organisation |
| Sign in | you | `! gh auth login --web` and choose GitHub.com, HTTPS, "Login with a web browser". It shows a one-time code to paste in the browser |
| Git uses it | agent | `gh auth setup-git` (no more password prompts on push) |
| Git identity | agent, with their name/email | `git config --global user.name "..."` and `user.email "..."` (use the GitHub email or the `noreply` address to keep it private) |
| Create the repo | agent, **after their go** | `gh repo create <name> --private --source . --remote origin --push` (add `--org`-style `owner/name` for an organisation) |
| Check | agent | `gh repo view --web` opens it for them |

Teach: "A private repository is a locked filing cabinet on GitHub. Only
people you invite can see it."

## Vercel

| Step | Who | Command / place |
|---|---|---|
| Install CLI | agent, after go | `npm install --global vercel@latest` then `vercel --version` |
| Account + sign in | you | `! vercel login` (this also creates an account). Choose "Continue with GitHub". Company: join or create the team first |
| Check | agent | `vercel whoami`; `vercel teams ls` and `vercel switch <team>` if they belong to several teams |
| Connect the repo (preferred) | you, guided | https://vercel.com/new, then pick the GitHub repo, then Deploy. Vercel asks to install its GitHub app on the repo or organisation; approve only that repo if they prefer |
| Or link from the terminal | agent, after go | `vercel link --yes` (add `--project <name>` / `--team <slug>` when needed), then `vercel git connect` to attach the GitHub repo |
| Env vars | you type values | `vercel env add <NAME> production` (and `preview`, `development`). The CLI prompts for the value, so the secret never appears in chat. Or the dashboard: Project, Settings, Environment Variables |
| Pull for local dev | agent | `vercel env pull .env.local` |
| Domain | you buy/own it; agent adds | `vercel domains add <domain> <project>`, then the user sets the DNS records Vercel prints, at their registrar |
| Agent tools (optional) | agent, after go | Vercel plugin `npx plugins add vercel/vercel-plugin` or the MCP server (`launchpad-docs.mjs mcp-config vercel`); the MCP asks the user to approve access in the browser |

Teach: "Linking tells Vercel 'this folder is that project'. It writes a
small `.vercel` folder that stays on your machine; it's in `.gitignore`."

## Sanity

| Step | Who | Command / place |
|---|---|---|
| Account + sign in | you | `! npx sanity@latest login --provider github` (also creates an account; `google` and `vercel` work too; company SSO: `--sso <org-slug>`) |
| No account yet, want to try first | agent | https://sanity.new creates a real project to claim later |
| Create project + Studio | agent, after go | `npx sanity@latest init --yes --project-name "<name>" --dataset-default --template clean --typescript --output-path studio` (from the repo root; for an embedded Next.js Studio follow the next-sanity guide instead). This also sets up Sanity's agent skills and MCP server |
| Check | agent | `npx sanity@latest projects list`; `npx sanity@latest debug` (prints no secrets by default) |
| Allow the site to read | agent, after go | `npx sanity@latest cors add http://localhost:3000 --credentials` and later `npx sanity@latest cors add https://<domain>` (credentials only where the Studio or preview needs them; never a wildcard) |
| Tokens (preview, webhooks) | you create, you store | `npx sanity@latest manage` opens project settings; API, Tokens. Create a **Viewer** token for drafts; paste it straight into `vercel env add SANITY_API_READ_TOKEN` or `.env.local`, never into chat |
| Invite editors | agent, after go | `npx sanity@latest users invite <email> --role editor` |
| Webhook to revalidate | agent, after go | `npx sanity@latest hooks create` (interactive: run as `!`) or the dashboard; the secret goes into Vercel env vars |
| MCP for this editor | agent | `npx sanity@latest mcp configure` (asks which editor: Claude Code, Codex, Cursor...) |
| Deploy a separate Studio | agent, after go | `npx sanity@latest deploy` (gives `<name>.sanity.studio`) |

Teach: "The project ID is like a shop's address: fine to share. A token is
the key to the stockroom: never share it."

## Troubleshooting (say the fix in plain words)

| Symptom | Likely cause | Fix |
|---|---|---|
| `command not found: gh/vercel` | CLI not installed or the terminal was opened before install | Install, then open a new terminal |
| The login opens nothing | No default browser in that terminal, or remote machine | Copy the URL it prints into a browser; `npx sanity login --no-open` prints the URL |
| `gh` push asks for a password | Credential helper not set | `gh auth setup-git` |
| `Permission denied` / `403` on push | Signed in as the wrong account, or not in the organisation | `gh auth status`; `gh auth switch`; ask an org owner for access |
| Vercel can't see the repo | The Vercel GitHub app isn't installed for that repo/org | GitHub settings, Applications, Vercel, Configure, add the repo |
| Vercel deploys to the wrong team | CLI scope | `vercel switch <team>` then `vercel link --yes` again |
| Sanity: "CORS origin not allowed" in the browser console | Origin missing | `sanity cors add <origin>` |
| Sanity: content loads locally, not on Vercel | Env vars missing in Vercel, or set for the wrong environment | Compare `.env.example` with `vercel env ls` |
| Pasted a token in chat or committed it | It's leaked | Revoke it now (Sanity manage / Vercel / GitHub settings), create a new one, store it properly |

## Record it

In `LAUNCHPAD.md`, fill the Accounts table: service, account or team name,
who owns it, plan, connected date. Never record a token.
