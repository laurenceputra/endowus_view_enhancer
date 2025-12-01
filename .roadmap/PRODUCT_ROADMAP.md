# Endowus Portfolio Viewer - Product Roadmap

**Version**: 1.0  
**Last Updated**: December 2025  
**Current Version**: v2.1.1

---

## Executive Summary

This roadmap outlines the strategic direction for the Endowus Portfolio Viewer over the next 12-18 months. Our focus is on enhancing financial decision-making while maintaining our core principles: **privacy-first, accuracy-critical, user empowerment, and simplicity**.

### Vision
Become the essential companion tool for Endowus investors, providing deep portfolio insights that empower better financial decisions—all while keeping data private and secure.

### Current State Assessment
- **Strengths**: Solid API interception, clean bucket aggregation, modern UI, privacy-first architecture
- **User Base**: Growing adoption among sophisticated Endowus investors
- **Technical Health**: Stable v2.1.1, cross-browser compatible, minimal bugs
- **Pain Points**: Limited historical tracking, no data export, desktop-only, manual bucket management

---

## Product Principles

Before adding any feature, evaluate against these principles:

| Principle | Criteria |
|-----------|----------|
| **Privacy First** | All processing client-side, no external data transmission |
| **Accuracy Critical** | Financial calculations must be precise and validated |
| **User Empowerment** | Give users control, support diverse strategies |
| **Simplicity** | Intuitive UX, minimal configuration, easy to install |

### Decision Framework

**MUST HAVE**: Improves financial decisions + Technically feasible + Maintains privacy + No breaking changes  
**SHOULD HAVE**: Serves common need + Reasonable maintenance + Aligns with principles + Incremental implementation  
**WON'T HAVE**: Requires backend + Modifies Endowus API + Overly complex + Conflicts with browser extension model

---

## Quarterly Roadmap

### Q1 2026: Foundation & Stability
**Theme**: Solidify core functionality, fix edge cases, improve reliability

#### High Priority

##### 1.1 Enhanced Data Export (High Impact, Medium Effort)
**Problem**: Users want to analyze portfolio data in Excel, Google Sheets, or other tools  
**Solution**: Export to CSV, JSON, and Excel formats with customizable fields  

**User Stories**:
- As an investor, I want to export my portfolio data to CSV so I can analyze trends in Excel
- As a tax preparer, I want to export year-end data so I can file accurate tax returns
- As a financial planner, I want to export bucket summaries so I can review my strategy

**Acceptance Criteria**:
- [ ] CSV export with all goal data (name, investment, returns, growth %, bucket, goal type)
- [ ] JSON export for programmatic access
- [ ] Excel export with formatted tables and charts
- [ ] Export both summary (by bucket) and detailed (by goal) views
- [ ] Include timestamp and portfolio totals in export
- [ ] File naming: `endowus_portfolio_YYYY-MM-DD.csv`
- [ ] Handle special characters in goal names (quotes, commas)
- [ ] Preserve number formatting (currency, percentages)

**Technical Approach**:
```javascript
function exportToCSV(data, viewType) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `endowus_portfolio_${viewType}_${timestamp}.csv`;
  
  // Build CSV with proper escaping
  const csv = buildCSV(data);
  
  // Trigger download
  downloadFile(csv, filename, 'text/csv');
}
```

**Success Metrics**: 
- 40%+ of active users use export within first month
- Zero data corruption reports
- Positive feedback on export formats

---

##### 1.2 Data Persistence & Historical Tracking (High Impact, High Effort)
**Problem**: Users can't track performance over time or see historical trends  
**Solution**: Store snapshots locally using IndexedDB, enable time-based comparisons  

**User Stories**:
- As an investor, I want to see my portfolio performance over the past 6 months
- As a tracker, I want to know if my strategy is improving quarter-over-quarter
- As a long-term planner, I want to visualize growth trends across buckets

**Acceptance Criteria**:
- [ ] Automatic daily snapshots stored in IndexedDB (client-side database)
- [ ] Manual "Save Snapshot" button for important milestones
- [ ] View historical data: 7 days, 30 days, 90 days, 1 year, all-time
- [ ] Compare current vs. previous period (% change)
- [ ] Line charts showing investment and returns over time
- [ ] Data retention: Keep up to 2 years of daily snapshots
- [ ] Export historical data to CSV
- [ ] Clear storage option for privacy-conscious users
- [ ] Data migration from v2.1.1 (graceful handling of no history)

