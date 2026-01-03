# AGENTS

## Repository overview
This repo contains a Tampermonkey userscript for Endowus view enhancements and a Jest test suite for validating its logic.

## Coding conventions
- Align with the existing codebase style in `tampermonkey/endowus_portfolio_viewer.user.js`.
- Use 4-space indentation.
- Always include semicolons.
- Use camelCase for variables and functions.
- Keep section header blocks to organize the script.
- Wrap the userscript in an IIFE structure.

## Separation of concerns
- Keep pure logic above the browser-only block.
- Ensure logic remains testable and exportable under Node.

## Styling pattern
- Inject CSS via a string in `injectStyles()`.
- Use the `epv-` prefix for class names.

## Testing guidance
- Jest tests should import functions from the userscript.
- Keep logic functions pure to support unit testing.

## Workflow phases
- Phase 1 (Architecture and planning): an architect outlines the change, identifies risks, and gets a devil's advocate review before implementation.
- Phase 2 (Implementation): build the planned changes, keeping logic testable and exports stable.
- Phase 3 (QA): run Jest tests and validate behavior against the plan.
- Phase 4 (Devil's advocate review): independently review the completed work for quality, maintainability, and safety.

## Workflow checklists
### Architect (Phase 1)
- Define the problem, goals, and out-of-scope items.
- Identify risks and assumptions (e.g., DOM selectors and missing data cases).
- Ensure logic is designed to be pure and exportable under Node.
- Note required updates to `TECHNICAL_DESIGN.md` and README references.

### Devil's advocate (pre-implementation)
- Challenge ambiguous requirements and hidden edge cases.
- Verify the plan preserves testability and separation of concerns.
- Check for safety risks (data egress, unsafe string handling, `eval`).

### Implementation (Phase 2)
- Keep logic above the browser-only block and preserve the IIFE structure.
- Follow coding conventions (4-space indentation, semicolons, camelCase).
- Export new logic for Jest tests and keep functions pure.
- Use `injectStyles()` with `epv-` class naming for any new UI.

### QA (Phase 3)
- Run Jest tests for logic changes and validate behavior manually.
- Confirm behavior matches the Phase 1 plan and documented expectations.
- Check for console errors or regressions in common flows.

### Devil's advocate (Phase 4)
- Confirm implementation matches the plan with no unreviewed scope creep.
- Re-review maintainability, safety, and documentation updates.

## Definition of done
- Behavior matches the Phase 1 plan and expectations.
- New or changed logic has corresponding Jest coverage where applicable.
- Pure logic remains exportable and browser-only code stays isolated.
- Documentation updates are applied when behavior changes.
- Safety requirements are met (no data egress, no `eval`, sanitized strings).

## Testing and verification
- Run Jest tests for any logic change.
- If tests are not run, explain why in the PR description.

## PR checklist
- Summary clearly states user-visible behavior changes.
- Tests run (or skipped with justification).
- Documentation updated (`TECHNICAL_DESIGN.md`, README references) when needed.

## Update pointers
- If behavior changes, update `TECHNICAL_DESIGN.md` and any related README references.

## Safety
- No data egress.
- Avoid `eval`.
- Sanitize user-visible strings.

## GitHub instructions and patterns
- Review `.github/copilot-instructions.md` before starting work and follow its guidance.
- Align with any relevant patterns or agent guidance under `.github/agents/`.
- If guidance conflicts with the existing userscript style, prefer the current codebase conventions.
