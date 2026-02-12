# Missing Test Coverage Analysis

**Generated**: February 2025  
**Status**: Proposed  
**Context**: Pre-refactor test gap analysis

---

## Executive Summary

This document identifies critical gaps in test coverage that should be addressed **before** starting major refactors (UI overlay, sync error handling, workers util extraction, performance tweaks).

**Key Findings**:
- ✅ **Strong coverage**: Core utilities, sync encryption, data models
- ⚠️ **Moderate gaps**: UI components, error handling, worker utilities
- ❌ **Critical gaps**: Performance tests, accessibility tests, integration tests

**Recommendation**: Add 15-20 new test files (~100 new test cases) before refactoring begins.

---

## 1. UI Component Tests (CRITICAL GAP)

### Missing Files

#### `tampermonkey/__tests__/uiOverlay.test.js` (NEW - HIGH PRIORITY)
**Why**: UI overlay is being refactored, but has no dedicated unit tests.

**What to test**:
- [ ] Modal structure creation (DOM generation)
- [ ] Overlay positioning and z-index
- [ ] Focus trap implementation
- [ ] Event listener attachment/cleanup
- [ ] Open/close animations
- [ ] Keyboard navigation (ESC, Tab)
- [ ] Backdrop click handling
- [ ] Multiple open/close cycles (memory leaks)

**Estimated size**: 150-200 lines, 15-20 test cases

**Sample test**:
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

---

#### `tampermonkey/__tests__/uiAccessibility.test.js` (NEW - MEDIUM PRIORITY)
**Why**: Accessibility is a quality requirement but not currently tested.

**What to test**:
- [ ] ARIA attributes presence
- [ ] ARIA live regions for dynamic content
- [ ] Keyboard focus order
- [ ] Screen reader announcements
- [ ] Color contrast (automated check)
- [ ] Semantic HTML usage

**Estimated size**: 100-150 lines, 10-15 test cases

**Sample test**:
```javascript
test('modal has correct ARIA attributes', () => {
    const modal = openModal();
    
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.getAttribute('aria-labelledby')).toBeTruthy();
});
```

---

#### `tampermonkey/__tests__/uiLayout.test.js` (NEW - LOW PRIORITY)
**Why**: Responsive design needs validation, but can be manual initially.

**What to test**:
- [ ] Mobile viewport rendering (320px-767px)
- [ ] Tablet viewport rendering (768px-1023px)
- [ ] Desktop viewport rendering (1024px+)
- [ ] Layout doesn't break on window resize
- [ ] Overflow handling for long content

**Estimated size**: 80-120 lines, 8-12 test cases

---

## 2. Error Handling Tests (CRITICAL GAP)

### Missing Files

#### `tampermonkey/__tests__/syncErrorHandling.test.js` (NEW - HIGH PRIORITY)
**Why**: Sync error handling is being enhanced, but lacks dedicated tests.

**What to test**:
- [ ] Error categorization (network, auth, server, client)
- [ ] User-friendly error messages
- [ ] Error recovery strategies
- [ ] Retry logic decision making
- [ ] Offline detection
- [ ] Error persistence for debugging

**Estimated size**: 200-250 lines, 20-25 test cases

**Sample test**:
```javascript
describe('error categorization', () => {
    test('categorizes network timeout as transient', () => {
        const error = new Error('Network timeout');
        const category = categorizeSyncError(error);
        
        expect(category.type).toBe('network');
        expect(category.retryable).toBe(true);
        expect(category.retryDelay).toBeGreaterThan(0);
    });
    
    test('categorizes 401 as auth error', () => {
        const error = { status: 401, error: 'INVALID_TOKEN' };
        const category = categorizeSyncError(error);
        
        expect(category.type).toBe('auth');
        expect(category.retryable).toBe(true);
        expect(category.requiresReauth).toBe(true);
    });
});
```

---

#### `tampermonkey/__tests__/retryLogic.test.js` (NEW - HIGH PRIORITY)
**Why**: Retry logic is complex and critical for sync reliability.

**What to test**:
- [ ] Exponential backoff timing (1s, 2s, 4s, 8s, 16s)
- [ ] Max retry limit enforcement
- [ ] Retry skip for non-retryable errors
- [ ] Jitter addition (randomized delay)
- [ ] Circuit breaker pattern (optional)

**Estimated size**: 150-200 lines, 12-18 test cases

