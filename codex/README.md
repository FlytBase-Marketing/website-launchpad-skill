# Codex profiles for the website-launchpad skill

Codex reads the same agent instructions as Claude Code. The prompt points it
at the Markdown files in `plugins/website-launchpad/agents/`. Profiles only
pin the model, the sandbox and network access (both agents need the network
for official docs, npm versions and live checks).

```bash
cp codex/*.config.toml ~/.codex/

PKG=<path to this repo>
SKILL=$PKG/plugins/website-launchpad/skills/website-launchpad

# Health check (writes LAUNCHPAD-HEALTH.md only)
codex exec -p launchpad-auditor "Follow $PKG/plugins/website-launchpad/agents/launchpad-auditor.md (ignore its YAML frontmatter). Project root: $(pwd). Skill path: $SKILL. Live URL: https://example.com (production)"

# Fact-check claims against official docs, one process per source, in parallel
codex exec -p docs-scout "Follow $PKG/plugins/website-launchpad/agents/docs-scout.md (ignore its YAML frontmatter). Project root: $(pwd). Skill path: $SKILL. Source: nextjs. Claims: 1) app/sitemap.ts generates /sitemap.xml 2) middleware.ts is still the file name in this version" &
codex exec -p docs-scout "... Source: sanity. Claims: ..." &
wait
```

Docs MCP servers in Codex go in `~/.codex/config.toml`:

```bash
node $SKILL/scripts/launchpad-docs.mjs mcp-config nextjs astro --format codex
```

Model names (`gpt-6-luna`, `gpt-6.1-sol`) match this machine's Codex model
list as of 2026-11. Check `~/.codex/models_cache.json` and update the
profiles when the lineup changes. `-p <name>` layers
`~/.codex/<name>.config.toml` over the base config.
