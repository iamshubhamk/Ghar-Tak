# Skills

Skills are installed at **user level**, so every project gets them:
- Skills: `~/.claude/skills/` (manifest with source URL + commit: `~/.claude/skills/INSTALLED.tsv`)
- Subagents: `~/.claude/agents/`
- Guide (when to use what): `~/.claude/CLAUDE.md`
- Non-skill UI libraries and design references: `~/.claude/references/ui-resources.md`, `~/.claude/references/design-md/`

This project also keeps its own copy of `ui-ux-pro-max` in `.claude/skills/` (installed 2026-10-27). The
user-level copy is the same commit.

## Installed 2026-10-28 (reviewed under Rule 14; safe parts only)

| Source | What was installed | Left out, and why |
|---|---|---|
| [proyecto26/system-design-skills](https://github.com/proyecto26/system-design-skills) `228d57d` | 22 skills (`system-design` orchestrator + topics) + agent `system-design-orchestrator` | — |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) `2c60614` | `karpathy-guidelines` | — |
| [obra/superpowers](https://github.com/obra/superpowers) `2ce8aa1` | 13 skills (TDD, systematic-debugging, writing-plans, verification, code review, worktrees, …) | `using-superpowers` + SessionStart hook (always-on bootstrap), `diagnosing-superpowers` (plugin self-debugging) |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) `aeac41d` | 23 skills + `~/.claude/references/*` checklists they link to + agents `test-engineer`, `web-performance-auditor` | `test-driven-development` (name clash, Superpowers' kept), `using-agent-skills` (bootstrap meta-skill), duplicate agents |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) `09c434a` | 6 skills, **on demand**, piloted in mobile + web only | plugin hooks (always-on mode, band module) |
| [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) `9b68f7e` | 16 skills (caveman modes + investigate-first, safe-refactor, surgical-patch, verify-and-stop, …), **on demand** | hooks; `caveman-compress` (calls Anthropic API with a key); `caveman-setup`, `-stats`, `-manage`, `-optimize`, `-evidence-review` (need hooks or a Caveman cloud login) |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) `d34c87e` | `impeccable` (live mode talks to localhost only) | plugin hooks |
| [marvkr/better-design](https://github.com/marvkr/better-design) `175e7ba` | `better-design` | repo-internal `.agents` skills |
| [madebymustafa/design-taste](https://github.com/madebymustafa/design-taste) `c4a6bff` | 24 skills (`design-taste`, `taste-*`, style presets) | — |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) `6be93f4` | `seo-plan`, `seo-local`, `seo-hreflang`, `seo-content-brief`, `seo-competitor-pages` (instruction-only; DataForSEO sections are optional) | 30 skills that need the plugin's Python scripts (network fetchers) or paid APIs (Ahrefs, DataForSEO, Firecrawl, Google OAuth, image generation), plus the PostToolUse hook |
| [SNLabat/SEO-GEO-AEO-Skill](https://github.com/SNLabat/SEO-GEO-AEO-Skill) `a2c8769` | `seo-geo-aeo` | — (note: its optional DOCX report runs `npm install -g docx` if missing; Claude asks first) |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) `be2a406` | `changelog-generator`, `webapp-testing`, `mcp-builder`, `theme-factory`, `domain-name-brainstormer`, `content-research-writer` | ~850 `*-automation` skills (need a Composio account/MCP), other network or credential skills |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) `408d3c9` | 40 curated agents (backend, frontend, expo-react-native-expert, fastapi-developer, devops, deployment, QA, debugger, security, SEO, product, …) | the other ~130 agents, to keep every session's agent list small; add more on request |
| [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) `0a8cd4e` | CLI `graphifyy==0.9.97` in `~/.claude/tools/graphify-venv` + `graphify` skill. **Code-only:** `GRAPHIFY_BACKEND=none` in `~/.claude/settings.json` | `graphify install` (would add PreToolUse hooks and edit CLAUDE.md). The skill was patched to use the pinned venv instead of `pip install` into system Python |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) `3b60532` | 84 brand DESIGN.md files as references | — |

## Not installed

| Requested | Why |
|---|---|
| Superdesign (superdesigndev/superdesign + superdesign-skill) | Runs `npx @superdesign/cli@latest` and needs a Superdesign cloud login (Rule 14) |
| Understand-Anything (Egonex-AI) | The core `understand` skill depends on the plugin's built Node packages, and its SessionStart hook says "do not ask the user for confirmation". Graphify covers codebase graphs, offline |
| Archify (tt-a1i/archify) | Its `finalize` step always runs an update check against the author's site (network call, no opt-out). `architecture-diagram` from system-design-skills covers diagrams. Can be added if you allow that check |
| Motion Primitives, UI Layouts, Cursify, Canvas UI, Paper Shaders, Hyperiux | Component libraries, not skills. Listed in `~/.claude/references/ui-resources.md` to add per project |
| screenshot-to-code | Standalone app that needs an LLM API key. Listed in ui-resources |
| Trickle UI kit (akaieuan/trickle) | Repository not found |
| Hyperiux-Immersive/Hyperiux | Not found; the current repo is Hyperiux-Immersion-Labs/hyperiux-components (listed in ui-resources) |
| OmniRoute | Skipped by the human |

## Which workstream uses what

Each `.claude/commands/<workstream>.md` names its skills. In short: **architect** → system-design suite,
planning and ADR skills, graphify. **backend** → API design, TDD, security, FastAPI/Python agents.
**mobile / web** → ui-ux-pro-max, impeccable, design-taste, better-design, ponytail (pilot); web also uses
the SEO skills. **infrastructure** → CI/CD, shipping, git workflow, devops agents. **support** → debugging,
TDD, verification, webapp-testing, graphify, QA/debugger agents.
