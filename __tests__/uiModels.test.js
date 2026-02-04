/**
 * Unit tests for UI state and view model helpers
 */

const {
    getReturnClass,
    calculatePercentOfType,
    calculateGoalDiff,
    calculateFixedTargetPercent,
    calculateRemainingTargetPercent,
    isRemainingTargetAboveThreshold,
    getProjectedInvestmentValue,
    buildDiffCellData,
    resolveGoalTypeActionTarget,
    buildSummaryViewModel,
    buildBucketDetailViewModel,
    collectGoalIds,
    buildGoalTargetById,
    buildGoalFixedById
} = require('../tampermonkey/goal_portfolio_viewer.user.js');

const {
    createBucketMapFixture,
    createProjectedInvestmentFixture,
    createGoalTargetFixture,
    createGoalFixedFixture
} = require('./fixtures/uiFixtures');

describe('format helpers', () => {
    test('should return correct return class', () => {
        expect(getReturnClass(10)).toBe('positive');
        expect(getReturnClass(-1)).toBe('negative');
        expect(getReturnClass('invalid')).toBe('');
    });

    test('should calculate percent of type', () => {
        expect(calculatePercentOfType(50, 200)).toBe(25);
        expect(calculatePercentOfType(0, 0)).toBe(0);
    });

    test('should calculate goal diff display', () => {
        const diffInfo = calculateGoalDiff(1200, 60, 2500);
        expect(diffInfo.diffClass).toBe('negative');
        expect(diffInfo.diffAmount).toBe(-300);
    });

    test('should handle invalid goal diff inputs', () => {
        expect(calculateGoalDiff(100, null, 200)).toEqual({
            diffAmount: null,
            diffClass: ''
        });
    });

    test('should build diff cell data', () => {
        const diffData = buildDiffCellData(1200, 60, 2500);
        expect(diffData.diffDisplay).toMatch(/-?\$?-?300\.00/);
        expect(diffData.diffClassName).toBe('gpv-diff-cell negative');
    });

    test('should calculate fixed target percent', () => {
        expect(calculateFixedTargetPercent(500, 2000)).toBe(25);
        expect(calculateFixedTargetPercent(500, 0)).toBeNull();
    });

    test('should calculate remaining target percent', () => {
        expect(calculateRemainingTargetPercent([60, 25])).toBe(15);
        expect(calculateRemainingTargetPercent([100, 10])).toBe(-10);
    });

    test('should detect high remaining target percentage', () => {
        expect(isRemainingTargetAboveThreshold(2)).toBe(false);
        expect(isRemainingTargetAboveThreshold(2.01)).toBe(true);
        expect(isRemainingTargetAboveThreshold('invalid')).toBe(false);
    });
});

describe('projected and goal helpers', () => {
    test('should get projected investment value', () => {
        const projected = createProjectedInvestmentFixture();
        expect(getProjectedInvestmentValue(projected, 'Retirement', 'GENERAL_WEALTH_ACCUMULATION')).toBe(500);
        expect(getProjectedInvestmentValue(projected, 'Retirement', 'CASH_MANAGEMENT')).toBe(0);
    });

    test('should return default diff cell data on invalid inputs', () => {
        const diffData = buildDiffCellData(100, null, 0);
        expect(diffData.diffDisplay).toBe('-');
        expect(diffData.diffClassName).toBe('gpv-diff-cell');
    });
});

describe('resolveGoalTypeActionTarget', () => {
    test('should resolve target input action', () => {
        const targetInput = { dataset: { goalId: 'g1' } };
        const target = {
            closest: selector => (selector === '.gpv-target-input' ? targetInput : null)
        };
        expect(resolveGoalTypeActionTarget(target)).toEqual({
            type: 'target',
            element: targetInput
        });
    });

    test('should resolve fixed toggle action', () => {
        const fixedToggle = { dataset: { goalId: 'g2' } };
        const target = {
            closest: selector => (selector === '.gpv-fixed-toggle-input' ? fixedToggle : null)
        };
        expect(resolveGoalTypeActionTarget(target)).toEqual({
            type: 'fixed',
            element: fixedToggle
        });
    });

    test('should return null when target is not resolvable', () => {
        expect(resolveGoalTypeActionTarget(null)).toBeNull();
        expect(resolveGoalTypeActionTarget({})).toBeNull();
    });
});

