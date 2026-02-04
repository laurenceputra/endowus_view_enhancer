---
name: ux-accessibility
description: "Review or implement UI/visual changes with accessibility checks (keyboard, focus, contrast, ARIA, motion). Use for any new UI elements or visual updates."
---

# UX Accessibility

## Checklist
1. **Keyboard navigation**
   - Ensure all interactive elements are reachable and operable via keyboard.
   - Ensure focus order is logical and visible.

2. **Focus states**
   - Provide visible focus styles; do not remove them without replacement.
   - Trap focus in modals/dialogs when applicable.

3. **Contrast & readability**
   - Verify sufficient contrast for text and controls.
   - Avoid using color as the sole indicator of state.

4. **ARIA & semantics**
   - Prefer semantic elements (button, label, heading).
   - Add ARIA labels for icon-only controls.

5. **Motion & animation**
   - Keep animations subtle and support reduced-motion preferences.

## Output Format
- Findings
- Recommendations
