---
title: Goal Portfolio Viewer Development Guide
description: Comprehensive instructions for GitHub Copilot when working on the Goal Portfolio Viewer Tampermonkey userscript
applies_to:
  - copilot-chat
  - copilot-cli
  - copilot-workspace
  - copilot-code-review
---

# Goal Portfolio Viewer - Development Guide

## Project Overview

**Type**: Browser Extension (Tampermonkey Userscript)  
**Purpose**: Enhance the Endowus (Singapore) investment platform with custom portfolio visualization  
**Architecture**: Single-file JavaScript with API interception  
**Key Feature**: Organize investment goals into custom "buckets" for better portfolio management

### Core Technologies
- **Runtime**: Browser (Tampermonkey/Greasemonkey/Violentmonkey)
- **Language**: Vanilla JavaScript (ES6+)
- **API Interception**: Monkey patching of fetch() and XMLHttpRequest
- **UI**: Injected CSS via `injectStyles()` with a modern gradient design system
- **Data Flow**: Intercept → Process → Aggregate → Visualize

### Critical Context
- **Privacy-First**: ALL processing happens client-side. Never send data externally.
- **Financial Data**: Handles sensitive investment information requiring accuracy and security
- **Single-File**: Entire application in one `.user.js` file for easy distribution
- **No Dependencies**: Pure vanilla JS - no build process, no external libraries

---

## Workflow Contract (Required)

Use this compact workflow for all changes. Keep detailed role guidance in `.github/agents/*.md` and avoid duplicating it here.

### Required Artifacts
- **Change Brief**: Problem, goal, and acceptance criteria.
- **Risks & Tradeoffs**: Short note, especially for data accuracy, privacy, or API interception changes.
- **Test Plan**: Jest coverage and any manual checks needed.
- **Verification**: Commands run and outcomes.

### Change Type → Required Steps

| Change Type | Required Steps |
| --- | --- |
| Pure logic | Jest tests with edge cases + lint; update docs if behavior changes |
| UI/visual | Jest (if logic touched) + lint + screenshot + smoke check |
| Behavior change | Jest + lint + update TECHNICAL_DESIGN.md and README references |
| Performance | Jest + lint + perf check and reasoning about impact |
| Documentation-only | Lint not required unless code changes; no tests required unless logic changed |

### Role Guides (Single Source of Detail)
- **Product**: `.github/agents/product-manager.md` (requirements framing)
- **Architecture/Risks**: `.github/agents/staff-engineer.md`
- **QA/Test Depth**: `.github/agents/qa-engineer.md`
- **Review Gates**: `.github/agents/code-reviewer.md`
- **Devil's Advocate**: `.github/agents/devils-advocate.md` (blind spots)

### Agent Interaction Model (Required)
1. **Product**: Frame the problem, user impact, and acceptance criteria.
2. **Staff Engineer**: Confirm architecture fit, call out risks/tradeoffs, and own implementation.
3. **Devil's Advocate**: Surface blind spots, assumptions, and risk gaps.
4. **QA**: Define test depth, edge cases, and verification steps.
5. **Code Reviewer**: Apply review gates before final approval.

### Stage Alignment Gates (Required)
Only move to the next stage when all required agents are aligned.
- **Alignment artifact**: 1-3 bullets per stage capturing agreement.
- **Blocking rule**: Any blocking concern stops progression until resolved.
- **Loopback rule**: If QA or Code Review fails, return to Stage 3 (Staff Engineer implementation), then re-run QA and Code Review.

#### Stage Gates
1. **Product Gate**: Product owns scope; Staff Engineer and QA confirm acceptance criteria are testable.
2. **Staff Engineer Gate**: Risks/tradeoffs documented; Product and QA agree on scope impact.
3. **Devil's Advocate Gate**: Risks/assumptions addressed or explicitly accepted.
4. **QA Gate**: Test plan covers change type requirements; Staff Engineer agrees to fix gaps.
5. **Code Review Gate**: Reviewer approves or blocks; QA must re-verify after any changes.

