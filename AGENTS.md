# AGENTS

> **Note:** This file provides a quick reference. For comprehensive guidance, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md) (single source of truth).

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

### Workflow Overview

1. **Product Manager** frames the problem and acceptance criteria
2. **Staff Engineer** designs solution and implements changes
3. **Devil's Advocate** challenges assumptions and surfaces risks
4. **QA Engineer** defines test plan and verifies quality
5. **Code Reviewer** applies final quality gates before merge

See [Comprehensive Development Guide](.github/copilot-instructions.md) for detailed workflow and orchestration.

## Key Principles

- **Single Source of Truth**: [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- **Privacy First**: No data egress, all processing client-side
- **Testing Required**: Jest tests mandatory for all logic changes
- **Financial Accuracy**: Critical - verify calculations
- **Security**: No `eval`, sanitize all strings

## Definition of Done

- [ ] Behavior matches requirements and acceptance criteria
- [ ] Jest tests added/updated for logic changes
- [ ] Documentation updated if behavior changes
- [ ] Version bumped if behavior changes
- [ ] All tests passing
- [ ] Security requirements met

## Quick Reference

```bash
# Run tests
npm test

# Run linter
npm run lint

# Run tests with coverage
npm run test:coverage
```

## Further Reading

- [Comprehensive Development Guide](.github/copilot-instructions.md)
- [Technical Design](TECHNICAL_DESIGN.md)
- [Testing Guide](TESTING.md)
