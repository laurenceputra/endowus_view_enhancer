/**
 * Unit tests for UI state and view model helpers
 */

const {
    getReturnClass,
    calculatePercentOfType,
    calculateGoalDiff,
    parseMoneyDisplay,
    getProjectedInvestmentValue,
    getGoalInvestmentAmount,
    buildSummaryViewModel,
    buildBucketDetailViewModel,
    collectGoalIds,
    buildGoalTargetById
} = require('../tampermonkey/goal_portfolio_viewer.user.js');

const {
    createBucketMapFixture,
    createProjectedInvestmentFixture,
    createGoalTargetFixture
} = require('./fixtures/uiFixtures');

describe('format helpers', () => {
    test('should return correct return class', () => {
        expect(getReturnClass(10)).toBe('positive');
        expect(getReturnClass(-1)).toBe('negative');
        expect(getReturnClass('invalid')).toBe('');
    });

    test('should calculate percent of type', () => {
        expect(calculatePercentOfType(50, 200)).toBe('25.00');
        expect(calculatePercentOfType(0, 0)).toBe('0.00');
    });

    test('should calculate goal diff display', () => {
        const diffInfo = calculateGoalDiff(1200, 60, 2500);
        expect(diffInfo.diffDisplay).toBe('$-300.00');
        expect(diffInfo.diffClass).toBe('negative');
    });

    test('should handle invalid goal diff inputs', () => {
        expect(calculateGoalDiff(100, null, 200)).toEqual({
            diffAmount: null,
            diffDisplay: '-',
            diffClass: ''
        });
    });

    test('should parse money display strings', () => {
        expect(parseMoneyDisplay('$1,234.50')).toBe(1234.5);
        expect(parseMoneyDisplay('')).toBeNull();
    });
});

describe('projected and goal helpers', () => {
    test('should get projected investment value', () => {
        const projected = createProjectedInvestmentFixture();
        expect(getProjectedInvestmentValue(projected, 'Retirement', 'GENERAL_WEALTH_ACCUMULATION')).toBe(500);
        expect(getProjectedInvestmentValue(projected, 'Retirement', 'CASH_MANAGEMENT')).toBe(0);
    });

    test('should get goal investment amount', () => {
        const bucketMap = createBucketMapFixture();
        const amount = getGoalInvestmentAmount(bucketMap.Retirement, 'GENERAL_WEALTH_ACCUMULATION', 'g2');
        expect(amount).toBe(800);
        expect(getGoalInvestmentAmount(bucketMap.Retirement, 'GENERAL_WEALTH_ACCUMULATION', 'missing')).toBeNull();
    });
});

describe('view model builders', () => {
    test('should build summary view model', () => {
        const bucketMap = createBucketMapFixture();
        const viewModel = buildSummaryViewModel(bucketMap);
        expect(viewModel.buckets).toHaveLength(2);
        expect(viewModel.buckets[0].bucketName).toBe('Education');
        expect(viewModel.buckets[1].bucketName).toBe('Retirement');
        const retirement = viewModel.buckets[1];
        expect(retirement.returnClass).toBe('positive');
        expect(retirement.goalTypes[0].goalType).toBe('GENERAL_WEALTH_ACCUMULATION');
        expect(retirement.goalTypes[1].returnClass).toBe('negative');
    });

    test('should build bucket detail view model with projections', () => {
        const bucketMap = createBucketMapFixture();
        const projected = createProjectedInvestmentFixture();
        const targets = createGoalTargetFixture();
        const viewModel = buildBucketDetailViewModel('Retirement', bucketMap, projected, targets);
        expect(viewModel.bucketName).toBe('Retirement');
        const goalTypeModel = viewModel.goalTypes[0];
        expect(goalTypeModel.projectedAmount).toBe(500);
        expect(goalTypeModel.adjustedTotal).toBe(2500);
        const firstGoal = goalTypeModel.goals[0];
        expect(firstGoal.percentOfType).toBe('60.00');
        expect(firstGoal.diffDisplay).toBe('$-300.00');
        expect(firstGoal.targetDisplay).toBe('60.00');
    });

    test('should return null for missing bucket', () => {
        const bucketMap = createBucketMapFixture();
        expect(buildBucketDetailViewModel('Missing', bucketMap, {}, {})).toBeNull();
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
});
