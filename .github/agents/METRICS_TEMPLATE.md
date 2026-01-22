---
name: workflow-metrics
description: Template for tracking agent workflow performance metrics
---

# Workflow Metrics Template

Use this template to track agent effectiveness and workflow performance for each PR or feature.

## PR Information

- **PR Number**: #XXX
- **Feature/Bug**: [Brief description]
- **Started**: YYYY-MM-DD HH:MM
- **Merged**: YYYY-MM-DD HH:MM
- **Total Duration**: [X hours/days]

---

## Phase Durations

| Phase | Duration | Status |
|-------|----------|--------|
| Planning | X hours | ✅/⚠️/❌ |
| Design | X hours | ✅/⚠️/❌ |
| Risk Assessment | X hours | ✅/⚠️/❌ |
| Implementation | X hours | ✅/⚠️/❌ |
| QA | X hours | ✅/⚠️/❌ |
| Review | X hours | ✅/⚠️/❌ |

**Total**: X hours

---

## Agent Interactions

### Product Manager
- **Invocations**: X
- **Key Decisions**: 
  - [Decision 1]
  - [Decision 2]
- **Clarity Score**: ⭐⭐⭐⭐⭐ (1-5)

### Staff Engineer
- **Invocations**: X
- **Implementations**: X
- **Rework Cycles**: X
- **Code Quality Score**: ⭐⭐⭐⭐⭐ (1-5)

### Devil's Advocate
- **Invocations**: X
- **Risks Identified**: X
- **Risks Materialized**: X
- **Risk Prevention Score**: ⭐⭐⭐⭐⭐ (1-5)

### QA Engineer
- **Invocations**: X
- **Test Coverage**: X%
- **Bugs Found**: X
- **Bugs Escaped**: X
- **Quality Gate Score**: ⭐⭐⭐⭐⭐ (1-5)

### Code Reviewer
- **Review Rounds**: X
- **Issues Found**: X (Blocking: X, Important: X, Suggestion: X)
- **Approval**: First Round / After Revisions
- **Review Quality Score**: ⭐⭐⭐⭐⭐ (1-5)

---

## Quality Metrics

### Test Coverage
- **Before**: X%
- **After**: X%
- **Target**: >70%
- **Status**: ✅/⚠️/❌

### Code Quality
- **Linting Errors**: X
- **Code Smells**: X
- **Complexity**: Low/Medium/High
- **Status**: ✅/⚠️/❌

### Bug Metrics
- **Bugs Found in QA**: X
- **Bugs Found in Review**: X
- **Bugs Found in Production**: X
- **Defect Escape Rate**: X%

---

## Workflow Issues

### Blockers
1. [Blocker 1] - Duration: X hours - Resolution: [how resolved]
2. [Blocker 2] - Duration: X hours - Resolution: [how resolved]

### Conflicts
1. [Conflict 1] - Between: [agents] - Resolution: [how resolved]
2. [Conflict 2] - Between: [agents] - Resolution: [how resolved]

### Rework
1. [Rework 1] - Reason: [why] - Duration: X hours
2. [Rework 2] - Reason: [why] - Duration: X hours

---

## Success Criteria

### Acceptance Criteria Met
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Quality Gates Passed
- [ ] All tests pass
- [ ] Linting clean
- [ ] Security checks pass
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Version bumped (if needed)

---

## Lessons Learned

### What Went Well
1. [Success 1]
2. [Success 2]

### What Could Be Improved
1. [Improvement 1]
2. [Improvement 2]

### Action Items
- [ ] [Action 1]
- [ ] [Action 2]

---

## Performance Analysis

### Time Efficiency
- **Expected Duration**: X hours
- **Actual Duration**: X hours
- **Variance**: +/- X hours (X%)

### Quality Efficiency
- **Rework Cycles**: X (Target: <2)
- **First-Time Approval**: Yes/No
- **Defect Density**: X bugs per 100 LOC

### Agent Effectiveness
- **Planning Clarity**: X/10
- **Design Quality**: X/10
- **Risk Prevention**: X/10
- **Test Coverage**: X/10
- **Review Thoroughness**: X/10

---

## Aggregate Statistics (Optional)

Track across multiple PRs to identify trends:

```
Last 10 PRs:
- Average Duration: X hours
- Average Rework Cycles: X
- Average Test Coverage: X%
- Defect Escape Rate: X%
- First-Time Approval Rate: X%
```

---

## Notes

[Any additional context, special circumstances, or observations]

---

**Completed By**: [Your Name]
**Date**: YYYY-MM-DD