**Technical Approach**:
```javascript
// Use IndexedDB for persistent storage
const db = await openDB('EndowusPortfolio', 1, {
  upgrade(db) {
    db.createObjectStore('snapshots', { keyPath: 'timestamp' });
  }
});

async function saveSnapshot() {
  const snapshot = {
    timestamp: Date.now(),
    data: mergedInvestmentData,
    buckets: groupByBucket(mergedInvestmentData),
    totals: calculateTotals(mergedInvestmentData)
  };
  await db.put('snapshots', snapshot);
}
```

**Privacy Notes**:
- All data stays in browser's IndexedDB (no cloud sync)
- Users can clear all historical data with one click
- Automatic cleanup of snapshots older than 2 years

**Success Metrics**:
- Historical data available for 80%+ of users after 30 days
- Zero data loss incidents
- 25%+ of users view historical trends monthly

---

##### 1.3 Mobile Optimization (Medium Impact, High Effort)
**Problem**: Tampermonkey doesn't work on mobile browsers; mobile users can't access the tool  
**Solution**: Create responsive mobile-friendly UI, explore mobile browser extension alternatives  

**User Stories**:
- As a mobile user, I want to check my portfolio on my phone during commute
- As an on-the-go investor, I want quick access to bucket summaries on mobile
- As a tablet user, I want the interface to adapt to my screen size

**Acceptance Criteria**:
- [ ] Responsive design works on screens 360px+ width
- [ ] Touch-friendly buttons and interactions (min 44x44px touch targets)
- [ ] Simplified mobile view with collapsible sections
- [ ] Swipe gestures for navigation (bucket to bucket)
- [ ] Modal scales to fit mobile screen without horizontal scroll
- [ ] Test on iOS Safari, Chrome Mobile, Firefox Mobile
- [ ] Consider PWA (Progressive Web App) wrapper for mobile installation
- [ ] Fallback: Mobile-specific bookmarklet version

**Technical Approach**:
```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
  .modal-container {
    width: 95vw;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .bucket-card {
    width: 100%;
    margin-bottom: 1rem;
  }
  
  table {
    font-size: 0.875rem;
  }
}

/* Touch-friendly tap targets */
.portfolio-viewer-button {
  min-width: 60px;
  min-height: 60px;
  touch-action: manipulation;
}
```

**Mobile Extension Options**:
1. **Bookmarklet**: JavaScript snippet users save as bookmark
2. **PWA**: Progressive Web App that uses Endowus's API (requires CORS handling)
3. **Mobile Script Managers**: Explore UserScripts (iOS), Kiwi Browser (Android with extensions)

**Success Metrics**:
- 50%+ mobile satisfaction rating
- Works on iOS Safari, Chrome Mobile, Firefox Mobile
- Mobile usage accounts for 15%+ of total sessions

---

##### 1.4 Advanced Error Handling & User Feedback (Medium Impact, Low Effort)
**Problem**: When things go wrong, users don't know what happened or how to fix it  
**Solution**: Comprehensive error messages, loading states, data validation warnings  

**User Stories**:
- As a user, I want to know why my data isn't loading
- As a troubleshooter, I want clear guidance on fixing issues
- As a new user, I want to understand what "waiting for data" means

**Acceptance Criteria**:
- [ ] Loading indicator shows which APIs are pending (e.g., "2 of 3 APIs loaded")
- [ ] Error messages explain the problem and suggest solutions
- [ ] Data validation warnings (e.g., "5 goals missing investment data")
- [ ] Connection status indicator (API reachable vs. network issue)
- [ ] "Refresh Data" button to manually re-trigger API interception
- [ ] Debug mode toggle (advanced users can see console logs)
- [ ] In-app help tooltip with quick start guide
- [ ] Graceful degradation: Show partial data if some APIs fail

**Error Scenarios**:
```javascript
const ERROR_MESSAGES = {
  NO_DATA: {
    title: "No Portfolio Data Found",
    message: "Navigate through your Endowus portfolio to load data.",
    action: "Visit your Goals page and return here."
  },
  PARTIAL_DATA: {
    title: "Incomplete Data",
    message: "Some goals are missing information.",
    action: "Refresh the page and try again."
  },
  API_ERROR: {
    title: "Connection Issue",
    message: "Unable to load data from Endowus.",
    action: "Check your internet connection and refresh."
  }
};
```

**Success Metrics**:
- 50% reduction in "not working" support requests
- 90%+ users understand loading states
- Error recovery success rate: 80%+

---

#### Medium Priority

##### 1.5 Custom Bucket Colors & Icons (Low Impact, Low Effort)
**Problem**: All buckets look the same; hard to distinguish at a glance  
**Solution**: Let users assign colors and emoji icons to buckets  

