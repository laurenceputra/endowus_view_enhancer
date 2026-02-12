# Test Plan: Upcoming Refactors

**Version**: 1.0  
**Date**: February 2025  
**Status**: Proposed  
**Owner**: QA Engineer

---

## Executive Summary

This document proposes comprehensive test plans for four major refactoring areas:
1. **UI Overlay Improvements** - Modal/overlay rendering and interaction enhancements
2. **Sync Error Handling** - Robust error recovery and user feedback
3. **Workers Util Extraction** - Shared utility consolidation and testing
4. **Performance Tweaks** - Cache optimization and rendering performance

Each section includes:
- **Scope**: What's being refactored
- **Test Strategy**: How to verify correctness
- **Test Cases**: Specific scenarios to validate
- **Acceptance Criteria**: Definition of done
- **Missing Tests**: Gaps to fill before/during refactor

---

## 1. UI Overlay Improvements

### Refactor Scope

**Current State** (~8,400 LOC userscript):
- Modal/overlay created with `document.createElement`
- Direct DOM manipulation for all UI updates
- Button injection and positioning logic scattered
- Mix of inline styles and CSS classes
- Limited keyboard navigation and accessibility

**Proposed Changes**:
- Extract modal rendering to dedicated UI module
- Consolidate overlay state management
- Improve focus management (modal open/close)
- Enhance responsive design and animations
- Better separation of concerns (rendering vs business logic)

### Test Strategy

#### Unit Tests (New)
**File**: `tampermonkey/__tests__/uiOverlay.test.js`

Test rendering functions in isolation with jsdom:
- Modal creation and structure
- Overlay positioning and z-index handling
- Button injection and removal
- CSS class application
- Focus trap behavior

#### Integration Tests (Enhanced)
**File**: `tampermonkey/__tests__/init.test.js` (expand)

Test full UI lifecycle:
- Overlay appears on correct page/route
- Modal opens/closes correctly
- View switching (Summary ↔ Detail)
- Data updates reflect in UI
- Cleanup on navigation

#### Manual Testing Checklist

```
Browser: Chrome/Firefox/Edge (latest 2 versions each)

[ ] Button Injection
    [ ] Button appears in correct location
    [ ] Button has proper styling and hover state
    [ ] Button doesn't overlap existing UI
    [ ] Button respects viewport size

[ ] Modal Behavior
    [ ] Opens smoothly with animation
    [ ] Centers correctly on all screen sizes
    [ ] Closes on backdrop click
    [ ] Closes on ESC key
    [ ] Closes on X button click
    [ ] Focus trapped within modal when open
    [ ] Focus returns to button on close

[ ] Responsive Design
    [ ] Mobile viewport (320px - 767px)
    [ ] Tablet viewport (768px - 1023px)
    [ ] Desktop viewport (1024px+)
    [ ] Landscape and portrait orientations

[ ] Performance
    [ ] Modal opens in < 300ms
    [ ] No layout shift when injecting button
    [ ] No memory leaks after 10 open/close cycles

[ ] Accessibility
    [ ] Screen reader announces modal open/close
    [ ] All interactive elements keyboard accessible
    [ ] Tab order logical
    [ ] ARIA labels present and correct
    [ ] Color contrast meets WCAG AA
```

### Test Cases

#### TC-UI-001: Modal Creation and Structure
```javascript
test('creates modal with correct structure', () => {
    const modal = createOverlay();
    
    expect(modal.id).toBe('gpv-overlay');
    expect(modal.className).toContain('gpv-overlay');
    
    const container = modal.querySelector('.gpv-container');
    expect(container).toBeTruthy();
    
    const closeButton = modal.querySelector('.gpv-close-button');
    expect(closeButton).toBeTruthy();
});
```

#### TC-UI-002: Focus Management on Open
```javascript
test('traps focus when modal opens', () => {
    setupDom();
    const modal = createOverlay();
    document.body.appendChild(modal);
    
    openModal();
    
    // First focusable element should receive focus
    const firstInput = modal.querySelector('input, button, [tabindex]');
    expect(document.activeElement).toBe(firstInput);
});
```

#### TC-UI-003: Focus Restoration on Close
```javascript
test('restores focus to trigger element on close', () => {
    setupDom();
    const button = document.createElement('button');
    button.id = 'gpv-button';
    document.body.appendChild(button);
    button.focus();
    
    openModal();
    closeModal();
    
    expect(document.activeElement).toBe(button);
});
```

#### TC-UI-004: Keyboard Navigation
```javascript
test('closes modal on ESC key', () => {
    setupDom();
    openModal();
    
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escEvent);
    
    expect(document.getElementById('gpv-overlay')).toBeNull();
});
```

#### TC-UI-005: Backdrop Click Closes Modal
```javascript
test('closes modal on backdrop click, not container click', () => {
    setupDom();
    const modal = openModal();
    
    const backdrop = modal;
    const container = modal.querySelector('.gpv-container');
    
    // Click container - should NOT close
    container.click();
    expect(document.getElementById('gpv-overlay')).toBeTruthy();
    
    // Click backdrop - should close
    backdrop.click();
    expect(document.getElementById('gpv-overlay')).toBeNull();
});
```