describe('view model builders', () => {
    test('should build summary view model', () => {
        const bucketMap = createBucketMapFixture();
        const projected = createProjectedInvestmentFixture();
        const targets = createGoalTargetFixture();
        const fixed = createGoalFixedFixture();
        const viewModel = buildSummaryViewModel(bucketMap, projected, targets, fixed);
        expect(viewModel.buckets).toHaveLength(2);
        expect(viewModel.buckets[0].bucketName).toBe('Education');
        expect(viewModel.buckets[1].bucketName).toBe('Retirement');
        expect(viewModel.showAllocationDriftHint).toBe(true);
        const retirement = viewModel.buckets[1];
        expect(retirement.returnClass).toBe('positive');
        expect(retirement.goalTypes[0].goalType).toBe('GENERAL_WEALTH_ACCUMULATION');
        expect(retirement.goalTypes[1].returnClass).toBe('negative');
        expect(retirement.goalTypes[0].allocationDriftDisplay).toBe('25.00%');
    });

    test('should build bucket detail view model with projections', () => {
        const bucketMap = createBucketMapFixture();
        const projected = createProjectedInvestmentFixture();
        const targets = createGoalTargetFixture();
        const fixed = createGoalFixedFixture();
        const viewModel = buildBucketDetailViewModel({
            bucketName: 'Retirement',
            bucketMap,
            projectedInvestmentsState: projected,
            goalTargetById: targets,
            goalFixedById: fixed
        });
        expect(viewModel.bucketName).toBe('Retirement');
        const goalTypeModel = viewModel.goalTypes[0];
        expect(goalTypeModel.goals.map(goal => goal.goalName)).toEqual([
            'Retirement - Core',
            'Retirement - Growth'
        ]);
        expect(goalTypeModel.projectedAmount).toBe(500);
        expect(goalTypeModel.adjustedTotal).toBe(2500);
        expect(goalTypeModel.remainingTargetDisplay).toBe('12.00%');
        expect(goalTypeModel.remainingTargetIsHigh).toBe(true);
        expect(goalTypeModel.allocationDriftDisplay).toBe('25.00%');
        const firstGoal = goalTypeModel.goals[0];
        expect(firstGoal.percentOfType).toBe(60);
        expect(firstGoal.diffDisplay).toMatch(/0\.00/);
        expect(firstGoal.targetDisplay).toBe('48.00');
        expect(firstGoal.isFixed).toBe(true);
    });

    test('should return empty buckets for invalid summary input', () => {
        expect(buildSummaryViewModel(null)).toEqual({ buckets: [], showAllocationDriftHint: false });
        expect(buildSummaryViewModel('invalid')).toEqual({ buckets: [], showAllocationDriftHint: false });
    });

    test('should handle summary buckets without meta or goal types', () => {
        const bucketMap = {
            Lonely: {}
        };
        const viewModel = buildSummaryViewModel(bucketMap);
        expect(viewModel.buckets).toHaveLength(1);
        expect(viewModel.buckets[0].endingBalanceAmount).toBe(0);
        expect(viewModel.buckets[0].goalTypes).toEqual([]);
        expect(viewModel.showAllocationDriftHint).toBe(false);
    });

    test('should build bucket detail without projected investments or targets', () => {
        const bucketMap = createBucketMapFixture();
        const viewModel = buildBucketDetailViewModel({
            bucketName: 'Retirement',
            bucketMap,
            projectedInvestmentsState: null,
            goalTargetById: null,
            goalFixedById: null
        });
        const goalTypeModel = viewModel.goalTypes[0];
        expect(goalTypeModel.projectedAmount).toBe(0);
        expect(goalTypeModel.remainingTargetDisplay).toBe('100.00%');
        expect(goalTypeModel.remainingTargetIsHigh).toBe(true);
        expect(goalTypeModel.goals[0].targetDisplay).toBe('');
        expect(goalTypeModel.goals[0].returnPercentDisplay).toBe('10.00%');
    });

    test('should apply remaining target to diff when single target is missing', () => {
        const bucketMap = {
            Solo: {
                _meta: { endingBalanceTotal: 1000 },
                GENERAL_WEALTH_ACCUMULATION: {
                    endingBalanceAmount: 1000,
                    totalCumulativeReturn: 0,
                    goals: [
                        {
                            goalId: 'g1',
                            goalName: 'Solo - Fixed',
                            endingBalanceAmount: 600,
                            totalCumulativeReturn: 0
                        },
                        {
                            goalId: 'g2',
                            goalName: 'Solo - Missing',
                            endingBalanceAmount: 400,
                            totalCumulativeReturn: 0
                        }
                    ]
                }
            }
        };
        const viewModel = buildBucketDetailViewModel({
            bucketName: 'Solo',
            bucketMap,
            projectedInvestmentsState: null,
            goalTargetById: {},
            goalFixedById: { g1: true }
        });
        const goalTypeModel = viewModel.goalTypes[0];
        expect(goalTypeModel.remainingTargetDisplay).toBe('0.00%');
        const missingGoal = goalTypeModel.goals.find(goal => goal.goalId === 'g2');
        expect(missingGoal.targetDisplay).toBe('');
        expect(missingGoal.diffDisplay).toMatch(/0\.00/);
    });

    test('should keep diff empty when remaining target is negative', () => {
        const bucketMap = {
            Stretch: {
                _meta: { endingBalanceTotal: 1000 },
                GENERAL_WEALTH_ACCUMULATION: {
                    endingBalanceAmount: 1000,
                    totalCumulativeReturn: 0,
                    goals: [
                        {
                            goalId: 'g1',
                            goalName: 'Stretch - One',
                            endingBalanceAmount: 300,
                            totalCumulativeReturn: 0
                        },
                        {
                            goalId: 'g2',
                            goalName: 'Stretch - Two',
                            endingBalanceAmount: 300,
                            totalCumulativeReturn: 0
                        },
                        {
                            goalId: 'g3',
                            goalName: 'Stretch - Missing',
                            endingBalanceAmount: 400,
                            totalCumulativeReturn: 0
                        }
                    ]
                }
            }
        };
        const viewModel = buildBucketDetailViewModel({
            bucketName: 'Stretch',
            bucketMap,
            projectedInvestmentsState: null,
            goalTargetById: { g1: 80, g2: 30 },
            goalFixedById: {}
        });
        const goalTypeModel = viewModel.goalTypes[0];
        const missingGoal = goalTypeModel.goals.find(goal => goal.goalId === 'g3');
        expect(missingGoal.targetDisplay).toBe('');
        expect(missingGoal.diffDisplay).toBe('-');
    });

    test('should return null for missing bucket', () => {
        const bucketMap = createBucketMapFixture();
        expect(buildBucketDetailViewModel({
            bucketName: 'Missing',
            bucketMap,
            projectedInvestmentsState: {},
            goalTargetById: {},
            goalFixedById: {}
        })).toBeNull();
    });
});

describe('collectGoalIds and buildGoalTargetById', () => {
    test('should collect goal ids from bucket', () => {
        const bucketMap = createBucketMapFixture();
        const goalIds = collectGoalIds(bucketMap.Retirement).sort();
        expect(goalIds).toEqual(['g1', 'g2', 'g3']);
    });

    test('should build goal target map with getter', () => {
        const map = buildGoalTargetById(['a', 'b'], id => (id === 'a' ? 20 : null));
        expect(map).toEqual({ a: 20 });
    });

    test('should build goal fixed map with getter', () => {
        const map = buildGoalFixedById(['a', 'b'], id => id === 'b');
        expect(map).toEqual({ b: true });
    });
});