### Versioning & Docs
- If behavior changes, update TECHNICAL_DESIGN.md and any related README references.
- Behavior changes require a version bump in the userscript and package files.

---

## Code Style & Standards

### JavaScript Style

```javascript
// ✅ Preferred
const goals = apiData.performance.map(goal => ({
  ...goal,
  bucket: extractBucket(goal.name)
}));

// ❌ Avoid
var goals = [];
for (var i = 0; i < apiData.performance.length; i++) {
  goals[i] = apiData.performance[i];
  goals[i].bucket = extractBucket(goals[i].name);
}
```

**Guidelines**:
- Prefer `const` over `let`, never use `var`
- Use arrow functions for callbacks
- Use template literals for strings with variables
- Use destructuring for objects and arrays
- 4-space indentation (no tabs)
- Always include semicolons
- Prefer single quotes for strings

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Functions | camelCase with verb | `extractBucket()`, `renderSummaryView()` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS`, `DEBUG` |
| Variables | camelCase | `apiData`, `bucketName`, `totalInvestment` |
| CSS Classes | kebab-case with `gpv-` prefix | `gpv-trigger-btn`, `gpv-container` |
| Event Handlers | `on` + Event | `onButtonClick()`, `onModalClose()` |

### File Structure Pattern

The userscript follows this structure (order matters):
1. Userscript metadata block (`// ==UserScript==`)
2. IIFE wrapper (`(function() { 'use strict';`)
3. Data storage objects
4. API interception (monkey patching)
5. Data processing functions
6. UI rendering functions
7. Styling injection via `injectStyles()`
8. Initialization

---

## Security & Privacy Requirements

### Critical Rules (NEVER violate these)

1. **No External API Calls**: Data must stay in browser
   ```javascript
   // ❌ NEVER do this
   fetch('https://external-api.com/log', { body: userData });
   
   // ✅ Only intercept, never initiate
   window.fetch = async function(...args) {
     const response = await originalFetch.apply(this, args);
     // Process locally only
   };
   ```

2. **XSS Prevention**: Always sanitize user input
   ```javascript
   // ❌ Vulnerable to XSS
   element.innerHTML = `<div>${goalName}</div>`;
   
   // ✅ Safe
   const div = document.createElement('div');
   div.textContent = goalName;
   element.appendChild(div);
   ```

3. **No eval()**: Never use `eval()` or `Function()` constructor

4. **Sensitive Data Logging**: Never log financial data in production
   ```javascript
   const DEBUG = false; // Must be false for releases
   
   function debug(message, data) {
     if (DEBUG) {
       // Redact sensitive fields
       const safe = { ...data };
       delete safe.investment;
       delete safe.cumulativeReturn;
       console.log(message, safe);
     }
   }
   ```

### Data Validation Pattern

Always validate data before processing:

```javascript
function validateGoalData(goal) {
  return {
    id: String(goal?.id || ''),
    name: String(goal?.name || 'Unnamed Goal'),
    investment: Number(goal?.investment) || 0,
    cumulativeReturn: Number(goal?.cumulativeReturn) || 0,
    growthPercentage: Number(goal?.growthPercentage) || 0,
    goalType: String(goal?.goalType || 'Unknown')
  };
}
```

---

## API Interception Architecture

### Critical Endpoints

| Endpoint | Data Provided | Usage |
|----------|--------------|-------|
| `/v1/goals/performance` | Returns, growth %, current value | Performance metrics |
| `/v2/goals/investible` | Investment amounts, goal types | Investment details |
| `/v1/goals` | Goal names, IDs, descriptions | Goal metadata |

### Interception Pattern

```javascript
// Pattern for fetch interception
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const url = args[0];
  
  if (typeof url === 'string' && url.includes('/specific/endpoint')) {
    const clone = response.clone(); // ALWAYS clone before reading
    try {
      const data = await clone.json();
      processData(data); // Process asynchronously
      GM_setValue('cache_key', JSON.stringify(data)); // Cache in Tampermonkey storage
    } catch (error) {
      console.error('[Goal Portfolio Viewer] Error:', error);
      // Don't break original flow
    }
  }
  
  return response; // ALWAYS return original response
};
```