#### TC-UI-006: Multiple Open/Close Cycles (Memory Leak Check)
```javascript
test('cleans up properly after multiple cycles', () => {
    setupDom();
    
    // Simulate 20 open/close cycles
    for (let i = 0; i < 20; i++) {
        openModal();
        closeModal();
    }
    
    // Check no duplicate elements
    const overlays = document.querySelectorAll('#gpv-overlay');
    expect(overlays.length).toBe(0);
    
    // Check event listeners cleaned up (no memory leaks)
    // This is harder to test directly, but we can check side effects
    openModal();
    const modal = document.getElementById('gpv-overlay');
    expect(modal).toBeTruthy();
    expect(modal.parentElement).toBe(document.body);
});
```

#### TC-UI-007: Z-Index Layering
```javascript
test('modal has correct z-index to overlay page content', () => {
    setupDom();
    const modal = openModal();
    
    const computedStyle = window.getComputedStyle(modal);
    const zIndex = parseInt(computedStyle.zIndex);
    
    expect(zIndex).toBeGreaterThan(1000); // High enough to overlay
});
```

#### TC-UI-008: Button Injection Idempotency
```javascript
test('does not create duplicate buttons', () => {
    setupDom();
    
    injectButton();
    injectButton();
    injectButton();
    
    const buttons = document.querySelectorAll('#gpv-button');
    expect(buttons.length).toBe(1);
});
```

### Acceptance Criteria

- [ ] All unit tests pass with > 90% coverage on new UI module
- [ ] Integration tests validate full open/close lifecycle
- [ ] Manual testing checklist completed on 3 browsers
- [ ] No console errors during normal usage
- [ ] Performance metrics meet targets (< 300ms modal open)
- [ ] Accessibility review passes (keyboard nav, screen reader)
- [ ] No memory leaks after 20 open/close cycles

### Missing Tests to Add

1. **UI Component Isolation Tests** (`uiOverlay.test.js` - NEW)
   - Modal structure generation
   - Focus trap implementation
   - Event listener attachment/cleanup
   - CSS class toggling logic

2. **Accessibility Tests** (`uiAccessibility.test.js` - NEW)
   - ARIA attribute presence
   - Keyboard navigation flows
   - Focus order validation
   - Screen reader announcements (with jsdom + aria-live)

3. **Responsive Layout Tests** (Manual + automated)
   - Viewport size scenarios
   - Layout shift detection
   - Overflow handling

4. **Animation/Transition Tests** (Manual)
   - Smooth open/close
   - No jank during transitions
   - Hardware acceleration enabled

---

## 2. Sync Error Handling

### Refactor Scope

**Current State**:
- Basic error categorization (`categorizeSyncError`)
- Generic error messages
- Limited retry logic
- Sync failures can leave UI in inconsistent state
- Network errors not distinguished from auth errors

**Proposed Changes**:
- Enhanced error classification system
- Specific error messages with actionable guidance
- Exponential backoff retry logic
- Better UI feedback during errors
- Graceful degradation when sync unavailable
- Error telemetry (local logging, no external tracking)

### Test Strategy

#### Unit Tests (Enhanced)
**Files**: 
- `tampermonkey/__tests__/syncManager.test.js` (expand)
- `tampermonkey/__tests__/syncErrorHandling.test.js` (NEW)

Test error handling paths:
- Network failure scenarios
- Auth token expiration
- Rate limiting (429 responses)
- Server errors (500, 503)
- Conflict resolution errors
- Invalid encrypted data
- Timeout scenarios

#### Integration Tests (New)
**File**: `tampermonkey/__tests__/syncIntegration.test.js`

Test end-to-end error recovery:
- Sync → Error → Retry → Success
- Sync → Auth Expired → Re-auth → Retry → Success
- Sync → Network Down → Queue → Network Up → Flush Queue

#### Worker Tests (Enhanced)
**Files**:
- `workers/test/handlers.test.js` (expand)
- `workers/test/errorResponses.test.js` (NEW)

Test API error responses:
- Consistent error format
- Appropriate HTTP status codes
- Error details in response body

### Test Cases

#### TC-SYNC-001: Network Timeout Handling
```javascript
test('retries sync after network timeout with exponential backoff', async () => {
    const syncManager = createSyncManager();
    
    let attempts = 0;
    global.fetch = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
            return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({ ok: true, json: () => ({}) });
    });
    
    await syncManager.performSync();
    
    expect(attempts).toBe(3);
    expect(syncManager.getState().lastSyncStatus).toBe('success');
});
```

#### TC-SYNC-002: Auth Token Expiration Recovery
```javascript
test('refreshes token and retries sync on 401', async () => {
    const syncManager = createSyncManager();
    
    let callCount = 0;
    global.fetch = jest.fn((url) => {
        callCount++;
        
        if (url.includes('/sync') && callCount === 1) {
            return Promise.resolve({
                ok: false,
                status: 401,
                json: () => ({ error: 'INVALID_TOKEN' })
            });
        }
        
        if (url.includes('/refresh')) {
            return Promise.resolve({
                ok: true,
                json: () => ({ accessToken: 'new-token' })
            });
        }
        
        return Promise.resolve({ ok: true, json: () => ({}) });
    });
    
    await syncManager.performSync();
    
    expect(callCount).toBeGreaterThan(2); // Initial sync, refresh, retry
    expect(syncManager.getState().lastSyncStatus).toBe('success');
});
```

