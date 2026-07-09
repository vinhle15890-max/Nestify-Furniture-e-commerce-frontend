# Nestify Cross-Repo AI Context System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a workspace-root hub (`AGENTS.md` + `.claude/agents/`) that gives a coordinating Claude Code session, spawned subagents, and parallel sessions one cross-repo context map into both the BE (Laravel) and FE (React) repos; add per-repo entry points; and remove the brand-DNA duplication by deleting `nestify_new_UI/` after a parity check.

**Architecture:** A single hub at the unversioned workspace root points into the existing docs of both repos (no doc rewrites). Each repo keeps a short `AGENTS.md` pointing up to the hub. Five subagent definitions live in the hub's `.claude/agents/`. `nestify_new_UI/` is deleted only after verifying FE `docs/nestify/` covers its content.

**Tech Stack:** Markdown docs + Claude Code agent-definition frontmatter (`name`, `description`, `model`, `tools`). No application code.

Spec: `Nestify-Furniture-e-commerce-frontend/docs/superpowers/specs/2026-07-08-ai-context-system-design.md`.

## Global Constraints

- **Do NOT commit and do NOT `git add`.** (Standing project constraint.) The hub files live at the workspace root, which is **not a git repo**, so there is nothing to commit for them; the BE/FE `AGENTS.md` files are left uncommitted in their repos for the user to commit.
- **`nestify_new_UI/` deletion is IRREVERSIBLE** (not in any git repo). It may only be deleted in Task 5, and only after Task 1's parity check passed. If Task 1 finds unique content, port it first.
- **Do NOT rewrite existing BE/FE docs.** The hub LINKS to them as-is. The only allowed doc edit is adding a short "↑ hub" pointer to FE `AGENTS.md` (Task 4).
- **Paths are absolute-from-workspace-root.** Workspace root = `/home/lequanggiabao/Documents/Project Code/Do-An-Tot-Nghiep`. BE = `<root>/Nestify-Furniture-e-commerce-backend`, FE = `<root>/Nestify-Furniture-e-commerce-frontend`.
- **All agent definitions default `model: sonnet`.** Coordinator overrides per task at dispatch time.

---

### Task 1: Parity check + salvage (deletion gate — NO deletion here)

**Files:**
- Read-only: `<root>/nestify_new_UI/*.md`, `<root>/Nestify-Furniture-e-commerce-frontend/docs/nestify/*.md`
- Produce: `<root>/nestify_new_UI-parity-report.md` (temporary scratch note; delete in Task 5)

**Interfaces:**
- Produces: a confirmed boolean "FE docs/nestify covers all brand content of nestify_new_UI" + a list of salvaged ideas from `Nestify_Prompt_System_ClaudeCode.md` for Task 2's hub AGENTS.md.

- [ ] **Step 1: Map the file correspondence**

Expected correspondence (verify each):
| nestify_new_UI/ | FE docs/nestify/ |
|---|---|
| `Nestify_Brand_Context_v0.1.md` | `00_Brand_Context.md` |
| `Nestify_Brand_Constitution_v0.1.md` | `01_Brand_Constitution.md` |
| `Nestify_Story_Bible_v0.1.md` | `02_Story_Bible.md` |
| `Nestify_Design_DNA_Part1_Foundation.md` | `03_Design_DNA.md` |
| `Nestify_Component_Bible_Part1.md` + `Part2.md` | `04_Component_Bible.md` (merged) |
| `Nestify_Brand_Manifesto_v0.1.md` | `05_Brand_Manifesto.md` |
| `Nestify_Prompt_System_ClaudeCode.md` | (no FE equivalent — salvage into hub) |

- [ ] **Step 2: Diff each corresponding pair for content parity**

