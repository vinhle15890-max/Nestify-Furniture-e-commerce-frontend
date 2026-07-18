# Nestify Cross-Repo AI Context System — Design Spec

Date: 2026-07-08
Status: **DESIGN (approved in brainstorming, pending user review)**. Uncommitted per standing
constraint (nothing committed until the user asks).

## Purpose

Stand up a single cross-repo **context + agent system** so any AI worker — a coordinating Claude
Code session, a spawned subagent, or a second parallel Claude Code window — can reliably find and
read the right context from **both** the backend (Laravel) and frontend (React) repos, and so that
a defined roster of specialized subagents can run in parallel the way the Media Library feature was
just built.

Secondary goal: remove the brand-DNA duplication between the workspace-root `nestify_new_UI/` folder
and the FE `docs/nestify/` folder, leaving one canonical source.

## Current landscape (as-found)

- Two **separate git repos** as siblings under `Do-An-Tot-Nghiep/`, which is itself **not** a git repo:
  - `Nestify-Furniture-e-commerce-backend/` (BE)
  - `Nestify-Furniture-e-commerce-frontend/` (FE)
- **BE**: rich `docs/` (`00`–`14` numbered + `README.md` index + `internal/AI_CONTEXT.md` +
  `FE_AI_CONTEXT.md` + `codebase-guide.md` + `use-cases-and-erd.md` + `decisions-pending.md`).
  **No `AGENTS.md`/`CLAUDE.md`, no `.claude/`.**
- **FE**: `AGENTS.md` (root; `CLAUDE.md` → `@AGENTS.md`), `.claude/skills/{nestify-ui,nestify-review}`,
  `docs/nestify/` (Becoming-Room DNA, `00`–`05`), `docs/superpowers/{specs,plans}`, `docs/TASKS.md`,
  `docs/FE-TEAM-WORKFLOW.md`.
- **Workspace root**: `.claude/` (only `settings.local.json`), `nestify_new_UI/` (8 brand-DNA source
  files incl. a `Nestify_Prompt_System_ClaudeCode.md`), `NestifyBaoCao_v2.md` (report),
  `Diagrams/`, `nestify_erd.puml`.
- **Duplication:** `nestify_new_UI/` brand DNA is superseded by FE `docs/nestify/` (consolidated:
  Component Bible Part1+Part2 → single `04`, Design DNA renamed to `03`, files renamed `00`–`05`).
  FE `docs/nestify/` is what the `nestify-ui`/`nestify-review` skills already read. The only
  `nestify_new_UI/` file NOT reflected in FE is `Nestify_Prompt_System_ClaudeCode.md` — a meta-doc
  about the Claude Code context setup that is the conceptual ancestor of THIS system.

## Decisions (from brainstorming)

1. **Mode = both** — a defined subagent roster AND support for multiple parallel Claude Code sessions,
   all sharing one cross-repo context.
2. **Topology = workspace-root hub** — the roster and the top-level entry point live at the root;
   each repo keeps a short entry point that points up to the hub.
3. **Roster = Lean 5** — `be-implementer`, `fe-implementer`, `task-reviewer`, `explorer`, `docs-writer`.
4. **DNA dedup = delete `nestify_new_UI/`** (no archive) — but ONLY after a file-by-file parity check
   confirms FE `docs/nestify/` covers its brand content, and after salvaging the useful ideas from
   `Nestify_Prompt_System_ClaudeCode.md` into the new root `AGENTS.md`. The dir is not in any git repo,
   so deletion is irreversible — the parity gate is mandatory.
5. **Loose root files** (`NestifyBaoCao_v2.md`, `Diagrams/`, `nestify_erd.puml`) stay in place
   (they cross-reference each other); the hub only indexes them.

## Architecture

### A. Entry points & discovery