#### TC-SYNC-003: Rate Limit Backoff
```javascript
test('respects 429 rate limit and waits before retry', async () => {
    const syncManager = createSyncManager();
    const startTime = Date.now();
    
    let attempts = 0;
    global.fetch = jest.fn(() => {
        attempts++;
        if (attempts === 1) {
            return Promise.resolve({
                ok: false,
                status: 429,
                headers: new Map([['Retry-After', '2']]),
                json: () => ({ error: 'RATE_LIMITED' })
            });
        }
        return Promise.resolve({ ok: true, json: () => ({}) });
    });
    
    await syncManager.performSync();
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(2000); // Waited at least 2 seconds
    expect(attempts).toBe(2);
});
```

#### TC-SYNC-004: Conflict Resolution Error
```javascript
test('presents conflict UI when server has newer data', async () => {
    const syncManager = createSyncManager();
    
    global.fetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 409,
        json: () => ({
            error: 'CONFLICT',
            serverData: { timestamp: 200, encryptedData: 'newer' }
        })
    }));
    
    await syncManager.performSync();
    
    expect(syncManager.getState().lastSyncStatus).toBe('conflict');
    expect(syncManager.getState().conflictData).toBeTruthy();
    
    // Verify conflict UI shown
    const conflictUI = document.querySelector('.gpv-sync-conflict');
    expect(conflictUI).toBeTruthy();
});
```

#### TC-SYNC-005: Invalid Encrypted Data Handling
```javascript
test('handles decryption failure gracefully', async () => {
    const syncManager = createSyncManager();
    
    global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => ({
            encryptedData: 'corrupted-data-that-cannot-be-decrypted',
            timestamp: Date.now()
        })
    }));
    
    await syncManager.performSync();
    
    expect(syncManager.getState().lastSyncStatus).toBe('error');
    expect(syncManager.getState().lastError).toContain('decrypt');
    
    // Verify user-friendly error message shown
    const errorMsg = document.querySelector('.gpv-sync-error');
    expect(errorMsg.textContent).toContain('decryption failed');
});
```

#### TC-SYNC-006: Server Error (500) Handling
```javascript
test('categorizes server errors and shows appropriate message', async () => {
    const syncManager = createSyncManager();
    
    global.fetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => ({ error: 'INTERNAL_ERROR', message: 'Database unavailable' })
    }));
    
    await syncManager.performSync();
    
    expect(syncManager.getState().lastSyncStatus).toBe('error');
    expect(syncManager.getState().errorCategory).toBe('server');
    
    const errorUI = document.querySelector('.gpv-sync-error');
    expect(errorUI.textContent).toContain('Try again later');
});
```

#### TC-SYNC-007: Offline Detection and Queue
```javascript
test('queues sync when offline and flushes when online', async () => {
    const syncManager = createSyncManager();
    
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    
    await syncManager.performSync();
    
    expect(syncManager.getState().queuedSync).toBe(true);
    expect(syncManager.getState().lastSyncStatus).toBe('queued');
    
    // Simulate going online
    Object.defineProperty(navigator, 'onLine', { value: true });
    
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => ({}) }));
    
    window.dispatchEvent(new Event('online'));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(syncManager.getState().queuedSync).toBe(false);
    expect(syncManager.getState().lastSyncStatus).toBe('success');
});
```

#### TC-SYNC-008: User-Friendly Error Messages
```javascript
describe('error message generation', () => {
    test('network error shows retry guidance', () => {
        const error = new Error('Network timeout');
        const message = getSyncErrorGuidance(error);
        
        expect(message).toContain('connection');
        expect(message).toContain('retry');
    });
    
    test('auth error shows re-login guidance', () => {
        const error = { status: 401, error: 'INVALID_TOKEN' };
        const message = getSyncErrorGuidance(error);
        
        expect(message).toContain('log in again');
    });
    
    test('rate limit error shows wait time', () => {
        const error = { status: 429, retryAfter: 60 };
        const message = getSyncErrorGuidance(error);
        
        expect(message).toContain('60');
        expect(message).toContain('minute');
    });
});
```

#### TC-SYNC-009: Exponential Backoff Logic
```javascript
test('uses exponential backoff for transient errors', async () => {
    const syncManager = createSyncManager();
    const attemptTimes = [];
    
    global.fetch = jest.fn(() => {
        attemptTimes.push(Date.now());
        if (attemptTimes.length < 4) {
            return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve({ ok: true, json: () => ({}) });
    });
    
    await syncManager.performSync();
    
    // Verify exponential backoff: 1s, 2s, 4s
    expect(attemptTimes.length).toBe(4);
    expect(attemptTimes[1] - attemptTimes[0]).toBeGreaterThanOrEqual(1000);
    expect(attemptTimes[2] - attemptTimes[1]).toBeGreaterThanOrEqual(2000);
    expect(attemptTimes[3] - attemptTimes[2]).toBeGreaterThanOrEqual(4000);
});
```

