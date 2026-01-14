# Test Coverage Visualization
**Goal Portfolio Viewer - Coverage Heat Map**

## Coverage by Code Section

```
Legend:
█████ 100% | ████░ 80% | ███░░ 60% | ██░░░ 40% | █░░░░ 20% | ░░░░░ 0%
```

### Main Userscript: goal_portfolio_viewer.user.js (3,962 lines)

| Line Range | Section | Coverage | Priority | Status |
|------------|---------|----------|----------|--------|
| 17-26 | Configuration & Debug | ░░░░░ 0% | P3 | 🔵 Low priority |
| 27-41 | Debug Logging | █░░░░ 20% | P3 | 🔵 Low priority |
| 48-56 | Storage Key Generators | █████ 100% | ✅ | ✅ Complete |
| 57-69 | Projected Investment Keys | █████ 100% | ✅ | ✅ Complete |
| 71-85 | Bucket Name Extraction | █████ 100% | ✅ | ✅ Complete |
| 87-98 | Goal Type Display | █████ 100% | ✅ | ✅ Complete |
| 100-109 | Goal Type Sorting | █████ 100% | ✅ | ✅ Complete |
| 110-115 | Money Formatting | █████ 100% | ✅ | ✅ Complete |
| 117-131 | Percent Display | █████ 100% | ✅ | ✅ Complete |
| 132-144 | Growth % Calculation | █████ 100% | ✅ | ✅ Complete |
| 146-152 | Return Class | █████ 100% | ✅ | ✅ Complete |
| 154-161 | Percent of Type | █████ 100% | ✅ | ✅ Complete |
| 163-185 | Goal Diff Calculation | █████ 100% | ✅ | ✅ Complete |
| 187-201 | Dashboard Route Check | █████ 100% | ✅ | ✅ Complete |
| 203-210 | Fixed Target % | █████ 100% | ✅ | ✅ Complete |
| 212-225 | Remaining Target % | █████ 100% | ✅ | ✅ Complete |
| 227-234 | Threshold Check | █████ 100% | ✅ | ✅ Complete |
| 236-249 | Goal Sorting | █████ 100% | ✅ | ✅ Complete |
| 251-293 | Goal Type Allocation | ████░ 80% | ✅ | ✅ Good |
| 295-320 | Goal Type View State | ░░░░░ 0% | P1 | 🟡 Needs tests |
| 322-329 | Projected Investment Get | █████ 100% | ✅ | ✅ Complete |
| 331-338 | Diff Cell Data | █████ 100% | ✅ | ✅ Complete |
| 340-353 | Action Target Resolution | █████ 100% | ✅ | ✅ Complete |
| 355-410 | Summary View Model | ████░ 80% | ✅ | ✅ Good |
| 412-496 | Bucket Detail View Model | ████░ 80% | ✅ | ✅ Good |
| 498-512 | Collect Goal IDs | █████ 100% | ✅ | ✅ Complete |
| 514-525 | Build Goal Target Map | █████ 100% | ✅ | ✅ Complete |
| 527-545 | Build Goal Fixed Map | █████ 100% | ✅ | ✅ Complete |
| 548-633 | **Merged Investment Data** | ██░░░ 30% | P0 | 🔴 Critical gap |
| 635-637 | Performance Cache Key | █████ 100% | ✅ | ✅ Complete |
| 639-646 | Cache Fresh Check | █████ 100% | ✅ | ✅ Complete |
| 648-656 | Cache Refresh Allowed | █████ 100% | ✅ | ✅ Complete |
| 658-668 | Percentage Formatting | █████ 100% | ✅ | ✅ Complete |
| 670-695 | Time Series Normalize | █████ 100% | ✅ | ✅ Complete |
| 697-702 | Latest TS Point | █████ 100% | ✅ | ✅ Complete |
| 704-721 | Nearest Point Lookup | █████ 100% | ✅ | ✅ Complete |
| 723-736 | Performance Date | █████ 100% | ✅ | ✅ Complete |
| 738-772 | Window Start Date | █████ 100% | ✅ | ✅ Complete |
| 774-797 | Return from Time Series | █████ 100% | ✅ | ✅ Complete |
| 799-813 | Extract Return % | ░░░░░ 0% | P2 | 🟢 Low priority |
| 815-832 | Map Returns Table | █████ 100% | ✅ | ✅ Complete |
| 834-848 | Derive Perf Windows | ████░ 80% | ✅ | ✅ Good |
| 850-875 | Merge Time Series | █████ 100% | ✅ | ✅ Complete |
| 877-894 | Time Series Window | █████ 100% | ✅ | ✅ Complete |
| 896-911 | Extract Amount | █████ 100% | ✅ | ✅ Complete |
| 913-931 | Weighted Average | █████ 100% | ✅ | ✅ Complete |
| 933-973 | Weighted Window Returns | ████░ 80% | ✅ | ✅ Good |
| 975-1063 | Summarize Perf Metrics | ████░ 80% | ✅ | ✅ Good |
| 1065-1088 | Sequential Request Queue | ░░░░░ 0% | P1 | 🟡 Needs tests |
| 1094-1105 | **Browser Check** | ░░░░░ 0% | - | ⚪ Skipped in tests |
| 1107-1115 | Auth Debug Logging | ░░░░░ 0% | P3 | 🔵 Low priority |
| 1117-1133 | API Constants | ░░░░░ 0% | - | ⚪ Config only |
| 1146-1276 | **API Interception** | ░░░░░ 0% | P0 | 🔴 CRITICAL GAP |
| 1278-1345 | XHR Request Tracking | ░░░░░ 0% | P0 | 🔴 CRITICAL GAP |
| 1347-1408 | Goal Storage Adapters | ░░░░░ 0% | P0 | 🔴 CRITICAL GAP |
| 1410-1442 | Projected Inv Storage | ░░░░░ 0% | P0 | 🔴 CRITICAL GAP |
| 1448-1506 | **Cookie & Header Utils** | ░░░░░ 0% | P0 | 🔴 CRITICAL GAP |
| 1508-1567 | **GM_cookie Auth** | ░░░░░ 0% | P0 | 🔴 CRITICAL GAP |
| 1570-1673 | **Auth Header Extraction** | ░░░░░ 0% | P0 | 🔴 CRITICAL GAP |
| 1674-1900 | **Performance Fetching** | ░░░░░ 0% | P1 | 🟡 High priority |
| 1902-2638 | **UI Rendering Functions** | ░░░░░ 0% | P1 | 🟡 High priority |
| 2640-2730 | **Event Handlers** | ░░░░░ 0% | P1 | 🟡 High priority |
| 2732-2787 | Projected Inv Handler | ░░░░░ 0% | P1 | 🟡 High priority |
| 2793-3600 | **CSS Injection** | ░░░░░ 0% | P2 | 🟢 Medium priority |
| 3607-3900 | **Modal & Init** | ░░░░░ 0% | P2 | 🟢 Medium priority |