**Acceptance Criteria**:
- [ ] Color picker for each bucket (10 preset colors + custom)
- [ ] Emoji picker for bucket icons (or upload small image)
- [ ] Settings stored in Tampermonkey storage (GM_setValue)
- [ ] Default gradient colors if not customized
- [ ] Preview changes before saving
- [ ] Reset to defaults option

**Technical Approach**:
```javascript
const bucketSettings = {
  'Retirement': { color: '#667eea', icon: '🏖️' },
  'Education': { color: '#10b981', icon: '🎓' },
  'Emergency': { color: '#ef4444', icon: '🚨' }
};

GM_setValue('bucket_settings', JSON.stringify(bucketSettings));
```

**Success Metrics**:
- 30%+ of users customize at least one bucket
- Improved visual scanning speed (anecdotal)

---

##### 1.6 Performance Optimization (Low Impact, Medium Effort)
**Problem**: Large portfolios (20+ goals) cause lag when opening viewer  
**Solution**: Optimize rendering, lazy loading, virtual scrolling  

**Acceptance Criteria**:
- [ ] Modal opens in <500ms regardless of portfolio size
- [ ] Virtual scrolling for goal tables (render only visible rows)
- [ ] Debounced search/filter inputs (300ms delay)
- [ ] Memoized calculations (cache bucket aggregations)
- [ ] Profiling to identify bottlenecks
- [ ] Support up to 100 goals without noticeable lag

**Technical Approach**:
```javascript
// Memoization
let cachedBuckets = null;
let lastDataHash = null;

function getBuckets(data) {
  const currentHash = hashData(data);
  if (currentHash === lastDataHash && cachedBuckets) {
    return cachedBuckets;
  }
  
  cachedBuckets = groupByBucket(data);
  lastDataHash = currentHash;
  return cachedBuckets;
}
```

**Success Metrics**:
- P95 modal open time <500ms
- Smooth scrolling on 50+ goal portfolios
- Zero UI freezes reported

---

### Q2 2026: Visualization & Insights
**Theme**: Help users understand their portfolio through charts, trends, and analytics

#### High Priority

##### 2.1 Interactive Charts & Graphs (High Impact, High Effort)
**Problem**: Tables are dense; visual representations make data easier to digest  
**Solution**: Add pie charts, bar charts, line graphs for portfolio composition and trends  

**User Stories**:
- As a visual learner, I want to see my bucket allocation as a pie chart
- As a tracker, I want line graphs showing portfolio growth over time
- As a comparator, I want bar charts comparing bucket performance

**Acceptance Criteria**:
- [ ] Pie chart: Portfolio allocation by bucket (% of total investment)
- [ ] Bar chart: Returns by bucket (side-by-side comparison)
- [ ] Line chart: Portfolio value over time (requires historical data from 1.2)
- [ ] Stacked area chart: Investment composition over time
- [ ] Interactive tooltips on hover (show exact values)
- [ ] Toggle between chart and table views
- [ ] Export charts as PNG images
- [ ] Responsive charts (resize for mobile)
- [ ] Accessible: Keyboard navigation, screen reader support