**Sample test**:
```javascript
test('uses exponential backoff for transient errors', async () => {
    const retryManager = createRetryManager();
    const attemptTimes = [];
    
    const operation = jest.fn(() => {
        attemptTimes.push(Date.now());
        if (attemptTimes.length < 4) {
            throw new Error('Transient error');
        }
        return 'success';
    });
    
    await retryManager.execute(operation);
    
    // Verify exponential backoff: 1s, 2s, 4s
    expect(attemptTimes[1] - attemptTimes[0]).toBeGreaterThanOrEqual(1000);
    expect(attemptTimes[2] - attemptTimes[1]).toBeGreaterThanOrEqual(2000);
    expect(attemptTimes[3] - attemptTimes[2]).toBeGreaterThanOrEqual(4000);
});
```

---

#### `workers/test/errorResponses.test.js` (NEW - MEDIUM PRIORITY)
**Why**: Worker API needs consistent error responses.

**What to test**:
- [ ] Error response format consistency
- [ ] Appropriate HTTP status codes
- [ ] Error detail inclusion (no sensitive data)
- [ ] CORS headers on error responses
- [ ] Rate limit error includes Retry-After header

**Estimated size**: 100-150 lines, 10-15 test cases

---

## 3. Worker Utility Tests (MEDIUM GAP)

### Missing Files

#### `workers/test/utils/crypto.test.js` (NEW - HIGH PRIORITY)
**Why**: Crypto functions will be extracted, need isolated tests.

**What to test**:
- [ ] Password hashing (SHA-256)
- [ ] JWT signing (HS256)
- [ ] JWT verification
- [ ] Token expiration handling
- [ ] Key derivation (if applicable)

**Estimated size**: 120-150 lines, 12-15 test cases

---

#### `workers/test/utils/validation.test.js` (NEW - HIGH PRIORITY)
**Why**: Validation logic will be extracted, needs isolated tests.

**What to test**:
- [ ] Sync payload validation
- [ ] User ID format validation
- [ ] Device ID format validation
- [ ] Timestamp range validation
- [ ] Encrypted data format validation

**Estimated size**: 150-180 lines, 15-18 test cases

---

#### `workers/test/utils/response.test.js` (NEW - MEDIUM PRIORITY)
**Why**: Response builders need consistent testing.

**What to test**:
- [ ] Success response format
- [ ] Error response format
- [ ] Conflict response format
- [ ] Rate limit response with headers
- [ ] CORS header application

**Estimated size**: 80-100 lines, 8-10 test cases

---

#### `workers/test/utils/time.test.js` (NEW - LOW PRIORITY)
**Why**: Time utilities are simple but need validation.

**What to test**:
- [ ] Duration parsing (1h, 30m, 7d)
- [ ] Expiry timestamp calculation
- [ ] Expiration detection
- [ ] TTL calculation

**Estimated size**: 60-80 lines, 6-8 test cases

---

#### `workers/test/utils/config.test.js` (NEW - LOW PRIORITY)
**Why**: Config normalization needs testing.

**What to test**:
- [ ] Environment variable normalization
- [ ] Default value provision
- [ ] Required variable validation
- [ ] Type coercion (string to number, etc.)

**Estimated size**: 60-80 lines, 6-8 test cases

---

## 4. Performance Tests (CRITICAL GAP)

### Missing Files

#### `tampermonkey/__tests__/performance.test.js` (NEW - HIGH PRIORITY)
**Why**: Performance optimizations need baseline and regression tests.

**What to test**:
- [ ] Cache hit/miss rate
- [ ] Cache eviction policy (LRU)
- [ ] Memoization effectiveness
- [ ] Rendering time (20, 50, 100 goals)
- [ ] API call frequency
- [ ] Memory usage over time

**Estimated size**: 250-300 lines, 20-25 test cases

**Sample test**:
```javascript
test('cache improves performance on repeated access', () => {
    const cache = createPerformanceCache();
    
    const getData = () => ({ expensive: 'calculation' });
    
    // First access - cache miss
    const start1 = performance.now();
    cache.get('key-1', getData);
    const miss = performance.now() - start1;
    
    // Second access - cache hit
    const start2 = performance.now();
    cache.get('key-1', getData);
    const hit = performance.now() - start2;
    
    expect(hit).toBeLessThan(miss * 0.1); // 10x faster
});
```

---

#### `tampermonkey/__tests__/memory.test.js` (NEW - MEDIUM PRIORITY)
**Why**: Memory leaks are a common issue in long-running userscripts.

**What to test**:
- [ ] Modal open/close cycles (100 iterations)
- [ ] Cache growth limits (LRU enforcement)
- [ ] Event listener cleanup
- [ ] DOM node cleanup
- [ ] Heap growth rate

**Estimated size**: 100-150 lines, 8-12 test cases

---

## 5. Integration Tests (MEDIUM GAP)

### Missing Files

#### `tampermonkey/__tests__/syncIntegration.test.js` (NEW - MEDIUM PRIORITY)
**Why**: End-to-end sync flows need validation.

