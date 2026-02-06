# Action Guidance + Reliability Product Spec

## Goal
Define a feasible roadmap for improving Goal Portfolio Viewer when bulk-apply APIs are unavailable and users require clearer action guidance and stronger reliability.

This spec covers items **1–5** from the prioritized list:
1. Action instructions layer (beyond raw diff)
3. Reliability hardening for third-party interception
4. Sync error UX and supportability improvements
5. Prioritized implementation order and release plan

## Constraints and Non-Goals

### Constraints
- No bulk apply execution API is available from the third-party platform.
- The userscript runs on a third-party site and depends on fetch/XHR interception.
- Rebalance execution may span up to one week.
- Current sync only stores encrypted configuration values; session data is not synced.

### Non-Goals
- No automated trade placement.
- No direct mutation of third-party portfolio state via undocumented APIs.
- No server-side portfolio execution orchestration.

---

## Work Items and Exact Changes

### 1) Action Instructions Layer (not a duplicate of diff)

**Problem**
Current diff output (`current - target`) is informational but not operationally prescriptive.

**Scope**
Add an explicit action model per goal and per bucket that converts diff into user tasks.

**File targets**
- `tampermonkey/goal_portfolio_viewer.user.js`
- `__tests__/utils.test.js`
- `README.md` (user-facing explanation)
- `TECHNICAL_DESIGN.md` (behavior contract)

**Functional spec**
- For each goal row, derive:
  - `actionLabel`: `Top up`, `Trim`, `Monitor`, `Needs target setup`, `No action (fixed)`
  - `actionAmount`: absolute amount to act on (rounded to configured increment)
  - `actionPriority`: `High`, `Medium`, `Low`
  - `actionReason`: short explanation (under/over target and by how much)
  - `actionGeneratedAt`: timestamp
- For each bucket, derive an ordered action queue sorted by priority + impact.
- Preserve existing diff display; action instructions are an additive layer.

**Behavior rules**
- Missing target -> `Needs target setup`.
- Fixed goal -> `No action (fixed)`.
- Invalid adjusted total or insufficient numeric inputs -> do not generate actionable row.
- Threshold semantics:
  - Within threshold: `Monitor`
  - Above threshold positive diff: `Trim`
  - Above threshold negative diff: `Top up`

---

### 2) Workflow note (rebalance tracker deferred)

**Problem**
Manual rebalance is multi-day; single-session checklist assumptions fail in real usage.

**Scope**
Defer plan-tracker implementation until a more robust execution-aware model is designed.

**File targets**
- `tampermonkey/goal_portfolio_viewer.user.js`
- `__tests__/utils.test.js` (state-machine helpers)
- `README.md`
- `TECHNICAL_DESIGN.md`

**Activation model**
- Plan-tracker behavior is out of scope for now.

**Lifecycle model**
No tracker states are currently implemented in this scope.

**Persistence model**
N/A (deferred).

**Rebase behavior**
N/A (deferred).

---

### 3) Reliability Hardening for Interception Architecture

**Problem**
Third-party API and DOM changes can break parsing or rendering unexpectedly.

**Scope**
Add defensive parsing, degradation behavior, and localized observability.

**File targets**
- `tampermonkey/goal_portfolio_viewer.user.js`
- `__tests__/utils.test.js`
- `TECHNICAL_DESIGN.md`

**Functional spec**
- Add contract guards for required payload fields per endpoint.
- Isolate endpoint-specific parsers from view model composition.
- Introduce degraded mode UI states:
  - `No data yet`
  - `Temporarily unavailable`
  - `Schema changed / unsupported`
- Add bounded retries with cooldown for transient failures.
- Add local diagnostic surface (non-sensitive) for endpoint health and last parse status.

**Safety requirements**
- No sensitive financial payload logging in production.
- Interception failure in one endpoint must not break unrelated widgets.

---

### 4) Sync Error UX and Supportability

**Problem**
Sync failures are not consistently categorized or explained, increasing support burden.

**Scope**
Centralize sync error handling and provide deterministic user actions.

**File targets**
- `tampermonkey/goal_portfolio_viewer.user.js`
- `__tests__/utils.test.js` (error mapping helpers)
- `docs/sync-setup.md`
- `README.md` (if user workflow changes)

**Functional spec**
- Define canonical error categories:
  - `auth`, `network`, `timeout`, `rate_limit`, `server`, `parse`, `crypto`
- Map each category to:
  - user-friendly message,
  - primary CTA,
  - optional secondary action,
  - troubleshooting deep-link.
- Show retry status:
  - next retry countdown,
  - last attempt timestamp,
  - manual retry control.
- Improve conflict dialog copy to make overwrite impact explicit.

**UX rules**
- Every surfaced sync error must include a recommended next action.
- Do not require console inspection for common failure recovery.

---

### 5) Priority and Release Slicing (what to build first)

**Problem**
All improvements are valuable but should be delivered in risk-reducing order.

**Scope**
Deliver in three phases with explicit gates.

**File targets**
- `README.md`
- `TECHNICAL_DESIGN.md`
- `TESTING.md`

**Release plan**
- **Phase 1 (Trust Foundation):**
  - Work item 4 (sync error UX)
  - Work item 3 (reliability guardrails)
- **Phase 2 (Execution Guidance):**
  - Work item 1 (action instructions layer)
- **Phase 3 (Long-Running Workflow):**
  - Work item 2 (deferred workflow note)

**Rationale**
- Reliability and sync trust reduce regressions/support load before adding new workflow complexity.

---

## Acceptance Criteria

### Item 1 (Action Instructions)
- Action labels are deterministic from diff + thresholds.
- Bucket view provides a sorted queue of recommended manual actions.
- Existing diff cell remains visible and unchanged in meaning.

### Item 2 (Workflow note)
- Rebalance plan tracker is intentionally deferred in this scope.

### Item 3 (Reliability)
- Partial endpoint failures do not collapse the entire UI.
- Unsupported payload shapes surface a clear degraded state.
- Retry behavior is bounded and avoids repeated rapid-fail loops.

### Item 4 (Sync UX)
- Each error category maps to an actionable CTA.
- Common issues are recoverable from UI alone.
- Conflict choice text clearly communicates overwrite scope.

### Item 5 (Delivery Order)
- Phase gates are documented and followed in release notes.
- Test coverage increments with each phase before rollout.

---

## Verification

### Automated
- Run unit tests for new action derivation and state-machine helpers.
- Add regression tests for parser guardrails and sync error mapping.

### Manual
- Simulate missing/partial API payloads and verify degraded-state messaging.
- Simulate sync error categories and verify CTA correctness.
- Validate action guidance without tracker features.

### Commands
```bash
npm test
npm run lint
```

---

## Commit
Suggested commit message when implementing this spec:
- `docs: add manual rebalance and reliability product spec (items 1-5)`

---

## Completion Checklist
- [ ] Action instruction model implemented and tested
- [ ] Interception reliability guardrails implemented and tested
- [ ] Sync error taxonomy + UX implemented and tested
- [ ] README + TECHNICAL_DESIGN + TESTING docs updated
- [ ] Release notes include phased rollout and known limitations