**Technical Approach**:
```javascript
// Use lightweight chart library (e.g., Chart.js ~200KB)
// @require https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js

function renderPieChart(buckets) {
  const canvas = document.createElement('canvas');
  new Chart(canvas, {
    type: 'pie',
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        data: Object.values(buckets).map(b => b.totalInvestment),
        backgroundColor: Object.keys(buckets).map(b => getBucketColor(b))
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = formatMoney(context.parsed);
              const percentage = ((context.parsed / totalInvestment) * 100).toFixed(1);
              return `${context.label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
  return canvas;
}
```

**Chart Types & Use Cases**:
| Chart | Use Case | Data Source |
|-------|----------|-------------|
| Pie | Allocation by bucket | Current snapshot |
| Bar | Returns comparison | Current snapshot |
| Line | Growth over time | Historical data |
| Stacked Area | Composition changes | Historical data |

**Success Metrics**:
- 60%+ of users view charts weekly
- 30%+ users toggle chart view as primary
- Positive feedback on visual clarity

---

##### 2.2 Advanced Filtering & Search (Medium Impact, Medium Effort)
**Problem**: Hard to find specific goals in large portfolios  
**Solution**: Search goals by name, filter by bucket/type/performance  

**User Stories**:
- As a searcher, I want to find "Core Portfolio" goals instantly
- As a filter user, I want to see only positive-return goals
- As a type sorter, I want to filter by "Investment" vs "Cash" goals

**Acceptance Criteria**:
- [ ] Search bar: Filter goals by name (fuzzy matching)
- [ ] Filter by bucket (multi-select dropdown)
- [ ] Filter by goal type (Investment, Cash, SRS, etc.)
- [ ] Filter by performance: Positive returns, Negative returns, All
- [ ] Sort by: Name, Investment (high/low), Returns (high/low), Growth % (high/low)
- [ ] Clear all filters button
- [ ] Show result count (e.g., "Showing 5 of 12 goals")
- [ ] Persist filter state when switching views
- [ ] Keyboard shortcuts: Ctrl+F to focus search

**Technical Approach**:
```javascript
function filterGoals(goals, filters) {
  return goals.filter(goal => {
    // Search filter
    if (filters.search && !goal.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Bucket filter
    if (filters.buckets.length > 0 && !filters.buckets.includes(goal.bucket)) {
      return false;
    }
    
    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(goal.goalType)) {
      return false;
    }
    
    // Performance filter
    if (filters.performance === 'positive' && goal.cumulativeReturn < 0) {
      return false;
    }
    if (filters.performance === 'negative' && goal.cumulativeReturn >= 0) {
      return false;
    }
    
    return true;
  });
}
```

**Success Metrics**:
- 40%+ users use search/filter monthly
- Average time to find goal: <10 seconds
- Filter combinations used: 3+ per session

---

##### 2.3 Portfolio Health Score & Insights (Medium Impact, High Effort)
**Problem**: Users don't know if their portfolio is healthy or needs rebalancing  
**Solution**: Calculate health score, provide actionable insights  

**User Stories**:
- As an investor, I want to know if my portfolio is well-diversified
- As a rebalancer, I want alerts when buckets drift from target allocation
- As a beginner, I want simple advice on portfolio health

**Acceptance Criteria**:
- [ ] Portfolio Health Score (0-100) with color indicator
- [ ] Diversification score (based on bucket distribution)
- [ ] Rebalancing suggestions (if buckets > 10% off target)
- [ ] Risk assessment (based on volatility of returns)
- [ ] Performance vs. benchmark (if user sets targets)
- [ ] Insight cards with explanations and actions
- [ ] Settings to define target allocations per bucket
- [ ] Dismiss/hide insights user doesn't care about

**Health Score Factors**:
| Factor | Weight | Calculation |
|--------|--------|-------------|
| Diversification | 30% | Bucket count, even distribution |
| Performance | 30% | Positive returns, growth consistency |
| Risk Balance | 20% | Mix of conservative & aggressive goals |
| Goal Completion | 20% | Progress toward user-defined targets |

**Insights Examples**:
```javascript
const insights = [
  {
    type: 'warning',
    title: 'Retirement Bucket Underweight',
    message: 'Your Retirement bucket is 15% below target allocation.',
    action: 'Consider adding $5,000 to rebalance.'
  },
  {
    type: 'success',
    title: 'Strong Diversification',
    message: 'Your portfolio is well-distributed across 5 buckets.',
    action: null
  },
  {
    type: 'info',
    title: 'Emergency Fund Goal Met',
    message: 'Your Emergency bucket has reached target allocation.',
    action: 'Consider redirecting new funds to growth buckets.'
  }
];
```

**Success Metrics**:
- 50%+ users check health score monthly
- 25%+ users act on insights (anecdotal)
- Positive feedback on insight quality

---

#### Medium Priority

##### 2.4 Bucket Target Tracking (Medium Impact, Medium Effort)
**Problem**: Users have target allocations but can't track progress  
**Solution**: Set target investment amounts per bucket, show progress bars  

**Acceptance Criteria**:
- [ ] Set target amount for each bucket (e.g., "Retirement: $500,000")
- [ ] Progress bars showing % complete (visual + numeric)
- [ ] Overfunded indicator (>100%)
- [ ] Time to goal estimation (based on historical growth)
- [ ] Alerts when within 10% of target
- [ ] Export targets to CSV
- [ ] Import targets from CSV (bulk setup)

**Technical Approach**:
```javascript
const bucketTargets = {
  'Retirement': { target: 500000, current: 350000 },
  'Education': { target: 200000, current: 150000 }
};

