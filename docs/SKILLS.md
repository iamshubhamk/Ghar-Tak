# Skills

Every skill installed in this repo (Rule 15). Third-party skills are reviewed per Rule 14 before install.

## Installed

| Skill | Source | Pinned at | Purpose | Workstreams |
|-------|--------|-----------|---------|-------------|
| `ui-ux-pro-max` (core folder only) | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill, path `.claude/skills/ui-ux-pro-max/` | `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03` (2026-10-26) | UI/UX guidance from a local database: styles, palettes, fonts, UX rules, React Native and React guidelines. Run as `python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" [--domain ux\|style\|color\|typography] [--stack react-native]` | mobile, web |

### ui-ux-pro-max: install notes (approved 2026-10-27)
- Copied by hand from the reviewed commit and verified byte-for-byte identical (73 files, 3.7 MB). No npm
  package or plugin was used, so none of the repo's other 6 skills were installed.
- Runtime: standard-library Python only, no network, no credentials. The only `subprocess` calls are in
  `scripts/tests/`, where the skill's own tests start its local `search.py`. Normal use never runs them.
- `--persist` writes `design-system/<project>/MASTER.md`. The mobile and web workstreams should agree on one
  location before using it.
- To update: review a newer commit under Rule 14, re-copy the folder, and update the commit above.

Built-in Claude Code commands every workstream can use without installing anything: `/code-review`,
`/security-review`, `/simplify`.

## Pending approval

_none_

(The ui-ux-pro-max review that was here is now covered by the install notes above.)

## Shortlist (proposed, not installed)

| Candidate | Source | For | Why / notes |
|-----------|--------|-----|-------------|
| Expo official skills: `expo-router`, `expo-data-fetching`, `expo-upgrade`, `expo-project-structure`, `eas-app-stores`, `eas-workflows`, `eas-update` | https://github.com/expo/skills (`plugins/expo/skills/`). Maintained by Expo, ~3.3k stars, active (last push 2026-10-26) | mobile, release | First-party and kept current with the SDK. Install only the listed folders, not the whole plugin. Each one needs a Rule 14 review, especially any that run `eas` CLI commands, since those touch the Expo account. |
| `obra/superpowers`: `test-driven-development`, `systematic-debugging`, `verification-before-completion` | https://github.com/obra/superpowers (~306k stars, active) | qa-monitoring, backend | Good testing habits that fit Rule 9. Instructions only. Copy the 3 folders, not the whole framework, because the framework's bootstrap skill changes how every session works. |
| Trail of Bits security skills (pick 1–2, e.g. insecure-defaults / auth review) | https://github.com/trailofbits/skills (~7.8k stars, active) | backend, qa-monitoring | Reputable security firm. Relevant because the app stores Aadhaar and bank documents. Review each one: some call external tools. |
| Google's Android skills: `play` only | https://github.com/android/skills (~9.9k stars, active) | release | Mostly for native Kotlin/Compose, so not relevant. The Play Console guidance may help with the store listing. |
| FastAPI | none recommended | backend | Every FastAPI skill found is from a community aggregator (mindrally, majiayu000 registry, claudskills.com) with unclear upkeep, and most assume SQLAlchemy. Better: write a small **project skill** `.claude/skills/ghartak-backend/` covering this repo's patterns (Motor, service layer, error envelope, contract export). |

Searched 2026-10-27: GitHub, the expo/android/anthropics skill repos, claudskills.com, claudemarketplaces.com,
openskillindex.com.
