# Execution Plan - Outstanding Work

## Goal
Complete the remaining work from the previous review and the newly requested UX updates:
- Update docs + API examples for current sync/auth behavior.
- Add agent/skill alignment guidance.
- Document multi‑instance Cloudflare config (including configurable `SYNC_KV` binding).
- Improve conflict resolution UI to show goal‑level diffs.
- Enforce CORS allowlist for the single origin `https://app.sg.endowus.com`.

This plan is written so another contributor can pick it up without additional context.

## Work Items and Exact Changes

### 1) Documentation accuracy (sync/auth behavior)
**Objective:** Ensure docs match current sync UI, login flow, and encryption key behavior.

**Files to review and update:**
- `README.md`
- `docs/sync-setup.md`
- `tampermonkey/README.md`
- `TECHNICAL_DESIGN.md`
- `SYNC_ARCHITECTURE.md` (for any UI flow diagrams)

**What to change:**
- Identify any claims about sync automation/UI features that are not currently implemented.
- Update language to reflect actual behavior (manual sync, opt‑in on login, encryption key storage behavior, refresh‑token expiry expectations).
- Ensure the default sync server URL matches current value (`https://goal-portfolio-sync.laurenceputra.workers.dev`).
- Update conflict‑resolution copy to reflect only two options (Local vs Remote) and mention the goal‑level diff preview once implemented.

**Acceptance criteria:**
- No doc claims a feature that the UI does not currently provide.
- Sync flow and encryption key explanations match the implementation.
- Conflict docs list only the options visible in the UI.

---

### 2) API example updates (auth headers)
**Objective:** Make all curl/examples usable with current auth requirements.

**Primary file:**
- `DEPLOYMENT.md`

**Secondary scan:**
- Search for `/auth/` and `/sync` usage in docs: `README.md`, `SYNC_ARCHITECTURE.md`, `docs/sync-setup.md`, `workers/README.md`.

**What to change:**
- Ensure all `/sync` requests include `Authorization: Bearer <token>` and `X-User-Id` where required.
- Ensure auth endpoints show correct body payload (e.g., `userId`, `passwordHash`) and any required headers.
- Keep examples consistent with current server routes.

**Acceptance criteria:**
- Every API example contains all required headers and matches runtime handler expectations.

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
- Update `.github/pull_request_template.md` to include a `Skills used:` line under each phase gate.

**Acceptance criteria:**
- The agent workflow remains authoritative.
- Skills are positioned as optional execution helpers, not workflow replacements.
- PR template supports recording skills used per phase.

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
- Provide a sample multi‑instance configuration snippet in `wrangler.toml` (e.g., staging + prod + secondary instance).

**Acceptance criteria:**
- Docs show how to run two isolated instances under one account.
- Clear instructions for per‑instance KV IDs + secrets + CORS allowlist.

---

### 5) Conflict resolution UI: goal‑level diff preview
**Objective:** Make conflict resolution end‑user friendly by showing what changed.

**Primary file:**
- `tampermonkey/goal_portfolio_viewer.user.js`

**What to change:**
- When a conflict is detected, compute a diff list of goals that differ between local and remote:
  - Show goal name (or ID if name unavailable).
  - Show local vs remote target percentage for each changed goal.
  - Optionally indicate fixed‑flag differences if they changed.
- Display the diff list inside the conflict modal under each side (Local/Remote) or as a consolidated list.
- Keep the existing two actions: “Keep Local” and “Use Remote”.

**Acceptance criteria:**
- Conflict dialog shows a readable list of changed goals with local vs remote values.
- User can decide which side to keep without inspecting console logs.

---

### 6) CORS allowlist enforcement for `https://app.sg.endowus.com`
**Objective:** Ensure CORS headers match the single origin where the script runs.

**Files to update:**
- `workers/src/index.js`
- `workers/src/handlers.js`
- `workers/wrangler.toml`
- Deployment docs (`workers/README.md` and/or `DEPLOYMENT.md`)

**What to change:**
- Set default `CORS_ORIGINS` to `https://app.sg.endowus.com` in example configs (wrangler + docs).
- Ensure **all** responses (including handler responses) use the resolved allowlist instead of `*`.
- Confirm preflight and normal responses return the same origin header.

**Acceptance criteria:**
- All endpoints return `Access-Control-Allow-Origin: https://app.sg.endowus.com` by default.
- CORS origin is configurable per instance and consistently enforced.

---

### 7) Verification
- Manually scan updated docs for accuracy and broken references.
- Validate that example curl commands include required headers.
- Validate conflict dialog shows goal‑level diffs in the UI.
- Validate CORS headers in preflight + normal responses match the configured origin.

---

### 8) Commit
- Stage all changes.
- Commit with a concise message, e.g., `docs: align sync guidance + multi-instance config` or `feat: conflict diff + cors allowlist`.

## Completion Checklist
- [ ] Docs updated and consistent with current behavior.
- [ ] API examples include required auth headers.
- [ ] Agent/skill alignment guidance added and PR template updated.
- [ ] Multi‑instance config documented (KV binding + per‑instance knobs).
- [ ] Conflict dialog shows goal‑level diff preview.
- [ ] CORS allowlist enforced for `https://app.sg.endowus.com`.
- [ ] Commit created and `git status -sb` clean.