function calculateProgress(bucket) {
  const { target, current } = bucketTargets[bucket];
  const progress = (current / target) * 100;
  const remaining = target - current;
  
  // Estimate time to goal based on historical monthly growth
  const monthlyGrowth = calculateMonthlyGrowth(bucket);
  const monthsToGoal = monthlyGrowth > 0 ? remaining / monthlyGrowth : null;
  
  return { progress, remaining, monthsToGoal };
}
```

**Success Metrics**:
- 40%+ users set at least one target
- Users report increased goal clarity (survey)

---

##### 2.5 Comparison Views (Low Impact, Medium Effort)
**Problem**: Can't easily compare buckets or time periods  
**Solution**: Side-by-side comparison mode  

**Acceptance Criteria**:
- [ ] Compare 2 buckets side-by-side (investment, returns, growth %)
- [ ] Compare current vs. past period (requires historical data)
- [ ] Highlight differences (color-coded increases/decreases)
- [ ] Export comparison to CSV
- [ ] Support 3+ bucket comparison with table view

**Success Metrics**:
- 20%+ users try comparison feature
- Useful for quarterly portfolio reviews

---

### Q3 2026: Data Management & Customization
**Theme**: Give users more control over their data and experience

#### High Priority

##### 3.1 Custom Calculations & Metrics (High Impact, High Effort)
**Problem**: Users want to track metrics specific to their strategy (e.g., dividend yield, expense ratio)  
**Solution**: Allow users to define custom calculated fields  

**User Stories**:
- As a dividend investor, I want to see estimated annual dividends per bucket
- As a cost-conscious investor, I want to track total fees paid
- As a tax planner, I want to calculate tax implications of returns

**Acceptance Criteria**:
- [ ] Formula builder: Create calculations using available data fields
- [ ] Pre-built templates: Dividend yield, expense ratio, tax impact
- [ ] Custom field appears in tables and exports
- [ ] Support arithmetic operations: +, -, *, /, %, ()
- [ ] Validation: Prevent division by zero, invalid formulas
- [ ] Save up to 10 custom fields per user
- [ ] Toggle custom fields on/off in views
- [ ] Documentation with examples

**Formula Examples**:
```javascript
// User defines formulas with simple syntax
const customFormulas = [
  {
    name: 'Annual Dividends',
    formula: 'investment * 0.03', // Assumes 3% dividend yield
    format: 'currency'
  },
  {
    name: 'Cost Basis',
    formula: 'investment - cumulativeReturn',
    format: 'currency'
  },
  {
    name: 'Tax Liability (30%)',
    formula: 'cumulativeReturn * 0.30',
    format: 'currency'
  }
];

function evaluateFormula(formula, goal) {
  // Parse and evaluate safely (no eval())
  const parser = new FormulaParser();
  return parser.parse(formula, goal);
}
```

**Security Note**: Use a safe expression parser (no `eval()`), limit formula complexity

**Success Metrics**:
- 25%+ users create at least one custom metric
- Top 5 formulas identified for templates
- Zero security incidents

---

##### 3.2 Data Archiving & Backup (Medium Impact, Medium Effort)
**Problem**: Users fear losing historical data if browser storage is cleared  
**Solution**: Export complete data archive, import to restore  

**Acceptance Criteria**:
- [ ] "Backup All Data" button → Downloads ZIP file
- [ ] ZIP contains: Current snapshot, historical data, settings, custom formulas
- [ ] "Restore from Backup" → Upload ZIP to restore
- [ ] Automatic weekly backup reminder (optional)
- [ ] Data validation on import (check format, version compatibility)
- [ ] Merge or replace option when restoring
- [ ] Backup includes metadata (version, timestamp, portfolio total)

**Backup Format**:
```json
{
  "version": "2.2.0",
  "timestamp": "2026-03-15T10:30:00Z",
  "metadata": {
    "totalInvestment": 450000,
    "totalReturn": 35000,
    "goalCount": 12,
    "bucketCount": 4
  },
  "currentSnapshot": { /* full data */ },
  "historicalSnapshots": [ /* array of past snapshots */ ],
  "settings": { /* user preferences */ },
  "customFormulas": [ /* user-defined calculations */ ]
}
```

**Success Metrics**:
- 30%+ users back up data within first 3 months
- Zero data loss complaints
- Successful restore rate: 95%+

---

##### 3.3 Advanced Bucket Management (Medium Impact, Medium Effort)
**Problem**: Renaming buckets requires renaming all goals; can't merge buckets  
**Solution**: Bucket mapping interface for bulk operations  

**User Stories**:
- As a renamer, I want to change "Retirement" to "Retirement Fund" without editing 10 goals
- As a consolidator, I want to merge "Emergency" and "Emergency Fund" buckets
- As an organizer, I want to split a bucket into sub-buckets

**Acceptance Criteria**:
- [ ] Bucket management panel: List all buckets with goal counts
- [ ] Rename bucket: Updates display name (doesn't modify Endowus goals)
- [ ] Merge buckets: Combine multiple buckets into one
- [ ] Split bucket: Create rules to subdivide (e.g., by goal type)
- [ ] Bucket mappings stored locally (goals unchanged on Endowus)
- [ ] Reset to original bucket names option
- [ ] Preview changes before applying
- [ ] Export/import bucket mappings

**Technical Approach**:
```javascript
const bucketMappings = {
  'Retirement - Core Portfolio': 'Retirement',
  'Retirement - Satellite': 'Retirement',
  'Emergency': 'Emergency Fund',
  'Emergency Reserve': 'Emergency Fund'
};

