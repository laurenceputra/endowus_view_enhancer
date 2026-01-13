# AGENTS

## Repository overview
This repo contains a Tampermonkey userscript for goal-based portfolio view enhancements and a Jest test suite for validating its logic. Currently supports the Endowus (Singapore) platform.

## Coding conventions
- Align with the existing codebase style in `tampermonkey/goal_portfolio_viewer.user.js`.
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
- Use the `gpv-` prefix for class names.

## Testing guidance
- Jest tests should import functions from the userscript.
- Keep logic functions pure to support unit testing.
- Jest testing is mandatory for all changes; manual testing checklists are not required.

## Development workflow alignment
- Follow the workflow guidance in `.github/copilot-instructions.md` as the single source of truth.
- Use the role guides in `.github/agents/` instead of a fixed phase model:
  - `staff-engineer.md` for architecture, risks, and technical tradeoffs.
  - `product-manager.md` for requirements framing and scope.
  - `qa-engineer.md` for testing strategy and verification.
  - `code-reviewer.md` for final review quality gates.
- Codex should load the `.github/agents/*.md` files for role-specific guidance whenever relevant.

## Definition of done
- Behavior matches documented requirements and expectations.
- New or changed logic has corresponding Jest coverage where applicable.
- Pure logic remains exportable and browser-only code stays isolated.
- Documentation updates are applied when behavior changes.
- Safety requirements are met (no data egress, no `eval`, sanitized strings).

## Testing and verification
- Run Jest tests for any change.
- If tests are not run, explain why in the PR description.

## PR checklist
- Summary clearly states user-visible behavior changes.
- Tests run (or skipped with justification).
- Documentation updated (`TECHNICAL_DESIGN.md`, README references) when needed.

## Update pointers
- If behavior changes, update `TECHNICAL_DESIGN.md` and any related README references.
- If behavior changes, require a version bump, in the tampermonkey/goal_portfolio_viewer.user.js, package.json, package-lock.json. There should only be 1 version bump per PR.

## Safety
- No data egress.
- Avoid `eval`.
- Sanitize user-visible strings.

## GitHub instructions and patterns
- Review `.github/copilot-instructions.md` before starting work and follow its guidance.
- Align with any relevant patterns or agent guidance under `.github/agents/`.
- If guidance conflicts with the existing userscript style, prefer the current codebase conventions.
- Treat `.github/copilot-instructions.md` as the single source of truth; keep this file minimal and defer to it for detailed guidance.
