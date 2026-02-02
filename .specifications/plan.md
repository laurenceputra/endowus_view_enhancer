# Remaining Work Plan

## Scope
Address the outstanding items from the previous code review plan that are still not done:
- Documentation updates to align with current sync/auth behavior.
- API example updates to include required auth headers.
- Commit the current uncommitted changes.
- Add alignment guidance for .github agent workflow + .codex skills.
- Plan support for configurable `SYNC_KV` and multi-instance Cloudflare setup.

## Tasks
1. Review docs for sync/auth claims and mark anything that overstates current functionality.
   - Targets: `README.md`, `docs/sync-setup.md`, `tampermonkey/README.md`, and any sync references in `TECHNICAL_DESIGN.md`.
2. Update API examples to include required auth headers (`X-User-Id`, `X-Password-Hash` and/or `Authorization` where applicable).
   - Primary target: `DEPLOYMENT.md`.
   - Secondary scan: search for `/auth/` or `/sync` curl examples in other docs (e.g., `README.md`, `SYNC_ARCHITECTURE.md`).
3. Verify docs are consistent with current sync flow and encryption key behavior.
4. Add alignment guidance for agent workflow + skills:
   - Document capability mapping (agent phase -> skill usage).
   - State precedence rules (agent workflow gates override skill advice if conflict).
   - Add a lightweight checklist line for “skills used” per phase.
5. Plan and implement config-driven `SYNC_KV` naming (multi-instance support), including other multi-instance configs:
   - Identify current `SYNC_KV` usage in Workers config and runtime.
   - Add a configuration option for KV namespace binding name (e.g., `SYNC_KV_BINDING` or env-based binding alias).
   - Update runtime to read the configured binding name and error clearly if missing.
   - Add per-instance config knobs:
     - Unique Worker name/route per instance (wrangler env entries).
     - Per-instance KV namespace IDs.
     - Per-instance `JWT_SECRET` (tokens isolated by instance).
     - Per-instance CORS allowlist (e.g., `CORS_ORIGINS`).
     - Per-instance `ENVIRONMENT` value for error verbosity.
   - Update `wrangler.toml` examples/README to show multiple instance setup with different KV namespaces and secrets.
6. Run a quick documentation sanity check (links and example commands) and note any follow-ups.
7. Commit all changes from this work (docs + config examples) with a concise message.

## Verification
- Manual doc review completed for all listed files.
- API examples include required headers and match current endpoint behavior.
- Agent/skill alignment guidance documented.
- `SYNC_KV` configuration documented and works with multiple instances.
- Multi-instance config knobs (name/route, KV, JWT_SECRET, CORS, ENVIRONMENT) documented.
- `git status -sb` is clean after the commit.
