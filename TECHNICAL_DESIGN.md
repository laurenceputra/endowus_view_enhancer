# Technical Design Documentation

This document provides technical details about the Endowus Portfolio Viewer implementation, architecture, and development guide.

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
├── endowus_portfolio_viewer.user.js  # Main script file
└── README.md                          # User documentation
```

### Firefox Extension Architecture

The Firefox extension uses a multi-component architecture:
- Background script for WebRequest API interception
- Content script for UI injection
- Message passing between components

**File Structure:**
```
src/
├── background.js      # WebRequest API interception
├── content.js         # UI injection and rendering
└── manifest.json      # Extension configuration
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

### Firefox Extension Implementation: WebRequest API

The Firefox extension uses the `browser.webRequest.filterResponseData()` API:

```javascript
browser.webRequest.onBeforeRequest.addListener(
    function(details) {
        let filter = browser.webRequest.filterResponseData(details.requestId);
        let decoder = new TextDecoder("utf-8");
        let encoder = new TextEncoder();
        let data = "";

        filter.ondata = event => {
            data += decoder.decode(event.data, {stream: true});
        };

        filter.onstop = event => {
            const jsonData = JSON.parse(data);
            // Process data
            filter.write(encoder.encode(data));
            filter.close();
        };
    },
    {urls: ["*://app.sg.endowus.com/api/v1/goals/performance*"]},
    ["blocking"]
);
```

**Advantages:**
- Official browser API
- Clean separation of concerns
- Can modify requests/responses
- Better security model

**Limitations:**
- Firefox-specific
- Requires special permissions
- More complex architecture

---

## Data Processing

### Data Merging Logic

The script combines data from three API endpoints:

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

**Merge Algorithm:**

```javascript
function mergeAPIResponses() {
    const merged = {};
    
    // Start with performance data as base
    performanceData.forEach(goal => {
        merged[goal.id] = {
            id: goal.id,
            cumulativeReturn: goal.cumulativeReturn,
            growthPercentage: goal.growthPercentage
        };
    });
    
    // Add investment details
    investibleData.forEach(goal => {
        if (merged[goal.id]) {
            merged[goal.id].investment = goal.investment;
            merged[goal.id].goalType = goal.goalType;
        }
    });
    
    // Add goal names and extract buckets
    summaryData.forEach(goal => {
        if (merged[goal.id]) {
            merged[goal.id].name = goal.name;
            merged[goal.id].bucket = extractBucket(goal.name);
        }
    });
    
    return Object.values(merged);
}
```

### Bucket Extraction

Goals are grouped by extracting the bucket name from the goal title:

```javascript
function extractBucket(goalName) {
    // Format: "BucketName - Goal Description"
    const parts = goalName.split(' - ');
    return parts[0] || 'Uncategorized';
}
```

**Examples:**
- `"Retirement - Core Portfolio"` → Bucket: `"Retirement"`
- `"Education - University Fund"` → Bucket: `"Education"`
- `"Emergency Fund"` → Bucket: `"Emergency"`

### Aggregation Calculations

#### Bucket-Level Aggregation

```javascript
function aggregateBucket(goals) {
    return {
        totalInvestment: goals.reduce((sum, g) => sum + g.investment, 0),
        totalReturn: goals.reduce((sum, g) => sum + g.cumulativeReturn, 0),
        growthPercentage: (totalReturn / totalInvestment) * 100,
        goalsByType: groupByGoalType(goals)
    };
}
```

#### Goal Type Aggregation

```javascript
function groupByGoalType(goals) {
    const types = {};
    
    goals.forEach(goal => {
        const type = goal.goalType;
        if (!types[type]) {
            types[type] = {
                goals: [],
                totalInvestment: 0,
                totalReturn: 0
            };
        }
        
        types[type].goals.push(goal);
        types[type].totalInvestment += goal.investment;
        types[type].totalReturn += goal.cumulativeReturn;
    });
    
    return types;
}
```

#### Percentage Calculations

```javascript
function calculatePercentageOfType(goal, typeTotal) {
    return (goal.investment / typeTotal.totalInvestment) * 100;
}
```

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
3. **View Selector** - Dropdown to switch between Summary and Detail views
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

#### Summary View Rendering

```javascript
function renderSummaryView(data) {
    const buckets = groupByBucket(data);
    
    let html = '<div class="summary-container">';
    
    for (const [bucketName, bucketData] of Object.entries(buckets)) {
        html += renderBucketCard(bucketName, bucketData);
    }
    
    html += '</div>';
    return html;
}
```

#### Detail View Rendering

```javascript
function renderBucketView(bucketName, goals) {
    const byType = groupByGoalType(goals);
    
    let html = '<div class="detail-container">';
    html += `<h2>${bucketName}</h2>`;
    
    for (const [type, typeData] of Object.entries(byType)) {
        html += renderGoalTable(type, typeData);
    }
    
    html += '</div>';
    return html;
}
```

#### Table Generation

```javascript
function renderGoalTable(goalType, data) {
    return `
        <div class="goal-type-section">
            <h3>${goalType}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Goal</th>
                        <th>Investment</th>
                        <th>% of ${goalType}</th>
                        <th>Return</th>
                        <th>Growth %</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.goals.map(g => renderGoalRow(g, data.totalInvestment)).join('')}
                </tbody>
            </table>
        </div>
    `;
}
```