#### TC-SYNC-010: Max Retry Limit
```javascript
test('stops retrying after max attempts and shows error', async () => {
    const syncManager = createSyncManager();
    
    let attempts = 0;
    global.fetch = jest.fn(() => {
        attempts++;
        return Promise.reject(new Error('Persistent error'));
    });
    
    await syncManager.performSync();
    
    expect(attempts).toBe(5); // Max retries = 5
    expect(syncManager.getState().lastSyncStatus).toBe('failed');
    
    const errorUI = document.querySelector('.gpv-sync-error');
    expect(errorUI.textContent).toContain('multiple attempts');
});
```

### Acceptance Criteria

- [ ] All error types have specific handling and messaging
- [ ] Retry logic uses exponential backoff (1s, 2s, 4s, 8s, 16s max)
- [ ] Max retry limit enforced (5 attempts)
- [ ] Offline detection works correctly
- [ ] Auth token refresh automatic and transparent
- [ ] Conflict resolution UI functional
- [ ] Error messages user-friendly and actionable
- [ ] No sync failures crash the userscript
- [ ] Graceful degradation when sync unavailable

### Missing Tests to Add

1. **Error Categorization Tests** (`syncErrorHandling.test.js` - NEW)
   - Network errors (timeout, DNS, connection refused)
   - HTTP errors (4xx, 5xx by specific code)
   - Application errors (conflict, invalid data, encryption failure)
   - Classification logic accuracy

2. **Retry Logic Tests** (add to `syncManager.test.js`)
   - Exponential backoff timing
   - Max retry enforcement
   - Retry skip for non-retryable errors (e.g., 400, 403)
   - Circuit breaker pattern (optional)

3. **Error Message Tests** (add to `syncUi.test.js`)
   - Message generation for each error type
   - Localization readiness (if applicable)
   - Action button presence (retry, re-auth, dismiss)

4. **Worker Error Response Tests** (`workers/test/errorResponses.test.js` - NEW)
   - Consistent error format
   - Appropriate status codes
   - Error detail inclusion/exclusion (no sensitive data)

---

## 3. Workers Util Extraction

### Refactor Scope

**Current State** (Workers ~1,099 LOC across 6 files):
- `src/auth.js` (344 LOC) - Auth logic mixed with crypto utilities
- `src/storage.js` (119 LOC) - KV operations
- `src/handlers.js` (136 LOC) - Request handlers with embedded validation
- `src/cors.js` (23 LOC) - CORS header building
- `src/ratelimit.js` (157 LOC) - Rate limiting logic
- `src/index.js` (320 LOC) - Routing and orchestration

**Proposed Extraction**:
- Create `src/utils/` directory with:
  - `crypto.js` - Hash functions, JWT signing/verification
  - `validation.js` - Request body validation, schema checks
  - `response.js` - Consistent response builders (error/success)
  - `time.js` - Timestamp helpers, TTL calculations
  - `config.js` - Environment config normalization

**Benefits**:
- Easier unit testing (pure functions)
- Reduced duplication
- Better separation of concerns
- Clearer module responsibilities

### Test Strategy

#### Unit Tests (New)
**Files**:
- `workers/test/utils/crypto.test.js` (NEW)
- `workers/test/utils/validation.test.js` (NEW)
- `workers/test/utils/response.test.js` (NEW)
- `workers/test/utils/time.test.js` (NEW)
- `workers/test/utils/config.test.js` (NEW)

Test extracted utilities in isolation:
- Pure function behavior
- Edge cases and error handling
- No dependencies on env or KV

#### Integration Tests (Update)
**Files**:
- `workers/test/handlers.test.js` (update to use extracted utils)
- `workers/test/auth.test.js` (update to use extracted utils)
- `workers/test/index.test.js` (update to use extracted utils)

Test that handlers still work correctly with extracted utilities.

### Test Cases

#### TC-UTIL-001: Crypto Hash Function Extraction
```javascript
// File: workers/test/utils/crypto.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, signJWT, verifyJWT } from '../../src/utils/crypto.js';

test('hashPassword produces consistent SHA-256 hashes', async () => {
    const hash1 = await hashPassword('password123');
    const hash2 = await hashPassword('password123');
    
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64); // SHA-256 hex string
});

test('hashPassword produces different hashes for different inputs', async () => {
    const hash1 = await hashPassword('password123');
    const hash2 = await hashPassword('password456');
    
    assert.notEqual(hash1, hash2);
});

test('signJWT and verifyJWT round-trip correctly', async () => {
    const payload = { userId: 'test-user', type: 'access' };
    const secret = 'test-secret-key';
    
    const token = await signJWT(payload, secret, '1h');
    const verified = await verifyJWT(token, secret);
    
    assert.equal(verified.userId, 'test-user');
    assert.equal(verified.type, 'access');
});

test('verifyJWT rejects expired tokens', async () => {
    const payload = { userId: 'test-user' };
    const secret = 'test-secret-key';
    
    // Sign with 0 second expiry (immediately expired)
    const token = await signJWT(payload, secret, '0s');
    
    await assert.rejects(
        async () => verifyJWT(token, secret),
        { message: /expired/ }
    );
});
```