**What to test**:
- [ ] Full sync flow: encrypt → upload → download → decrypt
- [ ] Conflict resolution flow: conflict → choose → resolve → sync
- [ ] Auth flow: login → get tokens → refresh token → use
- [ ] Offline → Online flow: queue → reconnect → flush queue
- [ ] Error → Retry flow: fail → backoff → retry → succeed

**Estimated size**: 200-250 lines, 15-20 test cases

---

#### `workers/test/integration.test.js` (NEW - LOW PRIORITY)
**Why**: Worker integration tests ensure all components work together.

**What to test**:
- [ ] Full request lifecycle (auth → handler → storage → response)
- [ ] Rate limiting across multiple requests
- [ ] CORS headers on all response types
- [ ] Token refresh during long sessions
- [ ] Cleanup tasks (stale data)

**Estimated size**: 150-200 lines, 12-15 test cases

---

## 6. Edge Case Tests (LOW GAP)

### Tests to Add to Existing Files

#### Add to `tampermonkey/__tests__/handlers.test.js`
- [ ] Very large datasets (1000+ goals)
- [ ] Malformed API responses (missing fields, wrong types)
- [ ] Race conditions (multiple API calls)
- [ ] Stale cache scenarios

**Estimated additions**: 40-60 lines, 4-6 new test cases

---

#### Add to `tampermonkey/__tests__/utils.test.js`
- [ ] Extreme number formatting (> $1B, < $0.01)
- [ ] Unicode handling in goal names
- [ ] HTML injection in goal names (XSS prevention)
- [ ] Very long bucket names (> 100 chars)

**Estimated additions**: 50-80 lines, 5-8 new test cases

---

#### Add to `workers/test/handlers.test.js`
- [ ] Concurrent sync requests from same user
- [ ] Very large encrypted payloads (> 1MB)
- [ ] Malformed JWT tokens
- [ ] Expired tokens with valid refresh tokens

**Estimated additions**: 60-80 lines, 6-8 new test cases

---

## 7. Manual Testing Checklists (DOCUMENTATION GAP)

### Missing Checklists (Add to TEST_PLAN_REFACTORS.md)

#### Cross-Browser Compatibility Checklist
```
[ ] Chrome (latest 2 versions)
[ ] Firefox (latest 2 versions)
[ ] Edge (latest 2 versions)
[ ] Safari (latest 2 versions) - if applicable

For each browser:
[ ] Button injection works
[ ] Modal opens/closes
[ ] Data displays correctly
[ ] Sync functionality works
[ ] No console errors
```

#### Financial Accuracy Checklist
```
For 3+ random goals:
[ ] Investment amount matches platform
[ ] Return amount matches platform
[ ] Growth percentage matches platform

For 2+ buckets:
[ ] Bucket aggregation correct
[ ] Sum of goals = bucket total
[ ] Bucket growth % calculated correctly
```

#### Security & Privacy Checklist
```
[ ] No data sent to external servers (check Network tab)
[ ] Console logs don't expose sensitive data
[ ] Local storage encryption enabled
[ ] XSS prevention working (test with malicious input)
[ ] CSP violations checked
```

---

## Summary: Test Files to Add

### High Priority (Before Refactors Start)
1. ✅ `tampermonkey/__tests__/uiOverlay.test.js` - UI component unit tests
2. ✅ `tampermonkey/__tests__/syncErrorHandling.test.js` - Error categorization
3. ✅ `tampermonkey/__tests__/retryLogic.test.js` - Retry strategies
4. ✅ `tampermonkey/__tests__/performance.test.js` - Performance benchmarks
5. ✅ `workers/test/utils/crypto.test.js` - Crypto utilities
6. ✅ `workers/test/utils/validation.test.js` - Validation utilities

**Total new files**: 6  
**Estimated lines**: ~1,200  
**Estimated test cases**: ~100  
**Estimated effort**: 2-3 weeks

### Medium Priority (During Refactors)
1. `tampermonkey/__tests__/uiAccessibility.test.js` - Accessibility tests
2. `tampermonkey/__tests__/memory.test.js` - Memory leak detection
3. `tampermonkey/__tests__/syncIntegration.test.js` - End-to-end sync
4. `workers/test/utils/response.test.js` - Response builders
5. `workers/test/errorResponses.test.js` - Worker error handling

**Total new files**: 5  
**Estimated lines**: ~700  
**Estimated test cases**: ~55  
**Estimated effort**: 2-3 weeks

### Low Priority (Nice to Have)
1. `tampermonkey/__tests__/uiLayout.test.js` - Responsive design
2. `workers/test/utils/time.test.js` - Time utilities
3. `workers/test/utils/config.test.js` - Config normalization
4. `workers/test/integration.test.js` - Worker integration

**Total new files**: 4  
**Estimated lines**: ~400  
**Estimated test cases**: ~35  
**Estimated effort**: 1-2 weeks

