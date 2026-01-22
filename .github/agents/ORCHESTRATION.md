---
name: orchestration
description: Agent coordination, workflow state machine, and handoff protocols
applies_to:
  - copilot-chat
  - copilot-cli
  - copilot-workspace
  - copilot-code-review
---

# Agent Orchestration Guide

This document defines how agents coordinate, hand off work, resolve conflicts, and progress through the workflow stages.

## Workflow State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                         PLANNING PHASE                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Product Manager: Frame problem & acceptance criteria        │
│    Output: User story, acceptance criteria, success metrics    │
│    Gate: Staff Engineer + QA confirm criteria are testable     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DESIGN PHASE                               │
├─────────────────────────────────────────────────────────────────┤
│ 2. Staff Engineer: Propose technical solution                  │
│    Output: Architecture, risks, tradeoffs                      │
│    Gate: Product + QA agree on scope impact                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RISK ASSESSMENT PHASE                         │
├─────────────────────────────────────────────────────────────────┤
│ 3. Devil's Advocate: Challenge assumptions                     │
│    Output: Risks, blind spots, mitigations                     │
│    Gate: Risks addressed or explicitly accepted                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   IMPLEMENTATION PHASE                          │
├─────────────────────────────────────────────────────────────────┤
│ 4. Staff Engineer: Implement solution                          │
│    Output: Code changes, unit tests                            │
│    Gate: Code compiles, unit tests pass                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     QA PHASE                                    │
├─────────────────────────────────────────────────────────────────┤
│ 5. QA Engineer: Verify quality                                 │
│    Output: Test results, bug reports                           │
│    Gate: Test plan executed, critical bugs fixed              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REVIEW PHASE                                 │
├─────────────────────────────────────────────────────────────────┤
│ 6. Code Reviewer: Final quality gate                           │
│    Output: Approval or change requests                         │
│    Gate: All blocking issues resolved                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
                  [MERGE]
```

## Handoff Protocols

### Product Manager → Staff Engineer

**Handoff Document:**
```markdown
## Problem Statement
[Clear description of user pain point]

## Acceptance Criteria
- [ ] Criterion 1 (testable)
- [ ] Criterion 2 (testable)

## Success Metrics
[How we measure success]

## Constraints
[Technical, business, or regulatory constraints]
```

**Staff Engineer Checklist:**
- [ ] Acceptance criteria are clear and testable
- [ ] Constraints are understood
- [ ] Success metrics are measurable
- [ ] Scope is reasonable for single PR

**Loopback Conditions:**
- Acceptance criteria are ambiguous or untestable
- Constraints conflict with technical feasibility
- Scope is too large (requires splitting)

---

### Staff Engineer → Devil's Advocate

**Handoff Document:**
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

**Devil's Advocate Checklist:**
- [ ] Test all key assumptions
- [ ] Surface unmentioned risks
- [ ] Challenge tradeoffs
- [ ] Identify blind spots

**Loopback Conditions:**
- Critical risk without mitigation
- Assumption proven false
- Better alternative identified

---

### Devil's Advocate → Staff Engineer (Implementation)

**Handoff Document:**
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

**Staff Engineer Checklist:**
- [ ] All blocking risks have mitigations
- [ ] Accepted risks are documented
- [ ] Required mitigations are in implementation plan

**Loopback Conditions:**
- Blocking risk cannot be mitigated (back to Product Manager)
- Mitigation requires scope change (back to Product Manager)

---

### Staff Engineer → QA Engineer

**Handoff Document:**
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

**QA Engineer Checklist:**
- [ ] Test plan covers all acceptance criteria
- [ ] Edge cases identified and testable
- [ ] Performance impact considered
- [ ] Security implications assessed

**Loopback Conditions:**
- Test failure reveals logic error (back to Staff Engineer)
- Missing critical test coverage (back to Staff Engineer)
- Performance regression (back to Staff Engineer)

---

### QA Engineer → Code Reviewer

**Handoff Document:**
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

**Code Reviewer Checklist:**
- [ ] QA passed all gates
- [ ] Code quality meets standards
- [ ] No security vulnerabilities
- [ ] Documentation updated

**Loopback Conditions:**
- Code review finds logic errors (back to Staff Engineer + QA)
- Security vulnerability found (back to Staff Engineer + QA)
- Breaking change not documented (back to Staff Engineer)

---

## Conflict Resolution

### When Agents Disagree

**Scenario: Product Manager vs. Staff Engineer (Scope)**

**Resolution Protocol:**
1. Product Manager states user value
2. Staff Engineer states technical cost/risk
3. Devil's Advocate surfaces tradeoffs
4. Decision: Split scope or accept larger PR

**Example:**
```
PM: "We need export to CSV, Excel, and PDF"
SE: "That's 3 PRs worth. CSV is 1 day, Excel/PDF adds 3 days each"
DA: "Risk: Large PR harder to review, more bugs. Also: Excel/PDF need libraries"
Decision: Split into 3 PRs. Ship CSV first (user feedback), then Excel, then PDF
```

---

**Scenario: Staff Engineer vs. QA Engineer (Test Coverage)**

**Resolution Protocol:**
1. QA states required coverage
2. Staff Engineer states feasibility/cost
3. Devil's Advocate assesses actual risk
4. Decision: Balance coverage with effort

**Example:**
```
QA: "Need tests for all 15 edge cases"
SE: "5 are truly edge cases, 10 are theoretical. Would take 2 extra days"
DA: "Financial data is critical. But 10 theoretical cases have zero user reports"
Decision: Test the 5 real edge cases now. Document 10 theoretical for future
```

---

**Scenario: QA Engineer vs. Code Reviewer (Quality Standards)**

**Resolution Protocol:**
1. Code Reviewer states concern
2. QA explains test coverage rationale
3. Devil's Advocate assesses risk
4. Decision: Additional tests or accept risk

**Example:**
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

## Agent Selection Decision Tree

Use this to determine which agent to invoke:

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
| QA Engineer | 🤝 Input | 🤝 Input | ❌ No | ✅ Owner | 🤝 Input | 🤝 Input |
| Code Reviewer | ❌ No | 🤝 Input | ❌ No | 🤝 Verify | ✅ Owner | 🤝 Input |
| Devil's Advocate | 🤝 Challenge | 🤝 Challenge | ❌ No | 🤝 Challenge | ❌ No | ✅ Owner |

**Legend:**
- ✅ Owner: Primary responsibility and decision-maker
- 🤝 Input/Support: Provides input, collaborates, or verifies
- ❌ No: Not involved in this phase

---

## Workflow Automation

### Pre-Commit Hook

Automatically runs before each commit:
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run linter
npm run lint || exit 1

# Run tests
npm test || exit 1

echo "✅ Pre-commit checks passed"
```