### URL Matching Best Practices

```javascript
// ❌ Too broad - matches unwanted endpoints
if (url.includes('/v1/goals')) { }

// ✅ Specific - exact match
if (url.includes('/v1/goals/performance')) { }

// ✅ Specific - regex with boundary
if (url.match(/\/v1\/goals(?:[?#]|$)/)) { }
```

---

## Data Processing Patterns

### Financial Calculations (Critical Accuracy)

```javascript
// Always handle division by zero
function calculateGrowthPercentage(investment, returns) {
  if (!investment || investment === 0) return 0;
  // Round to 2 decimal places for display
  return Math.round((returns / investment) * 10000) / 100;
}

// Money formatting
function formatMoney(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Percentage formatting
function formatPercentage(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
```

### Bucket Extraction Logic

The app organizes goals by "buckets" using naming convention: `"Bucket Name - Goal Description"`

```javascript
function extractBucket(goalName) {
  if (!goalName || typeof goalName !== 'string') {
    return 'Uncategorized';
  }
  
  const separatorIndex = goalName.indexOf(' - ');
  return separatorIndex === -1 
    ? goalName.trim() 
    : goalName.substring(0, separatorIndex).trim();
}

// Examples:
// "Retirement - Core Portfolio" → "Retirement"
// "Education - University Fund" → "Education"
// "Emergency Fund" → "Emergency Fund"
// "" → "Uncategorized"
```

### Data Aggregation Pattern

```javascript
function aggregateBucket(goals) {
  const totalInvestment = goals.reduce((sum, g) => sum + (g.investment || 0), 0);
  const totalReturn = goals.reduce((sum, g) => sum + (g.cumulativeReturn || 0), 0);
  const growthPercentage = calculateGrowthPercentage(totalInvestment, totalReturn);
  
  // Group by goal type (Investment, Cash, SRS, etc.)
  const byType = goals.reduce((acc, goal) => {
    const type = goal.goalType || 'Unknown';
    if (!acc[type]) {
      acc[type] = { goals: [], totalInvestment: 0, totalReturn: 0 };
    }
    acc[type].goals.push(goal);
    acc[type].totalInvestment += goal.investment || 0;
    acc[type].totalReturn += goal.cumulativeReturn || 0;
    return acc;
  }, {});
  
  return { totalInvestment, totalReturn, growthPercentage, byType };
}
```

---

## UI/UX Guidelines

### Design System

**Color Palette**:
- Primary Gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Positive Returns: `#10b981` (green)
- Negative Returns: `#ef4444` (red)
- Background: `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(10px)`
- Text: `#1f2937` (dark), `#ffffff` (light)

**Animations**:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

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

**Transition Speed**: 300ms for all interactive elements

### DOM Manipulation Best Practices

```javascript
// ❌ Bad - Multiple reflows
goals.forEach(goal => {
  container.innerHTML += renderGoalRow(goal);
});

// ✅ Good - Single reflow
const html = goals.map(goal => renderGoalRow(goal)).join('');
container.innerHTML = html;

// ✅ Better - Use DocumentFragment for complex insertions
const fragment = document.createDocumentFragment();
goals.forEach(goal => {
  const row = createGoalRow(goal);
  fragment.appendChild(row);
});
container.appendChild(fragment);
```

### Rendering Pattern

```javascript
function renderComponent(data) {
  // Validate data first
  if (!data || !Array.isArray(data.goals)) {
    return '<div class="error">No data available</div>';
  }
  
  // Build HTML in memory
  const rows = data.goals.map(goal => `
    <tr>
      <td>${escapeHtml(goal.name)}</td>
      <td>${formatMoney(goal.investment)}</td>
      <td style="color: ${goal.cumulativeReturn >= 0 ? '#10b981' : '#ef4444'}">
        ${formatMoney(goal.cumulativeReturn)}
      </td>
      <td>${formatPercentage(goal.growthPercentage)}</td>
    </tr>
  `).join('');
  
  return `
    <table class="gpv-table">
      <thead>
        <tr>
          <th>Goal</th>
          <th>Investment</th>
          <th>Return</th>
          <th>Growth</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