Run (from workspace root):
```bash
NU="nestify_new_UI"; FN="Nestify-Furniture-e-commerce-frontend/docs/nestify"
diff <(cat "$NU/Nestify_Brand_Context_v0.1.md") "$FN/00_Brand_Context.md" | head -40
diff <(cat "$NU/Nestify_Brand_Constitution_v0.1.md") "$FN/01_Brand_Constitution.md" | head -40
diff <(cat "$NU/Nestify_Story_Bible_v0.1.md") "$FN/02_Story_Bible.md" | head -40
diff <(cat "$NU/Nestify_Design_DNA_Part1_Foundation.md") "$FN/03_Design_DNA.md" | head -40
diff <(cat "$NU/Nestify_Component_Bible_Part1.md" "$NU/Nestify_Component_Bible_Part2.md") "$FN/04_Component_Bible.md" | head -60
diff <(cat "$NU/Nestify_Brand_Manifesto_v0.1.md") "$FN/05_Brand_Manifesto.md" | head -40
```
Expected: differences are only cosmetic (headers/renames/merge seams), not lost substantive content. If a diff shows FE is MISSING substantive content, that content must be ported into the FE canonical file before Task 5 (note it in the parity report; do NOT edit here unless trivial).

- [ ] **Step 3: Check for external references to `nestify_new_UI/`**

Run (from workspace root):
```bash
grep -rn "nestify_new_UI" \
  Nestify-Furniture-e-commerce-frontend/{AGENTS.md,docs,.claude} \
  Nestify-Furniture-e-commerce-backend/docs \
  /home/lequanggiabao/.claude/projects/-home-lequanggiabao-Documents-Project-Code-Do-An-Tot-Nghiep/memory \
  2>/dev/null | grep -v "nestify_new_UI-parity-report"
```
Expected: no live doc/skill/memory references `nestify_new_UI/` paths (the FE skills already point to `docs/nestify/`). Record any hit — it must be repointed to `docs/nestify/` before Task 5.

- [ ] **Step 4: Salvage ideas from the prompt-system doc**

Read `nestify_new_UI/Nestify_Prompt_System_ClaudeCode.md`. Extract the still-relevant, non-stale ideas (the CLAUDE.md-as-concise-pointers philosophy, the hard-guardrail list, the skills split) into a short bullet list for Task 2's hub AGENTS.md. Its `nestify_new_UI/...` paths are STALE (use `docs/nestify/...`).

- [ ] **Step 5: Write the parity report**

Write `<root>/nestify_new_UI-parity-report.md` with: the per-file parity verdict, any content that must be ported first (with where), the external-reference grep result, and the salvaged-ideas bullet list. End with an explicit line: `SAFE TO DELETE: yes|no`.

> No commit. No deletion in this task.

---

### Task 2: Root hub — `AGENTS.md` + `CLAUDE.md`

**Files:**
- Create: `<root>/AGENTS.md`
- Create: `<root>/CLAUDE.md`

**Interfaces:**
- Consumes: the salvaged-ideas list from Task 1.
- Produces: the Context Map + roster that Task 3's agents and Task 4's repo entry points reference.

- [ ] **Step 1: Write `<root>/CLAUDE.md`**

```markdown
@AGENTS.md
```

- [ ] **Step 2: Write `<root>/AGENTS.md`**