---

## Coverage by Functional Area

### ✅ Excellent Coverage (90-100%)

```
██████████████████████████████████████████████████ 100%
```

**Areas:**
- ✅ Data formatting (formatMoney, formatPercentage)
- ✅ Financial calculations (growth %, diffs, weighted avg)
- ✅ Bucket name extraction
- ✅ Goal type transformations
- ✅ Time series operations (normalize, merge, window)
- ✅ Return calculations with flow adjustments
- ✅ Storage key generation
- ✅ View model helpers (summary, bucket detail)

**Test Count:** 160+ tests  
**Confidence:** 🟢 High - Safe to refactor

---

### ⚠️ Partial Coverage (30-80%)

```
████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 30-80%
```

**Areas:**
- ⚠️ Merged investment data (30%)
- ⚠️ Goal type view state (0%)
- ⚠️ Weighted window returns (80%)
- ⚠️ Performance window derivation (80%)

**Test Count:** 17 tests  
**Confidence:** 🟡 Medium - Exercise caution when changing

---

### 🔴 No Coverage (0%)

```
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%
```

**Critical (P0) - Security & Data Integrity:**
- 🔴 API interception (fetch/XHR monkey patching) - 130 lines
- 🔴 Authentication (cookies, tokens, headers) - 225 lines
- 🔴 Data persistence (GM_setValue/getValue) - 100 lines
- 🔴 XHR request tracking - 70 lines