#### TC-UTIL-002: Validation Utility Extraction
```javascript
// File: workers/test/utils/validation.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSyncPayload, validateUserId } from '../../src/utils/validation.js';

test('validateSyncPayload accepts valid payload', () => {
    const payload = {
        userId: 'user-123',
        deviceId: 'device-456',
        encryptedData: 'ciphertext',
        timestamp: Date.now(),
        version: 1
    };
    
    const result = validateSyncPayload(payload);
    assert.equal(result.valid, true);
    assert.equal(result.error, null);
});

test('validateSyncPayload rejects missing fields', () => {
    const payload = {
        userId: 'user-123',
        // Missing deviceId
        encryptedData: 'ciphertext',
        timestamp: Date.now()
    };
    
    const result = validateSyncPayload(payload);
    assert.equal(result.valid, false);
    assert.match(result.error, /deviceId/);
});

test('validateUserId rejects invalid formats', () => {
    assert.equal(validateUserId(''), false);
    assert.equal(validateUserId(null), false);
    assert.equal(validateUserId(123), false);
    assert.equal(validateUserId('a'.repeat(300)), false); // Too long
});

test('validateUserId accepts valid user IDs', () => {
    assert.equal(validateUserId('user-123'), true);
    assert.equal(validateUserId('email@example.com'), true);
    assert.equal(validateUserId('uuid-format-id'), true);
});
```

#### TC-UTIL-003: Response Builder Extraction
```javascript
// File: workers/test/utils/response.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { 
    successResponse, 
    errorResponse, 
    conflictResponse 
} from '../../src/utils/response.js';

test('successResponse builds correct structure', () => {
    const data = { message: 'Sync successful' };
    const response = successResponse(data);
    
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, ...data });
});

test('errorResponse includes error details', () => {
    const response = errorResponse(400, 'BAD_REQUEST', 'Invalid payload');
    
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'BAD_REQUEST');
    assert.equal(response.body.message, 'Invalid payload');
    assert.equal(response.body.success, false);
});

test('conflictResponse includes server data', () => {
    const serverData = { timestamp: 200, encryptedData: 'newer' };
    const response = conflictResponse(serverData);
    
    assert.equal(response.status, 409);
    assert.equal(response.body.error, 'CONFLICT');
    assert.deepEqual(response.body.serverData, serverData);
});
```

#### TC-UTIL-004: Time Utility Extraction
```javascript
// File: workers/test/utils/time.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { 
    parseExpiry, 
    isExpired, 
    getExpiryTimestamp 
} from '../../src/utils/time.js';

test('parseExpiry converts duration strings to milliseconds', () => {
    assert.equal(parseExpiry('1h'), 3600000);
    assert.equal(parseExpiry('30m'), 1800000);
    assert.equal(parseExpiry('7d'), 604800000);
    assert.equal(parseExpiry('60s'), 60000);
});

test('isExpired detects expired timestamps', () => {
    const now = Date.now();
    const past = now - 10000; // 10 seconds ago
    const future = now + 10000; // 10 seconds from now
    
    assert.equal(isExpired(past), true);
    assert.equal(isExpired(future), false);
});

test('getExpiryTimestamp calculates correct future time', () => {
    const now = Date.now();
    const expiry = getExpiryTimestamp('1h', now);
    
    assert.equal(expiry, now + 3600000);
});
```

#### TC-UTIL-005: Config Normalization Extraction
```javascript
// File: workers/test/utils/config.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEnv, getRequiredEnv } from '../../src/utils/config.js';

test('normalizeEnv provides defaults for missing values', () => {
    const env = { SYNC_KV: 'test-kv' };
    const normalized = normalizeEnv(env);
    
    assert.equal(normalized.SYNC_KV, 'test-kv');
    assert.equal(normalized.ACCESS_TOKEN_EXPIRY, '1h'); // Default
    assert.equal(normalized.REFRESH_TOKEN_EXPIRY, '7d'); // Default
});

test('getRequiredEnv throws on missing required variable', () => {
    const env = {};
    
    assert.throws(
        () => getRequiredEnv(env, 'JWT_SECRET'),
        { message: /JWT_SECRET/ }
    );
});

test('getRequiredEnv returns value when present', () => {
    const env = { JWT_SECRET: 'my-secret' };
    const value = getRequiredEnv(env, 'JWT_SECRET');
    
    assert.equal(value, 'my-secret');
});
```

### Acceptance Criteria

- [ ] All utility functions extracted to `src/utils/` modules
- [ ] Each utility module has dedicated test file with > 90% coverage
- [ ] Existing handler tests updated to use extracted utilities
- [ ] No duplicated code between modules
- [ ] All tests pass after refactor
- [ ] Performance unchanged (no regression)
- [ ] Worker bundle size not significantly increased

### Missing Tests to Add

1. **Utility Module Tests** (NEW - 5 files)
   - `workers/test/utils/crypto.test.js`
   - `workers/test/utils/validation.test.js`
   - `workers/test/utils/response.test.js`
   - `workers/test/utils/time.test.js`
   - `workers/test/utils/config.test.js`

