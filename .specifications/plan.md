# Execution Plan - Outstanding Work

## Goal
Complete the remaining work from the previous review: update docs + API examples, add agent/skill alignment guidance, and document multi‑instance Cloudflare configuration (including configurable `SYNC_KV` binding). This plan is written so another contributor can pick it up without additional context.

## Work Items and Exact Changes

### 1) Documentation accuracy (sync/auth behavior)
**Objective:** Ensure docs match current sync UI, login flow, and encryption key behavior.

**Files to review and update:**
- `README.md`
- `docs/sync-setup.md`
- `tampermonkey/README.md`
- `TECHNICAL_DESIGN.md`

**What to change:**
- Identify any claims about sync automation/UI features that are not currently implemented.
- Update language to reflect actual behavior (e.g., manual sync, opt‑in on login, encryption key storage behavior, refresh‑token expiry expectations).
- Ensure the default sync server URL matches current value (`https://goal-portfolio-sync.laurenceputra.workers.dev`).

**Acceptance criteria:**
- No doc claims a feature that the UI does not currently provide.
- Sync flow and encryption key explanations match the current implementation.

---

### 2) API example updates (auth headers)
**Objective:** Make all curl/examples usable with current auth requirements.

**Primary file:**
- `DEPLOYMENT.md`

**Secondary scan:**
- Search for `/auth/` and `/sync` usage in docs: `README.md`, `SYNC_ARCHITECTURE.md`, `docs/sync-setup.md`.

**What to change:**
- Ensure all `/sync` requests include `Authorization: Bearer <token>` and `X-User-Id` where required.
- Ensure auth endpoints show the correct body payload (e.g., `userId`, `passwordHash`) and any required headers.
- Keep examples consistent with current server routes.

**Acceptance criteria:**
- Every API example contains all required headers and matches the runtime handler expectations.

---

### 3) Agent + skill alignment guidance
**Objective:** Align `.github/agents` workflow with `.codex/skills` capabilities without breaking the gated workflow.

**File to update:**
- `.github/copilot-instructions.md`

**What to add:**
- A short “Skill Invocation” section with:
  - Mapping of agent phases to suggested skills (e.g., QA -> `qa-testing`, Code Review -> `code-review`).
  - Precedence rule: agent workflow gates override skill guidance if they conflict.
  - A lightweight checklist line for each phase: “skills used: …”.
  - Exception rule: if no matching skill exists, proceed with the agent phase and note it.

**Acceptance criteria:**
- The agent workflow remains authoritative.
- Skills are positioned as optional execution helpers, not workflow replacements.

---

### 4) Multi‑instance Cloudflare configuration (including configurable `SYNC_KV`)
**Objective:** Allow multiple Workers instances under one Cloudflare account with isolated config.

**Files to update:**
- `workers/wrangler.toml`
- `workers/README.md` (or `DEPLOYMENT.md` if that is the central doc)
- Any other deployment docs referencing KV/Secrets setup.

**What to change:**
- Document a configurable KV binding name (e.g., `SYNC_KV_BINDING`) and default fallback to `SYNC_KV`.
- Document per‑instance config knobs:
  - Unique Worker `name`/route per instance.
  - Per‑instance KV namespace IDs.
  - Per‑instance `JWT_SECRET` (token isolation).
  - Per‑instance `CORS_ORIGINS` (domain allowlist).
  - Per‑instance `ENVIRONMENT` (error verbosity).
- Provide a sample multi‑instance configuration snippet in `wrangler.toml` (e.g., staging + prod + second instance).

**Acceptance criteria:**
- Docs show how to run two isolated instances under one account.
- Clear instructions for per‑instance KV IDs + secrets + CORS allowlist.

---

### 5) Verification
- Manually scan updated docs for accuracy and broken references.
- Validate that example curl commands include required headers.

---

### 6) Commit
- Stage all changes.
- Commit with a concise message, e.g., `docs: align sync guidance + multi-instance config`.

## Completion Checklist
- [ ] Docs updated and consistent with current behavior.
- [ ] API examples include required auth headers.
- [ ] Agent/skill alignment guidance added.
- [ ] Multi‑instance config documented (KV binding + per‑instance knobs).
- [ ] Commit created and `git status -sb` clean.