**High Priority (P1) - User Facing:**
- 🟡 Performance data fetching - 226 lines
- 🟡 UI rendering (summary, bucket, detail views) - 736 lines
- 🟡 Event handlers (input, toggle, change) - 90 lines
- 🟡 Sequential request queue - 24 lines

**Medium Priority (P2) - UX:**
- 🟢 Modal management - 300 lines
- 🟢 CSS injection - 800 lines
- 🟢 Initialization - 100 lines

**Low Priority (P3) - Debug:**
- 🔵 Debug logging - 20 lines
- 🔵 Auth debug logging - 10 lines

**Test Count:** 0 tests  
**Confidence:** 🔴 None - Changes are risky

---

## Coverage by Risk Level

### 🔴 Critical Risk (0% coverage, high impact)

| Area | Lines | Impact | Likelihood | Risk Score |
|------|-------|--------|------------|------------|
| API Interception | 130 | Critical | Medium | 🔴 **HIGH** |
| Authentication | 225 | Critical | Low | 🔴 **HIGH** |
| Data Persistence | 100 | High | Medium | 🔴 **HIGH** |
| Data Merging | 85 | High | Medium | 🟡 **MEDIUM** |

**Total Critical Untested Lines:** 540  
**% of Codebase:** 13.6%

### 🟡 High Risk (0% coverage, medium impact)

| Area | Lines | Impact | Likelihood | Risk Score |
|------|-------|--------|------------|------------|
| Performance Fetching | 226 | Medium | Medium | 🟡 **MEDIUM** |
| UI Rendering | 736 | Medium | Low | 🟡 **MEDIUM** |
| Event Handling | 90 | Medium | Medium | 🟡 **MEDIUM** |

**Total High Risk Untested Lines:** 1,052  
**% of Codebase:** 26.5%

### 🟢 Medium/Low Risk (0% coverage, low impact)

| Area | Lines | Impact | Likelihood | Risk Score |
|------|-------|--------|------------|------------|
| Modal Management | 300 | Low | Low | 🟢 **LOW** |
| CSS Injection | 800 | Low | Very Low | 🟢 **LOW** |
| Debug Logging | 30 | Very Low | Low | 🟢 **LOW** |

**Total Medium/Low Risk Untested Lines:** 1,130  
**% of Codebase:** 28.5%

---

## Test Distribution

### Current Test Distribution (177 tests)

```
Data Processing     ████████████████████████████████████ 120 tests (68%)
Time Series        ████████████████████░░░░░░░░░░░░░░░░  40 tests (23%)
View Models        ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  17 tests (9%)
Other              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0 tests (0%)
```

### Recommended Test Distribution (437 tests)

```
Data Processing     ████████████████████████████  120 tests (27%)
Time Series        ██████████░░░░░░░░░░░░░░░░░░   40 tests (9%)
View Models        ████░░░░░░░░░░░░░░░░░░░░░░░░   17 tests (4%)
API/Auth           ████████████████░░░░░░░░░░░░   70 tests (16%)
Storage            ███████░░░░░░░░░░░░░░░░░░░░░   30 tests (7%)
UI Rendering       ████████████████████░░░░░░░░   80 tests (18%)
Events             ████████░░░░░░░░░░░░░░░░░░░░   30 tests (7%)
Integration        ███████████░░░░░░░░░░░░░░░░░   40 tests (9%)
E2E                ███░░░░░░░░░░░░░░░░░░░░░░░░░   10 tests (2%)
```

---

## Code Complexity vs Coverage

**High Complexity + No Coverage = Highest Risk**

