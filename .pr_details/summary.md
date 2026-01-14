# Summary
- Centralized endpoint detection, normalized API inputs, and consolidated percent/number helpers for more consistent logic.
- Added view-model caching, render scheduling, and DOM batching to reduce unnecessary recomputation and layout churn.
- Hardened performance data flow with error boundaries and cache handling that can reuse stale data while refreshing.

# Change Brief
Problem: The userscript had scattered normalization/formatting logic, repeated view-model recomputation, and limited error containment around API interception and performance loading.
Goal: Improve maintainability, performance, and reliability without changing the user-facing feature set.
Acceptance Criteria:
- View-model computation reuses cached results when inputs are unchanged.
- Rendering is scheduled to avoid redundant updates.
- API and performance data handling is resilient to malformed data and network failures.
- Unit tests cover new helpers and cache behavior.

# Risks & Tradeoffs
- Introducing caching adds a versioning path; incorrect invalidation could show stale data if a bug slips in.
- Allowing stale cache reads can surface older performance data while refresh completes.

# Test Plan
- npm test

# Verification
- npm test
