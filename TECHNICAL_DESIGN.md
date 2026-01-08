# Technical Design Documentation

This document provides technical details about the Goal Portfolio Viewer implementation, architecture, and development guide.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Interception](#api-interception)
3. [Data Processing](#data-processing)
4. [UI Components](#ui-components)
5. [Implementation Comparison](#implementation-comparison)
6. [Development Guide](#development-guide)
7. [Advanced Troubleshooting](#advanced-troubleshooting)
8. [Developer FAQ](#developer-faq)

---

## Architecture Overview

### Tampermonkey Script Architecture

The Tampermonkey userscript uses a single-file architecture that:
- Runs in the page context for direct API access
- Uses monkey patching for API interception
- Injects UI components directly into the DOM
- Processes all data client-side

**File Structure:**
```
tampermonkey/
├── goal_portfolio_viewer.user.js  # Main script file
└── README.md                          # User documentation
```

---

## API Interception

### Tampermonkey Implementation: Monkey Patching

The Tampermonkey script intercepts API calls by wrapping the native `fetch` and `XMLHttpRequest` APIs:

#### Fetch API Patching

```javascript
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0];
    
    if (url.includes('/v1/goals/performance')) {
        const clone = response.clone();
        const data = await clone.json();
        // Process performance data
    }
    
    return response;
};
```

**Key endpoints intercepted:**
- `/v1/goals/performance` - Performance metrics (returns, growth %)
- `/v2/goals/investible` - Investment details (amounts, goal types)
- `/v1/goals` - Goal summaries (names, descriptions)
- `https://bff.prod.silver.endowus.com/v1/performance` - Goal performance time series + return windows

#### XMLHttpRequest Patching

```javascript
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url;
    return originalOpen.apply(this, [method, url, ...args]);
};

const originalSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
        if (this._url.includes('/v1/goals/performance')) {
            const data = JSON.parse(this.responseText);
            // Process data
        }
    });
    return originalSend.apply(this, args);
};
```

**Advantages:**
- Works across all browsers
- No special permissions required
- Direct access to response data
- Non-blocking to native functionality

**Limitations:**
- Must run in page context
- Can be affected by Content Security Policy
- Requires careful handling to avoid infinite loops

### Performance API Contract

The enhanced performance view retrieves time-series data per goal from the BFF endpoint:

- **Endpoint**: `https://bff.prod.silver.endowus.com/v1/performance`
- **Query params**:
  - `displayCcy=SGD`
  - `goalId=<uuid>`
- **Response fields used**:
  - `timeSeries.data[].date`
  - `timeSeries.data[].amount`
  - `returnsTable.*`
  - `performanceDates.*`
  - `totalCumulativeReturnPercent`
  - `totalCumulativeReturnAmount`
- **Origin relationship**: `app.sg.endowus.com` sends same-site requests to `bff.prod.silver.endowus.com`
- **Required headers**: `authorization` (bearer token), `client-id`, `device-id`

These headers are captured from in-app fetch requests and reused for the sequential performance fetch queue.
If captured headers are missing, the script falls back to the `webapp-sg-access-token` and `webapp-deviceId` cookies
and any locally stored `client-id` to build the performance request headers.

### Performance Metrics Mapping

The performance metrics table is built from the per-goal performance response fields below. When multiple goals are
combined, percentage metrics are weighted by each goal’s net investment amount.

| Table Label | Primary Response Field(s) | Notes |
| --- | --- | --- |
| Total Return % | `totalCumulativeReturnPercent` | Weighted by `netInvestmentAmount` across goals. |
| TWR % | `timeWeightedReturnPercent` → `twrPercent` | Weighted by `gainOrLossTable.netInvestment.allTimeValue.amount` across goals. |
| Annualised IRR | `returnsTable.annualisedIrr.allTimeValue` | Weighted by `gainOrLossTable.netInvestment.allTimeValue.amount` across goals. |
| Gain / Loss | `totalCumulativeReturnAmount` | Summed across goals. |
| Net Fees | `gainOrLossTable.accessFeeCharged.allTimeValue.amount` − `gainOrLossTable.trailerFeeRebates.allTimeValue.amount` | Summed across goals. |
| Net Investment | `gainOrLossTable.netInvestment.allTimeValue.amount` → `netInvestmentAmount` → `netInvestment` | Summed; falls back to earliest time-series amount when missing. |
| Ending Balance | `endingBalanceAmount` → `totalBalanceAmount` → `marketValueAmount` | Summed; falls back to latest time-series amount when missing. |

---

## Data Processing

### Data Merging Logic

The script combines data from three API endpoints into a bucket map used by the UI:

1. **Performance Data** (`/v1/goals/performance`)
   - Cumulative returns
   - Growth percentages
   - Current market values

2. **Investment Data** (`/v2/goals/investible`)
   - Investment amounts
   - Goal types (Investment, Cash, SRS, etc.)
   - Asset allocation details

3. **Goal Summaries** (`/v1/goals`)
   - Goal names
   - Goal descriptions
   - Goal IDs

**Merge Algorithm (current implementation):**

```javascript
function buildMergedInvestmentData(performanceData, investibleData, summaryData) {
    if (!performanceData || !investibleData || !summaryData) {
        return null;
    }

    const investibleMap = {};
    investibleData.forEach(item => investibleMap[item.goalId] = item);

    const summaryMap = {};
    summaryData.forEach(item => summaryMap[item.goalId] = item);

    const bucketMap = {};

    performanceData.forEach(perf => {
        const invest = investibleMap[perf.goalId] || {};
        const summary = summaryMap[perf.goalId] || {};
        const goalName = invest.goalName || summary.goalName || '';
        const firstWord = goalName.trim().split(' ')[0];
        const goalBucket = firstWord && firstWord.length > 0 ? firstWord : 'Uncategorized';

        const goalObj = {
            goalId: perf.goalId,
            goalName,
            goalBucket,
            goalType: invest.investmentGoalType || summary.investmentGoalType || '',
            totalInvestmentAmount: invest.totalInvestmentAmount?.display?.amount || null,
            totalCumulativeReturn: perf.totalCumulativeReturn?.amount || null,
            simpleRateOfReturnPercent: perf.simpleRateOfReturnPercent || null
        };

        if (!bucketMap[goalBucket]) {
            bucketMap[goalBucket] = { total: 0 };
        }

        if (!bucketMap[goalBucket][goalObj.goalType]) {
            bucketMap[goalBucket][goalObj.goalType] = {
                totalInvestmentAmount: 0,
                totalCumulativeReturn: 0,
                goals: []
            };
        }

        bucketMap[goalBucket][goalObj.goalType].goals.push(goalObj);

        if (typeof goalObj.totalInvestmentAmount === 'number') {
            bucketMap[goalBucket][goalObj.goalType].totalInvestmentAmount += goalObj.totalInvestmentAmount;
            bucketMap[goalBucket].total += goalObj.totalInvestmentAmount;
        }

        if (typeof goalObj.totalCumulativeReturn === 'number') {
            bucketMap[goalBucket][goalObj.goalType].totalCumulativeReturn += goalObj.totalCumulativeReturn;
        }
    });

    return bucketMap;
}
```

### Bucket Extraction

Buckets are derived from the first word in the goal name. This matches the
goal naming convention used in the UI: `"BucketName - Goal Description"`.

**Examples:**
- `"Retirement - Core Portfolio"` → Bucket: `"Retirement"`
- `"Education - University Fund"` → Bucket: `"Education"`
- `"Emergency Fund"` → Bucket: `"Emergency"`

### Aggregation Calculations

Bucket totals and per-goal-type totals are aggregated while building the bucket map
(`buildMergedInvestmentData`). UI-specific calculations (returns, percentages, diffs)
are computed in view-model helpers to keep the DOM rendering layer thin and testable.

### Performance Window Derivation

The current UI only surfaces windows that are directly available from the API returns table:

- 1M (`oneMonthValue`)
- 6M (`sixMonthValue`)
- YTD (`ytdValue`)
- 1Y (`oneYearValue`)
- 3Y (`threeYearValue`)

These values are mapped by `mapReturnsTableToWindowReturns()` and aggregated by
`calculateWeightedWindowReturns()` when multiple goals are combined. Goals without a
TWR value for a window are excluded from that window’s aggregate.

**Note:** The codebase includes helper functions like `getWindowStartDate()` and
`calculateReturnFromTimeSeries()` that can support date-derived windows, but the
current implementation does not compute 1D, 7D, or QTD windows.

### Sequential Fetch Queue + Cache

Performance requests are executed sequentially with a configurable delay to avoid rate limiting.

- **Queue**: runs `fetch` per goal ID with a delay between calls.
- **Cache**: Tampermonkey storage keyed by `gpv_performance_<goalId>`.
- **TTL**: 7 days; cached responses are reused if still fresh and purged once stale.
- **Refresh policy**: the UI exposes a “Clear cache & refresh” action once cached data is at least 24 hours old.

### Money Formatting

All monetary values are formatted consistently:

```javascript
function formatMoney(amount) {
    return '$' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
```

**Output Examples:**
- `1234.56` → `"$1,234.56"`
- `1000000` → `"$1,000,000.00"`
- `-500.75` → `"-$500.75"`

---

## UI Components

### Component Architecture

The UI consists of:
1. **Trigger Button** - Fixed position button to open the viewer
2. **Modal Overlay** - Full-screen overlay with backdrop blur
3. **View Selector** - Dropdown to switch between Summary and Detail views, synced with summary card clicks
4. **Data Display Area** - Dynamic content area for tables and cards

### Styling System

#### Modern Gradient Design

```css
/* Primary gradient used throughout */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Hover state gradient */
background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
```

#### Color-Coded Returns

```javascript
function getReturnColor(value) {
    return value >= 0 ? '#10b981' : '#ef4444';  // Green : Red
}
```

#### Animation System

```css
/* Fade-in animation */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Slide-up animation */
@keyframes slideUp {
    from { 
        opacity: 0;
        transform: translateY(20px);
    }
    to { 
        opacity: 1;
        transform: translateY(0);
    }
}
```

### Rendering Functions

The UI renders DOM elements directly. To keep DOM rendering thin, the script builds
plain view-model objects and passes them into the renderer functions.

#### Summary View Rendering

```javascript
const summaryViewModel = buildSummaryViewModel(bucketMap);
renderSummaryView(contentDiv, summaryViewModel, onBucketSelect);
```

The `summaryViewModel` contains:
- bucket names
- totals/returns/growth display strings
- per-goal-type rows with display names

#### Detail View Rendering

```javascript
const goalIds = collectGoalIds(bucketMap[bucketName]);
const goalTargetById = buildGoalTargetById(goalIds, getGoalTargetPercentage);
const goalFixedById = buildGoalFixedById(goalIds, getGoalFixedFlag);
const bucketViewModel = buildBucketDetailViewModel(
    bucketName,
    bucketMap,
    projectedInvestments,
    goalTargetById,
    goalFixedById
);
renderBucketView(contentDiv, bucketViewModel, bucketMap, projectedInvestments, cleanupCallbacks);
```

The `bucketViewModel` contains:
- bucket totals and growth display strings
- per-goal-type sections (with projected investment inputs)
- per-goal rows (fixed toggles, targets, remaining target %, diffs, return classes)

---

## Development Guide

### Setting Up Development Environment

1. **Install Tampermonkey** in your browser
2. **Enable Developer Mode**:
   - Open Tampermonkey dashboard
   - Go to Settings
   - Set Config Mode to "Advanced"
   - Enable "Show advanced options"
3. **Create New Script**:
   - Click "Create a new script"
   - Start coding

### Modifying the Tampermonkey Script

**Workflow:**
1. Edit script in Tampermonkey editor
2. Save changes (Ctrl+S)
3. Refresh the platform page
4. Test functionality
5. Check browser console for errors

### Version Bump Checklist

When shipping a release, update every version touchpoint to keep them aligned:

1. **Userscript metadata**: `tampermonkey/goal_portfolio_viewer.user.js` → `// @version`
2. **Package metadata**: `package.json` → `"version"`
3. **Changelog**: `tampermonkey/README.md` → add a new entry under `## Changelog`

If any of these are missed, Tampermonkey auto-updates or release notes can drift from the actual code.

**Key Sections to Modify:**

```javascript
// === Configuration ===
const API_ENDPOINTS = {
    performance: '/v1/goals/performance',
    investible: '/v2/goals/investible',
    summary: '/v1/goals'
};

// === Data Processing ===
function buildMergedInvestmentData() { /* ... */ }
function buildSummaryViewModel() { /* ... */ }
function buildBucketDetailViewModel() { /* ... */ }

// === UI Rendering ===
function renderSummaryView() { /* ... */ }
function renderBucketView() { /* ... */ }

// === Styling ===
function injectStyles() { /* ... */ }
```

### Debugging Tips

#### Console Logging

```javascript
// Enable debug mode
const DEBUG = true;

function debug(message, data) {
    if (DEBUG) {
        console.log(`[Goal Portfolio Viewer] ${message}`, data);
    }
}

// Usage
debug('API Response:', responseData);
debug('Merged Data:', mergedData);
```

#### Testing Without Live Data

```javascript
// Mock data for testing
const mockData = [
    {
        id: '1',
        name: 'Retirement - Core Portfolio',
        investment: 100000,
        cumulativeReturn: 5000,
        goalType: 'Investment'
    }
    // ... more mock data
];

// Use mock data for testing
if (window.location.hostname === 'localhost') {
    renderView(mockData);
}
```

### Performance Optimization

#### Debouncing API Calls

```javascript
let apiCallTimer;
function handleAPIResponse(url, data) {
    clearTimeout(apiCallTimer);
    apiCallTimer = setTimeout(() => {
        processData(data);
    }, 500); // Wait 500ms for all APIs to respond
}
```

#### Efficient DOM Updates

```javascript
// Bad: Multiple DOM manipulations
element.innerHTML += '<div>Item 1</div>';
element.innerHTML += '<div>Item 2</div>';

// Good: Single DOM manipulation
const html = items.map(item => `<div>${item}</div>`).join('');
element.innerHTML = html;
```

### Security Best Practices

1. **Sanitize User Input**
   ```javascript
   function sanitize(str) {
       const div = document.createElement('div');
       div.textContent = str;
       return div.innerHTML;
   }
   ```

2. **Avoid `eval()` and Similar**
   - Never use `eval()`
   - Avoid `Function()` constructor
   - Use `JSON.parse()` instead of `eval()` for JSON

3. **Content Security Policy**
   - Inject styles programmatically
   - Avoid inline event handlers
   - Use `addEventListener()` instead

4. **Data Privacy**
   - Process all data locally
   - Never send data to external servers
   - Don't log sensitive information

---

## Advanced Troubleshooting

### API Interception Not Working

**Symptoms:**
- No data appears in viewer
- "Please wait" message persists
- Console shows no intercepted data

**Diagnosis:**
```javascript
// Check if APIs are being called
console.log('Fetch patched:', window.fetch !== originalFetch);
console.log('XHR patched:', XMLHttpRequest.prototype.open !== originalOpen);

// Monitor all fetch calls
window.fetch = new Proxy(originalFetch, {
    apply(target, thisArg, args) {
        console.log('Fetch called:', args[0]);
        return target.apply(thisArg, args);
    }
});
```

**Solutions:**
1. Ensure script runs before page loads (`@run-at document-start`)
2. Check Content Security Policy isn't blocking script
3. Verify API endpoints haven't changed
4. Clear browser cache and reload

### Data Merging Issues

**Symptoms:**
- Incomplete data in viewer
- Missing goals or buckets
- Incorrect calculations

**Diagnosis:**
```javascript
// Check data completeness
console.log('Performance goals:', Object.keys(performanceData).length);
console.log('Investible goals:', Object.keys(investibleData).length);
console.log('Summary goals:', Object.keys(summaryData).length);

// Find missing data
const allIds = new Set([
    ...Object.keys(performanceData),
    ...Object.keys(investibleData),
    ...Object.keys(summaryData)
]);

allIds.forEach(id => {
    const has = {
        perf: !!performanceData[id],
        inv: !!investibleData[id],
        sum: !!summaryData[id]
    };
    if (!has.perf || !has.inv || !has.sum) {
        console.log(`Incomplete data for goal ${id}:`, has);
    }
});
```

**Solutions:**
1. Navigate through all portfolio sections to trigger all API calls
2. Wait for page to fully load before opening viewer
3. Check if goal naming follows expected format
4. Verify API response structure hasn't changed

### UI Rendering Problems

**Symptoms:**
- Broken layout
- Missing styles
- Overlapping elements

**Diagnosis:**
```javascript
// Check if the trigger button is present
const button = document.querySelector('.gpv-trigger-btn');
console.log('Trigger button present:', !!button);

// Check if the overlay is present after opening
const overlay = document.querySelector('.gpv-overlay');
console.log('Overlay present:', !!overlay);
```

**Solutions:**
1. Increase CSS specificity to override conflicts
2. Use `!important` sparingly for critical styles
3. Check for conflicting extensions
4. Verify DOM structure matches selectors

### Performance Issues

**Symptoms:**
- Slow loading
- Laggy interactions
- Browser freezing

**Solutions:**
1. Reduce DOM manipulations
2. Implement virtual scrolling for large datasets
3. Debounce expensive operations
4. Use `requestAnimationFrame()` for animations

---

## Developer FAQ

### Q: Can I modify the bucket naming convention?

Yes, update the bucket derivation logic inside `buildMergedInvestmentData()`:

```javascript
// Current behavior (first word):
const goalName = invest.goalName || summary.goalName || '';
const firstWord = goalName.trim().split(' ')[0];
const goalBucket = firstWord && firstWord.length > 0 ? firstWord : 'Uncategorized';

// Example alternative (bucket in parentheses):
// const match = goalName.match(/\\(([^)]+)\\)$/);
// const goalBucket = match ? match[1] : 'Uncategorized';
```

### Q: How do I add a new calculated field?

1. Add calculation in data processing:
```javascript
function processGoal(goal) {
    return {
        ...goal,
        myNewField: calculateMyField(goal)
    };
}
```

2. Update rendering:
```javascript
<td>${formatMyField(goal.myNewField)}</td>
```

### Q: Can I export data to CSV?

Yes, add export functionality:

```javascript
function exportToCSV(data) {
    const headers = ['Goal', 'Investment', 'Return', 'Growth %'];
    const rows = data.map(g => [
        g.name,
        g.investment,
        g.cumulativeReturn,
        g.growthPercentage
    ]);
    
    const csv = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.csv';
    a.click();
}
```

### Q: How do I add chart visualizations?

The current userscript renders lightweight SVG charts that resize with their container using `ResizeObserver`, including a dynamic height derived from available width. If you add new charts, follow the same pattern: measure the container, render with a matching `viewBox`, and re-render on resize to keep coordinates accurate.

If you need a larger charting library, keep it lightweight:

```javascript
// Add to userscript header
// @require https://cdn.jsdelivr.net/npm/chart.js

function renderChart(data) {
    const canvas = document.createElement('canvas');
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.investment)
            }]
        }
    });
    return canvas;
}
```

### Q: Can I change the color scheme?

Yes, modify the CSS in `injectStyles()`:

```javascript
// Change primary gradient
background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);

// Change positive return color
color: #YOUR_GREEN_COLOR;

// Change negative return color  
color: #YOUR_RED_COLOR;
```

### Q: How do I intercept additional API endpoints?

Add to the interception logic:

```javascript
if (url.includes('/v1/your/new/endpoint')) {
    const clone = response.clone();
    const data = await clone.json();
    processNewEndpoint(data);
}
```

### Q: Can I run this on a different investment platform?

Yes, but you'll need to:
1. Change the `@match` URL pattern
2. Update API endpoint URLs
3. Modify data structure parsing
4. Adjust selectors for button placement

### Q: How do I handle different currencies?

Update the formatter:

```javascript
function formatMoney(amount, currency = 'SGD') {
    const symbols = {
        'SGD': 'S$',
        'USD': '$',
        'EUR': '€'
    };
    
    return symbols[currency] + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
```

---

## Contributing

When contributing to the technical implementation:

1. **Follow existing code style**
   - Use consistent indentation (4 spaces)
   - Add comments for complex logic
   - Use descriptive variable names

2. **Test thoroughly**
   - Test with real platform data
   - Test with mock data
   - Test edge cases (empty data, single goal, etc.)

3. **Document changes**
   - Update this technical documentation
   - Add inline comments for complex code
   - Update changelog

4. **Consider backwards compatibility**
   - Don't break existing bucket naming conventions
   - Maintain API compatibility
   - Provide migration guides for breaking changes

---

## Changelog

### Version 2.0.0 (Tampermonkey)
- Complete rewrite with modern architecture
- Modern gradient UI design
- Cross-browser compatibility
- Monkey patching API interception
- Auto-update functionality
- Enhanced animations and transitions
- Improved data visualization

---

## Additional Resources

- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)
- [Userscript Best Practices](https://wiki.greasespot.net/Code_Patterns)
- [Web API Reference](https://developer.mozilla.org/en-US/docs/Web/API)

---

*Last updated: November 2024*