function applyBucketMapping(goal) {
  const originalBucket = extractBucket(goal.name);
  return bucketMappings[goal.name] || bucketMappings[originalBucket] || originalBucket;
}
```

**Success Metrics**:
- 20%+ users create at least one mapping
- Reduces need to rename goals on Endowus
- Positive feedback on flexibility

---

#### Medium Priority

##### 3.4 Theme Customization (Low Impact, Low Effort)
**Problem**: Users want to personalize appearance  
**Solution**: Light/dark mode, custom themes  

**Acceptance Criteria**:
- [ ] Light mode, dark mode, auto (follows system)
- [ ] 5 preset themes (default, ocean, forest, sunset, monochrome)
- [ ] Custom theme builder (primary color, secondary color, accent)
- [ ] Preview themes before applying
- [ ] Accessibility: WCAG AA contrast compliance
- [ ] Theme stored in Tampermonkey storage

**Success Metrics**:
- 40%+ users switch from default theme
- Dark mode most popular alternative

---

##### 3.5 Keyboard Shortcuts (Low Impact, Low Effort)
**Problem**: Power users want faster navigation  
**Solution**: Comprehensive keyboard shortcut system  

**Acceptance Criteria**:
- [ ] `Ctrl+Shift+P` - Open Portfolio Viewer
- [ ] `Escape` - Close modal
- [ ] `Tab` / `Shift+Tab` - Navigate between buckets
- [ ] `Enter` - Open selected bucket detail
- [ ] `Ctrl+E` - Export current view
- [ ] `Ctrl+F` - Focus search box
- [ ] `?` - Show keyboard shortcuts help overlay
- [ ] Shortcuts work across all views

**Success Metrics**:
- 15%+ users discover shortcuts
- Power users report faster workflow

---

### Q4 2026: User Experience & Polish
**Theme**: Refine the experience, onboard new users, improve accessibility

#### High Priority

##### 4.1 Interactive Onboarding (High Impact, Medium Effort)
**Problem**: New users don't understand bucket naming convention or features  
**Solution**: First-time user tutorial and guided setup  

**User Stories**:
- As a new user, I want to understand how to organize my goals
- As a first-time viewer, I want a tour of available features
- As a learner, I want examples of good bucket strategies

**Acceptance Criteria**:
- [ ] First-run tutorial (5-step walkthrough)
- [ ] Step 1: Explain bucket concept with examples
- [ ] Step 2: Show naming convention (`Bucket - Goal`)
- [ ] Step 3: Tour of Summary view
- [ ] Step 4: Tour of Detail view
- [ ] Step 5: Highlight export & settings
- [ ] Skip tutorial option
- [ ] Re-launch tutorial from settings
- [ ] Progress indicators (Step 2 of 5)
- [ ] Contextual tooltips on first use of features

**Tutorial Content**:
```javascript
const tutorialSteps = [
  {
    target: '.portfolio-viewer-button',
    title: 'Welcome to Portfolio Viewer!',
    content: 'Click here anytime to view your organized portfolio.',
    position: 'left'
  },
  {
    target: '.summary-container',
    title: 'Bucket Organization',
    content: 'Your goals are automatically grouped into buckets based on their names. Use the format: "Bucket Name - Goal Description".',
    example: '"Retirement - Core Portfolio"',
    position: 'center'
  },
  // ... more steps
];
```

**Success Metrics**:
- 70%+ new users complete tutorial
- 50% reduction in "how do I use this?" support questions
- Improved user activation rate

---

##### 4.2 In-App Help & Documentation (Medium Impact, Low Effort)
**Problem**: Users have to leave the app to read documentation  
**Solution**: Contextual help system integrated into UI  

**Acceptance Criteria**:
- [ ] "?" icon in header opens help panel
- [ ] Searchable help articles
- [ ] Contextual help: Click ? next to any feature for explanation
- [ ] FAQ section with common questions
- [ ] Video tutorials (link to YouTube/Vimeo)
- [ ] Changelog: See what's new in recent updates
- [ ] Contact support link (GitHub issues)
- [ ] Help content loads instantly (embedded in script)

**Help Topics**:
- Getting Started Guide
- Bucket Naming Best Practices
- Understanding Growth Percentages
- Exporting Data
- Troubleshooting Common Issues
- Advanced Features
- Privacy & Security
- Keyboard Shortcuts

**Success Metrics**:
- 30%+ users access in-app help
- 40% reduction in external documentation clicks
- Positive feedback on help quality

---

##### 4.3 Accessibility Improvements (Medium Impact, Medium Effort)
**Problem**: Not fully accessible to users with disabilities  
**Solution**: WCAG 2.1 AA compliance  

**Acceptance Criteria**:
- [ ] Keyboard navigation: All features accessible without mouse
- [ ] Screen reader support: ARIA labels, semantic HTML
- [ ] Color contrast: WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Focus indicators: Clear visible focus on interactive elements
- [ ] Alternative text: All icons and images have alt text
- [ ] No reliance on color alone: Use icons + text for status
- [ ] Reduced motion option: Disable animations for users with vestibular disorders
- [ ] Adjustable font size: Support browser zoom up to 200%
- [ ] Accessible data tables: Proper headers, scope attributes

**Technical Approach**:
```html
<!-- Semantic HTML -->
<button aria-label="Open Portfolio Viewer" aria-expanded="false">
  <span aria-hidden="true">📊</span> Portfolio Viewer
