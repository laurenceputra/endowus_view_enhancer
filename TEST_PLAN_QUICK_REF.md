# Test Plan Quick Reference

**Last Updated**: February 2025  
**For**: Refactor Test Planning (UI, Sync, Workers, Performance)

---

## 📋 Document Overview

This repository contains three test planning documents:

1. **TEST_PLAN_REFACTORS.md** - Comprehensive test plans for all refactors (42KB)
2. **MISSING_TESTS.md** - Gap analysis and prioritized test additions (18KB)
3. **This file** - Quick reference and decision guide (3KB)

---

## 🎯 Quick Decision Guide

### "What should I test before refactoring X?"

| Refactor | Must Have Tests | Files to Add | Priority |
|----------|-----------------|--------------|----------|
| **UI Overlay** | Modal structure, focus management, keyboard nav | `uiOverlay.test.js` | 🔴 HIGH |
| **Sync Errors** | Error categorization, retry logic, user messages | `syncErrorHandling.test.js`, `retryLogic.test.js` | 🔴 HIGH |
| **Workers Utils** | Crypto, validation, response builders | `utils/*.test.js` (5 files) | 🟡 MEDIUM |
| **Performance** | Cache effectiveness, rendering speed, memory | `performance.test.js`, `memory.test.js` | 🔴 HIGH |

---

## 📊 Current vs Target Coverage

| Area | Current | Target | Gap | Priority |
|------|---------|--------|-----|----------|
| Userscript Utils | 85% | 90% | 5% | 🟢 Good |
| Workers | 70% | 85% | 15% | 🟡 Moderate |
| UI Components | 40% | 85% | 45% | 🔴 Critical |
| Error Handling | 50% | 90% | 40% | 🔴 Critical |
| Performance | 0% | 80% | 80% | 🔴 Critical |
| Integration | 30% | 75% | 45% | 🟡 Moderate |

---

## 🚀 Implementation Timeline

### Week 1-2: Foundation (HIGH PRIORITY)
**Goal**: Add critical tests before ANY refactoring

```bash
# Create these files:
tampermonkey/__tests__/uiOverlay.test.js          # 150 lines, 15 tests
tampermonkey/__tests__/syncErrorHandling.test.js  # 200 lines, 20 tests
tampermonkey/__tests__/performance.test.js        # 250 lines, 20 tests

# Expected effort: 2-3 weeks
# Blockers removed: UI refactor, performance refactor
```

### Week 3-4: Worker Prep (MEDIUM PRIORITY)
**Goal**: Test worker utilities before extraction

```bash
# Create these files:
workers/test/utils/crypto.test.js       # 120 lines, 12 tests
workers/test/utils/validation.test.js   # 150 lines, 15 tests
workers/test/utils/response.test.js     # 80 lines, 8 tests

# Expected effort: 1-2 weeks
# Blockers removed: Worker util extraction
```

### Week 5-6: Advanced (MEDIUM PRIORITY)
**Goal**: Integration and memory tests during refactors

```bash
# Create these files:
tampermonkey/__tests__/retryLogic.test.js        # 150 lines, 15 tests
tampermonkey/__tests__/memory.test.js            # 100 lines, 10 tests
tampermonkey/__tests__/syncIntegration.test.js   # 200 lines, 18 tests

# Expected effort: 2 weeks
# Blockers removed: Sync error refactor confidence boost
```

### Week 7-8: Polish (LOW PRIORITY)
**Goal**: Complete coverage and documentation

```bash
# Create these files:
tampermonkey/__tests__/uiAccessibility.test.js   # 100 lines, 12 tests
workers/test/utils/time.test.js                  # 60 lines, 6 tests
workers/test/utils/config.test.js                # 60 lines, 6 tests

# Expected effort: 1 week
# Blockers removed: None (nice-to-have)
```

---

## 🎪 Test Execution Checklist

### Before Starting Refactor
- [ ] Read relevant section in `TEST_PLAN_REFACTORS.md`
- [ ] Check `MISSING_TESTS.md` for gaps in this area
- [ ] Add missing high-priority tests
- [ ] Run full test suite (all pass)
- [ ] Check coverage baseline

### During Refactor
- [ ] Run tests continuously (watch mode)
- [ ] Add tests for new functionality
- [ ] Update tests for changed behavior
- [ ] Keep all tests passing (no broken tests)

### After Refactor
- [ ] Run full test suite (all pass)
- [ ] Check coverage increased or maintained
- [ ] Complete manual testing checklist
- [ ] Verify performance targets met
- [ ] Update documentation

---

## 🔧 Manual Testing Checklists

### Smoke Test (5-10 min - Every Commit)
```
[ ] Fresh install works
[ ] Button appears
[ ] Modal opens
[ ] Data displays
[ ] Can close modal
[ ] No console errors
```

### Financial Accuracy (15-20 min - CRITICAL)
```
[ ] Pick 3 random goals
[ ] Verify investment $ matches platform
[ ] Verify return $ matches platform
[ ] Verify growth % matches platform
[ ] Verify bucket aggregation correct
```

### Cross-Browser (30 min - Major Changes)
```
[ ] Chrome (latest) - all features work
[ ] Firefox (latest) - all features work
[ ] Edge (latest) - all features work
[ ] No console errors in any browser
```

---

