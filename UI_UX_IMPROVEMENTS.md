# UI/UX Interaction Improvements - Goal Portfolio Viewer

## Executive Summary

As Product Manager, I've reviewed the userscript's UI/UX focusing on user interaction patterns. While the script has solid visual design and basic functionality, there are critical gaps in **focus management**, **keyboard navigation**, **screen reader accessibility**, and **user feedback** that impact usability, especially for power users and users with disabilities.

## Current State Assessment

### ✅ Strengths
- Visual feedback for input validation (flash animation)
- Loading states on buttons ("Saving...", "Refreshing...")
- Toast notifications for success/error messages
- Basic keyboard support on bucket cards (Enter/Space)
- Some ARIA attributes (aria-expanded, aria-controls, aria-label)

### ❌ Critical Gaps Identified

#### 1. **Modal/Overlay Focus Management** (HIGH PRIORITY)
- ❌ No focus trap when modals open
- ❌ Focus not automatically set to first interactive element
- ❌ No Escape key to close modals
- ❌ Focus not restored to trigger element on close
- ❌ Background content remains keyboard-accessible (violation of modal pattern)

**User Impact**: Keyboard users can tab out of modals into background content, screen readers announce wrong context, confusing navigation.

#### 2. **Keyboard Navigation** (HIGH PRIORITY)
- ❌ Close buttons lack keyboard-visible focus indicators (`:focus-visible` missing)
- ❌ Sync indicator clickable but lacks keyboard activation
- ❌ No keyboard shortcuts for common actions (refresh, save, close)
- ❌ Tab order may be illogical in complex forms
- ❌ Conflict resolution buttons lack clear keyboard flow

**User Impact**: Power users cannot efficiently navigate, accessibility barriers for keyboard-only users.

#### 3. **Screen Reader Accessibility** (MEDIUM PRIORITY)
- ❌ Notifications lack `role="alert"` or `aria-live` regions
- ❌ Modal overlays lack `role="dialog"` and `aria-modal="true"`
- ❌ Loading states not announced to screen readers
- ❌ Dynamic content updates (validation, calculations) not announced
- ❌ Form validation errors not associated with inputs (`aria-describedby`)

**User Impact**: Screen reader users miss critical feedback, cannot understand modal context, unaware of async operations.

---

## TOP 3 IMPROVEMENTS (Prioritized)

### #1: Complete Modal Focus Management
**Priority**: MUST HAVE  
**Effort**: Medium (2-3 hours)  
**User Impact**: Critical for accessibility compliance and keyboard users

#### Problem
When sync settings or conflict resolution modals open:
- Users can Tab into background Endowus page
- Screen readers don't announce modal context
- No way to close with Escape key
- Focus jumps unexpectedly when modal closes

#### Solution
Implement complete modal focus trap pattern:
1. Focus first interactive element on modal open
2. Trap Tab/Shift+Tab within modal
3. Close on Escape key
4. Restore focus to trigger element on close
5. Add proper ARIA attributes

#### Acceptance Criteria

**✓ Focus Management**
- [ ] When sync settings modal opens, focus automatically moves to first interactive element (close button or first input)
- [ ] When conflict resolution modal opens, focus moves to modal container or first button
- [ ] Tab key cycles through only modal interactive elements (no escape to background)
- [ ] Shift+Tab cycles backward through modal elements only
- [ ] When modal closes, focus returns to the element that opened it (sync indicator, back button, etc.)

**✓ Keyboard Shortcuts**
- [ ] Escape key closes any modal (unless `allowOverlayClose: false` and conflict in progress)
- [ ] When conflict modal is open, Escape shows warning: "Please resolve conflict before closing"
- [ ] Escape key works even when focus is on input fields

**✓ ARIA Attributes**
- [ ] Modal overlay has `role="dialog"`
- [ ] Modal container has `aria-modal="true"`
- [ ] Modal title has unique `id` referenced by `aria-labelledby` on dialog
- [ ] Background content has `aria-hidden="true"` when modal is open
- [ ] Background `aria-hidden` removed when modal closes

**✓ Visual Indicators**
- [ ] All focusable elements in modal have clear `:focus-visible` styles (2px outline, contrasting color)
- [ ] Close button (×) shows focus ring when tabbed to
- [ ] Current focused element is always visible (no overflow clipping)