## Testing Guidelines

### Automated Testing (Required)

- Run Jest for every change.
- Run ESLint for every change that touches code.
- Add or update tests for new logic, regressions, and edge cases.

### Manual/Exploratory Testing (When Applicable)

- UI or behavior changes require a smoke check and financial accuracy spot checks.
- For full checklists, edge cases, and cross-browser expectations, follow `.github/agents/qa-engineer.md`.

---

## Performance Optimization

### Key Metrics

- Button injection: < 100ms
- API interception setup: < 50ms
- Modal open: < 500ms
- View switch: < 300ms
- No memory leaks (use Chrome DevTools Memory profiler)

### Optimization Techniques

```javascript
// 1. Debounce expensive operations
let renderTimer;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderPortfolioView();
  }, 300);
}

// 2. Cache computed values
let cachedBuckets = null;
function getBuckets(goals) {
  if (cachedBuckets && !dataChanged) return cachedBuckets;
  cachedBuckets = computeBuckets(goals);
  return cachedBuckets;
}

// 3. Lazy load details
const detailCache = {};
function showBucketDetail(bucketName) {
  if (!detailCache[bucketName]) {
    detailCache[bucketName] = renderBucketDetail(bucketName);
  }
  displayContent(detailCache[bucketName]);
}

// 4. Use event delegation
modalContainer.addEventListener('click', (event) => {
  if (event.target.matches('.close-button')) {
    closeModal();
  } else if (event.target.matches('.gpv-bucket-card')) {
    showBucketDetail(event.target.dataset.bucket);
  }
});
```

---

## Common Tasks

### Adding a New Calculated Field

1. **Add to data processing**:
   ```javascript
   function processGoal(goal) {
     return {
       ...goal,
       myNewField: calculateMyField(goal)
     };
   }
   ```

2. **Update rendering**:
   ```javascript
   <td>${formatMyField(goal.myNewField)}</td>
   ```

3. **Add formatter if needed**:
   ```javascript
   function formatMyField(value) {
     // Format logic
   }
   ```

4. **Add tests** for edge cases

### Modifying Bucket Logic

⚠️ **Warning**: Changes affect all existing users!

1. Document old behavior
2. Ensure backward compatibility
3. Add migration logic if needed
4. Update TECHNICAL_DESIGN.md
5. Bump version number (MAJOR if breaking)

### Adding New API Endpoint

1. **Add to interception**:
   ```javascript
   if (url.includes('/v1/your/new/endpoint')) {
     const clone = response.clone();
     const data = await clone.json();
     apiData.newEndpoint = data;
     GM_setValue('api_newEndpoint', JSON.stringify(data));
   }
   ```

2. **Update merge logic** to include new data
3. **Update data model** if needed
4. **Test thoroughly** - API changes are risky

---

## Debugging

### Enable Debug Mode

```javascript
const DEBUG = true; // At top of file

// Add logging throughout
debug('API Response:', responseData);
debug('Merged Data:', mergedData);
debug('Bucket Aggregation:', bucketData);
```

### Debug Object (Add to window for console access)

```javascript
if (DEBUG) {
  window.portfolioViewerDebug = {
    apiData,
    mergedData,
    buckets: () => groupByBucket(mergedData),
    recalculate: () => recalculateAll(),
    clearCache: () => {
      GM_deleteValue('api_performance');
      GM_deleteValue('api_investible');
      GM_deleteValue('api_summary');
    }
  };
}
```

### Common Issues

1. **API not intercepted**: Check `@run-at document-start` in metadata
2. **Data not merging**: Verify all 3 endpoints have been called
3. **UI not updating**: Check for JavaScript errors in console
4. **Calculations wrong**: Verify input data, check for division by zero
5. **Button not appearing**: Check CSS conflicts with platform styles

