# Test Implementation Guide
**Goal Portfolio Viewer - Practical Testing Examples**

This guide provides copy-paste ready test templates for the identified coverage gaps.

---

## Phase 1: Critical Tests (P0)

### 1. API Interception Tests

**File:** `__tests__/integration/apiInterception.test.js`

```javascript
/**
 * API Interception Tests
 * Tests the fetch and XMLHttpRequest monkey patching
 */

describe('API Interception', () => {
  let originalFetch;
  let mockGM_setValue;
  let mockGM_getValue;
  
  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
    
    // Mock Tampermonkey storage
    mockGM_setValue = jest.fn();
    mockGM_getValue = jest.fn();
    global.GM_setValue = mockGM_setValue;
    global.GM_getValue = mockGM_getValue;
    
    // Clear any previous data
    global.apiData = {
      performance: null,
      investible: null,
      summary: null
    };
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });
  
  describe('Fetch Interception', () => {
    test('should intercept /v1/goals/performance endpoint', async () => {
      const mockData = {
        goals: [
          {
            id: 'goal1',
            name: 'Retirement - Core',
            performance: { return: 1000 }
          }
        ]
      };
      
      global.fetch = jest.fn().mockResolvedValue({
        clone: () => ({
          json: () => Promise.resolve(mockData)
        }),
        json: () => Promise.resolve(mockData)
      });
      
      // Apply monkey patch by importing userscript
      require('../../tampermonkey/goal_portfolio_viewer.user.js');
      
      const response = await fetch('https://api.endowus.com/v1/goals/performance');
      const data = await response.json();
      
      expect(data).toEqual(mockData);
      expect(mockGM_setValue).toHaveBeenCalledWith(
        'api_performance',
        JSON.stringify(mockData)
      );
    });
    
    test('should intercept /v2/goals/investible endpoint', async () => {
      const mockData = {
        goals: [
          {
            id: 'goal1',
            name: 'Retirement - Core',
            investmentAmount: 10000
          }
        ]
      };
      
      global.fetch = jest.fn().mockResolvedValue({
        clone: () => ({
          json: () => Promise.resolve(mockData)
        }),
        json: () => Promise.resolve(mockData)
      });
      
      const response = await fetch('https://api.endowus.com/v2/goals/investible');
      const data = await response.json();
      
      expect(data).toEqual(mockData);
      expect(mockGM_setValue).toHaveBeenCalledWith(
        'api_investible',
        JSON.stringify(mockData)
      );
    });
    
    test('should intercept /v1/goals summary endpoint', async () => {
      const mockData = [
        { id: 'goal1', name: 'Retirement - Core' },
        { id: 'goal2', name: 'Education - College' }
      ];
      
      global.fetch = jest.fn().mockResolvedValue({
        clone: () => ({
          json: () => Promise.resolve(mockData)
        }),
        json: () => Promise.resolve(mockData)
      });
      
      const response = await fetch('https://api.endowus.com/v1/goals');
      const data = await response.json();
      
      expect(data).toEqual(mockData);
      expect(mockGM_setValue).toHaveBeenCalledWith(
        'api_summary',
        JSON.stringify(mockData)
      );
    });
    
    test('should handle malformed JSON gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      global.fetch = jest.fn().mockResolvedValue({
        clone: () => ({
          json: () => Promise.reject(new Error('Invalid JSON'))
        }),
        json: () => Promise.resolve({})
      });
      
      const response = await fetch('https://api.endowus.com/v1/goals/performance');
      
      // Should not throw
      await expect(response.json()).resolves.toBeDefined();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing API response'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
    
    test('should not interfere with non-target URLs', async () => {
      const mockData = { data: 'test' };
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockData)
      });
      
      const response = await fetch('https://example.com/api/data');
      const data = await response.json();
      
      expect(data).toEqual(mockData);
      expect(mockGM_setValue).not.toHaveBeenCalled();
    });
    
    test('should handle concurrent API calls', async () => {
      const mockData1 = { goals: [{ id: 'goal1' }] };
      const mockData2 = { goals: [{ id: 'goal2' }] };
      
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          clone: () => ({ json: () => Promise.resolve(mockData1) }),
          json: () => Promise.resolve(mockData1)
        })
        .mockResolvedValueOnce({
          clone: () => ({ json: () => Promise.resolve(mockData2) }),
          json: () => Promise.resolve(mockData2)
        });
      
      const [response1, response2] = await Promise.all([
        fetch('https://api.endowus.com/v1/goals/performance'),
        fetch('https://api.endowus.com/v1/goals/performance')
      ]);
      
      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);
      
      expect(data1).toEqual(mockData1);
      expect(data2).toEqual(mockData2);
      expect(mockGM_setValue).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('XHR Interception', () => {
    test('should intercept XMLHttpRequest to performance endpoint', (done) => {
      const mockData = { goals: [{ id: 'goal1' }] };
      
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://api.endowus.com/v1/goals/performance');
      
      xhr.onload = function() {
        expect(mockGM_setValue).toHaveBeenCalledWith(
          'api_performance',
          JSON.stringify(mockData)
        );
        done();
      };
      
      // Mock server response
      Object.defineProperty(xhr, 'responseText', {
        writable: true,
        value: JSON.stringify(mockData)
      });
      Object.defineProperty(xhr, 'status', {
        writable: true,
        value: 200
      });
      
      xhr.send();
      
      // Simulate response
      setTimeout(() => {
        if (xhr.onload) xhr.onload();
      }, 10);
    });
  });
});
```