---

## Prioritized Implementation Order

### Week 1-2: Foundation
**Goal**: Add critical missing tests before any refactoring

1. Create `uiOverlay.test.js` - UI component isolation
2. Create `performance.test.js` - Performance baseline
3. Create `syncErrorHandling.test.js` - Error categorization
4. Add edge cases to existing `handlers.test.js`

**Deliverable**: 4 new test files, ~80 new test cases

### Week 3-4: Worker Preparation
**Goal**: Add worker utility tests before extraction refactor

1. Create `workers/test/utils/crypto.test.js`
2. Create `workers/test/utils/validation.test.js`
3. Create `workers/test/utils/response.test.js`
4. Update existing worker tests to use extracted utilities

**Deliverable**: 3 new test files, ~40 new test cases

### Week 5-6: Advanced Testing
**Goal**: Add integration and memory tests during refactors

1. Create `retryLogic.test.js` - Retry strategies
2. Create `memory.test.js` - Memory leak detection
3. Create `syncIntegration.test.js` - End-to-end sync
4. Add accessibility tests

**Deliverable**: 4 new test files, ~50 new test cases

### Week 7-8: Polish
**Goal**: Add remaining tests and documentation

1. Create remaining utility tests (time, config)
2. Add manual testing checklists
3. Document test execution procedures
4. Create test coverage dashboard

**Deliverable**: Complete test coverage documentation

---

## Success Criteria

### Coverage Targets
- **Current**: ~85% (userscript utils), ~70% (workers)
- **After additions**: > 90% (pure functions), > 85% (overall)

### Test Count Targets
- **Current**: ~150 total tests
- **After additions**: ~340 total tests (+190)

### Quality Targets
- All new files have > 90% code coverage
- All new tests follow established patterns
- No skipped/pending tests in production
- Test execution time < 15 seconds total

### Confidence Targets
- 9/10 confidence for UI refactor
- 9/10 confidence for sync error refactor
- 9/10 confidence for worker util extraction
- 8/10 confidence for performance refactor

---

## Risk Assessment

### Risks of NOT Adding Tests

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| UI regression breaks modal | HIGH | MEDIUM | Add UI tests before refactor |
| Sync errors unhandled | HIGH | HIGH | Add error handling tests |
| Performance degradation | MEDIUM | MEDIUM | Add performance benchmarks |
| Memory leaks in production | MEDIUM | LOW | Add memory leak tests |
| Worker util extraction breaks sync | HIGH | MEDIUM | Add worker utility tests |

### Risks of Adding Too Many Tests

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Test maintenance burden | MEDIUM | HIGH | Focus on high-value tests |
| Slow CI execution | LOW | MEDIUM | Parallelize test execution |
| Over-testing trivial code | LOW | MEDIUM | Test coverage guidelines |
| Test fragility (brittle) | MEDIUM | MEDIUM | Use robust selectors, avoid implementation details |

---

## Recommendations

### Immediate Actions (This Week)
1. ✅ **Approve this test gap analysis**
2. 🔄 **Create test implementation tickets** (one per new file)
3. 🔄 **Assign ownership** (QA Engineer + Staff Engineer pair)
4. 🔄 **Set up test coverage tracking** (CI dashboard)

### Short-Term Actions (Next 2 Weeks)
1. 🔄 **Implement high-priority tests** (Week 1-2 plan)
2. 🔄 **Establish test patterns** (templates for new tests)
3. 🔄 **Run baseline coverage report** (before refactors)
4. 🔄 **Document test execution** (README update)

### Medium-Term Actions (Next 4-6 Weeks)
1. 🔄 **Complete all critical tests** (before refactors)
2. 🔄 **Add medium-priority tests** (during refactors)
3. 🔄 **Run continuous coverage tracking** (CI integration)
4. 🔄 **Manual testing validation** (cross-browser, accessibility)

### Long-Term Actions (Next 3 Months)
1. 🔄 **Complete all test additions** (low priority included)
2. 🔄 **Achieve 85%+ overall coverage**
3. 🔄 **Document testing best practices**
4. 🔄 **Establish test quality metrics**

---

## Conclusion

This analysis identifies **15 new test files** and **~190 new test cases** that should be added to improve test coverage before major refactors. The prioritization ensures that:

1. **Critical gaps** are filled before refactoring begins (UI, error handling, performance)
2. **Worker utilities** are tested before extraction refactor
3. **Integration scenarios** are validated during refactors
4. **Quality goals** are achieved (85%+ coverage, 9/10 confidence)

**Estimated Total Effort**: 6-8 weeks (parallel with refactoring work)

**Next Step**: Review and approve, then create implementation tickets for Week 1-2 foundation tests.