```
Do-An-Tot-Nghiep/                      ← workspace root = the HUB
├── AGENTS.md                          ← single entry point (context map + guardrails + roster)
├── CLAUDE.md                          ← one line: @AGENTS.md
├── .claude/agents/                    ← the 5 subagent definitions
│   ├── be-implementer.md
│   ├── fe-implementer.md
│   ├── task-reviewer.md
│   ├── explorer.md
│   └── docs-writer.md
├── Nestify-Furniture-e-commerce-backend/
│   ├── AGENTS.md   (NEW, short)       ← "you are in BE; read docs/README.md; hub is one level up"
│   ├── CLAUDE.md   (NEW)              ← @AGENTS.md
│   └── docs/ …                        ← unchanged (already the BE source of truth)
└── Nestify-Furniture-e-commerce-frontend/
    ├── AGENTS.md   (EDIT)             ← add "↑ hub" pointer at top; DNA guardrails stay
    └── docs/ …                        ← unchanged; docs/nestify = canonical DNA
```

**Discovery model:**
- **Coordinating session run from the root** → root `AGENTS.md` + root `.claude/agents/` load; the
  coordinator spawns subagents that `cd` into BE or FE as their task needs.
- **A session (or parallel window) opened inside a repo** → that repo's `AGENTS.md`/`CLAUDE.md` load
  and immediately link up to the hub's context map, so the worker still finds cross-repo context.
- **Caveat documented in the hub:** Claude Code auto-discovers `.claude/agents/` at the project root
  and `~/.claude/agents/` (user level), not arbitrary parent dirs — so the defined roster is available
  when the project root IS the workspace root. Running deep inside a repo uses that repo's entry point
  (which points up) rather than auto-loading the root roster. This is acceptable: coordination happens
  from the root; repo-local sessions are for focused single-repo work.

### B. Agent roster (`.claude/agents/*.md`)

Each file: YAML frontmatter (`name`, `description`, `model`, `tools`) + a focused brief that bakes in
the conventions proven during the Media Library build. All default to `model: sonnet` (mechanical
implementation/review); the coordinator may override per task.

