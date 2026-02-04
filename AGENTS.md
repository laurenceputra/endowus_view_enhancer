# AGENTS

> **Note:** This file provides a quick reference. For comprehensive guidance, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md) (single source of truth, GitHub standard filename).

## Quick Start

This repository uses a multi-agent workflow for development. Each agent has specific responsibilities:

### Agent Roles

| Agent | Role | Documentation |
|-------|------|---------------|
| **Product Manager** | Requirements framing, scope, user impact | [`.github/agents/product-manager.md`](.github/agents/product-manager.md) |
| **Staff Engineer** | Architecture, implementation, technical decisions | [`.github/agents/staff-engineer.md`](.github/agents/staff-engineer.md) |
| **QA Engineer** | Testing strategy, quality assurance | [`.github/agents/qa-engineer.md`](.github/agents/qa-engineer.md) |
| **Code Reviewer** | Final review, quality gates | [`.github/agents/code-reviewer.md`](.github/agents/code-reviewer.md) |
| **Devil's Advocate** | Risk surfacing, blind spots | [`.github/agents/devils-advocate.md`](.github/agents/devils-advocate.md) |

### Merged Responsibilities (No New Roles)
- **Security/Privacy** → Staff Engineer + Code Reviewer
- **UX/Accessibility** → Product Manager + QA Engineer
- **Release/Docs** → Staff Engineer + Code Reviewer

### Trigger Rules
For trigger rules and detailed enforcement, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

### Workflow Overview
For workflow phases, key principles, definition of done, and testing commands, see the [Comprehensive Development Guide](.github/copilot-instructions.md).

## Further Reading

- [Comprehensive Development Guide](.github/copilot-instructions.md)
- [Technical Design](TECHNICAL_DESIGN.md)
- [Testing Guide](TESTING.md)

## Repository Hygiene

- The `.specifications/` directory is ignored via `.gitignore` and should not be committed.