### GitHub Actions Workflow

Automated agent reviews on pull requests:
```yaml
name: Agent Review
on: [pull_request]
jobs:
  qa-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
      - run: npm run lint
```

---

## Performance Metrics

Track these metrics to improve agent effectiveness:

### Agent Performance KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Planning Phase Duration | < 1 hour | Time from request to accepted design |
| Implementation Phase Duration | < 1 day | Time from design to code complete |
| QA Phase Duration | < 2 hours | Time from code complete to QA approval |
| Review Phase Duration | < 1 hour | Time from QA approval to merge |
| Defect Escape Rate | < 5% | Bugs found in prod / total bugs |
| Rework Rate | < 10% | PRs requiring major revision |

### Tracking Template

```markdown
## Workflow Metrics - [PR Number]

**Phase Durations:**
- Planning: [X hours]
- Design: [X hours]
- Implementation: [X hours]
- QA: [X hours]
- Review: [X hours]
- Total: [X hours]

**Quality Metrics:**
- Test Coverage: [X%]
- Bugs Found in QA: [X]
- Bugs Found in Review: [X]
- Rework Cycles: [X]

**Agent Effectiveness:**
- Devil's Advocate Risks: [X found] / [X materialized]
- QA Defect Detection: [X found] / [X escaped]
- Review Approval: [First Time / Revisions Required]
```

---

## Quick Reference Commands

```bash
# Invoke specific agent workflows
copilot agent product-manager "Define requirements for [feature]"
copilot agent staff-engineer "Design solution for [problem]"
copilot agent devils-advocate "Challenge assumptions in [design]"
copilot agent qa-engineer "Test plan for [feature]"
copilot agent code-reviewer "Review [PR/commit]"

# Run full workflow
copilot workflow run --feature "[feature description]"

# Check workflow state
copilot workflow status

# Skip to specific phase
copilot workflow goto [planning|design|implementation|qa|review]
```

---

## Best Practices

### For Product Managers
- Write acceptance criteria as testable behaviors
- Include success metrics upfront
- Define constraints clearly
- Collaborate on scope with Staff Engineer

### For Staff Engineers
- Document assumptions and tradeoffs
- Call out risks proactively
- Design for testability
- Consider future extensibility

### For Devil's Advocates
- Focus on high-impact risks
- Provide concrete mitigations
- Don't block for theoretical issues
- Balance rigor with pragmatism

### For QA Engineers
- Test acceptance criteria systematically
- Focus on critical paths first
- Document test evidence
- Verify financial accuracy manually

### For Code Reviewers
- Review with fresh perspective
- Check security implications
- Verify documentation updates
- Balance standards with pragmatism

---

## Continuous Improvement

Review and update this orchestration guide:
- After each major feature (lessons learned)
- When conflicts arise repeatedly (update resolution)
- When bottlenecks occur (streamline handoffs)
- Quarterly (broader process improvements)

**Document Changes:**
- Date: [YYYY-MM-DD]
- Change: [What was updated]
- Rationale: [Why it was changed]
- Impact: [Expected improvement]

---

**Remember**: Orchestration should enable speed and quality, not create bureaucracy. Adapt these guidelines to fit the team's needs while maintaining the core principles of multi-agent collaboration.