**✓ Edge Cases**
- [ ] If modal contains form with auto-save, focus remains in modal during save
- [ ] If error occurs during save, focus moves to error message or stays on button
- [ ] Multiple rapid Escape presses don't cause JavaScript errors
- [ ] Works correctly in nested modals (sync settings → conflict resolution)

**✓ Technical**
- [ ] Implementation uses standard `document.activeElement` tracking
- [ ] No memory leaks from event listeners (removed on modal close)
- [ ] Compatible with Tampermonkey across Chrome, Firefox, Edge

---

### #2: Screen Reader Announcements
**Priority**: SHOULD HAVE  
**Effort**: Small (1-2 hours)  
**User Impact**: High for screen reader users (estimated 2-5% of users)

#### Problem
Screen reader users miss critical feedback:
- "Saving..." → "Saved" state changes not announced
- Validation errors (flash animation) are silent
- Toast notifications may not be announced
- Sync status changes invisible to screen readers

#### Solution
Add ARIA live regions for dynamic feedback:
1. Status messages use `role="status"` or `aria-live="polite"`
2. Errors use `role="alert"` or `aria-live="assertive"`
3. Loading states announced via `aria-busy` or live region
4. Form validation errors linked with `aria-describedby`

#### Acceptance Criteria

**✓ Notification Announcements**
- [ ] Toast notifications (`.gpv-notification`) have `role="status"` for info/success
- [ ] Toast notifications with errors have `role="alert"` 
- [ ] Sync toast messages (`.gpv-sync-toast`) have `aria-live="polite"`
- [ ] Screen reader announces: "Saved successfully" when sync saves
- [ ] Screen reader announces: "Error: Connection failed" when sync fails

**✓ Loading State Announcements**
- [ ] When "Refresh" button clicked, screen reader announces "Refreshing performance data"
- [ ] When sync button shows "Saving...", `aria-busy="true"` added to button
- [ ] When save completes, `aria-busy` removed and success message announced
- [ ] Loading spinners have `aria-label="Loading"` or equivalent

**✓ Validation Feedback**
- [ ] When input validation fails (flash border), error message div appears with:
  - `id="gpv-error-{goalId}"`
  - `role="alert"`
  - Text: "Invalid value. Enter a number between 0 and 100"
- [ ] Input has `aria-describedby="gpv-error-{goalId}"` when error present
- [ ] When value clamped (warning flash), message: "Value adjusted to 100 (maximum)"
- [ ] Error messages cleared when input becomes valid

**✓ Sync Status Indicator**
- [ ] Sync indicator div has `role="button"` and `aria-label="Open sync settings. Status: Synced"`
- [ ] Aria-label updates dynamically: "Status: Syncing..." / "Status: Error" / "Status: Conflict"
- [ ] When conflict occurs, screen reader announces: "Alert: Sync conflict detected"

**✓ Modal Context**
- [ ] Conflict modal announces: "Sync conflict dialog. Choose local or remote data."
- [ ] Modal description properly associated with `aria-describedby`

**✓ Form Labels**
- [ ] All inputs have associated `<label>` or `aria-label`
- [ ] Server URL input: `aria-label="Sync server URL"`
- [ ] User ID input: `aria-label="User ID for sync"`
- [ ] Password input: `aria-label="Encryption password"`

**✓ Testing**
- [ ] Manual test with NVDA (Windows) or VoiceOver (Mac) confirms all announcements work
- [ ] No duplicate announcements (check if `aria-live` + `role` conflict)
- [ ] Announcements don't interrupt user when typing (use `polite` not `assertive` for non-critical)

---

### #3: Enhanced Keyboard Navigation
**Priority**: SHOULD HAVE  
**Effort**: Medium (2-3 hours)  
**User Impact**: High for power users, improves efficiency for all users

#### Problem
Keyboard navigation is inefficient:
- Close button lacks visible focus
- Sync indicator not keyboard-accessible
- No shortcuts for common actions
- Tab order through long forms is tedious

