# Demo Environment

This directory contains tools and files for demonstrating the Goal Portfolio Viewer with mock data.

## Contents

### Mock Data Generation
- **`generate-mock-data.py`** - Python script that generates realistic mock investment data
  - Creates 2 buckets: House Purchase (~$200k) and Retirement (~$60k)
  - House Purchase: 70% Core-Balanced, 10% Megatrends, 10% Tech, 10% China
  - Retirement: 55% Core-Aggressive, 15% Megatrends, 15% Tech, 15% China
  - Actual investments have realistic variance from targets (-8% to +10%) for realism
  - All goals under Investment type (GENERAL_WEALTH_ACCUMULATION)
  - Generates JSON file with API response format
  - **Includes `performanceTimeSeries`** with:
    - `timeSeries.data` - Daily time-series data for performance charts
    - `returnsTable.twr` - Time-Weighted Return metrics (1m, 6m, ytd, 1y, 3y)
    - Realistic bumpy performance with market volatility patterns
    - Contribution events for testing contribution-adjusted calculations

- **`mock-data.json`** - Generated mock data (performance, investible, summary, performanceTimeSeries)
- **`mock-data.js`** - JavaScript version of the mock data generator (legacy)
- **`BUCKET_CONFIGURATION.md`** - Documentation of bucket structure, targets, and calculated values

### Screenshot Tools
- **`take-screenshots.py`** - Python script for manual screenshot instructions
- **`take-screenshots.js`** - Node.js script for automated Playwright screenshots
- **`take-screenshots-automated.sh`** - Shell wrapper for automated screenshots
- **`prepare-demo.sh`** - Prepares demo userscript files for local testing

### Demo Pages
- **`demo-clean.html`** - Minimal demo page that works with the modified userscript
  - Sets `__GPV_DEMO_MODE__` flag to enable button in non-Endowus URLs
  - Mocks Tampermonkey API (GM_setValue, GM_getValue, etc.)
  - Loads mock data from JSON file including performanceTimeSeries
  - Loads modified userscript with demo mode enabled

- **`index.html`** - Full-featured demo page with info panel
- **`demo.html`** - Alternative demo page (kept for reference)

### Generated Files (gitignored)
- **`goal_portfolio_viewer_demo.user.js`** - Modified userscript with demo mode patch
- **`goal_portfolio_viewer.user.js`** - Copy of main userscript

## Usage

### Generate New Mock Data

```bash
python3 generate-mock-data.py
```

This creates `mock-data.json` with randomized investment amounts and returns.

### Run Demo Locally

1. Start a local web server:
   ```bash
   cd demo
   python3 -m http.server 8080
   ```

2. Open in browser:
   ```
   http://localhost:8080/demo-clean.html
   ```

3. Click the "📊 Portfolio Viewer" button that appears in the bottom-right

### Take Screenshots

#### Automated (Recommended)

Using Node.js with Playwright:
```bash
# Install Playwright (one-time setup)
npm install playwright
npx playwright install chromium

# Run automated screenshot capture
node take-screenshots.js
```

This will automatically:
- Open the demo in a headless browser
- Click the Portfolio Viewer button
- Capture summary view
- Navigate to each bucket detail view
- Scroll to capture both the performance graph AND goals table
- Save all screenshots to the `assets/` directory

#### Manual

Using Python helper script for instructions:
```bash
python3 take-screenshots.py
```

Or manually capture screenshots:
- Summary view (both buckets: House Purchase and Retirement)
- House Purchase bucket detail view (scroll to capture goals table)
- Retirement bucket detail view (scroll to capture goals table)

**Important**: When capturing bucket detail views, make sure to scroll down to include the goals table (individual goal breakdowns with investment amounts and returns).

### Example Screenshots

**House Purchase Bucket - Top Section (Performance Graph):**

![House Purchase - Top](https://github.com/user-attachments/assets/57003f68-75ef-45c4-b0dd-48ffa7c575db)

**House Purchase Bucket - Bottom Section (Goals Table):**

![House Purchase - Bottom](https://github.com/user-attachments/assets/e980446b-e4ca-463a-8fdd-f459f6156c4a)

**Retirement Bucket - Top Section (Performance Graph):**

![Retirement - Top](https://github.com/user-attachments/assets/deeb7a7d-be6c-4c50-bfdb-7ad8c208bcf3)

**Retirement Bucket - Bottom Section (Goals Table):**

![Retirement - Bottom](https://github.com/user-attachments/assets/524ada98-1a28-4524-b257-fb9ddb8c1f00)

## Mock Data Structure

### House Purchase Bucket (~$194k)
- House Purchase - Core - Balanced: ~$133k (70% allocation, +11.98% return)
- House Purchase - Megatrends: ~$21k (10% allocation, +11.24% return)
- House Purchase - Tech: ~$21k (10% allocation, +3.58% return)
- House Purchase - China: ~$19k (10% allocation, +0.67% return)

### Retirement Bucket (~$57k)
- Retirement - Core - Aggressive: ~$32k (55% allocation, +10.80% return)
- Retirement - Megatrends: ~$9k (15% allocation, +14.35% return)
- Retirement - Tech: ~$9k (15% allocation, +1.51% return)
- Retirement - China: ~$9k (15% allocation, +2.17% return)

All amounts are randomized with each generation while maintaining realistic proportions and return ranges.
Actual investments have realistic variance from targets (-8% to +10%) for demo realism.

## Technical Notes

### Demo Mode Patch

The demo requires a modified userscript that checks for `window.__GPV_DEMO_MODE__` in addition to the Endowus dashboard URL:

```javascript
function shouldShowButton() {
    return window.location.href === 'https://app.sg.endowus.com/dashboard' || 
           window.__GPV_DEMO_MODE__ === true;
}
```

### Mock Tampermonkey API

The demo pages provide a minimal Tampermonkey API implementation:

```javascript
const mockStorage = {};

window.GM_setValue = function(key, value) {
    mockStorage[key] = value;
};

window.GM_getValue = function(key, defaultValue) {
    return mockStorage.hasOwnProperty(key) ? mockStorage[key] : defaultValue;
};

window.GM_deleteValue = function(key) {
    delete mockStorage[key];
};
```

This allows the userscript to run without actual Tampermonkey installed.