2. **Refactored Handler Tests** (UPDATE existing)
   - Ensure handlers work correctly with extracted utils
   - Mock utility functions for isolated handler testing
   - Test error propagation from utils to handlers

3. **Import/Export Tests** (NEW - `workers/test/modules.test.js`)
   - Verify all exports from utility modules
   - Check for circular dependencies
   - Validate module structure

---

## 4. Performance Tweaks

### Refactor Scope

**Current State** (Userscript ~8,400 LOC):
- Performance data cached per goal with expiry
- Sorted goals cached with simple key-based invalidation
- No batching of API responses
- Modal rendering recreates DOM on every open
- No lazy loading for large datasets (50+ goals)

**Proposed Optimizations**:
1. **Enhanced Caching**
   - LRU cache for performance data (limit 100 entries)
   - Preload/prefetch optimization
   - Better cache invalidation strategy

2. **DOM Rendering**
   - Virtual DOM or incremental rendering for goal lists
   - Reuse DOM nodes instead of recreating
   - Lazy render goals outside viewport (virtual scrolling)

3. **Data Processing**
   - Memoization for expensive calculations
   - Worker threads for heavy computation (if applicable)
   - Debounce/throttle API calls

4. **Bundle Size**
   - Remove unused code
   - Minify/compress (while keeping readable metadata)

### Test Strategy

#### Performance Benchmarks (New)
**File**: `tampermonkey/__tests__/performance.test.js`

Test performance characteristics:
- Cache hit/miss ratio
- Rendering time for large datasets
- Memory usage over time
- API call frequency reduction

#### Unit Tests (Enhanced)
**Files**:
- `tampermonkey/__tests__/utils.test.js` (add cache tests)
- `tampermonkey/__tests__/uiRenderers.test.js` (add perf tests)

#### Manual Performance Testing

```
Tools:
- Chrome DevTools Performance tab
- Memory profiler
- Network throttling
- Large dataset simulation (50+ goals)
```

### Test Cases

#### TC-PERF-001: Cache Hit Rate
```javascript
test('cache improves performance on repeated access', () => {
    const cache = createPerformanceCache();
    
    const goal1 = { goalId: 'goal-1', data: 'data-1' };
    const goal2 = { goalId: 'goal-2', data: 'data-2' };
    
    // First access - cache miss
    let start = performance.now();
    cache.get('goal-1', () => goal1);
    let miss = performance.now() - start;
    
    // Second access - cache hit
    start = performance.now();
    cache.get('goal-1', () => goal1);
    let hit = performance.now() - start;
    
    expect(hit).toBeLessThan(miss * 0.1); // Cache should be 10x faster
});
```

#### TC-PERF-002: LRU Cache Eviction
```javascript
test('LRU cache evicts oldest entries when full', () => {
    const cache = createLRUCache(3); // Max 3 entries
    
    cache.set('goal-1', 'data-1');
    cache.set('goal-2', 'data-2');
    cache.set('goal-3', 'data-3');
    
    expect(cache.size()).toBe(3);
    
    // Access goal-1 to make it recently used
    cache.get('goal-1');
    
    // Add goal-4, should evict goal-2 (oldest)
    cache.set('goal-4', 'data-4');
    
    expect(cache.has('goal-1')).toBe(true);
    expect(cache.has('goal-2')).toBe(false); // Evicted
    expect(cache.has('goal-3')).toBe(true);
    expect(cache.has('goal-4')).toBe(true);
});
```

#### TC-PERF-003: Memoization Effectiveness
```javascript
test('memoization prevents redundant calculations', () => {
    let calculationCount = 0;
    
    const expensiveFunction = memoize((a, b) => {
        calculationCount++;
        return a + b;
    });
    
    const result1 = expensiveFunction(5, 3);
    const result2 = expensiveFunction(5, 3);
    const result3 = expensiveFunction(7, 2);
    
    expect(result1).toBe(8);
    expect(result2).toBe(8);
    expect(result3).toBe(9);
    expect(calculationCount).toBe(2); // Only 2 unique calculations
});
```

#### TC-PERF-004: DOM Reuse vs Recreation
```javascript
test('reusing DOM nodes is faster than recreating', () => {
    const container = document.createElement('div');
    const goals = Array(50).fill(null).map((_, i) => ({
        goalId: `goal-${i}`,
        name: `Goal ${i}`,
        investment: 10000 + i * 1000
    }));
    
    // Method 1: Recreate DOM every time
    const start1 = performance.now();
    renderGoalsRecreate(container, goals);
    const time1 = performance.now() - start1;
    
    // Method 2: Reuse existing DOM nodes
    const start2 = performance.now();
    renderGoalsReuse(container, goals);
    const time2 = performance.now() - start2;
    
    expect(time2).toBeLessThan(time1 * 0.5); // Reuse should be 2x faster
});
```