#### Solution
Comprehensive keyboard improvements:
1. Add `:focus-visible` to all interactive elements
2. Make sync indicator keyboard-accessible
3. Add keyboard shortcuts (Ctrl+R refresh, etc.)
4. Optimize tab order in forms
5. Add skip links for long sections

#### Acceptance Criteria

**✓ Focus Visibility**
- [ ] All buttons show 2px solid focus ring with contrasting color (e.g., `#0066cc`)
- [ ] Close button (×) shows focus ring when tabbed to
- [ ] Sync indicator shows focus ring when tabbed to
- [ ] Bucket cards maintain `:focus-visible` styling (already implemented, verify)
- [ ] Input fields show focus ring (not just browser default)
- [ ] Toggle switches/checkboxes show focus ring
- [ ] Focus ring has 3:1 contrast ratio with background (WCAG AA)

**✓ Keyboard Accessibility**
- [ ] Sync indicator (`#gpv-sync-indicator`) is keyboard-focusable (`tabindex="0"`)
- [ ] Sync indicator activates on Enter or Space key
- [ ] When activated via keyboard, focus moves into opened modal
- [ ] All custom buttons/controls respond to Enter and Space

**✓ Keyboard Shortcuts**
- [ ] Ctrl+R (Cmd+R on Mac) refreshes performance data when portfolio view open
- [ ] Shortcut doesn't conflict with browser refresh (preventDefault when appropriate)
- [ ] Ctrl+S (Cmd+S on Mac) saves sync settings when modal open (preventDefault)
- [ ] Shortcuts shown in UI tooltips or help text: "Refresh (Ctrl+R)"
- [ ] Shortcuts disabled when focus is in text input (to allow normal typing)

**✓ Tab Order Optimization**
- [ ] In sync settings modal, tab order is logical:
  1. Close button
  2. Server URL input
  3. User ID input
  4. Password input
  5. Remember key checkbox
  6. Enable sync checkbox
  7. Auto-sync checkbox
  8. Save button
  9. Register button
  10. Login button
  11. Back button
- [ ] In conflict resolution, tab order:
  1. Close button
  2. "Keep Local" button
  3. "Use Remote" button
  4. "Cancel" button
  5. Back button
- [ ] No hidden elements in tab order (`display: none` elements skipped)
- [ ] No unnecessarily focusable elements (decorative icons, etc.)

**✓ Skip Links (Bonus)**
- [ ] When bucket detail view opens, "Skip to goals" link appears
- [ ] Skip link becomes visible on keyboard focus
- [ ] Skip link jumps to first goal input or goal list

**✓ Visual Indicators**
- [ ] Current keyboard focus always visible (not hidden by overflow or z-index)
- [ ] Scrollable areas auto-scroll to keep focused element visible
- [ ] Focus doesn't get stuck behind fixed position elements

**✓ User Guidance**
- [ ] Close button has `title="Close (Esc)"` tooltip
- [ ] Refresh button has `title="Refresh data (Ctrl+R)"` tooltip
- [ ] Save button has `title="Save settings (Ctrl+S)"` tooltip
- [ ] First-time users see subtle hint: "Tip: Press Esc to close" (dismissible)

**✓ Testing**
- [ ] Complete workflow keyboard-only test (no mouse):
  - Open portfolio viewer
  - Tab to bucket, press Enter
  - Tab through goals, change target, Tab to save
  - Open sync settings via Tab + Enter
  - Fill form, save, close with Esc
  - Open conflict modal, resolve, close
- [ ] Tab order flows logically (no unexpected jumps)
- [ ] No focus traps where keyboard gets stuck
- [ ] Works in Chrome, Firefox, Edge with Tampermonkey

---

## Additional Findings (Lower Priority)

### 4. Loading State Feedback (NICE TO HAVE)
- [ ] Performance data refresh shows spinner in button
- [ ] Disable interactions during async operations
- [ ] Show progress bar for long operations (sync uploads)
- [ ] Timeout feedback: "Taking longer than expected..."

### 5. Form Validation UX (NICE TO HAVE)
- [ ] Real-time validation messages below inputs (not just flash)
- [ ] Green checkmark for valid inputs
- [ ] "Unsaved changes" warning when closing modal
- [ ] Confirm dialog for destructive actions (clear data)