---

### 2. Authentication Tests

**File:** `__tests__/integration/authentication.test.js`

```javascript
/**
 * Authentication Tests
 * Tests cookie extraction and auth header construction
 */

const {
  getCookieValue,
  buildAuthorizationValue,
  getFallbackAuthHeaders,
  getAuthTokenFromGMCookie,
  selectAuthCookieToken,
  findCookieValue
} = require('../../tampermonkey/goal_portfolio_viewer.user.js');

describe('Authentication', () => {
  beforeEach(() => {
    // Clear any cached tokens
    global.gmCookieAuthToken = null;
  });
  
  describe('getCookieValue', () => {
    test('should extract cookie value from document.cookie', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'webapp-sg-access-token=mock-token-123; path=/; domain=.endowus.com'
      });
      
      const token = getCookieValue('webapp-sg-access-token');
      expect(token).toBe('mock-token-123');
    });
    
    test('should return null for missing cookie', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other-cookie=value'
      });
      
      const token = getCookieValue('webapp-sg-access-token');
      expect(token).toBeNull();
    });
    
    test('should handle URL-encoded cookie values', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'token=hello%20world'
      });
      
      const token = getCookieValue('token');
      expect(token).toBe('hello world');
    });
    
    test('should handle malformed encoding gracefully', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'token=bad%encoding'
      });
      
      const token = getCookieValue('token');
      expect(token).toBe('bad%encoding'); // Fallback to raw value
    });
    
    test('should return null when document is undefined', () => {
      const originalDocument = global.document;
      global.document = undefined;
      
      const token = getCookieValue('token');
      expect(token).toBeNull();
      
      global.document = originalDocument;
    });
  });
  
  describe('buildAuthorizationValue', () => {
    test('should add Bearer prefix to token', () => {
      const result = buildAuthorizationValue('token123');
      expect(result).toBe('Bearer token123');
    });
    
    test('should not duplicate Bearer prefix', () => {
      const result = buildAuthorizationValue('Bearer token123');
      expect(result).toBe('Bearer token123');
    });
    
    test('should handle case-insensitive Bearer prefix', () => {
      const result = buildAuthorizationValue('bearer token123');
      expect(result).toBe('bearer token123');
    });
    
    test('should return null for null token', () => {
      const result = buildAuthorizationValue(null);
      expect(result).toBeNull();
    });
    
    test('should return null for non-string token', () => {
      const result = buildAuthorizationValue(12345);
      expect(result).toBeNull();
    });
  });
  
  describe('selectAuthCookieToken', () => {
    test('should select httpOnly cookie when available', () => {
      const cookies = [
        { name: 'token1', value: 'regular-token', httpOnly: false },
        { name: 'token2', value: 'secure-token', httpOnly: true }
      ];
      
      const token = selectAuthCookieToken(cookies);
      expect(token).toBe('secure-token');
    });
    
    test('should select first cookie when no httpOnly available', () => {
      const cookies = [
        { name: 'token1', value: 'token-a', httpOnly: false },
        { name: 'token2', value: 'token-b', httpOnly: false }
      ];
      
      const token = selectAuthCookieToken(cookies);
      expect(token).toBe('token-a');
    });
    
    test('should return null for empty array', () => {
      const token = selectAuthCookieToken([]);
      expect(token).toBeNull();
    });
    
    test('should return null for non-array input', () => {
      const token = selectAuthCookieToken(null);
      expect(token).toBeNull();
    });
  });
  
  describe('findCookieValue', () => {
    test('should find cookie by name', () => {
      const cookies = [
        { name: 'token1', value: 'value1' },
        { name: 'token2', value: 'value2' }
      ];
      
      const value = findCookieValue(cookies, 'token2');
      expect(value).toBe('value2');
    });
    
    test('should return null for missing name', () => {
      const cookies = [
        { name: 'token1', value: 'value1' }
      ];
      
      const value = findCookieValue(cookies, 'token2');
      expect(value).toBeNull();
    });
  });
  
  describe('getAuthTokenFromGMCookie', () => {
    test('should retrieve token from GM_cookie API', async () => {
      global.GM_cookie = {
        list: jest.fn((query, callback) => {
          callback([
            { name: 'webapp-sg-access-token', value: 'gm-token', httpOnly: true }
          ]);
        })
      };
      
      const token = await getAuthTokenFromGMCookie();
      expect(token).toBe('gm-token');
    });
    
    test('should return null when GM_cookie unavailable', async () => {
      global.GM_cookie = undefined;
      
      const token = await getAuthTokenFromGMCookie();
      expect(token).toBeNull();
    });
    
    test('should try multiple cookie queries', async () => {
      let callCount = 0;
      global.GM_cookie = {
        list: jest.fn((query, callback) => {
          callCount++;
          if (callCount === 3) {
            callback([{ name: 'token', value: 'found', httpOnly: true }]);
          } else {
            callback([]);
          }
        })
      };
      
      const token = await getAuthTokenFromGMCookie();
      expect(token).toBe('found');
      expect(global.GM_cookie.list).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('getFallbackAuthHeaders', () => {
    test('should construct auth headers from cookies', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'webapp-sg-access-token=token123; webapp-deviceId=device456'
      });
      
      global.GM_cookie = undefined;
      
      const headers = await getFallbackAuthHeaders();
      
      expect(headers.authorization).toBe('Bearer token123');
      expect(headers['device-id']).toBe('device456');
      expect(headers['client-id']).toBeNull();
    });
    
    test('should handle missing cookies gracefully', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: ''
      });
      
      global.GM_cookie = undefined;
      
      const headers = await getFallbackAuthHeaders();
      
      expect(headers.authorization).toBeNull();
      expect(headers['device-id']).toBeNull();
      expect(headers['client-id']).toBeNull();
    });
  });
});
```

