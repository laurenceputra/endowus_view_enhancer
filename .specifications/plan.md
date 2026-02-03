# Execution Plan - Fix Review Issues (Path A)

## Goal
Fix the review issues by: (1) removing the CORS overrides that break rate‑limit responses, (2) fully removing PR template requirements from instructions, and (3) consolidating skills under `.codex/skills/*`. This plan follows **Path A** (no PR template enforcement) and uses a shared preview KV namespace.

## Work Items and Exact Changes

### 1) Remove CORS overrides on rate‑limit responses
**Objective:** Ensure rate‑limited responses remain CORS‑readable (no “CORS missing allow origin”).

**Files to update:**
- `workers/src/index.js`

**What to do:**
- Remove all occurrences of `Access-Control-Allow-Origin: null` in rate‑limit responses.
- Ensure `jsonResponse(..., resolvedEnv)` uses `applyCorsHeaders` so rate‑limited responses include `Access-Control-Allow-Origin` from `env.CORS_ORIGINS`.

**Acceptance criteria:**
- 429 responses include `Access-Control-Allow-Origin` for `https://app.sg.endowus.com`.
- Browser can read the JSON body on rate‑limit responses.

---

### 2) Fully remove PR template dependency (Path A)
**Objective:** Make instructions consistent with the “no PR template” workflow.

**Files to update:**
- `.github/copilot-instructions.md`

**What to do:**
- Remove any mention of PR templates or “Skills used” lines in the PR template.
- Keep the “Skill Alignment” guidance but direct it to working notes or PR description only.

**Acceptance criteria:**
- `.github/copilot-instructions.md` contains no PR template requirements.
- No CI steps enforce PR body structure.

---

### 3) Consolidate skills to `.codex/skills/*`
**Objective:** Remove duplicate skills under `.github/skills/*` and keep `.codex/skills/*` as the canonical location.

**Files to update:**
- `.github/skills/*`
- `.github/copilot-instructions.md` (only if it references `.github/skills/*`)

**What to do:**
- Delete duplicated skill folders under `.github/skills/*`.
- Confirm `.codex/skills/*` remains intact.
- Update any references to point to `.codex/skills/*`.

**Acceptance criteria:**
- Skills exist only under `.codex/skills/*`.
- No documentation references `.github/skills/*`.

---

### 4) Verification
- Manual: trigger a 429 rate‑limit response and confirm `Access-Control-Allow-Origin` is present.
- Lint: `npm run lint` (repo root).

---

### 5) Commit
- Stage all changes.
- Commit with a concise message, e.g., `fix: align cors and skills layout`.

## Completion Checklist
- [x] Rate‑limit responses include CORS allow‑origin.
- [x] Instructions no longer mention PR templates.
- [x] Skills only live under `.codex/skills/*`.
- [x] Lint passes.
- [ ] Commit created and `git status -sb` clean.