---

## Version Management

### Semantic Versioning

- **MAJOR** (x.0.0): Breaking changes (API, data format, bucket logic)
- **MINOR** (0.x.0): New features (new views, new calculations)
- **PATCH** (0.0.x): Bug fixes, performance improvements

### Release Checklist

- [ ] Update version in userscript metadata
- [ ] Update CHANGELOG.md
- [ ] Full test suite passed
- [ ] Financial calculations verified
- [ ] Cross-browser tested
- [ ] Debug mode set to `false`
- [ ] Documentation updated
- [ ] Git tag created: `git tag -a v2.1.2 -m "Release 2.1.2"`

---

## Documentation

### When to Update Docs

- **README.md**: User-facing features, installation, usage
- **TECHNICAL_DESIGN.md**: Architecture, API details, developer guide
- **Inline comments**: Complex algorithms, financial calculations
- **Commit messages**: Follow conventional commits

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, perf, test, chore

**Examples**:
```
feat(ui): add export to CSV functionality

Allow users to export their portfolio data to CSV format for
external analysis. Includes proper escaping of special characters.

Closes #42
```

```
fix(calculation): correct growth percentage for negative returns

When cumulative return is negative, growth percentage was showing
incorrect sign. Fixed calculation to properly handle negative values.

Fixes #38
```

---

## Important Constraints

### DO NOT

- ❌ Send data to external servers
- ❌ Modify platform API requests (only intercept responses)
- ❌ Use external libraries (keep it vanilla JS)
- ❌ Add build process (must work as single file)
- ❌ Break bucket naming convention without migration
- ❌ Log sensitive data in production
- ❌ Use localStorage (use GM_setValue/GM_getValue instead)

### ALWAYS

- ✅ Validate all data before processing
- ✅ Clone responses before reading
- ✅ Handle errors gracefully
- ✅ Test financial calculations manually
- ✅ Consider backward compatibility
- ✅ Update version number
- ✅ Check console for errors
- ✅ Test in multiple browsers

---

## Resources

- **Tampermonkey API**: https://www.tampermonkey.net/documentation.php
- **Userscript Best Practices**: https://wiki.greasespot.net/Code_Patterns
- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Web/API
- **OWASP XSS Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

---

## Quick Reference

### File Structure
```
goal-portfolio-viewer/
├── .github/
│   └── copilot-instructions.md (this file)
├── tampermonkey/
│   ├── goal_portfolio_viewer.user.js (main script)
│   └── README.md
├── README.md (user guide)
├── TECHNICAL_DESIGN.md (technical details)
└── LICENSE
```

### Key Functions
- `extractBucket(goalName)` - Parse bucket from goal name
- `mergeAPIResponses()` - Combine data from 3 endpoints
- `aggregateBucket(goals)` - Calculate bucket totals
- `renderSummaryView()` - Show all buckets
- `renderBucketView(bucket)` - Show goals in bucket
- `formatMoney(amount)` - Format currency
- `calculateGrowthPercentage(inv, ret)` - Calculate growth %

### CSS Classes
- `.gpv-trigger-btn` - Trigger button
- `.gpv-overlay` - Modal overlay
- `.gpv-container` - Modal content
- `.gpv-bucket-card` - Bucket summary card
- `.gpv-table` - Goals table

---

*This guide is maintained alongside the codebase. When in doubt, prioritize user privacy and financial data accuracy.*

---

## Agent Orchestration & Coordination

### Workflow State Machine