### 6. Mobile Touch Targets (NICE TO HAVE)
- [ ] All buttons minimum 44x44px touch target (WCAG AAA)
- [ ] Increased padding on mobile for sync indicator
- [ ] Swipe gestures to close modals on mobile

---

## Implementation Strategy

### Phase 1: Modal Focus (Week 1)
1. Implement focus trap utility function
2. Add Escape key handler
3. Add ARIA attributes
4. Test with keyboard only
5. Test with screen reader

### Phase 2: Screen Reader (Week 1)
1. Add ARIA live regions
2. Update toast notification component
3. Add validation error announcements
4. Test with NVDA/VoiceOver

### Phase 3: Keyboard Nav (Week 2)
1. Add `:focus-visible` styles
2. Implement keyboard shortcuts
3. Optimize tab order
4. Add tooltips
5. Full keyboard workflow test

### Phase 4: Polish (Week 2)
1. Add skip links
2. Improve loading states
3. Mobile touch target review
4. Cross-browser testing
5. Documentation

---

## Success Metrics

### Quantitative
- **Keyboard Task Completion**: 100% of workflows completable without mouse
- **Tab Stops**: Reduce from ~30 to ~15 in typical workflow (skip links)
- **Focus Trap Errors**: Zero reports of focus escaping modals
- **Screen Reader Errors**: Zero critical WCAG 2.1 Level A violations

### Qualitative
- **User Feedback**: "Much easier to navigate with keyboard"
- **Accessibility Audit**: Pass WCAG 2.1 Level AA automated checks
- **Power User Satisfaction**: Positive feedback on shortcuts

---

## Technical Notes

### Focus Trap Implementation
```javascript
function createFocusTrap(container) {
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = container.querySelectorAll(focusableSelectors);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    function handleKeyDown(e) {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();
    
    return {
        destroy: () => container.removeEventListener('keydown', handleKeyDown)
    };
}
```

### ARIA Live Region Pattern
```javascript
// Create persistent live region on init
const liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
liveRegion.className = 'gpv-sr-only'; // visually hidden
document.body.appendChild(liveRegion);

// Announce messages
function announce(message, priority = 'polite') {
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;
}
```

---

## Risks & Mitigation

### Risk: Escape Key Conflicts
**Mitigation**: Only capture Escape when modal is open, check `e.target` to avoid interfering with Endowus forms

### Risk: Focus Management Breaks
**Mitigation**: Thorough testing, fallback to body focus if trigger element unmounted

### Risk: Screen Reader Announcement Overload
**Mitigation**: Use `polite` not `assertive`, consolidate rapid updates, debounce validation messages

### Risk: Keyboard Shortcuts Conflict
**Mitigation**: Document conflicts, allow users to disable, use Ctrl+Shift+Key for less common actions

---

## Alignment with Product Principles

✅ **Privacy First**: No changes affect data handling  
✅ **Accuracy Critical**: Improved error feedback reduces user mistakes  
✅ **User Empowerment**: Keyboard users gain equal access  
✅ **Simplicity**: Focus management reduces confusion  
✅ **Accessibility**: WCAG 2.1 Level AA compliance

---

## Questions for Engineering

1. **Focus Trap**: Should we use a library (focus-trap) or custom implementation? Custom recommended for zero dependencies.

2. **Keyboard Shortcuts**: Should shortcuts work globally or only when overlay open? Recommend overlay-only to avoid conflicts.

3. **Screen Reader Testing**: Do we have access to NVDA/JAWS for testing? Recommend VoiceOver (Mac) + NVDA (Windows) minimum.

4. **Performance**: Will additional event listeners impact performance on large portfolios? Likely negligible, but test with 50+ goals.

---

## Conclusion

These three improvements address the most critical UX gaps for keyboard users, screen reader users, and power users. **Improvement #1 (Modal Focus)** is essential for WCAG compliance and should be implemented first. The acceptance criteria are concrete, testable, and aligned with established accessibility patterns.

**Estimated Total Effort**: 5-8 hours  
**Expected Impact**: High (affects 10-20% of users directly, improves perception for all)  
**Risk**: Low (additive changes, no breaking changes to existing functionality)

Let's prioritize #1 for immediate implementation, then #2 and #3 in parallel.