#### TC-PERF-005: Virtual Scrolling for Large Lists
```javascript
test('virtual scrolling renders only visible items', () => {
    const goals = Array(200).fill(null).map((_, i) => ({
        goalId: `goal-${i}`,
        name: `Goal ${i}`
    }));
    
    const container = document.createElement('div');
    container.style.height = '400px'; // Viewport
    
    const virtualList = createVirtualList(container, goals, {
        itemHeight: 50,
        buffer: 5
    });
    
    // Only ~13 items should be rendered (400px / 50px + buffer)
    const renderedItems = container.querySelectorAll('.goal-item');
    expect(renderedItems.length).toBeLessThan(20);
    expect(renderedItems.length).toBeGreaterThan(8);
});
```

#### TC-PERF-006: Debounced API Calls
```javascript
test('debounce reduces API call frequency', async () => {
    let callCount = 0;
    const apiCall = jest.fn(() => {
        callCount++;
        return Promise.resolve({ data: 'response' });
    });
    
    const debouncedCall = debounce(apiCall, 100);
    
    // Trigger 10 times rapidly
    for (let i = 0; i < 10; i++) {
        debouncedCall();
    }
    
    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(callCount).toBe(1); // Only 1 actual call
});
```

#### TC-PERF-007: Memory Leak Detection
```javascript
test('no memory leaks after repeated modal open/close', () => {
    setupDom();
    
    // Baseline memory
    if (global.gc) global.gc();
    const baseline = process.memoryUsage().heapUsed;
    
    // Simulate 100 open/close cycles
    for (let i = 0; i < 100; i++) {
        openModal();
        closeModal();
    }
    
    // Force garbage collection and check memory
    if (global.gc) global.gc();
    const after = process.memoryUsage().heapUsed;
    
    const increase = after - baseline;
    const increasePercent = (increase / baseline) * 100;
    
    // Memory should not increase more than 10%
    expect(increasePercent).toBeLessThan(10);
});
```

#### TC-PERF-008: Lazy Loading Goals
```javascript
test('lazy loads goals as user scrolls', async () => {
    const goals = Array(100).fill(null).map((_, i) => ({
        goalId: `goal-${i}`,
        name: `Goal ${i}`
    }));
    
    const container = document.createElement('div');
    const lazyList = createLazyList(container, goals, {
        initialLoad: 20,
        loadMore: 10
    });
    
    // Initially only 20 rendered
    expect(container.children.length).toBe(20);
    
    // Simulate scroll to bottom
    container.scrollTop = container.scrollHeight;
    container.dispatchEvent(new Event('scroll'));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should load 10 more
    expect(container.children.length).toBe(30);
});
```

#### TC-PERF-009: Cache Invalidation Strategy
```javascript
test('cache invalidates correctly on data change', () => {
    const cache = createPerformanceCache();
    
    cache.set('goal-1', { timestamp: 100, data: 'old' });
    
    expect(cache.get('goal-1')).toEqual({ timestamp: 100, data: 'old' });
    
    // Simulate data update
    cache.invalidate('goal-1');
    
    expect(cache.has('goal-1')).toBe(false);
    
    // New data can be cached
    cache.set('goal-1', { timestamp: 200, data: 'new' });
    
    expect(cache.get('goal-1')).toEqual({ timestamp: 200, data: 'new' });
});
```

#### TC-PERF-010: Bundle Size Monitoring
```javascript
// This is more of a CI check than a unit test
test('bundle size remains under threshold', () => {
    const fs = require('fs');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, '../goal_portfolio_viewer.user.js');
    const stats = fs.statSync(scriptPath);
    const sizeKB = stats.size / 1024;
    
    // Should not exceed 300KB (currently ~250KB)
    expect(sizeKB).toBeLessThan(300);
});
```

### Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Modal open time | < 300ms | ~400ms | With 20 goals |
| Cache hit rate | > 80% | ~60% | For performance data |
| Memory usage | < 50MB | ~65MB | After 10min usage |
| API calls (5min) | < 10 | ~20 | With active usage |
| Bundle size | < 300KB | 250KB | Minified |
| Rendering (50 goals) | < 200ms | ~350ms | Initial render |

### Acceptance Criteria

- [ ] All performance targets met or improved
- [ ] Cache hit rate > 80%
- [ ] Modal opens in < 300ms (50 goals)
- [ ] No memory leaks detected
- [ ] API calls reduced by > 50%
- [ ] Bundle size unchanged or reduced
- [ ] Performance tests added and passing

### Missing Tests to Add

1. **Performance Benchmark Suite** (`tampermonkey/__tests__/performance.test.js` - NEW)
   - Cache effectiveness
   - Rendering speed
   - Memory usage patterns
   - API call frequency

2. **Caching Logic Tests** (add to `utils.test.js`)
   - LRU eviction
   - Cache invalidation
   - Cache expiry
   - Preload/prefetch logic

3. **Rendering Performance Tests** (add to `uiRenderers.test.js`)
   - Large dataset rendering
   - DOM reuse vs recreation
   - Virtual scrolling
   - Lazy loading

4. **Memory Leak Tests** (NEW - `memory.test.js`)
   - Modal cycles
   - Cache growth
   - Event listener cleanup
   - DOM node cleanup

---

## Overall Test Gap Analysis

### Critical Gaps (Must Add Before Refactors)