```markdown
# Nestify — Workspace Hub (AI context entry point)

Bạn đang ở **workspace root**. Đây là hub điều phối cho HAI repo riêng biệt (mỗi cái là 1 git repo):
- `Nestify-Furniture-e-commerce-backend/` — API Laravel (BE)
- `Nestify-Furniture-e-commerce-frontend/` — SPA React (FE)

Workspace root này **không phải git repo**. File hub (AGENTS.md, CLAUDE.md, .claude/agents/) là lớp
điều phối dùng chung, không được version-control (xem spec `…frontend/docs/superpowers/specs/2026-07-08-ai-context-system-design.md`).

## Cách chạy
- **Điều phối cross-repo:** chạy Claude Code TỪ workspace root. Bộ subagent trong `.claude/agents/`
  và bản đồ context dưới đây sẽ được nạp; subagent tự `cd` vào BE hoặc FE theo task.
- **Làm việc trong 1 repo:** mở phiên ngay trong repo đó → đọc `AGENTS.md` của repo, nó trỏ ngược lên hub.

## Bản đồ context — cần gì đọc file đó (KHÔNG copy nội dung doc vào đây)
| Cần | Đọc |
|---|---|
| BE tổng quan / index | `Nestify-Furniture-e-commerce-backend/docs/README.md` |
| BE code-path từng feature (sâu) | `…backend/docs/14-workflows.md` |
| Hợp đồng API (request/response chính xác) | `…backend/docs/FE_AI_CONTEXT.md` |
| BE bộ nhớ nội bộ / quy ước AI | `…backend/docs/internal/AI_CONTEXT.md` |
| DB schema / ERD / use-case | `…backend/docs/04-database.md`, `…/use-cases-and-erd.md`, `nestify_erd.puml`, `Diagrams/` |
| Chạy test BE | `…backend/docs/07-testing.md` (+ lệnh Docker sqlite ở mục Guardrails) |
| FE tổng quan / quy ước | `Nestify-Furniture-e-commerce-frontend/AGENTS.md` |
| Brand + Design DNA storefront (CANONICAL) | `…frontend/docs/nestify/` (`00`–`05`) |
| FE workflow đội / bản đồ task | `…frontend/docs/FE-TEAM-WORKFLOW.md`, `…/docs/TASKS.md` |
| Spec & plan (feature 2 repo) | `…frontend/docs/superpowers/{specs,plans}` |
| Báo cáo / sơ đồ | `NestifyBaoCao_v2.md`, `Diagrams/`, `nestify_erd.puml` |

## Rào chắn cứng cross-cutting (đúng ở mọi nơi)
- **Không commit** cho tới khi user yêu cầu.
- **User tự chạy migration trên prod** — viết migration idempotent, KHÔNG chạy prod.
- **`cloudinary_id` không bao giờ serialize** trong bất kỳ API resource nào.
- **Chỉ customer mới mua được hàng** (gate staff bằng `isStaff`, role ≠ customer).
- **UI storefront** phải bám Design DNA "The Becoming Room" — nguồn `…frontend/docs/nestify/`; kiểm bằng
  skill `nestify-review` trước khi coi task UI là xong. (Guardrail màu/CTA/Room Planner nằm trong DNA — không lặp lại ở đây.)

## Bộ subagent (`.claude/agents/`, spawn từ root)
- `be-implementer` — code Laravel BE (test Docker sqlite; user chạy migration prod).
- `fe-implementer` — code React FE (JSX no-TS; Vitest+RTL; semantic tokens).
- `task-reviewer` — review 2 verdict (spec compliance + code quality); đọc diff, không sửa.
- `explorer` — read-only, search rộng cả 2 repo, trả kết luận.
- `docs-writer` — sync docs sau thay đổi (14-workflows / FE_AI_CONTEXT / TASKS…).

## Skills (storefront UI)
`nestify-ui` (tạo/sửa UI) và `nestify-review` (kiểm UI theo DNA) nằm ở
`…frontend/.claude/skills/` — chỉ áp cho file trong FE.
```
(In Step 2, weave in any additional salvaged bullet from Task 1 that isn't already covered — do not add stale `nestify_new_UI/` paths.)

- [ ] **Step 3: Verify every Context-Map link resolves**

Run (from workspace root):
```bash
for f in \
  Nestify-Furniture-e-commerce-backend/docs/README.md \
  Nestify-Furniture-e-commerce-backend/docs/14-workflows.md \
  Nestify-Furniture-e-commerce-backend/docs/FE_AI_CONTEXT.md \
  Nestify-Furniture-e-commerce-backend/docs/internal/AI_CONTEXT.md \
  Nestify-Furniture-e-commerce-backend/docs/04-database.md \
  Nestify-Furniture-e-commerce-backend/docs/use-cases-and-erd.md \
  Nestify-Furniture-e-commerce-backend/docs/07-testing.md \
  Nestify-Furniture-e-commerce-frontend/AGENTS.md \
  Nestify-Furniture-e-commerce-frontend/docs/nestify \
  Nestify-Furniture-e-commerce-frontend/docs/FE-TEAM-WORKFLOW.md \
  Nestify-Furniture-e-commerce-frontend/docs/TASKS.md \
  Nestify-Furniture-e-commerce-frontend/docs/superpowers \
  NestifyBaoCao_v2.md nestify_erd.puml Diagrams ; do
  [ -e "$f" ] && echo "OK   $f" || echo "MISS $f"
done
```
Expected: every line `OK`. Any `MISS` → fix the path in `AGENTS.md`.

> No commit.

---

### Task 3: Agent roster — `.claude/agents/*.md` (5 files)

**Files:**
- Create: `<root>/.claude/agents/be-implementer.md`
- Create: `<root>/.claude/agents/fe-implementer.md`
- Create: `<root>/.claude/agents/task-reviewer.md`
- Create: `<root>/.claude/agents/explorer.md`
- Create: `<root>/.claude/agents/docs-writer.md`

**Interfaces:**
- Consumes: the hub Context Map (Task 2) — each brief tells the agent to read it first.
- Produces: 5 dispatchable agent definitions.

- [ ] **Step 1: Write `be-implementer.md`**

```markdown
---
name: be-implementer
description: Implements backend tasks in the Laravel API repo (Nestify-Furniture-e-commerce-backend). Use for BE models, migrations, services, controllers, requests, resources, and their tests.
model: sonnet
---

You implement ONE backend task in `Nestify-Furniture-e-commerce-backend`. Read the workspace hub
`AGENTS.md` Context Map first, then your task brief.

Conventions (binding):
- Laravel 11. Follow existing patterns in the file you touch.
- **Run BE tests in the Docker sqlite image** from the BE repo root:
  `docker run --rm --entrypoint sh -v "$(pwd)/src:/var/www" -w /var/www -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: nestify-furniture-e-commerce-backend-app:latest -c "php artisan config:clear >/dev/null 2>&1; php artisan route:clear >/dev/null 2>&1; php artisan test <path>"`
- Validation errors use the app envelope `error.details.fields.<field>` — assert with
  `assertJsonPath('error.code','VALIDATION_FAILED')` + structure `['error'=>['details'=>['fields'=>['<field>']]]]`, NEVER `assertJsonValidationErrorFor`.
- `cloudinary_id` is internal — never serialize it in a resource.
- **The user runs migrations on prod.** Write migrations idempotent; never run against prod.
- TDD when the task says so. Do NOT commit / `git add` unless told. Report status + test results + files changed.
```

- [ ] **Step 2: Write `fe-implementer.md`**

```markdown
---
name: fe-implementer
description: Implements frontend tasks in the React SPA repo (Nestify-Furniture-e-commerce-frontend). Use for components, pages, feature api.js/hooks.js, and Vitest/RTL tests. For storefront UI, invoke the nestify-ui skill.
model: sonnet
---

You implement ONE frontend task in `Nestify-Furniture-e-commerce-frontend`. Read the workspace hub
`AGENTS.md` Context Map and the FE `AGENTS.md` first, then your task brief.

Conventions (binding):
- Vite + React 18, **plain JSX — no TypeScript**, no `.ts`/`.tsx`.
- Vitest + RTL, TDD. Run `npx vitest run <file>`; lint `npm run lint`; build `npm run build` (from FE repo root).
- **Semantic Tailwind tokens only** (`bg-surface`, `text-foreground`, …) — never raw hex.
- Feature folders: `features/<domain>/api.js` + `hooks.js`; pages stay thin.
- `useOffsetQuery({ queryKey, queryFn, page, enabled })` — object arg, caller owns `page`; `apiClient` returns the response BODY.
- VN copy. Errors surface via `ApiError` (`.code/.message/.details`).
- **Storefront UI** (Home, Product, Cart, Room Planner…): invoke the `nestify-ui` skill; run `nestify-review` before done.
- Do NOT commit / `git add` unless told. Report status + test/lint results + files changed.
```

- [ ] **Step 3: Write `task-reviewer.md`**

```markdown
---
name: task-reviewer
description: Reviews one completed task's diff for spec compliance and code quality. Use after an implementer finishes a task, before accepting it. Reads a scoped diff; never edits code.
model: sonnet
tools: Read, Grep, Glob, Bash
---

You review ONE task. You are given: the task brief, the implementer's report, and a scoped diff file.
Read all three. You may read repo files for context. **Do NOT edit code.**

Return TWO verdicts:
- **Spec compliance:** did it build exactly what the brief said — nothing missing, nothing extra (YAGNI)?
- **Code quality:** correctness, naming, test hygiene (assertions actually run and verify behavior; no dead/unreachable assertions), no over-building.

Rules:
- Judge ONLY the task's delta. Shared files may carry unrelated prior uncommitted work — ignore it.
- Do NOT re-run tests the implementer already ran; trust their report unless the diff contradicts it.
- If a finding conflicts with what the plan/brief mandates, surface it to the coordinator (whose call it is) — don't silently accept or override.
- Rank findings Critical / Important / Minor. Be concrete: `file:line` + why + fix.
```

- [ ] **Step 4: Write `explorer.md`**

```markdown
---
name: explorer
description: Read-only fan-out search across BOTH repos. Use when answering a question means sweeping many files/directories and you only need the conclusion, not file dumps.
model: sonnet
tools: Read, Grep, Glob, Bash
---

You answer a search/exploration question spanning the BE and/or FE repos. Read the workspace hub
`AGENTS.md` Context Map first to know where things live.

- Read excerpts, not whole files. Locate code; don't audit it.
- Return CONCLUSIONS with `file:line` references — NOT file dumps.
- State search breadth actually covered. If a claim is uncertain, say so.
- You are READ-ONLY: never edit, write, or commit.
```

- [ ] **Step 5: Write `docs-writer.md`**

```markdown
---
name: docs-writer
description: Syncs documentation to code changes at code-path detail. Use after a feature/change lands to update BE 14-workflows.md / FE_AI_CONTEXT.md and FE TASKS.md / FE-TEAM-WORKFLOW.md.
model: sonnet
tools: Read, Edit, Grep, Glob, Bash
---

You update docs to match shipped code. Read the workspace hub `AGENTS.md` Context Map first.

- BE: add/adjust the feature's section in `docs/14-workflows.md` (CODE-PATH detail: request → controller
  → service → model) and the API contract in `docs/FE_AI_CONTEXT.md`.
- FE: update `docs/TASKS.md` (feature checklist) and `docs/FE-TEAM-WORKFLOW.md` (team-level summary).
- Match each doc's existing structure/style; be accurate to the shipped behavior (read the code if unsure).
- Do NOT rewrite unrelated sections. Do NOT commit / `git add` unless told. Report which files changed.
```

- [ ] **Step 6: Verify frontmatter + structure**

Run (from workspace root):
```bash
ls .claude/agents/*.md | wc -l   # expect 5
for f in .claude/agents/*.md; do echo "== $f =="; sed -n '1,6p' "$f"; done
```
Expected: 5 files, each opening with a `---` frontmatter block containing `name:` and `description:` (and `model:`).

> No commit.

---

### Task 4: Per-repo entry points

**Files:**
- Create: `<root>/Nestify-Furniture-e-commerce-backend/AGENTS.md`
- Create: `<root>/Nestify-Furniture-e-commerce-backend/CLAUDE.md`
- Modify: `<root>/Nestify-Furniture-e-commerce-frontend/AGENTS.md` (add a "↑ hub" pointer at the very top only)

**Interfaces:**
- Consumes: the hub (Task 2). These point up to it.

- [ ] **Step 1: Write BE `CLAUDE.md`**

```markdown
@AGENTS.md
```

- [ ] **Step 2: Write BE `AGENTS.md`**

```markdown
# Nestify Backend — AI Agent Guide

Laravel 13 + PostgreSQL 16 (pgvector) API. Distinguishing features: **3D Room Planner** + **AI Chatbot RAG**.

## Bắt đầu ở đây
- **Index tài liệu:** `docs/README.md` (đọc trước; teammate mới đọc `docs/14-workflows.md`).
- **Bộ nhớ AI nội bộ + quy ước:** `docs/internal/AI_CONTEXT.md`.
- **Hợp đồng API cho FE:** `docs/FE_AI_CONTEXT.md`.

## Hub cross-repo (một cấp lên trên)
Repo này là 1 nửa của workspace `Do-An-Tot-Nghiep/`. Bản đồ context cross-repo + bộ subagent nằm ở
`../AGENTS.md` (workspace hub). Cần đụng cả BE lẫn FE → điều phối từ hub.

## Rào chắn cứng
- **Không commit** cho tới khi user yêu cầu.
- **User tự chạy migration prod** — migration phải idempotent, KHÔNG chạy prod.
- **`cloudinary_id` không bao giờ serialize.** Lỗi validation dùng envelope `error.details.fields.<field>`.
- Test chạy trong Docker sqlite (xem `docs/07-testing.md`).
- Chỉ customer mua được hàng; gate staff bằng `isStaff`.
```

- [ ] **Step 3: Add a hub pointer to the TOP of FE `AGENTS.md`**

Insert these lines immediately after the FE `AGENTS.md` title line (`# Nestify Frontend — AI Agent Guide`), before the existing body. Do NOT change anything else in the file.

```markdown

> **Workspace hub:** repo này là 1 nửa của `Do-An-Tot-Nghiep/`. Bản đồ context cross-repo (BE+FE) +
> bộ subagent dùng chung nằm ở `../AGENTS.md`. Đụng cả 2 repo → điều phối từ hub.
```

- [ ] **Step 4: Verify**

Run (from workspace root):
```bash
[ -f Nestify-Furniture-e-commerce-backend/AGENTS.md ] && echo "OK BE AGENTS"
[ -f Nestify-Furniture-e-commerce-backend/CLAUDE.md ] && echo "OK BE CLAUDE"
head -6 Nestify-Furniture-e-commerce-frontend/AGENTS.md   # expect the hub pointer near the top
```
Expected: both BE files exist; FE shows the hub pointer near the top with the rest of the file intact.

> No commit.

---

### Task 5: Delete `nestify_new_UI/` (gated) + final verification

**Files:**
- Delete: `<root>/nestify_new_UI/` (only if Task 1 report says `SAFE TO DELETE: yes`)
- Delete: `<root>/nestify_new_UI-parity-report.md` (scratch from Task 1)

- [ ] **Step 1: Re-confirm the gate**

Run (from workspace root):
```bash
grep -i "SAFE TO DELETE" nestify_new_UI-parity-report.md
```
Expected: `SAFE TO DELETE: yes`. If `no` (or any required content wasn't ported / any external reference still points at `nestify_new_UI/`), STOP and report back — do not delete.

- [ ] **Step 2: Delete the superseded source folder**

```bash
rm -rf nestify_new_UI
```

- [ ] **Step 3: Remove the scratch parity report**

```bash
rm -f nestify_new_UI-parity-report.md
```

- [ ] **Step 4: Final system verification**

Run (from workspace root):
```bash
[ ! -e nestify_new_UI ] && echo "OK nestify_new_UI removed"
ls Nestify-Furniture-e-commerce-frontend/docs/nestify/*.md | wc -l   # expect 6 (canonical DNA intact)
[ -f AGENTS.md ] && [ -f CLAUDE.md ] && echo "OK hub entry points"
ls .claude/agents/*.md | wc -l                                        # expect 5
grep -rn "nestify_new_UI" Nestify-Furniture-e-commerce-frontend/{AGENTS.md,docs,.claude} Nestify-Furniture-e-commerce-backend/docs 2>/dev/null && echo "!! stale ref" || echo "OK no stale refs"
```
Expected: `nestify_new_UI` gone; 6 canonical DNA files intact; hub entry points present; 5 agents; no stale references.

> No commit. Report the final state + remind the user: hub files are at the (unversioned) workspace root; BE/FE `AGENTS.md` are uncommitted in their repos.

---

## Self-Review notes (author)

- **Spec coverage:** topology/entry points (T2, T4), roster (T3), context system/Context Map (T2), DNA dedup with parity gate (T1→T5), loose files left in place + indexed (T2 Context Map). All spec sections mapped.
- **Irreversibility guard:** deletion (T5) is gated on T1's `SAFE TO DELETE: yes` and separated into its own task so a reviewer can reject it independently.
- **No placeholders:** every file's full content is inline (hub AGENTS.md, 5 agent files, BE AGENTS.md/CLAUDE.md, the FE insertion).
- **No-commit constraint** honored throughout; hub is unversioned by design (documented trade-off).