</button>

<!-- Screen reader announcements -->
<div role="status" aria-live="polite" aria-atomic="true">
  Loading portfolio data... 2 of 3 APIs loaded.
</div>

<!-- Reduced motion -->
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Success Metrics**:
- Pass automated accessibility audit (WAVE, axe)
- Manual testing with screen readers (NVDA, JAWS, VoiceOver)
- Positive feedback from accessibility community

---

##### 4.4 Performance Analytics Dashboard (Low Impact, Low Effort)
**Problem**: Users don't know how much they use the tool or key metrics  
**Solution**: Usage statistics and portfolio insights dashboard  

**Acceptance Criteria**:
- [ ] "My Stats" page showing:
  - Total investment across all buckets
  - Total returns (absolute & percentage)
  - Best performing bucket
  - Worst performing bucket
  - Number of goals tracked
  - Days of historical data available
  - Most viewed bucket
  - Last snapshot date
- [ ] Privacy: All stats stored locally, never transmitted
- [ ] Export stats to CSV

**Success Metrics**:
- 35%+ users view stats page monthly
- Drives engagement with historical data features

---

#### Medium Priority

##### 4.5 Multi-Language Support (Low Impact, High Effort)
**Problem**: Non-English speakers struggle with UI  
**Solution**: Internationalization (i18n) support  

**Acceptance Criteria**:
- [ ] Support languages: English (default), Mandarin, Malay, Tamil
- [ ] UI text fully translatable
- [ ] Number/currency formatting per locale
- [ ] Date formatting per locale
- [ ] Language selection in settings
- [ ] Auto-detect browser language
- [ ] Translation files easy to maintain
- [ ] Community contribution guide for translations

**Technical Approach**:
```javascript
const translations = {
  en: {
    'button.open': 'Portfolio Viewer',
    'modal.title': 'Portfolio Summary',
    'label.investment': 'Investment',
    'label.return': 'Return'
  },
  zh: {
    'button.open': '投资组合查看器',
    'modal.title': '投资组合摘要',
    'label.investment': '投资',
    'label.return': '回报'
  }
};

function t(key) {
  const lang = getUserLanguage();
  return translations[lang][key] || translations['en'][key];
}
```

**Success Metrics**:
- 20%+ users switch to non-English language
- Community contributes 2+ additional languages

---

## Feature Backlog (Future Consideration)

### Data & Analytics
- **Tax Optimization Insights**: Calculate tax-efficient withdrawal strategies
- **Scenario Planning**: "What if I invest $X more per month?"
- **Benchmarking**: Compare against market indices (S&P 500, STI)
- **Correlation Analysis**: Identify overlapping holdings across goals
- **Risk Metrics**: Sharpe ratio, max drawdown, volatility

### Automation & Integration
- **Auto-Rebalancing Suggestions**: Specific buy/sell recommendations
- **Alert System**: Email/notification when portfolio needs attention (requires backend—violates privacy?)
- **Calendar Integration**: Sync portfolio reviews with Google Calendar
- **IFTTT/Zapier Integration**: Trigger actions based on portfolio events

### Social & Collaboration
- **Anonymous Benchmarking**: Compare your portfolio to aggregated peer data
- **Shared Portfolio Views**: Generate shareable links (anonymized)
- **Community Strategies**: Browse popular bucket organizations
- **Collaborative Planning**: Multi-user portfolios (joint accounts)

### Advanced Features
- **Monte Carlo Simulation**: Probabilistic retirement planning
- **Goal-Based Planning**: Link buckets to life events (retirement age, college start date)
- **Asset Allocation Optimizer**: Suggest optimal bucket allocations
- **Fee Analyzer**: Track and minimize investment fees
- **Portfolio X-Ray**: Deep dive into underlying holdings

