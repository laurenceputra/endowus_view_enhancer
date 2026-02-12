# Refactor Risks: Quick Reference Card

**Use this as a quick checklist during code review. For details, see [CODE_REVIEW_REFACTOR_RISKS.md](./CODE_REVIEW_REFACTOR_RISKS.md)**

---

## 🔴 CRITICAL RISKS (Must Be Perfect)

### Userscript UI

#### 1. Financial Calculations
- [ ] Division by zero checks present
- [ ] `Number.isFinite()` used (not `isFinite()`)
- [ ] Percentage math correct (ratio vs percent)
- [ ] Null vs 0 distinction preserved
- [ ] Negative values handled

**Example Pattern:**
```javascript
const percent = investment === 0 ? 0 : (returns / investment) * 100;
```

#### 2. API Interception
- [ ] Response cloned before reading body
- [ ] URL matching is specific (not overly broad)
- [ ] No infinite loops (original fetch saved)
- [ ] Processing is non-blocking
- [ ] Returns original response immediately

**Example Pattern:**
```javascript
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    response.clone().json().then(processData);  // Async!
    return response;  // Return immediately
};
```

#### 3. Single-File Constraint
- [ ] No file splitting (stays single-file)
- [ ] No build steps added
- [ ] No ES6 modules (import/export)
- [ ] Stays within IIFE closure

### Workers Backend

#### 1. Authentication
- [ ] JWT secret is strong (256+ bits, in secrets)
- [ ] Token expiry validated
- [ ] Access token TTL = 15 min, Refresh = 60 days
- [ ] Algorithm fixed to HS256

#### 2. Encryption
- [ ] AES-GCM-256 maintained
- [ ] PBKDF2 iterations >= 100,000
- [ ] IV randomly generated per encryption
- [ ] No plaintext sent to server

---

## 🟠 HIGH RISKS (Important, May Block Merge)

### Userscript UI

#### 1. XSS Prevention
- [ ] All user content uses `textContent` (not `innerHTML`)
- [ ] No inline event handlers
- [ ] `addEventListener()` for events
- [ ] No `eval()` or `Function()`

#### 2. State & Race Conditions
- [ ] Queue flags respected (`isQueueRunning`)
- [ ] Null checks before reading state
- [ ] No assumptions about API call order
- [ ] Timers/intervals cleared properly

#### 3. Performance Fetch Queue
- [ ] Sequential execution (not parallel)
- [ ] Delay between requests (1000ms default)
- [ ] Cache freshness validated (7-day TTL)
- [ ] Stale data not served

### Workers Backend

#### 1. KV Storage
- [ ] All KV operations have try-catch
- [ ] Key prefix `sync_user:` preserved
- [ ] `serverTimestamp` added on write
- [ ] `await` on all KV calls

#### 2. Password Hashing
- [ ] PBKDF2 iterations >= 100,000
- [ ] Salt is random per user (128+ bits)
- [ ] Constant-time hash comparison

#### 3. CORS
- [ ] Origin = `https://app.sg.endowus.com` (exact)
- [ ] Methods: GET, POST, DELETE, OPTIONS
- [ ] Headers: Authorization, Content-Type
- [ ] OPTIONS returns 204

---

## 🟡 MEDIUM RISKS (Check, Not Blocking)

### Userscript UI

#### 1. Storage Keys
- [ ] Key format unchanged (or migration provided)
- [ ] Separators encoded (`encodeURIComponent`)
- [ ] No key collisions

#### 2. Testing Compatibility
- [ ] New functions added to exports
- [ ] Tests updated (`pnpm test` passes)
- [ ] Browser-only code not exported

#### 3. UI Responsiveness
- [ ] Modal responsive on mobile (320px+)
- [ ] Scroll works when content overflows
- [ ] z-index hierarchy preserved

### Workers Backend

#### 1. Rate Limiting
- [ ] Limits per-user (not global)
- [ ] `Retry-After` header on 429
- [ ] Limits are reasonable

#### 2. Conflict Resolution
- [ ] Server data returned on 409
- [ ] Timestamp comparison is `>` (newer)
- [ ] Client has conflict resolution UI

#### 3. Payload Size
- [ ] Size checked before parsing (10KB limit)
- [ ] Client warns before exceeding

---

## Quick Test Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Watch mode
pnpm run test:watch

# Workers tests
cd workers && pnpm test

# Deploy workers (preview)
cd workers && pnpm run deploy:preview
```

---

## Version Bump Checklist

When releasing:
- [ ] Userscript `@version` updated
- [ ] `package.json` version matches
- [ ] Changelog entry added
- [ ] Breaking changes noted

---

## Common Anti-Patterns

### ❌ Avoid These:

```javascript
// Financial calculation without zero check
const percent = (returns / investment) * 100;

// Not cloning response
const data = await response.json();
return response;  // Body consumed!

// XSS vulnerability
element.innerHTML = `<div>${userName}</div>`;

// Overly broad URL matching
if (url.includes('/v1/')) { /* ... */ }

// Parallel requests (breaks rate limiting)
await Promise.all(goalIds.map(fetchGoalPerformance));

// Wildcard CORS (security risk)
'Access-Control-Allow-Origin': '*'

// Logging sensitive data
console.log('User data:', { password, financialData });
```

### ✅ Use These Instead:

```javascript
// Safe division
const percent = investment === 0 ? 0 : (returns / investment) * 100;

// Clone response
const data = await response.clone().json();
return response;

// Safe rendering
const div = document.createElement('div');
div.textContent = userName;

// Specific URL matching
if (url.includes('/v1/goals/performance')) { /* ... */ }

// Sequential requests
for (const goalId of goalIds) {
    await fetchGoalPerformance(goalId);
    await delay(1000);
}

// Specific CORS origin
'Access-Control-Allow-Origin': 'https://app.sg.endowus.com'

// Safe logging
console.error('[Error]', { userId: '<redacted>', error: e.message });
```

---

## Emergency Contacts

If critical issue found during review:

1. **Block merge immediately** (comment with 🔴)
2. **Tag issue clearly**: `[blocking]`, `[security]`, `[data-loss]`
3. **Explain impact**: "This causes X when Y happens"
4. **Suggest fix**: Provide code example if possible
5. **Test locally**: Verify issue reproduces
6. **Escalate if needed**: Ping Staff Engineer agent

---

## Review Sign-Off Template

```markdown
## Code Review Summary

**Risk Level**: [Critical/High/Medium/Low]

### Blocking Issues (must fix):
- [ ] Issue 1: Description + location
- [ ] Issue 2: Description + location

### Important (should fix):
- Suggestion 1
- Suggestion 2

### Nice-to-have:
- Improvement 1

### Testing:
- [ ] Tested locally in Chrome
- [ ] Tested in Firefox
- [ ] Tested mobile responsive
- [ ] Tests pass (`pnpm test`)

**Verdict**: [Approve / Request Changes]
```

---

*Quick reference for [CODE_REVIEW_REFACTOR_RISKS.md](./CODE_REVIEW_REFACTOR_RISKS.md)*  
*Last Updated: December 2024*