## 📈 Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Modal open time | < 300ms | ~400ms | 🔴 |
| Cache hit rate | > 80% | ~60% | 🟡 |
| Memory usage (10min) | < 50MB | ~65MB | 🟡 |
| API calls (5min) | < 10 | ~20 | 🔴 |
| Bundle size | < 300KB | 250KB | 🟢 |
| Render 50 goals | < 200ms | ~350ms | 🔴 |

---

## 🐛 Bug Severity Guidelines

### P0 - CRITICAL (Stop Release)
- Data accuracy issues
- Complete feature failure
- Security vulnerabilities
- Data loss/corruption

### P1 - HIGH (Fix Before Release)
- Major feature broken
- Frequent crashes
- Cross-browser incompatibility
- Performance degradation

### P2 - MEDIUM (Fix in Sprint)
- Feature partially works
- Minor calculation errors
- UI glitches (not blocking)
- Confusing error messages

### P3 - LOW (Fix When Convenient)
- Cosmetic issues
- Text inconsistencies
- Rare edge cases
- Nice-to-have improvements

---

## 🎓 Test Writing Guidelines

### Good Test Naming
```javascript
✅ test('closes modal on ESC key press')
✅ test('retries sync after network timeout with exponential backoff')
✅ test('caches performance data to reduce API calls')

❌ test('modal test 1')
❌ test('sync works')
❌ test('cache')
```

### Test One Thing
```javascript
✅ GOOD - Single assertion
test('formatMoney displays positive numbers with dollar sign', () => {
    expect(formatMoney(1000)).toBe('$1,000.00');
});

❌ BAD - Multiple unrelated assertions
test('formatMoney works', () => {
    expect(formatMoney(1000)).toBe('$1,000.00');
    expect(formatMoney(-500)).toBe('$-500.00');
    expect(formatMoney(null)).toBe('-');
});
```

### Test Edge Cases
```javascript
describe('formatMoney', () => {
    test('handles positive numbers', () => { ... });
    test('handles negative numbers', () => { ... });
    test('handles zero', () => { ... });
    test('handles null', () => { ... });
    test('handles undefined', () => { ... });
    test('handles very large numbers', () => { ... });
    test('handles very small numbers', () => { ... });
});
```

---

## 📚 Key Files Reference

### Existing Tests (Good Examples)
- `tampermonkey/__tests__/utils.test.js` - Comprehensive utility testing
- `tampermonkey/__tests__/sync.test.js` - Crypto and encryption
- `workers/test/handlers.test.js` - Request handling patterns
- `workers/test/auth.test.js` - Auth flow testing

### Test Helpers
- `tampermonkey/__tests__/helpers/domSetup.js` - DOM setup/teardown
- `tampermonkey/__tests__/fixtures/` - Test data fixtures

### Source Files (Testing Targets)
- `tampermonkey/goal_portfolio_viewer.user.js` - Main userscript (8,400 LOC)
- `workers/src/*.js` - Worker modules (~1,100 LOC total)

---

## 🎯 Success Metrics

### Test Coverage
- ✅ **Target**: 90% pure functions, 85% overall
- 📊 **Current**: 85% userscript, 70% workers
- 🎯 **Gap**: Add ~190 test cases

### Test Count
- ✅ **Target**: 340 total tests
- 📊 **Current**: 150 total tests
- 🎯 **Gap**: +190 new tests needed

### Confidence Score
- ✅ **Target**: 9/10 confidence for each refactor
- 📊 **Current**: 6/10 average
- 🎯 **Gap**: Need critical tests added

### Execution Time
- ✅ **Target**: < 15 seconds total
- 📊 **Current**: ~7 seconds
- 🎯 **Gap**: Stay under target with 2x tests

---

## 💡 Quick Tips

### When in Doubt
1. **Test the happy path first** - Normal usage should always work
2. **Then test edge cases** - Null, empty, invalid, extreme values
3. **Finally test errors** - How does it fail gracefully?

### Red Flags
- 🚩 Skipping tests (only during development)
- 🚩 Tests that depend on execution order
- 🚩 Tests that modify global state without cleanup
- 🚩 Tests that require manual setup (browser, network)

### Green Flags
- ✅ Tests run fast (< 10ms each)
- ✅ Tests are isolated (can run in any order)
- ✅ Tests have descriptive names
- ✅ Tests follow AAA pattern (Arrange, Act, Assert)

---

## 🆘 Need Help?

### Full Details
- Read: `TEST_PLAN_REFACTORS.md` (comprehensive plans)
- Read: `MISSING_TESTS.md` (gap analysis)

### Testing Docs
- Read: `TESTING.md` (existing test infrastructure)
- Read: `BACKLOG.md` (planned work)

### Code Review
- Ask: Staff Engineer (architecture questions)
- Ask: QA Engineer (test strategy questions)
- Ask: Product Manager (priority questions)

---

## 📝 Summary

**Before any refactor**:
1. Check this quick reference
2. Read the relevant section in TEST_PLAN_REFACTORS.md
3. Check MISSING_TESTS.md for gaps
4. Add high-priority missing tests
5. Run full test suite
6. Proceed with confidence!

**During refactor**:
- Keep tests running (watch mode)
- Add tests for new functionality
- Don't break existing tests

**After refactor**:
- Run full test suite
- Check coverage maintained/improved
- Complete manual testing checklist
- Update documentation

**Good luck! 🚀**
