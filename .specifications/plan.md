# Execution Plan - Production KV via CI Template (Option A)

## Goal
Ensure production deploys via GitHub Actions render a Wrangler config with real KV namespace IDs from secrets, so the deployed worker has a valid `SYNC_KV` binding and no longer throws `KV binding "SYNC_KV" is not configured`.

## Work Items and Exact Changes

### 1) Add production Wrangler template
**Objective:** Provide a production config template that can be filled from CI secrets.

**Files to add:**
- `workers/wrangler.production.toml.template`

**What to do:**
- Create a template mirroring `workers/wrangler.toml` production settings with placeholders:
  - `__WORKER_NAME__`
  - `__KV_ID__`
  - `__KV_PREVIEW_ID__`
  - `__CORS_ORIGINS__`
- Set `vars` to include:
  - `ENVIRONMENT = "production"`
  - `SYNC_KV_BINDING = "SYNC_KV"`
  - `CORS_ORIGINS = "__CORS_ORIGINS__"`
- Ensure a single `[[kv_namespaces]]` binding named `SYNC_KV`.

**Acceptance criteria:**
- New template exists and matches production settings currently in `workers/wrangler.toml`.

---

### 2) Render production config in CI
**Objective:** Use secrets to render the production config and deploy with `--config`.

**Files to update:**
- `.github/workflows/deploy-production.yml`

**What to do:**
- Add a “Render production wrangler config” step similar to preview workflow:
  - Require `SYNC_KV_ID` secret
  - Allow optional `SYNC_KV_PREVIEW_ID` (fallback to `SYNC_KV_ID`)
  - Render `workers/wrangler.production.toml.template` into `workers/wrangler.production.toml`
- Update deploy step to use:
  - `npx wrangler@4 deploy --config <rendered path>`
- Ensure `CORS_ORIGINS` and `WORKER_NAME` values are set in the workflow `env` (if not already).

**Acceptance criteria:**
- CI deploy uses the rendered config (not the raw `wrangler.toml`).
- Missing `SYNC_KV_ID` fails fast with a clear error message.

---

### 3) Document new CI requirements
**Objective:** Ensure docs reflect that production deploy uses a CI-rendered template and needs KV secrets.

**Files to update:**
- `workers/README.md`
- `DEPLOYMENT.md`

**What to do:**
- Update “Production Deploy on Main” sections to include required secrets:
  - `SYNC_KV_ID`
  - `SYNC_KV_PREVIEW_ID` (optional, defaults to `SYNC_KV_ID`)
- Note that CI renders a production Wrangler config from `workers/wrangler.production.toml.template`.
- Keep local deploy instructions pointing to `workers/wrangler.toml` for non‑CI usage.

**Acceptance criteria:**
- Docs list production CI secrets and the template-based deploy behavior.

---

## Verification
- CI config render sanity check (local, optional):
  - `sed` renders the template with sample values and produces a valid `workers/wrangler.production.toml`.
- Manual check after deploy:
  - Cloudflare dashboard shows `SYNC_KV` binding on the production worker.
  - `/health` returns OK for the production URL.

## Commit
- Commit with a concise message, e.g., `ci: render production wrangler config`.

## Completion Checklist
- [ ] `workers/wrangler.production.toml.template` added and matches production config requirements.
- [ ] Production deploy workflow renders template and deploys with `--config`.
- [ ] Docs updated with production CI secret requirements and template note.
- [ ] Deployment verified: `SYNC_KV` binding present and `/health` works.
- [ ] Commit created and working tree clean.