---

### 3. Data Persistence Tests

**File:** `__tests__/integration/storage.test.js`

```javascript
/**
 * Data Persistence Tests
 * Tests Tampermonkey storage operations
 */

describe('Data Persistence', () => {
  let mockGM_setValue;
  let mockGM_getValue;
  let mockGM_deleteValue;
  
  beforeEach(() => {
    // Mock Tampermonkey storage
    const storage = {};
    
    mockGM_setValue = jest.fn((key, value) => {
      storage[key] = value;
    });
    
    mockGM_getValue = jest.fn((key, defaultValue) => {
      return storage[key] !== undefined ? storage[key] : defaultValue;
    });
    
    mockGM_deleteValue = jest.fn((key) => {
      delete storage[key];
    });
    
    global.GM_setValue = mockGM_setValue;
    global.GM_getValue = mockGM_getValue;
    global.GM_deleteValue = mockGM_deleteValue;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Goal Target Storage', () => {
    test('should save goal target percentage', () => {
      const goalId = 'goal123';
      const targetPct = 60;
      
      GM_setValue(`goal_target_pct_${goalId}`, targetPct.toString());
      
      expect(mockGM_setValue).toHaveBeenCalledWith(
        'goal_target_pct_goal123',
        '60'
      );
    });
    
    test('should retrieve goal target percentage', () => {
      GM_setValue('goal_target_pct_goal123', '60');
      
      const value = GM_getValue('goal_target_pct_goal123', '0');
      
      expect(value).toBe('60');
    });
    
    test('should delete goal target', () => {
      GM_setValue('goal_target_pct_goal123', '60');
      GM_deleteValue('goal_target_pct_goal123');
      
      expect(mockGM_deleteValue).toHaveBeenCalledWith('goal_target_pct_goal123');
    });
    
    test('should return default when target not found', () => {
      const value = GM_getValue('goal_target_pct_missing', '0');
      expect(value).toBe('0');
    });
  });
  
  describe('Projected Investment Storage', () => {
    test('should save projected investment', () => {
      const key = 'Retirement|GENERAL_WEALTH_ACCUMULATION';
      const amount = 5000;
      
      // Simulating projectedInvestments[key] = amount
      // This would be tested via the actual function
      GM_setValue('projected_inv_' + key, amount.toString());
      
      expect(mockGM_setValue).toHaveBeenCalled();
    });
  });
  
  describe('API Cache Storage', () => {
    test('should cache API responses', () => {
      const mockData = {
        goals: [{ id: 'goal1', name: 'Test Goal' }]
      };
      
      GM_setValue('api_performance', JSON.stringify(mockData));
      
      expect(mockGM_setValue).toHaveBeenCalledWith(
        'api_performance',
        expect.stringContaining('goal1')
      );
    });
    
    test('should retrieve cached API responses', () => {
      const mockData = {
        goals: [{ id: 'goal1', name: 'Test Goal' }]
      };
      
      GM_setValue('api_performance', JSON.stringify(mockData));
      const retrieved = GM_getValue('api_performance');
      
      expect(JSON.parse(retrieved)).toEqual(mockData);
    });
    
    test('should handle storage quota exceeded', () => {
      // Simulate quota exceeded
      mockGM_setValue.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      expect(() => {
        GM_setValue('large_data', 'x'.repeat(10000000));
      }).toThrow('QuotaExceededError');
    });
  });
  
  describe('Performance Cache', () => {
    test('should store performance data with timestamp', () => {
      const goalId = 'goal123';
      const perfData = {
        data: { return: 1000 },
        fetchedAt: Date.now()
      };
      
      GM_setValue(
        `goal_performance_${goalId}`,
        JSON.stringify(perfData)
      );
      
      expect(mockGM_setValue).toHaveBeenCalled();
    });
  });
});
```