| Function | Complexity | Coverage | Lines | Risk |
|----------|------------|----------|-------|------|
| `window.fetch` (monkey patch) | Very High | 0% | 50 | 🔴 CRITICAL |
| `extractAuthHeaders()` | Very High | 0% | 80 | 🔴 CRITICAL |
| `getAuthTokenFromGMCookie()` | High | 0% | 65 | 🔴 CRITICAL |
| `buildMergedInvestmentData()` | High | 30% | 85 | 🔴 HIGH |
| `fetchAllGoalPerformance()` | High | 0% | 100 | 🟡 HIGH |
| `renderBucketView()` | Medium | 0% | 200 | 🟡 MEDIUM |
| `handleTargetPercentChange()` | Medium | 0% | 50 | 🟡 MEDIUM |
| `injectStyles()` | Low | 0% | 800 | 🟢 LOW |

---

## Test Execution Performance

### Current Performance ✅

```
Total Tests:        177
Execution Time:     0.731s
Avg per Test:       4.1ms
Slowest Test:       14ms (buildDiffCellData)
Parallelization:    Single thread
Flakiness:          0%
```

### Projected Performance (Phase 3)

```
Total Tests:        437 (+260)
Execution Time:     <10s (target)
Avg per Test:       ~23ms
Slowest Test:       ~2s (E2E tests)
Parallelization:    Multi-thread
Flakiness:          <1% (target)
```

---

## Coverage Growth Roadmap

### Visual Timeline

```
Current State (30%)
████████░░░░░░░░░░░░░░░░░░░░

After Phase 1 (50%) - 2 weeks
████████████████░░░░░░░░░░░░

After Phase 2 (70%) - 6 weeks
█████████████████████████░░░

After Phase 3 (85%) - 12 weeks
██████████████████████████████
```

### Coverage Growth by Area

| Area | Current | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|---------|
| **Data Processing** | 95% | 95% | 95% | 95% |
| **Time Series** | 95% | 95% | 95% | 95% |
| **View Models** | 80% | 85% | 85% | 85% |
| **API/Auth** | 0% | 80% | 85% | 85% |
| **Storage** | 0% | 75% | 80% | 80% |
| **UI Rendering** | 0% | 10% | 70% | 75% |
| **Events** | 0% | 10% | 70% | 75% |
| **Integration** | 0% | 0% | 60% | 70% |
| **E2E** | 0% | 0% | 0% | 50% |

---

## Summary Statistics

### Overall Coverage

| Metric | Current | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| **Statements** | 30.29% | 50% | 70% | 85% |
| **Branches** | 45.85% | 60% | 75% | 87% |
| **Functions** | 36.95% | 55% | 72% | 86% |
| **Lines** | 30.1% | 50% | 70% | 85% |

### Confidence Levels

| Area | Current | After Fixes |
|------|---------|-------------|
| **Safe to Refactor** | 35% of code | 85% of code |
| **High Confidence** | 40% of code | 90% of code |
| **Medium Confidence** | 10% of code | 8% of code |
| **Low Confidence** | 50% of code | 2% of code |

---

## Quick Reference

### Legend

- 🔴 **Critical (P0):** Must fix immediately, blocks release
- 🟡 **High (P1):** Fix in next sprint, impacts users
- 🟢 **Medium (P2):** Fix in upcoming releases, improves quality
- 🔵 **Low (P3):** Fix when convenient, minor improvements
- ⚪ **Skipped:** Intentionally not tested (config, debug, browser check)

### Status Icons

- ✅ **Complete:** Coverage >80%, comprehensive tests
- ⚠️ **Partial:** Coverage 30-80%, needs more tests
- 🔴 **Critical Gap:** Coverage 0%, high risk, must fix
- 🟡 **High Priority:** Coverage 0%, medium risk, fix soon
- 🟢 **Medium Priority:** Coverage 0%, low risk, fix eventually
- 🔵 **Low Priority:** Coverage 0%, very low risk, optional

---

**Last Updated:** 2026-01-14  
**Next Update:** After Phase 1 completion (2 weeks)