1. **UI Component Unit Tests**
   - Current: Only integration tests in `init.test.js`
   - Need: Dedicated tests for each UI component
   - Priority: HIGH (blocks UI refactor)

2. **Error Handling Coverage**
   - Current: Basic error scenarios only
   - Need: Comprehensive error type coverage
   - Priority: HIGH (blocks sync error refactor)

3. **Worker Utility Tests**
   - Current: Utils tested inline with handlers
   - Need: Isolated utility function tests
   - Priority: MEDIUM (needed for extraction)

4. **Performance Benchmarks**
   - Current: None (manual testing only)
   - Need: Automated performance regression tests
   - Priority: MEDIUM (blocks perf refactor)

### Important Gaps (Add During Refactors)

1. **Accessibility Tests**
   - Current: Manual testing only
   - Need: Automated ARIA and keyboard nav tests
   - Priority: MEDIUM

2. **Integration Tests**
   - Current: Limited end-to-end scenarios
   - Need: Full sync flow, conflict resolution flows
   - Priority: MEDIUM

3. **Cross-Browser Tests**
   - Current: Manual testing only
   - Need: Automated browser matrix tests (CI)
   - Priority: LOW (expensive, manual OK for now)

### Nice-to-Have Gaps

1. **Visual Regression Tests**
   - Current: None
   - Need: Screenshot comparison for UI changes
   - Priority: LOW

2. **Fuzz Testing**
   - Current: None
   - Need: Random input testing for robustness
   - Priority: LOW

3. **Load Testing**
   - Current: None
   - Need: 100+ goal performance testing
   - Priority: LOW

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- Add missing UI component unit tests
- Add error handling test coverage
- Set up performance benchmarking framework

### Phase 2: UI Refactor (Week 3-4)
- Implement UI overlay improvements
- Run UI test suite continuously
- Manual testing on 3 browsers

### Phase 3: Sync Refactor (Week 5-6)
- Implement enhanced error handling
- Run sync test suite continuously
- Test retry logic and offline scenarios

### Phase 4: Worker Refactor (Week 7-8)
- Extract worker utilities
- Add utility test coverage
- Update integration tests

### Phase 5: Performance (Week 9-10)
- Implement performance optimizations
- Run benchmark suite
- Verify targets met

### Phase 6: Validation (Week 11-12)
- Full regression testing
- Cross-browser validation
- Performance profiling
- Documentation updates

---

## Test Execution Schedule

### Pre-Refactor (Before Each Phase)
- [ ] Run full test suite (all tests pass)
- [ ] Check test coverage (> 85% overall)
- [ ] Review test gaps for specific refactor
- [ ] Add missing tests before starting

### During Refactor
- [ ] Run related tests continuously (watch mode)
- [ ] Add new tests for new functionality
- [ ] Update tests for changed behavior
- [ ] Keep all tests passing (no broken tests)

### Post-Refactor (After Each Phase)
- [ ] Run full test suite (all tests pass)
- [ ] Check coverage increased or maintained
- [ ] Manual testing checklist completed
- [ ] Performance benchmarks met
- [ ] Code review with test focus

### Pre-Release
- [ ] All test suites pass
- [ ] Coverage > 85% overall
- [ ] Manual testing completed (3 browsers)
- [ ] Performance targets met
- [ ] Accessibility review passed
- [ ] Security review passed
- [ ] Documentation updated

---

## Success Metrics

### Test Coverage
- **Current**: ~85% (userscript utils), ~70% (workers)
- **Target**: > 90% (pure functions), > 80% (overall)

### Test Count
- **Current**: ~150 tests across all files
- **Target**: ~300 tests after refactors

### Bug Detection
- **Goal**: Catch 90%+ of bugs in testing (not production)
- **Measure**: Bugs found in dev vs. reported by users

### Test Execution Time
- **Current**: ~5 seconds (userscript), ~2 seconds (workers)
- **Target**: < 10 seconds total (even with 2x tests)

### Confidence Score
- **Question**: How confident are we that refactors won't break production?
- **Goal**: 9/10 confidence level
- **Enablers**: Comprehensive tests, high coverage, manual validation

---

## Conclusion

This test plan provides a comprehensive roadmap for validating four major refactoring areas. Key takeaways:

1. **Test First**: Add missing tests BEFORE refactoring
2. **Test Continuously**: Run tests during refactoring (watch mode)
3. **Test Thoroughly**: Don't skip manual testing and accessibility
4. **Test Metrics**: Track coverage, performance, and confidence

By following this plan, we can refactor with confidence, knowing that:
- Existing functionality is preserved (regression tests)
- New functionality works correctly (feature tests)
- Performance is improved (benchmark tests)
- User experience is enhanced (manual tests)

**Estimated Effort**:
- Test planning: 1 week (DONE with this document)
- Test implementation: 4-6 weeks (parallel with refactors)
- Test execution: Continuous + 2 weeks validation
- **Total**: 3-4 months for full refactor + test cycle

**Next Steps**:
1. Review and approve this test plan
2. Create test implementation tickets
3. Start Phase 1: Foundation tests
4. Begin first refactor with test coverage in place