```

                         PLANNING PHASE                          │

 1. Product Manager: Frame problem & acceptance criteria        │
    Output: User story, acceptance criteria                     │
    Gate: Staff Engineer + QA confirm criteria are testable     │

                     │
                     ▼

                      DESIGN PHASE                               │

 2. Staff Engineer: Propose technical solution                  │
    Output: Architecture, risks, tradeoffs                      │
    Gate: Product + QA agree on scope impact                    │

                     │
                     ▼

                   RISK ASSESSMENT PHASE                         │

 3. Devil's Advocate: Challenge assumptions                     │
    Output: Risks, blind spots, mitigations                     │
    Gate: Risks addressed or explicitly accepted                │

                     
                     ▼

                   IMPLEMENTATION PHASE                          │

 4. Staff Engineer: Implement solution                          │
    Output: Code changes, unit tests                            │
    Gate: Code compiles, unit tests pass                        │

                     │
                     ▼

                     QA PHASE                                    │

 5. QA Engineer: Verify quality                                 │
    Output: Test results, bug reports                           │
    Gate: Test plan executed, critical bugs fixed              │

                     │
                     ▼

                    REVIEW PHASE                                 │

 6. Code Reviewer: Final quality gate                           │
    Output: Approval or change requests                         │
    Gate: All blocking issues resolved                          │

                     │
                     ▼
                  [MERGE]
```

### Handoff Protocols

**Product Manager → Staff Engineer**

Handoff Document:
```markdown
## Problem Statement
[Clear description of user pain point]

## Acceptance Criteria
- [ ] Criterion 1 (testable)
- [ ] Criterion 2 (testable)

## Constraints
[Technical, business, or regulatory constraints]
```

Staff Engineer Checklist:
- [ ] Acceptance criteria are clear and testable
- [ ] Constraints are understood
- [ ] Scope is reasonable for single PR

Loopback Conditions:
- Acceptance criteria are ambiguous or untestable
- Constraints conflict with technical feasibility
- Scope is too large (requires splitting)

---

**Staff Engineer → Devil's Advocate**

Handoff Document:
```markdown
## Proposed Solution
[Technical approach]

## Architecture Changes
[What's being modified]

## Key Assumptions
1. [Assumption 1]
2. [Assumption 2]

## Known Risks
- **Risk 1**: [description] → Mitigation: [plan]
- **Risk 2**: [description] → Mitigation: [plan]

## Tradeoffs
[What we're trading off and why]
```

Devil's Advocate Checklist:
- [ ] Test all key assumptions
- [ ] Surface unmentioned risks
- [ ] Challenge tradeoffs
- [ ] Identify blind spots

Loopback Conditions:
- Critical risk without mitigation
- Assumption proven false
- Better alternative identified

---

**Devil's Advocate → Staff Engineer (Implementation)**

Handoff Document:
```markdown
## Risk Assessment Results
[Summary of findings]

## Blocking Risks
[Risks that must be addressed]

## Accepted Risks
[Risks explicitly accepted with rationale]

## Required Mitigations
- [ ] Mitigation 1
- [ ] Mitigation 2
```

Staff Engineer Checklist:
- [ ] All blocking risks have mitigations
- [ ] Accepted risks are documented
- [ ] Required mitigations are in implementation plan

Loopback Conditions:
- Blocking risk cannot be mitigated (back to Product Manager)
- Mitigation requires scope change (back to Product Manager)

---

**Staff Engineer → QA Engineer**

Handoff Document:
```markdown
## Implementation Summary
[What was changed]

## Test Hooks Added
[Functions/modules exported for testing]

## Edge Cases to Test
1. [Edge case 1]
2. [Edge case 2]

## Known Limitations
[Intentional limitations or future work]

## Manual Test Steps (if needed)
[Steps to verify in browser]
```

QA Engineer Checklist:
- [ ] Test plan covers all acceptance criteria
- [ ] Edge cases identified and testable
- [ ] Performance impact considered
- [ ] Security implications assessed

Loopback Conditions:
- Test failure reveals logic error (back to Staff Engineer)
- Missing critical test coverage (back to Staff Engineer)
- Performance regression (back to Staff Engineer)

---

**QA Engineer → Code Reviewer**