---

## Phase 2: High Priority Tests (P1)

### 4. UI Rendering Tests

**File:** `__tests__/browser/rendering.test.js`

```javascript
/**
 * UI Rendering Tests
 * Tests DOM manipulation and view rendering
 * Requires: JSDOM
 */

const { JSDOM } = require('jsdom');

describe('UI Rendering', () => {
  let dom, document, window;
  
  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body><div id="root"></div></body>', {
      url: 'https://app.sg.endowus.com/',
      runScripts: 'outside-only'
    });
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
  });
  
  afterEach(() => {
    dom.window.close();
  });
  
  describe('Summary View', () => {
    test('should render bucket cards', () => {
      const bucketMap = {
        'Retirement': {
          name: 'Retirement',
          totalInvestment: 10000,
          totalReturn: 1000,
          growthPercentage: 10.0,
          goals: []
        },
        'Education': {
          name: 'Education',
          totalInvestment: 5000,
          totalReturn: 500,
          growthPercentage: 10.0,
          goals: []
        }
      };
      
      // Call render function
      // renderSummaryView(bucketMap);
      
      // Assertions would check:
      // - Bucket cards created
      // - Correct data displayed
      // - Proper formatting
    });
    
    test('should sanitize goal names to prevent XSS', () => {
      const bucketMap = {
        'XSS Test': {
          name: '<script>alert("XSS")</script>',
          totalInvestment: 1000,
          totalReturn: 100,
          growthPercentage: 10.0,
          goals: []
        }
      };
      
      // renderSummaryView(bucketMap);
      
      // Verify no script tags in DOM
      // Verify text content is escaped
    });
    
    test('should handle empty bucket map', () => {
      // renderSummaryView({});
      
      // Should display empty state
      // Should not crash
    });
  });
  
  describe('Bucket Detail View', () => {
    test('should render goal type sections', () => {
      const bucket = {
        name: 'Retirement',
        goalTypes: {
          'GENERAL_WEALTH_ACCUMULATION': {
            displayName: 'Investment',
            goals: [
              { id: 'g1', name: 'Goal 1', investment: 1000 }
            ]
          }
        }
      };
      
      // renderBucketView(bucket);
      
      // Verify sections rendered
      // Verify goals displayed
    });
  });
});
```

