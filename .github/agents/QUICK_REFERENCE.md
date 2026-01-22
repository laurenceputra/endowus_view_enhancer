---
name: agent-quick-reference
description: Quick reference card for agent invocation and workflow navigation
---

# Agent Quick Reference Card

## 🎯 When to Use Which Agent

| I need to... | Use Agent | Command |
|--------------|-----------|---------|
| Define what to build | Product Manager | `@product-manager "Define requirements for [feature]"` |
| Design a solution | Staff Engineer | `@staff-engineer "Design approach for [problem]"` |
| Implement code | Staff Engineer | `@staff-engineer "Implement [feature]"` |
| Challenge assumptions | Devil's Advocate | `@devils-advocate "Review risks for [design]"` |
| Create test plan | QA Engineer | `@qa-engineer "Test plan for [feature]"` |
| Verify quality | QA Engineer | `@qa-engineer "Verify [implementation]"` |
| Review code | Code Reviewer | `@code-reviewer "Review [PR]"` |
| Resolve conflicts | Devil's Advocate | See orchestration guide |

## 📋 Workflow Phases

```
1. [PLANNING]      Product Manager defines requirements
2. [DESIGN]        Staff Engineer proposes solution  
3. [RISK CHECK]    Devil's Advocate challenges
4. [IMPLEMENT]     Staff Engineer codes
5. [QA]            QA Engineer tests
6. [REVIEW]        Code Reviewer approves
```

## ✅ Definition of Done

Before moving to next phase:

**Planning → Design:**
- [ ] Acceptance criteria clear and testable
- [ ] Success metrics defined
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

## 🚨 Common Scenarios

### "I have a bug to fix"
1. `@product-manager "Clarify expected behavior for [bug]"`
2. `@staff-engineer "Fix [bug]"`
3. `@qa-engineer "Verify fix for [bug]"`
4. `@code-reviewer "Review bugfix"`

### "I want to add a feature"
1. `@product-manager "Define requirements for [feature]"`
2. `@staff-engineer "Design [feature]"`
3. `@devils-advocate "Challenge [design]"`
4. `@staff-engineer "Implement [feature]"`
5. `@qa-engineer "Test [feature]"`
6. `@code-reviewer "Review [feature]"`

### "I'm unsure about an approach"
1. `@staff-engineer "Evaluate approaches: [A vs B vs C]"`
2. `@devils-advocate "What could go wrong with [approach]?"`
3. `@product-manager "Which approach delivers most user value?"`

### "Tests are failing"
1. `@qa-engineer "Diagnose test failure in [test]"`
2. `@staff-engineer "Fix failing test"`
3. `@qa-engineer "Re-verify fix"`

### "PR has review comments"
1. `@staff-engineer "Address review comment: [comment]"`
2. `@qa-engineer "Re-test after changes"`
3. `@code-reviewer "Re-review"`

## 💡 Agent Superpowers

**Product Manager:**
- Translates user needs to requirements
- Balances scope with value
- Defines success criteria

**Staff Engineer:**
- Designs scalable solutions
- Implements code changes
- Makes technical tradeoffs

**QA Engineer:**
- Designs test strategies
- Finds edge cases
- Verifies quality

**Code Reviewer:**
- Ensures code quality
- Catches security issues
- Maintains standards

**Devil's Advocate:**
- Surfaces blind spots
- Challenges assumptions
- Identifies risks

## 🛠️ Common Commands

```bash
# Run tests
npm test

# Run linter
npm run lint

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📊 Quality Gates

| Phase | Gate | Blocker If... |
|-------|------|---------------|
| Planning | Testable criteria | Acceptance criteria are vague |
| Design | Risk assessment | Critical unmitigated risk |
| Implementation | Tests pass | Test failures or no tests |
| QA | Quality verified | Critical bugs found |
| Review | Code approved | Blocking review comments |

## 🔄 Loopback Conditions

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

## 📈 Success Metrics

Track these for continuous improvement:
- Time per phase
- Rework cycles
- Defect escape rate
- Test coverage %
- Review approval rate

## 🎓 Tips

**For faster workflows:**
- Define clear acceptance criteria upfront
- Involve QA in design phase
- Write tests while implementing
- Address review comments promptly

**For better quality:**
- Challenge your own assumptions
- Test edge cases thoroughly
- Document tradeoffs
- Review your own code first

**For team alignment:**
- Share context in handoffs
- Document decisions
- Communicate blockers early
- Celebrate wins

## 🔗 Full Documentation

- [Comprehensive Guide](.github/copilot-instructions.md)
- [Orchestration Details](.github/agents/ORCHESTRATION.md)
- [Product Manager Role](.github/agents/product-manager.md)
- [Staff Engineer Role](.github/agents/staff-engineer.md)
- [QA Engineer Role](.github/agents/qa-engineer.md)
- [Code Reviewer Role](.github/agents/code-reviewer.md)
- [Devil's Advocate Role](.github/agents/devils-advocate.md)

---

**Remember**: Agents are tools to improve quality and speed. Use them pragmatically, not religiously. Adapt the workflow to your needs.