Handoff Document:
```markdown
## Test Results
- Unit Tests: ✓ / ✗
- Integration Tests: ✓ / ✗
- Manual Tests: ✓ / ✗
- Performance: ✓ / ✗

## Bugs Found & Fixed
1. [Bug 1] - Status: Fixed
2. [Bug 2] - Status: Fixed

## Outstanding Issues
[Any remaining issues and severity]

## Verification Checklist
- [ ] All acceptance criteria met
- [ ] Financial accuracy verified (if applicable)
- [ ] Security checks passed
- [ ] Cross-browser tested (if UI change)
```

Code Reviewer Checklist:
- [ ] QA passed all gates
- [ ] Code quality meets standards
- [ ] No security vulnerabilities
- [ ] Documentation updated

Loopback Conditions:
- Code review finds logic errors (back to Staff Engineer + QA)
- Security vulnerability found (back to Staff Engineer + QA)
- Breaking change not documented (back to Staff Engineer)

---

### Conflict Resolution

**When Agents Disagree**

**Scenario: Product Manager vs. Staff Engineer (Scope)**

Resolution Protocol:
1. Product Manager states user value
2. Staff Engineer states technical cost/risk
3. Devil's Advocate surfaces tradeoffs
4. Decision: Split scope or accept larger PR

Example:
```
PM: "We need export to CSV, Excel, and PDF"
SE: "That's 3 PRs worth. CSV is 1 day, Excel/PDF adds 3 days each"
DA: "Risk: Large PR harder to review, more bugs. Also: Excel/PDF need libraries"
Decision: Split into 3 PRs. Ship CSV first (user feedback), then Excel, then PDF
```

---

**Scenario: Staff Engineer vs. QA Engineer (Test Coverage)**

Resolution Protocol:
1. QA states required coverage
2. Staff Engineer states feasibility/cost
3. Devil's Advocate assesses actual risk
4. Decision: Balance coverage with effort

Example:
```
QA: "Need tests for all 15 edge cases"
SE: "5 are truly edge cases, 10 are theoretical. Would take 2 extra days"
DA: "Financial data is critical. But 10 theoretical cases have zero user reports"
Decision: Test the 5 real edge cases now. Document 10 theoretical for future
```

---

**Scenario: QA Engineer vs. Code Reviewer (Quality Standards)**

Resolution Protocol:
1. Code Reviewer states concern
2. QA explains test coverage rationale
3. Devil's Advocate assesses risk
4. Decision: Additional tests or accept risk

Example:
```
CR: "No tests for error handling path"
QA: "Error path is already tested via integration test"
DA: "Error path is critical security boundary. Explicit unit test would catch regressions"
Decision: Add explicit unit test for error path
```

---

### Escalation Path

If agents cannot resolve conflict:

1. **Level 1**: Devil's Advocate mediates (risk-based decision)
2. **Level 2**: Staff Engineer makes final technical call
3. **Level 3**: Product Manager makes final product call
4. **Level 4**: Document decision rationale and move forward

**Key Principle**: Bias toward shipping with known tradeoffs over perfection paralysis.

---

### Agent Selection Decision Tree

```
START
  │
  ├─ Need requirements/scope? ────────────► Product Manager
  │
  ├─ Need technical design? ──────────────► Staff Engineer
  │
  ├─ Need implementation? ────────────────► Staff Engineer
  │
  ├─ Need to challenge assumptions? ──────► Devil's Advocate
  │
  ├─ Need test strategy? ─────────────────► QA Engineer
  │
  ├─ Need test execution? ────────────────► QA Engineer
  │
  ├─ Need code review? ───────────────────► Code Reviewer
  │
  └─ Need conflict resolution? ───────────► See "Conflict Resolution"
```

### Agent Capabilities Matrix

| Agent | Requirements | Design | Implementation | Testing | Review | Risk Analysis |
|-------|--------------|--------|----------------|---------|--------|---------------|
| Product Manager | ✅ Owner | 🤝 Input | ❌ No | 🤝 Input | 🤝 Input | 🤝 Input |
| Staff Engineer | 🤝 Input | ✅ Owner | ✅ Owner | 🤝 Support | 🤝 Input | 🤝 Input |
| Code Reviewer | ❌ No | 🤝 Input | ❌ No | 🤝 Verify | ✅ Owner | 🤝 Input || QA Engineer | 🤝 Input | 
| Devil's Advocate | 🤝 Challenge | 🤝 Challenge | ❌ No | 🤝 Challenge | ❌ No | ✅ Owner |