---

## Implementation Comparison

### Firefox Extension vs Tampermonkey Script

#### Core Functionality Parity

| Feature | Firefox Extension | Tampermonkey Script | Status |
|---------|------------------|---------------------|--------|
| API Interception | ✅ WebRequest API | ✅ Monkey Patching | ✅ Equivalent |
| Data Merging | ✅ 3 endpoints | ✅ 3 endpoints | ✅ Identical |
| Bucket Grouping | ✅ First word | ✅ First word | ✅ Identical |
| Return Calculations | ✅ | ✅ | ✅ Identical |
| Summary View | ✅ | ✅ | ✅ Identical |
| Detail View | ✅ | ✅ | ✅ Identical |

#### Technical Differences

| Aspect | Firefox Extension | Tampermonkey Script |
|--------|------------------|---------------------|
| Architecture | Background + Content | Single userscript |
| Messaging | `browser.runtime` | Direct calls |
| API Method | WebRequest API | Monkey patching |
| Permissions | Extensive | Minimal |
| Installation | Manual load | One-click |
| Updates | Manual | Automatic |

#### Browser Compatibility

| Browser | Firefox Extension | Tampermonkey Script |
|---------|------------------|---------------------|
| Firefox | ✅ Native | ✅ via Tampermonkey |
| Chrome | ❌ | ✅ via Tampermonkey |
| Edge | ❌ | ✅ via Tampermonkey |
| Safari | ❌ | ✅ via Tampermonkey |
| Opera | ❌ | ✅ via Tampermonkey |

#### Advantages & Disadvantages

**Tampermonkey Script:**
- ✅ Cross-browser compatibility
- ✅ Easy installation and updates
- ✅ Modern UI design
- ✅ Simplified architecture
- ❌ Depends on third-party extension
- ❌ Potential CSP issues

**Firefox Extension:**
- ✅ Native browser integration
- ✅ Official API usage
- ✅ Better security model
- ❌ Firefox-only
- ❌ Complex architecture
- ❌ Manual installation required

---

## Development Guide

### Setting Up Development Environment

#### For Tampermonkey Script

1. **Install Tampermonkey** in your browser
2. **Enable Developer Mode**:
   - Open Tampermonkey dashboard
   - Go to Settings
   - Set Config Mode to "Advanced"
   - Enable "Show advanced options"
3. **Create New Script**:
   - Click "Create a new script"
   - Start coding

#### For Firefox Extension

1. **Install Firefox Developer Edition** (recommended)
2. **Navigate to** `about:debugging`
3. **Load Extension Temporarily**:
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

### Modifying the Tampermonkey Script

**Workflow:**
1. Edit script in Tampermonkey editor
2. Save changes (Ctrl+S)
3. Refresh Endowus page
4. Test functionality
5. Check browser console for errors

**Key Sections to Modify:**

```javascript
// === Configuration ===
const API_ENDPOINTS = {
    performance: '/v1/goals/performance',
    investible: '/v2/goals/investible',
    summary: '/v1/goals'
};

// === Data Processing ===
function mergeAPIResponses() { /* ... */ }
function aggregateBuckets() { /* ... */ }

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
        console.log(`[Portfolio Viewer] ${message}`, data);
    }
}

// Usage
debug('API Response:', responseData);
debug('Merged Data:', mergedData);
```

#### Inspecting Intercepted Data

```javascript
window.portfolioViewerDebug = {
    performanceData: [],
    investibleData: [],
    summaryData: [],
    mergedData: []
};

// Access via console:
// portfolioViewerDebug.performanceData
```

#### Testing Without Endowus

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
// Check if styles are injected
const styleElement = document.getElementById('portfolio-viewer-styles');
console.log('Styles injected:', !!styleElement);

// Check for CSS conflicts
const button = document.getElementById('portfolio-viewer-button');
console.log('Button computed styles:', window.getComputedStyle(button));
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

Yes, modify the `extractBucket()` function:

```javascript
function extractBucket(goalName) {
    // Original: "BucketName - Goal Description"
    // New: "Goal Description (BucketName)"
    const match = goalName.match(/\(([^)]+)\)$/);
    return match ? match[1] : 'Uncategorized';
}
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

Use a lightweight charting library:

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
   - Use consistent indentation (2 spaces)
   - Add comments for complex logic
   - Use descriptive variable names

2. **Test thoroughly**
   - Test with real Endowus data
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
- Complete rewrite from Firefox extension
- Modern gradient UI design
- Cross-browser compatibility
- Monkey patching API interception
- Auto-update functionality
- Enhanced animations and transitions
- Improved data visualization

### Version 1.0.0 (Firefox Extension)
- Initial release
- WebRequest API interception
- Basic UI
- Summary and detail views
- Bucket grouping by goal name

---

## Additional Resources

- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)
- [Userscript Best Practices](https://wiki.greasespot.net/Code_Patterns)
- [Firefox Extension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Web API Reference](https://developer.mozilla.org/en-US/docs/Web/API)

---

*Last updated: 2024*