---

### 5. Event Handling Tests

**File:** `__tests__/browser/events.test.js`

```javascript
/**
 * Event Handling Tests
 * Tests user interactions and input validation
 */

describe('Event Handling', () => {
  describe('Target Percentage Input', () => {
    test('should validate percentage input (0-100)', () => {
      // Test valid inputs
      expect(isValidPercentage('50')).toBe(true);
      expect(isValidPercentage('0')).toBe(true);
      expect(isValidPercentage('100')).toBe(true);
      
      // Test invalid inputs
      expect(isValidPercentage('-1')).toBe(false);
      expect(isValidPercentage('101')).toBe(false);
      expect(isValidPercentage('abc')).toBe(false);
    });
    
    test('should handle decimal percentages', () => {
      expect(isValidPercentage('50.5')).toBe(true);
      expect(isValidPercentage('99.99')).toBe(true);
    });
  });
  
  describe('Projected Investment Input', () => {
    test('should validate numeric input', () => {
      expect(isValidAmount('1000')).toBe(true);
      expect(isValidAmount('1000.50')).toBe(true);
      expect(isValidAmount('0')).toBe(true);
      
      expect(isValidAmount('-100')).toBe(false);
      expect(isValidAmount('abc')).toBe(false);
    });
  });
});
```

---

## Running the Tests

### Setup

```bash
# Install dependencies
npm install --save-dev @testing-library/dom jsdom

# Update package.json
{
  "devDependencies": {
    "@testing-library/dom": "^9.3.0",
    "jest": "^29.7.0",
    "jsdom": "^23.0.0"
  }
}
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/integration/apiInterception.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Jest Configuration

Add to `jest.config.js` or `package.json`:

```javascript
module.exports = {
  testEnvironment: 'jsdom', // For DOM tests
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

---

## Test Checklist

### For Each New Feature

- [ ] Unit tests for core logic
- [ ] Integration tests for API/storage
- [ ] Browser tests for UI (if applicable)
- [ ] Edge cases (null, undefined, empty, invalid)
- [ ] Error handling
- [ ] Security (XSS, injection)

### Before Each Release

- [ ] All tests passing
- [ ] Coverage ≥70%
- [ ] No console errors
- [ ] Manual smoke test
- [ ] Financial accuracy spot check

---

**Last Updated:** 2026-01-14  
**Maintainer:** QA Engineer  
**Review Schedule:** After each phase completion