| Agent | tools | Brief bakes in |
|---|---|---|
| `be-implementer` | all | Laravel 11; **BE tests via Docker sqlite** (`docker run … nestify-…-app:latest … php artisan test <path>`); validation envelope `error.details.fields.<field>` (never `assertJsonValidationErrorFor`); `cloudinary_id` never serialized; **user runs prod migrations** (write idempotent, don't run against prod); no-commit default; follow existing patterns. |
| `fe-implementer` | all | Vite + React 18 **plain JSX (no TS)**; Vitest + RTL, TDD; **semantic Tailwind tokens only** (no raw hex); feature folders `api.js`+`hooks.js`; `useOffsetQuery({queryKey,queryFn,page,enabled})` object-signature; `apiClient` returns the response body; VN copy; storefront UI → invoke `nestify-ui` skill. |
| `task-reviewer` | read + bash, no edit | Two verdicts: **spec compliance** (built exactly what the brief said, nothing extra/missing) + **code quality**; reads a scoped diff, never edits; surfaces plan-vs-code conflicts to the coordinator instead of deciding; does not re-run tests the implementer already ran. |
| `explorer` | read-only (no edit/write) | Read-only fan-out search across **both** repos; returns conclusions + `file:line`, not file dumps; used when a question spans many files. |
| `docs-writer` | read + edit docs | Syncs docs after code changes at **code-path detail**: BE `docs/14-workflows.md` (§ per feature) + `docs/FE_AI_CONTEXT.md` (API contract) + FE `docs/TASKS.md` / `docs/FE-TEAM-WORKFLOW.md`; keeps the hub Context Map current; no-commit default. |

### C. The context system — root `AGENTS.md`

Structured after the `Nestify_Prompt_System_ClaudeCode.md` philosophy (concise pointers + hard
guardrails, NOT copies of the docs). Sections:

1. **What this is** — two repos, one hub; how to run (coordinate from root, or open a repo directly).
2. **Context Map** — a "need X → read Y" table pointing into existing docs (no rewrite of them):

   | Need | Read |
   |---|---|
   | BE overview / index | `…backend/docs/README.md` |
   | BE feature code-paths (deep) | `…backend/docs/14-workflows.md` |
   | Exact API request/response shapes | `…backend/docs/FE_AI_CONTEXT.md` |
   | BE internal AI memory / conventions | `…backend/docs/internal/AI_CONTEXT.md` |
   | DB schema / ERD / use-cases | `…backend/docs/04-database.md`, `…/use-cases-and-erd.md`, `nestify_erd.puml`, `Diagrams/` |
   | Running BE tests | `…backend/docs/07-testing.md` (+ Docker sqlite cmd, quoted in hub) |
   | FE overview / conventions | `…frontend/AGENTS.md` |
   | Storefront brand + design DNA (canonical) | `…frontend/docs/nestify/` (`00`–`05`) |
   | FE feature/team workflow + task map | `…frontend/docs/FE-TEAM-WORKFLOW.md`, `…/docs/TASKS.md` |
   | Specs & plans (both repos' feature work) | `…frontend/docs/superpowers/{specs,plans}` |
   | Report / diagrams | `NestifyBaoCao_v2.md`, `Diagrams/`, `nestify_erd.puml` |

3. **Cross-cutting hard guardrails** — the small set true everywhere: no-commit-until-asked;
   user runs prod migrations; `cloudinary_id` never serialized; storefront design guardrails live in
   FE `docs/nestify/` + the `nestify-ui`/`nestify-review` skills (link, don't duplicate); staff vs
   customer purchase rules.
4. **Agent roster** — one-line-per-agent summary + "spawn from root; see `.claude/agents/`".
5. **Skills pointer** — `nestify-ui` / `nestify-review` live in FE `.claude/skills/` (storefront UI).

Each agent brief ends with "read the hub Context Map first" so subagents and parallel sessions share
one source of truth.

### D. Doc reorganization steps (with the parity gate)

1. **Parity check (blocking):** for each `nestify_new_UI/*.md`, confirm its content exists in FE
   `docs/nestify/` (Brand Context→`00`, Constitution→`01`, Story Bible→`02`, Design DNA→`03`,
   Component Bible Part1+Part2→`04`, Manifesto→`05`). If any unique content is found, port it into the
   FE canonical file first. `Nestify_Prompt_System_ClaudeCode.md` has no FE equivalent → fold its
   still-relevant ideas into the root `AGENTS.md` (it IS the ancestor of this system).
2. **Only after parity confirmed:** delete `nestify_new_UI/` (irreversible — not in git).
3. **Loose files:** leave `NestifyBaoCao_v2.md`, `Diagrams/`, `nestify_erd.puml` in place; index them
   from the hub Context Map. Do NOT move (they cross-reference each other).

## Known trade-off (accepted)

The hub (`Do-An-Tot-Nghiep/AGENTS.md`, `CLAUDE.md`, `.claude/agents/`) lives at the workspace root,
which is **not a git repo** — so these hub files are not version-controlled and won't travel via
either repo's git history (can't be shared with a teammate by cloning a repo). This is the accepted
cost of a single cross-repo hub without introducing a workspace-level git repo. The per-repo entry
points (BE/FE `AGENTS.md`) ARE versioned in their repos, so the repo-local half of the system is
tracked; only the shared coordination layer is local-only. If versioning the hub later matters, the
options are: (a) `git init` at the workspace root, or (b) mirror the hub into one repo and symlink.

## Out of scope (YAGNI)

- Merging the two git repos into one, or adding a workspace-level git repo.
- Rewriting any existing BE/FE doc (the hub links to them as-is; only `TASKS.md`/`FE-TEAM-WORKFLOW.md`
  received the Media-Library updates already done).
- Moving the report/diagrams/erd.
- A 6th+ agent (fe-ui specialist, db-migration) — folded into fe-implementer/be-implementer + skills.

## Success criteria

- From the workspace root, a coordinating session sees the 5 agents and a Context Map that resolves to
  real files in both repos.
- Opening a session inside BE or FE loads a short `AGENTS.md` that points up to the hub.
- No brand-DNA duplication remains; FE `docs/nestify/` is the single source; `nestify_new_UI/` is gone
  only after verified parity.
- Nothing committed until the user asks.