---

## Success Metrics & KPIs

### Adoption Metrics
- **Active Users**: Monthly active users (MAU)
- **Installation Rate**: New installs per month
- **Retention**: 30-day, 90-day retention rates
- **Feature Usage**: % users using each major feature

### Engagement Metrics
- **Session Frequency**: How often users open viewer
- **Session Duration**: Average time spent in viewer
- **Export Usage**: % users exporting data
- **Historical Data Views**: % users viewing trends

### Quality Metrics
- **Error Rate**: % sessions with errors
- **Load Time**: P50, P95, P99 modal open times
- **Data Accuracy**: Zero financial calculation errors
- **Cross-Browser Compatibility**: Works on 99%+ of browsers

### User Satisfaction
- **GitHub Stars**: Stars on repository
- **Issue Resolution**: Average time to close issues
- **User Feedback**: Survey NPS score (Net Promoter Score)
- **Support Requests**: Trend over time (should decrease)

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Endowus API changes | High | Medium | Monitor for changes, version detection, graceful degradation |
| Browser extension policy changes | High | Low | Maintain Firefox & Chrome compatibility, bookmarklet fallback |
| IndexedDB storage limits | Medium | Medium | Implement cleanup, warn users, provide export |
| Performance degradation | Medium | Medium | Profiling, optimization, virtual scrolling |
| Security vulnerabilities | High | Low | Regular security audits, no eval(), sanitize inputs |

### Product Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low user adoption | High | Medium | Strong onboarding, clear value prop, user education |
| Feature creep | Medium | High | Strict prioritization, MVP approach, user validation |
| Maintenance burden | Medium | Medium | Modular code, good documentation, community contributions |
| Competitor emerges | Medium | Low | Focus on privacy & quality, build loyal community |

### Privacy & Legal Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Accidental data leak | Critical | Very Low | Code audits, no external calls, open source transparency |
| Perceived as data harvesting | High | Low | Clear privacy policy, in-app transparency, educational content |
| Terms of service violation | Medium | Low | Read-only interception, no modifications to Endowus |

---

## Go-to-Market Strategy

### User Acquisition
1. **GitHub**: Optimize README, add screenshots, maintain active issues
2. **Reddit**: Post in r/singaporefi, r/personalfinance communities
3. **Forums**: Endowus user groups, HardwareZone Singapore
4. **Word of Mouth**: Encourage users to share with friends
5. **YouTube**: Tutorial video walkthrough

### User Retention
1. **Regular Updates**: Monthly feature releases
2. **Communication**: Changelog in-app, update notifications
3. **Community Building**: Discord/Telegram group for users
4. **Support**: Quick response to issues, proactive help

### Success Indicators
- **Month 1-3**: 100+ active users, 5-star reviews
- **Month 4-6**: 500+ active users, 1 community contribution
- **Month 7-12**: 1,000+ active users, feature parity with roadmap Q1-Q2

---

## Maintenance & Sustainability

### Development Velocity
- **Major Releases**: Quarterly (Q1, Q2, Q3, Q4)
- **Minor Releases**: Monthly (bug fixes, small features)
- **Hotfixes**: As needed (critical bugs, API changes)

### Community Involvement
- **Open Source**: Accept pull requests for features/fixes
- **Feature Requests**: GitHub Discussions for user input
- **Beta Testing**: Early access program for new features
- **Documentation**: Community can contribute to docs

### Technical Debt Management
- **Quarterly Refactoring**: Dedicate 20% of each quarter to code quality
- **Dependency Updates**: Monthly review of Chart.js, other libraries
- **Browser Compatibility**: Test new features on all supported browsers
- **Performance Audits**: Quarterly profiling and optimization

---

## Conclusion

This roadmap balances **user needs**, **technical feasibility**, and **product principles**. By focusing on:

1. **Q1**: Foundation (export, history, mobile, error handling)
2. **Q2**: Visualization (charts, filtering, insights)
3. **Q3**: Customization (custom metrics, backups, bucket management)
4. **Q4**: Polish (onboarding, accessibility, help)

We'll transform the Endowus Portfolio Viewer from a useful tool into an **essential companion** for sophisticated investors—all while keeping data private and the experience simple.

### Next Steps
1. Review and approve this roadmap
2. Create GitHub milestones for Q1-Q4
3. Break down Q1 features into implementable issues
4. Begin development on highest priority items (1.1 Data Export)
5. Establish feedback loop with early adopters

---

**Document Status**: DRAFT - Pending Review  
**Reviewers**: @laurenceputra, Community Contributors  
**Approval**: [ ] Product Lead [ ] Technical Lead [ ] Community Vote
