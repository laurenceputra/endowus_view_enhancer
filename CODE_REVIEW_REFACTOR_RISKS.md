# Code Review Risks: Refactors in Userscript UI & Workers Backend

**Version**: 1.0  
**Last Updated**: December 2024  
**Purpose**: Identify critical review areas and common pitfalls when refactoring the Goal Portfolio Viewer

---

## Table of Contents

1. [Userscript UI Refactor Risks](#userscript-ui-refactor-risks)
2. [Workers Backend Refactor Risks](#workers-backend-refactor-risks)
3. [Cross-Cutting Concerns](#cross-cutting-concerns)
4. [Pre-Refactor Checklist](#pre-refactor-checklist)
5. [Code Review Checklist](#code-review-checklist)
6. [Common Pitfalls by Category](#common-pitfalls-by-category)

---

## Userscript UI Refactor Risks

### 1. Single-File Architecture Constraints

**Risk Level**: 🔴 **CRITICAL**

The userscript is a **single 8400+ line file** that must remain self-contained for Tampermonkey.

#### Pitfalls:
- ✗ **Splitting into multiple files** - Breaks Tampermonkey loading
- ✗ **Adding build steps** - Violates zero-build constraint
- ✗ **Using ES6 modules** - Not supported in userscript context
- ✗ **External dependencies** - Must use `@require` in metadata or inline code

#### Review Checklist:
- [ ] Refactor maintains single-file structure
- [ ] No new external dependencies added (unless via `@require`)
- [ ] No module imports (`import`/`export` inside IIFE)
- [ ] Code remains compatible with Tampermonkey environment
- [ ] If extracting functions, ensure they stay within the IIFE closure

#### Safe Refactoring Patterns:
```javascript
// ✅ Safe: Extract to local function
(function() {
    'use strict';
    
    // Extract helper functions at top of IIFE
    function newHelperFunction() { /* ... */ }
    
    // Use throughout the file
    const result = newHelperFunction();
})();

// ❌ Unsafe: Try to split into modules
// import { helper } from './utils.js';  // BREAKS!
```

---

### 2. Financial Calculation Precision

**Risk Level**: 🔴 **CRITICAL**

Any refactor touching financial calculations can introduce rounding errors, precision loss, or incorrect formulas.

#### High-Risk Functions:
```javascript
// Critical calculation functions (lines vary):
- buildMergedInvestmentData()
- calculateWeightedWindowReturns()
- calculateRemainingTargetPercent()
- formatMoney()
- formatPercent()
```

#### Pitfalls:
- ✗ **Changing calculation order** - Can affect floating-point precision
- ✗ **Division without zero checks** - `investment === 0 ? 0 : return / investment`
- ✗ **Incorrect percentage conversions** - Mixing ratios (0.10) with percents (10)
- ✗ **Rounding at wrong time** - Round at display, not in calculations
- ✗ **Missing `Number.isFinite()` checks** - Can propagate `NaN` or `Infinity`

#### Review Checklist:
- [ ] Zero-division checks present for all divisions
- [ ] `Number.isFinite()` used instead of `isFinite()` (avoids coercion)
- [ ] Percentage calculations use correct multiplier (100 vs 1)
- [ ] Rounding occurs only at display layer, not in data layer
- [ ] Negative values handled correctly (returns can be negative)
- [ ] `null` vs `0` distinction preserved (missing data vs zero value)
- [ ] Weighted calculations use correct denominator (net investment amounts)

#### Examples:
```javascript
// ❌ Problematic
const percent = (return / investment) * 100;  // No zero check!

// ✅ Correct
const percent = investment === 0 ? 0 : (return / investment) * 100;

// ❌ Problematic - coerces non-numbers
if (isFinite(amount)) { /* ... */ }

// ✅ Correct - strict check
if (Number.isFinite(amount)) { /* ... */ }

// ❌ Problematic - treats missing as zero
const returns = data.returns || 0;

// ✅ Correct - preserves null for missing data
const returns = Number.isFinite(data.returns) ? data.returns : null;
```

---

### 3. API Interception & Data Flow

**Risk Level**: 🔴 **CRITICAL**

The userscript relies on monkey-patching `fetch` and `XMLHttpRequest`. Breaking this flow breaks everything.

#### High-Risk Code Sections:
```javascript
// Lines ~200-600 (varies):
- window.fetch wrapper
- XMLHttpRequest.prototype.open/send patches
- Response cloning logic
- API endpoint detection (regex matching)
- Data storage in global state object
```

#### Pitfalls:
- ✗ **Not cloning responses** - Consumes response body, breaks native app
  ```javascript
  // ❌ BREAKS APP
  const data = await response.json();
  return response;  // Body already consumed!
  
  // ✅ CORRECT
  const data = await response.clone().json();
  return response;  // Original still usable
  ```

- ✗ **Overly broad URL matching** - Intercepts unrelated requests
  ```javascript
  // ❌ Too broad
  if (url.includes('/v1/')) { /* ... */ }
  
  // ✅ Specific
  if (url.includes('/v1/goals/performance')) { /* ... */ }
  ```

- ✗ **Infinite fetch loops** - Patch calls itself
  ```javascript
  // ❌ INFINITE LOOP
  window.fetch = function(...args) {
      const response = await fetch(...args);  // Calls itself!
  };
  
  // ✅ CORRECT
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
      const response = await originalFetch.apply(this, args);
  };
  ```

- ✗ **Blocking the response** - Waiting for processing
  ```javascript
  // ❌ Delays response to app
  const data = await response.clone().json();
  processData(data);  // Slow operation
  return response;
  
  // ✅ Process asynchronously
  response.clone().json().then(processData);
  return response;  // Return immediately
  ```

#### Review Checklist:
- [ ] Response cloning used before reading body
- [ ] Original `fetch`/XHR preserved before patching
- [ ] URL matching is specific (full path, not partial)
- [ ] Processing happens asynchronously (non-blocking)
- [ ] Error handling doesn't break native app flow
- [ ] Auth header extraction doesn't mutate requests
- [ ] No infinite loops (patch doesn't call patched function)

---

### 4. DOM Manipulation & XSS Prevention

**Risk Level**: 🟠 **HIGH**

User data (goal names, bucket names) is rendered in the UI. Improper sanitization = XSS vulnerability.

#### High-Risk Functions:
```javascript
// Rendering functions:
- renderSummaryView()
- renderBucketView()
- renderGoalRow()
- renderPerformanceChart()
- createSyncSettingsUI()
```

#### Pitfalls:
- ✗ **Using `innerHTML` with user data** - XSS vector
  ```javascript
  // ❌ VULNERABLE
  element.innerHTML = `<div>${goalName}</div>`;
  
  // ✅ SAFE
  const div = document.createElement('div');
  div.textContent = goalName;
  element.appendChild(div);
  ```

- ✗ **Inline event handlers** - CSP violations, hard to audit
  ```javascript
  // ❌ Unsafe
  element.innerHTML = '<button onclick="handleClick()">Click</button>';
  
  // ✅ Safe
  const button = document.createElement('button');
  button.textContent = 'Click';
  button.addEventListener('click', handleClick);
  ```

- ✗ **Mixing static HTML with dynamic content**
  ```javascript
  // ❌ Risky
  element.innerHTML = '<div class="header">' + userName + '</div>';
  
  // ✅ Better - separate structure and content
  element.innerHTML = '<div class="header"></div>';
  element.querySelector('.header').textContent = userName;
  ```

#### Review Checklist:
- [ ] All user-visible content uses `textContent` or `createTextNode()`
- [ ] `innerHTML` only used for static skeletons or clearing containers
- [ ] No inline event handlers (`onclick`, `oninput`, etc.)
- [ ] All event listeners added via `addEventListener()`
- [ ] URL values validated before use (e.g., in `<a href>`)
- [ ] No `eval()`, `Function()`, or similar constructs
- [ ] No dynamic script tag injection

---

### 5. State Management & Race Conditions

**Risk Level**: 🟠 **HIGH**

The userscript uses a global `state` object. Refactoring state logic can introduce race conditions.

#### High-Risk Areas:
```javascript
// Global state object (lines ~100-150):
const state = {
    apiData: {
        performance: null,
        investible: null,
        summary: null
    },
    auth: {
        requestHeaders: null,
        gmCookieAuthToken: null
    },
    performance: {
        fetchQueue: [],
        isQueueRunning: false,
        cacheLastFetchedAt: null
    }
};
```

#### Pitfalls:
- ✗ **Concurrent modifications** - Multiple async operations updating state
- ✗ **Stale closures** - Functions capturing old state values
- ✗ **Missing null checks** - Assuming state is initialized
- ✗ **Race between API calls** - Depending on call order

#### Review Checklist:
- [ ] State updates are atomic (no partial updates)
- [ ] Async operations check state is still valid before updating
- [ ] No assumptions about API call order
- [ ] Null/undefined checks before reading state
- [ ] Queue mechanisms prevent concurrent operations (e.g., `isQueueRunning` flag)
- [ ] Timers/intervals are cleared properly (no memory leaks)

#### Safe Patterns:
```javascript
// ✅ Check before update
async function updateData() {
    const snapshot = state.currentVersion;
    const newData = await fetchData();
    
    // Verify state hasn't changed
    if (state.currentVersion === snapshot) {
        state.data = newData;
    }
}

// ✅ Queue mechanism for sequential operations
async function runQueue() {
    if (state.performance.isQueueRunning) {
        return;  // Already running
    }
    state.performance.isQueueRunning = true;
    
    try {
        while (state.performance.fetchQueue.length > 0) {
            const task = state.performance.fetchQueue.shift();
            await processTask(task);
        }
    } finally {
        state.performance.isQueueRunning = false;
    }
}
```

---

### 6. Performance: Sequential Fetch Queue

**Risk Level**: 🟠 **HIGH**

The enhanced performance view fetches time-series data per goal with a **sequential queue + delay** to avoid rate limiting.

#### Critical Code:
```javascript
// Performance fetch queue (lines ~3600-3800):
- runPerformanceFetchQueue()
- fetchGoalPerformance()
- Performance cache read/write logic
- PERFORMANCE_FETCH_DELAY_MS (configurable delay)
```

#### Pitfalls:
- ✗ **Removing delays** - Triggers rate limiting from BFF endpoint
- ✗ **Parallel requests** - Defeats sequential queue design
- ✗ **Cache invalidation bugs** - Serving stale financial data
- ✗ **Not respecting `isQueueRunning` flag** - Concurrent queue execution

#### Review Checklist:
- [ ] Delay between requests preserved (default: 1000ms)
- [ ] Queue executes sequentially (one at a time)
- [ ] `isQueueRunning` flag prevents concurrent queue runs
- [ ] Cache freshness checked (7-day TTL enforced)
- [ ] Stale cache entries purged (not returned)
- [ ] Fetch failures return `null` (don't serve stale data)
- [ ] Auth headers captured before queue starts
- [ ] Fallback to cookies if headers missing

#### Rate Limiting Context:
```javascript
// Why sequential + delay?
// - BFF endpoint (bff.prod.silver.endowus.com) has rate limits
// - Fetching 10+ goals in parallel triggers 429 responses
// - Sequential queue + 1s delay avoids rate limiting
// - User waits longer, but gets reliable data

// ✅ CORRECT PATTERN
const DELAY_MS = 1000;
for (const goalId of goalIds) {
    await fetchGoalPerformance(goalId);
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
}

// ❌ BREAKS RATE LIMITING
await Promise.all(goalIds.map(fetchGoalPerformance));  // Too fast!
```

---

### 7. Encryption & Sync (Optional Feature)

**Risk Level**: 🟠 **HIGH** (if touching sync code)

The optional cross-device sync feature uses **client-side AES-GCM encryption** with PBKDF2 key derivation.

#### High-Risk Functions:
```javascript
// Crypto module (lines ~1700-2000):
- Crypto.deriveMasterKey()
- Crypto.encryptWithMasterKey()
- Crypto.decryptWithMasterKey()
- Crypto.hashPasswordForAuth()

// Sync manager (lines ~2000-2400):
- SyncManager.uploadConfig()
- SyncManager.downloadConfig()
- SyncManager.resolveConflict()
```

#### Pitfalls:
- ✗ **Weakening encryption** - Changing from AES-GCM-256 to weaker cipher
- ✗ **Incorrect key derivation** - PBKDF2 iterations reduced
- ✗ **Reusing IVs** - Breaking AES-GCM security model
- ✗ **Storing keys in localStorage** - Remember-key is opt-in for UX only
- ✗ **Not validating decryption** - Accepting corrupted/tampered data

#### Review Checklist:
- [ ] AES-GCM 256-bit encryption maintained
- [ ] PBKDF2 iterations >= 100,000 for key derivation
- [ ] IV (nonce) is randomly generated per encryption
- [ ] Master key stored in memory only (session-scoped)
- [ ] Remembered key is the derived key, not password
- [ ] Decryption failures handled gracefully (don't crash)
- [ ] No plaintext data sent to server (only encrypted blobs)
- [ ] JWT tokens validated before use (expiry checked)
- [ ] Refresh token flow implemented correctly

#### Encryption Flow (Do Not Break):
```javascript
// Password -> Master Key -> Encrypted Data
const masterKey = await Crypto.deriveMasterKey(password, salt, iterations);
const encrypted = await Crypto.encryptWithMasterKey(plaintext, masterKey);

// Server receives only: { encryptedData, deviceId, timestamp }
// Server NEVER sees: password, masterKey, plaintext
```

---

### 8. Storage Key Collisions

**Risk Level**: 🟡 **MEDIUM**

The userscript stores data in Tampermonkey storage (`GM_setValue`). Refactoring keys can cause data loss or collisions.

#### Current Storage Keys:
```javascript
// Prefix-based keys:
- gpv_performance_<goalId>      // Performance cache
- gpv_collapse_<bucket>|<type>  // Collapse state
- goal_target_pct_<goalId>      // Target allocations
- goal_fixed_<goalId>           // Fixed goal flag
- sync_*                        // Sync config (optional)

// Global keys:
- api_performance / api_investible / api_summary
- gpv_bucket_mode               // View mode preference
```

#### Pitfalls:
- ✗ **Renaming keys** - Orphans old data, users lose settings
- ✗ **Changing key format** - `bucket|type` separator collisions
- ✗ **Not encoding separators** - Bucket name "A|B" breaks key parsing
- ✗ **Missing cleanup** - Old keys accumulate in storage

#### Review Checklist:
- [ ] Storage key format unchanged (or migration provided)
- [ ] Separator characters encoded (`encodeURIComponent`)
- [ ] No collisions between key types
- [ ] Old keys cleaned up if format changes
- [ ] Backward compatibility for existing users
- [ ] Storage quota not exceeded (Tampermonkey has limits)

#### Migration Pattern:
```javascript
// ✅ Safe key migration
function migrateStorageKey(oldKey, newKey) {
    const value = GM_getValue(oldKey);
    if (value !== undefined) {
        GM_setValue(newKey, value);
        GM_deleteValue(oldKey);
    }
}
```

---

### 9. Testing Compatibility

**Risk Level**: 🟡 **MEDIUM**

The userscript exports functions for testing via conditional exports. Breaking this breaks CI.

#### Test Export Pattern:
```javascript
// At end of IIFE (lines ~8300+):
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatMoney,
        formatPercent,
        buildMergedInvestmentData,
        // ... other test exports
    };
}
```

#### Pitfalls:
- ✗ **Removing function from exports** - Breaks existing tests
- ✗ **Renaming exported function** - Update tests simultaneously
- ✗ **Exporting browser-only code** - Fails in Node.js environment
- ✗ **Not testing new functions** - Coverage drops

#### Review Checklist:
- [ ] New pure functions added to exports (if testable)
- [ ] Export list updated when renaming functions
- [ ] Browser-only code not exported (DOM, window, etc.)
- [ ] Tests updated to match function signatures
- [ ] `pnpm test` passes before merge
- [ ] Coverage remains high (>90%)

---

### 10. UI Responsiveness & Modal Size

**Risk Level**: 🟡 **MEDIUM**

The modal overlay uses fixed dimensions and can be expanded. Refactoring CSS can break layout.

#### High-Risk CSS:
```javascript
// Modal overlay styles (injectStyles function):
- .gpv-overlay { ... }
- .gpv-modal { width: 90vw; max-width: 1400px; }
- .gpv-modal--expanded { max-width: 95vw; }
- Media queries for responsive breakpoints
```

#### Pitfalls:
- ✗ **Breaking responsive layout** - Fixed widths on mobile
- ✗ **z-index conflicts** - Modal hidden behind native UI
- ✗ **Scroll issues** - Content overflows, no scrolling
- ✗ **Animation glitches** - CSS transitions conflict

#### Review Checklist:
- [ ] Modal responsive on mobile (320px+)
- [ ] Expand/collapse works without breaking layout
- [ ] Scrolling enabled when content overflows
- [ ] z-index hierarchy preserved (overlay > native app)
- [ ] Animations smooth (no layout thrashing)
- [ ] No position: fixed issues on iOS Safari

---

## Workers Backend Refactor Risks

### 1. Authentication & Token Security

**Risk Level**: 🔴 **CRITICAL**

The Workers backend uses JWT access/refresh tokens. Breaking auth exposes all user data.

#### High-Risk Files:
- `workers/src/auth.js` - Token issuance, verification
- `workers/src/index.js` - Auth middleware, route protection

#### Pitfalls:
- ✗ **Weak token secrets** - Use long random strings (via Cloudflare Secrets)
- ✗ **No expiry validation** - Tokens valid forever
- ✗ **Missing token refresh** - Users logged out after 15 minutes
- ✗ **Timing attacks** - Use constant-time comparison for tokens
- ✗ **JWT algorithm confusion** - Always specify HS256 explicitly

#### Review Checklist:
- [ ] `JWT_SECRET` is strong (256+ bits) and in Cloudflare Secrets
- [ ] Access token TTL = 15 minutes
- [ ] Refresh token TTL = 60 days
- [ ] Token expiry validated (with skew allowance)
- [ ] Refresh endpoint returns new access token
- [ ] Algorithm fixed to HS256 (no `none` or RS256 confusion)
- [ ] Token payload includes `sub` (userId) and `exp` (expiry)

#### Token Flow (Do Not Break):
```javascript
// 1. Login -> issue both tokens
POST /auth/login
Response: { accessToken, refreshToken }

// 2. Protected request -> verify access token
GET /sync/:userId
Header: Authorization: Bearer <accessToken>

// 3. Access expired -> refresh
POST /auth/refresh
Header: Authorization: Bearer <refreshToken>
Response: { accessToken, refreshToken }  // New pair
```

---

### 2. KV Storage Operations

**Risk Level**: 🟠 **HIGH**

The Workers use Cloudflare KV for encrypted config storage. Bugs can cause data loss.

#### High-Risk File:
- `workers/src/storage.js` - KV read/write/delete operations

#### Pitfalls:
- ✗ **Missing error handling** - Silent failures lose data
- ✗ **Key collisions** - Wrong prefix breaks multi-tenancy
- ✗ **Not validating data structure** - Storing invalid JSON
- ✗ **Forgetting metadata** - `serverTimestamp` helps debugging
- ✗ **Synchronous assumptions** - KV operations are async

#### Review Checklist:
- [ ] All KV operations have try-catch
- [ ] Key prefix `sync_user:` preserved
- [ ] JSON serialization errors caught
- [ ] `serverTimestamp` added on write
- [ ] `await` used for all KV calls (they're async)
- [ ] No race conditions (KV is eventually consistent)
- [ ] Stale data cleanup doesn't delete active users

#### KV Consistency Model:
```javascript
// ⚠️ Cloudflare KV is eventually consistent
// - Writes may not be visible immediately (seconds to minutes)
// - Use consistent key naming to avoid collisions
// - Add timestamps for conflict detection

// ✅ CORRECT PATTERN
await kv.put(key, JSON.stringify({
    ...data,
    serverTimestamp: Date.now()  // For debugging/conflict resolution
}));

// ❌ RISKY - No metadata
await kv.put(key, data);  // What if data is not JSON?
```

---

### 3. Password Hashing (PBKDF2)

**Risk Level**: 🟠 **HIGH**

The Workers derive a storage hash from the client's SHA-256 password hash using PBKDF2.

#### Critical Code:
```javascript
// workers/src/auth.js:
async function deriveStorageHash(passwordHash, salt) {
    // PBKDF2 with 100,000 iterations
}
```

#### Pitfalls:
- ✗ **Reducing iterations** - Weakens security (keep >= 100,000)
- ✗ **Reusing salts** - Each user must have unique salt
- ✗ **Timing attacks** - Use constant-time comparison
- ✗ **Weak salt generation** - Use `crypto.getRandomValues()`

#### Review Checklist:
- [ ] PBKDF2 iterations >= 100,000
- [ ] Salt is 128+ bits (16 bytes)
- [ ] Salt is random per user (no hardcoded salts)
- [ ] Hash comparison uses constant-time function
- [ ] Salt stored with hash (in `user:<userId>` key)
- [ ] No plaintext passwords stored anywhere

---

### 4. CORS Configuration

**Risk Level**: 🟠 **HIGH**

The Workers API is called from `app.sg.endowus.com`. Incorrect CORS breaks sync.

#### High-Risk File:
- `workers/src/cors.js` - CORS headers
- `workers/src/index.js` - OPTIONS handler

#### Pitfalls:
- ✗ **Wildcard origin (`*`)** - Allows any site to call API (security risk)
- ✗ **Missing preflight support** - OPTIONS requests fail
- ✗ **Wrong methods** - GET/POST/DELETE must be allowed
- ✗ **Missing credentials header** - Auth headers blocked

#### Review Checklist:
- [ ] `Access-Control-Allow-Origin` = `https://app.sg.endowus.com` (exact match)
- [ ] `Access-Control-Allow-Methods` includes GET, POST, DELETE, OPTIONS
- [ ] `Access-Control-Allow-Headers` includes Authorization, Content-Type
- [ ] `Access-Control-Max-Age` set (reduce preflight requests)
- [ ] OPTIONS returns 204 (no content)
- [ ] CORS headers on all responses (including errors)

---

### 5. Rate Limiting

**Risk Level**: 🟡 **MEDIUM**

The Workers implement rate limiting to prevent abuse. Bugs can lock out users or allow abuse.

#### High-Risk File:
- `workers/src/ratelimit.js` - Rate limit logic

#### Pitfalls:
- ✗ **Too strict limits** - Normal usage blocked
- ✗ **No user-based limits** - Anonymous abuse possible
- ✗ **Shared limit keys** - All users share one limit
- ✗ **No bypass for authenticated requests** - Paying users limited like attackers

#### Review Checklist:
- [ ] Limits are per-user (keyed by `userId` or IP)
- [ ] Authenticated requests have higher limits
- [ ] `Retry-After` header set on 429 responses
- [ ] Limits are reasonable (e.g., 60 req/hour per user)
- [ ] No global counters (scales poorly)
- [ ] Limits stored in KV or Durable Objects (not memory)

---

### 6. Conflict Resolution

**Risk Level**: 🟡 **MEDIUM**

When syncing, the server checks timestamps to detect conflicts.

#### Critical Logic:
```javascript
// workers/src/handlers.js:
if (existing.timestamp > timestamp) {
    return jsonResponse({
        success: false,
        error: 'CONFLICT',
        serverData: existing
    }, 409);
}
```

#### Pitfalls:
- ✗ **Not returning server data** - Client can't resolve conflict
- ✗ **Wrong comparison** - `>=` vs `>` changes behavior
- ✗ **Clock skew issues** - Client/server clocks differ
- ✗ **No conflict UI** - User stuck with conflict

#### Review Checklist:
- [ ] Server data returned on 409 Conflict
- [ ] Timestamp comparison is `>` (newer than)
- [ ] Client has conflict resolution UI
- [ ] Conflict doesn't lose data (both versions preserved)
- [ ] User can choose: keep local, use remote, or merge

---

### 7. Payload Size Limits

**Risk Level**: 🟡 **MEDIUM**

The Workers enforce a 10KB payload limit for sync data.

#### Critical Check:
```javascript
// workers/src/index.js:
const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB

if (contentLength > MAX_PAYLOAD_SIZE) {
    return jsonResponse({
        error: 'PAYLOAD_TOO_LARGE',
        maxSize: MAX_PAYLOAD_SIZE
    }, 413);
}
```

#### Pitfalls:
- ✗ **Checking after parsing** - Wastes CPU on large payloads
- ✗ **No client-side check** - User tries to sync, fails silently
- ✗ **Limit too low** - Normal data exceeds limit
- ✗ **No compression** - Could fit more data with gzip

#### Review Checklist:
- [ ] Payload size checked before parsing JSON
- [ ] Client warns user before exceeding limit
- [ ] Limit is documented in API docs
- [ ] Encrypted data size estimated correctly (base64 overhead)
- [ ] 413 response includes `maxSize` in error

---

### 8. Environment Configuration

**Risk Level**: 🟡 **MEDIUM**

The Workers use `wrangler.toml` for config. Mistakes leak secrets or break deployments.

#### Critical Files:
- `workers/wrangler.toml` (gitignored in production)
- `workers/wrangler.production.toml.template`
- `workers/wrangler.preview.toml.template`

#### Pitfalls:
- ✗ **Secrets in `wrangler.toml`** - Committed to git (LEAK!)
- ✗ **Wrong KV binding name** - Code can't find storage
- ✗ **Missing environment variables** - Runtime errors
- ✗ **Wrong route** - API not accessible

#### Review Checklist:
- [ ] `wrangler.toml` in `.gitignore`
- [ ] Secrets use `wrangler secret put` (not in file)
- [ ] KV binding name matches code (`SYNC_KV` by default)
- [ ] `CORS_ORIGINS` set correctly per environment
- [ ] Routes match expected URLs
- [ ] Environment vars documented

---

## Cross-Cutting Concerns

### 1. Version Synchronization

**Risk Level**: 🟠 **HIGH**

Three version touchpoints must stay in sync:

1. **Userscript metadata**: `// @version X.Y.Z`
2. **Package.json**: `"version": "X.Y.Z"`
3. **Changelog**: New entry added

#### Review Checklist:
- [ ] All three versions match
- [ ] Version follows semver (MAJOR.MINOR.PATCH)
- [ ] Changelog entry describes changes
- [ ] Breaking changes bump MAJOR version

---

### 2. Backward Compatibility

**Risk Level**: 🟠 **HIGH**

Users auto-update the userscript. Breaking changes affect them immediately.

#### Review Checklist:
- [ ] Storage keys remain compatible (or migration provided)
- [ ] API endpoint contracts unchanged (or versioned)
- [ ] Sync protocol backward compatible
- [ ] Old cached data handled gracefully
- [ ] No assumptions about data shape from old versions

---

### 3. Error Handling & Logging

**Risk Level**: 🟡 **MEDIUM**

Silent failures are hard to debug. Excessive logging leaks sensitive data.

#### Review Checklist:
- [ ] All async operations have try-catch
- [ ] Errors logged with context (no PII/financial amounts)
- [ ] User-facing error messages are helpful
- [ ] No `console.log` in production (use `DEBUG` flag)
- [ ] Errors don't break main UI flow
- [ ] Network errors handled gracefully (offline support)

#### Safe Logging Pattern:
```javascript
// ❌ LEAKS SENSITIVE DATA
console.log('Error syncing:', { userId, password, data });

// ✅ SAFE
console.error('[Sync Error]', {
    userId: '<redacted>',
    error: error.message,
    timestamp: Date.now()
});
```

---

## Pre-Refactor Checklist

Before starting a refactor, verify:

- [ ] **Understand the "why"**: What problem does this refactor solve?
- [ ] **Identify blast radius**: What code/files will change?
- [ ] **Check for tests**: Does test coverage exist?
- [ ] **Review constraints**: Single-file? No build? Browser compatibility?
- [ ] **Backup data**: Export settings before testing
- [ ] **Plan rollback**: How to revert if things break?
- [ ] **Test locally**: Full manual test plan before pushing

---

## Code Review Checklist

### For Reviewers:

#### 1. **Correctness** (🔴 Blocking)
- [ ] Logic is correct (no off-by-one, zero-division, etc.)
- [ ] Financial calculations verified (use calculator)
- [ ] Edge cases handled (null, empty, negative values)
- [ ] No infinite loops or recursion without base case

#### 2. **Security** (🔴 Blocking)
- [ ] No XSS vulnerabilities (proper sanitization)
- [ ] No injection attacks (SQL, command, etc.)
- [ ] Encryption not weakened
- [ ] Auth checks present on protected routes
- [ ] No secrets in code (use environment variables)
- [ ] No sensitive data logged

#### 3. **Data Integrity** (🔴 Blocking)
- [ ] No data loss scenarios
- [ ] Migrations handle old data
- [ ] Storage keys don't collide
- [ ] Conflict resolution preserves both versions
- [ ] Backward compatibility maintained

#### 4. **Performance** (🟠 Important)
- [ ] No N+1 queries or loops
- [ ] Sequential fetch queue respected
- [ ] Cache freshness validated
- [ ] DOM updates batched (not per-item)
- [ ] No memory leaks (timers cleared, listeners removed)

#### 5. **Testing** (🟠 Important)
- [ ] Tests pass (`pnpm test`)
- [ ] New code has test coverage
- [ ] Manual test plan documented
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Mobile tested (responsive layout)

#### 6. **Documentation** (🟡 Nice-to-have)
- [ ] Complex logic has comments
- [ ] Breaking changes documented
- [ ] API changes noted
- [ ] README/TECHNICAL_DESIGN updated if needed

#### 7. **Code Quality** (🟡 Nice-to-have)
- [ ] Functions are small (<50 lines)
- [ ] No code duplication
- [ ] Clear variable names
- [ ] Consistent style

---

## Common Pitfalls by Category

### Financial Calculations
1. Division by zero
2. Mixing ratios (0.10) with percentages (10)
3. Floating-point precision errors
4. Rounding too early
5. Not handling negative values
6. Using `null` and `0` interchangeably

### API Interception
1. Not cloning responses
2. Overly broad URL matching
3. Infinite loops (patch calls itself)
4. Blocking response flow
5. Consuming response body twice

### Security
1. XSS via `innerHTML` with user data
2. Weak encryption (not AES-GCM-256)
3. Storing passwords (instead of hashes)
4. JWT secrets in code (not environment)
5. Wildcard CORS (`*`)
6. Logging sensitive data

### State Management
1. Race conditions (concurrent updates)
2. Stale closures (capturing old values)
3. Missing null checks
4. Not respecting queue flags

### Storage
1. Key collisions
2. Missing migrations
3. Exceeding quota
4. Not encoding separators in keys

### Testing
1. Breaking test exports
2. Not updating tests after refactor
3. Assuming browser environment in Node.js
4. Low coverage after changes

### Workers Backend
1. KV eventually consistent (not immediate)
2. Weak rate limits (abuse or over-blocking)
3. Missing CORS headers
4. Token expiry not validated
5. Conflict resolution missing

---

## Quick Reference: Risk Levels

- 🔴 **CRITICAL**: Must be perfect, blocks merge if issues found
  - Financial calculations
  - API interception
  - Authentication/encryption
  - Data loss scenarios

- 🟠 **HIGH**: Important to get right, but can iterate
  - State management
  - Performance optimizations
  - XSS prevention
  - KV operations

- 🟡 **MEDIUM**: Good to check, not blocking
  - Storage keys
  - UI responsiveness
  - Error handling
  - Logging

---

## Getting Help

If unsure during review:

1. **Ask the author**: "Can you explain why this change is needed?"
2. **Test locally**: Clone branch, run in browser, test manually
3. **Consult docs**: TECHNICAL_DESIGN.md, SYNC_ARCHITECTURE.md
4. **Check history**: `git log` to see similar past changes
5. **Use agents**: QA Engineer or Staff Engineer agents can help

---

**Remember**: Your goal as a reviewer is to be a **safety net**, **teacher**, and **collaborator**. Focus on helping ship high-quality, secure, and maintainable code. When in doubt, ask questions and test locally!

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Maintained by: Code Reviewer Agent*
