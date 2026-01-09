# Demo Environment

This directory contains tools and files for demonstrating the Goal Portfolio Viewer with mock data.

## Contents

### Mock Data Generation
- **`generate-mock-data.py`** - Python script that generates realistic mock investment data
  - Creates 2 buckets: Personal and Holiday
  - Each bucket has 5 core-satellite goals: Core, Tech, China, Megatrends, Real Estate
  - All goals under Investment type (GENERAL_WEALTH_ACCUMULATION)
  - Generates JSON file with API response format

- **`mock-data.json`** - Generated mock data (performance, investible, summary endpoints)
- **`mock-data.js`** - JavaScript version of the mock data generator

### Demo Pages
- **`demo-clean.html`** - Minimal demo page that works with the modified userscript
  - Sets `__GPV_DEMO_MODE__` flag to enable button in non-Endowus URLs
  - Mocks Tampermonkey API (GM_setValue, GM_getValue, etc.)
  - Loads mock data from JSON file
  - Loads modified userscript with demo mode enabled

- **`index.html`** - Full-featured demo page with info panel
- **`demo.html`** - Alternative demo page (kept for reference)

### Support Files
- **`loader.js`** - Dynamic script loader (not currently used)
- **`take-screenshots.py`** - Helper script for screenshot instructions

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

Use Playwright or manual browser screenshots to capture:
- Summary view (both buckets)
- Personal bucket detail view
- Holiday bucket detail view

## Mock Data Structure

### Personal Bucket (~$92k)
- Personal - Core: ~$47k (8.69% return)
- Personal - Tech: ~$14k (12.32% return)
- Personal - China: ~$14k (-5.24% return)
- Personal - Megatrends: ~$10k (8.99% return)
- Personal - Real Estate: ~$7k (2.76% return)

### Holiday Bucket (~$35k)
- Holiday - Core: ~$19k (7.47% return)
- Holiday - Tech: ~$6k (3.67% return)
- Holiday - China: ~$4k (-1.85% return)
- Holiday - Megatrends: ~$3k (10.96% return)
- Holiday - Real Estate: ~$3k (4.40% return)

All amounts are randomized with each generation while maintaining realistic proportions and return ranges.

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
