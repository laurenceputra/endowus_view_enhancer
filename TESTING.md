# Testing Guide

## Overview

This document explains the testing infrastructure for the Goal Portfolio Viewer project. The project uses Jest for testing with **zero code duplication** - all logic lives in one place.

## Architecture

### Single Source of Truth Pattern

The project uses a unique pattern to enable testing without code duplication:

1. **The Userscript** (`tampermonkey/goal_portfolio_viewer.user.js`):
   - Single self-contained file with ALL logic
   - Pure functions defined at the top
   - Browser-specific code wrapped in `if (typeof window !== 'undefined')`
   - Conditional exports at the bottom: `if (typeof module !== 'undefined' && module.exports)`
   - Works standalone in browser, exports functions in Node.js for testing

2. **Tests** (`__tests__/utils.test.js`):
   - Import pure functions directly from the userscript
   - Test the REAL implementation, not a duplicate
   - No synchronization needed between files

**Key Insight**: The userscript detects its environment (browser vs Node.js) and behaves accordingly:
- In browser: Functions are internal to the IIFE, browser code runs normally
- In Node.js: Browser code is skipped, functions are exported for testing

**IMPORTANT**: Changes to logic are made in ONE place:
- Update function in `tampermonkey/goal_portfolio_viewer.user.js`
- Add function to exports section if it's new
- Add/update tests in `__tests__/utils.test.js`

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Output

When tests pass, you'll see:
```
Test Suites: 1 passed, 1 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        0.444 s
```

Coverage report shows:
```
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |    94.73 |     100 |     100 |                   
 utils.js |     100 |    94.73 |     100 |     100 | 118-119,166       
----------|---------|----------|---------|---------|-------------------
```

## Test Structure

### Test Files

- `__tests__/utils.test.js` - Unit tests for all pure functions

### Tested Functions

1. **`getGoalTargetKey(goalId)`**
   - Generates storage keys for goal target percentages
   - Tests: normal input, empty string, special characters

2. **`getProjectedInvestmentKey(bucket, goalType)`**
   - Generates keys for projected investments
   - Tests: normal input, empty strings, special characters

3. **`getDisplayGoalType(goalType)`**
   - Converts internal goal types to display names
   - Tests: all known types, unknown types, empty string

4. **`sortGoalTypes(goalTypeKeys)`**
   - Sorts goal types in preferred order
   - Tests: full set, partial set, mixed, empty array, immutability

5. **`formatMoney(val)`**
   - Formats numbers as currency strings
   - Tests: positive, negative, zero, decimals, invalid inputs, large numbers

6. **`formatGrowthPercent(totalReturn, total)`**
   - Calculates and formats growth percentage
   - Tests: positive/negative returns, zero, division by zero, invalid inputs

7. **`buildMergedInvestmentData(performanceData, investibleData, summaryData)`**
   - Core function: merges data from 3 API endpoints
   - Tests: null inputs, invalid types, single goal, multiple goals, multiple buckets, missing fields, empty arrays

## Writing New Tests

### Test Structure Pattern

```javascript
describe('functionName', () => {
    test('should handle normal case', () => {
        const result = functionName(input);
        expect(result).toBe(expected);
    });

    test('should handle edge case', () => {
        const result = functionName(edgeInput);
        expect(result).toBe(expectedEdge);
    });

    test('should handle error case', () => {
        const result = functionName(invalidInput);
        expect(result).toBe(errorExpected);
    });
});
```

### Best Practices

1. **Test both happy path and edge cases**
   - Normal inputs
   - Empty/null/undefined
   - Invalid types
   - Boundary values
   - Error conditions

2. **Use descriptive test names**
   ```javascript
   // Good
   test('should return "Uncategorized" for empty goal name', () => { ... });
   
   // Bad
   test('test 1', () => { ... });
   ```

3. **Keep tests isolated**
   - Each test should be independent
   - Don't rely on test execution order
   - Clean up any state changes

4. **Test one thing per test**
   ```javascript
   // Good - single assertion
   test('should format positive numbers', () => {
       expect(formatMoney(1000)).toBe('$1,000.00');
   });
   
   // Bad - multiple unrelated assertions
   test('should format money', () => {
       expect(formatMoney(1000)).toBe('$1,000.00');
       expect(formatMoney(-500)).toBe('$-500.00');
       expect(formatMoney(null)).toBe('-');
   });
   ```

5. **Add tests for financial calculations**
   - Financial accuracy is critical
   - Test with real-world values
   - Verify rounding behavior
   - Test edge cases (very large/small numbers)

## Continuous Integration

### GitHub Actions Workflow

The CI workflow (`.github/workflows/ci.yml`) runs on:
- Every push to `main` branch
- Every pull request targeting `main`

### CI Steps

1. Checkout code
2. Setup Node.js (18.x and 20.x)
3. Install dependencies (`npm ci`)
4. Run tests (`npm test`)
5. Upload coverage (Node 20.x only)

### CI Requirements

- All tests must pass
- No test failures allowed
- Works on both Node.js 18.x and 20.x

### Viewing CI Results

1. Go to the Pull Request page
2. Check the "Checks" tab
3. View test results for each Node.js version
4. Click on failed tests to see details

## Common Issues

### Tests Fail Locally But Pass in CI

- Ensure you have the correct Node.js version
- Delete `node_modules` and `package-lock.json`, then `npm install`
- Check for environment-specific code

### Tests Pass But Coverage is Low

- Add tests for uncovered branches
- Test error handling paths
- Test all function inputs/outputs

### Locale-Dependent Tests

`formatMoney()` uses `toLocaleString()` which can vary by system locale. If tests fail:

```javascript
// Instead of exact match
expect(formatMoney(1000)).toBe('$1,000.00');

// Use regex or partial match
expect(formatMoney(1000)).toMatch(/^\$1,000\.00$/);
```

## Maintenance

### Keeping Tests in Sync

When updating the userscript:

1. ✅ Update function in `tampermonkey/goal_portfolio_viewer.user.js`
2. ✅ If adding a new testable function, add it to the conditional exports section
3. ✅ Update or add tests in `__tests__/utils.test.js`
4. ✅ Run tests locally
5. ✅ Commit all changes together

**No duplication!** There's only ONE copy of each function - in the userscript itself.

### Test Coverage Goals

- **Pure Logic Functions**: 100% coverage for exported functions
- **Overall File**: Lower percentage is expected (includes browser-only code)

Current coverage for tested functions: 100% statements, 94.73% branches, 100% functions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