**Legend:**
- ✅ Owner: Primary responsibility and decision-maker
- 🤝 Input/Support: Provides input, collaborates, or verifies
- ❌ No: Not involved in this phase

---

## Quick Reference

### When to Use Which Agent

| I need to... | Use Agent | Approach |
|--------------|-----------|----------|
| Define what to build | Product Manager | Frame requirements and scope |
| Design a solution | Staff Engineer | Design approach for problem |
| Implement code | Staff Engineer | Implement feature |
| Challenge assumptions | Devil's Advocate | Review risks for design |
| Create test plan | QA Engineer | Test plan for feature |
| Verify quality | QA Engineer | Verify implementation |
| Review code | Code Reviewer | Review PR |
| Resolve conflicts | Devil's Advocate | See orchestration guide |

### Workflow Phases

```
1. [PLANNING]      Product Manager defines requirements
2. [DESIGN]        Staff Engineer proposes solution  
3. [RISK CHECK]    Devil's Advocate challenges
4. [IMPLEMENT]     Staff Engineer codes
5. [QA]            QA Engineer tests
6. [REVIEW]        Code Reviewer approves
```

### Definition of Done Checklist

**Planning → Design:**
- [ ] Acceptance criteria clear and testable
- [ ] Constraints documented

**Design → Risk Check:**
- [ ] Technical approach documented
- [ ] Risks and tradeoffs identified
- [ ] Testability confirmed

**Risk Check → Implementation:**
- [ ] Critical risks mitigated
- [ ] Assumptions validated
- [ ] Scope confirmed

**Implementation → QA:**
- [ ] Code complete
- [ ] Unit tests pass
- [ ] Documentation updated

**QA → Review:**
- [ ] Test plan executed
- [ ] All acceptance criteria met
- [ ] Critical bugs fixed

**Review → Merge:**
- [ ] Code review approved
- [ ] No blocking issues
- [ ] Version bumped (if behavior changed)

### Common Scenarios

**"I have a bug to fix"**
1. Product Manager: Clarify expected behavior
2. Staff Engineer: Fix bug
3. QA Engineer: Verify fix
4. Code Reviewer: Review bugfix

**"I want to add a feature"**
1. Product Manager: Define requirements
2. Staff Engineer: Design feature
3. Devil's Advocate: Challenge design
4. Staff Engineer: Implement feature
5. QA Engineer: Test feature
6. Code Reviewer: Review feature

**"I'm unsure about an approach"**
1. Staff Engineer: Evaluate approaches (A vs B vs C)
2. Devil's Advocate: What could go wrong?
3. Product Manager: Which delivers most user value?

**"Tests are failing"**
1. QA Engineer: Diagnose test failure
2. Staff Engineer: Fix failing test
3. QA Engineer: Re-verify fix

**"PR has review comments"**
1. Staff Engineer: Address review comments
2. QA Engineer: Re-test after changes
3. Code Reviewer: Re-review

### Quality Gates

| Phase | Gate | Blocker If... |
|-------|------|---------------|
| Planning | Testable criteria | Acceptance criteria are vague |
| Design | Risk assessment | Critical unmitigated risk |
| Implementation | Tests pass | Test failures or no tests |
| QA | Quality verified | Critical bugs found |
| Review | Code approved | Blocking review comments |

### Loopback Conditions

**Back to Planning:**
- Scope too large (split required)
- Requirements unclear
- Constraints conflict

**Back to Design:**
- Critical risk found
- Better approach identified
- Technical infeasibility

**Back to Implementation:**
- Test failures reveal logic errors
- Review finds security issues
- Performance regression

**Back to QA:**
- Code changes after review
- New edge case discovered

