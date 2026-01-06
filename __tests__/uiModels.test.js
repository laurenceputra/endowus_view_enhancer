/**
 * Unit tests for UI state and view model helpers
 */

const {
    createInitialUiState,
    reduceUiState,
    getActiveView,
    getSelectedBucket,
    buildBucketSelectOptions,
    getBucketGoalTypes,
    calculateBucketTotalReturn,
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
    createGoalTargetFixture,
    createUiStateFixture
} = require('./fixtures/uiFixtures');

describe('createInitialUiState', () => {
    test('should return default UI state', () => {
        expect(createInitialUiState()).toEqual({
            isOpen: false,
            activeView: 'summary',
            selectedBucket: null,
            selectedGoalType: null
        });
    });

    test('should apply overrides', () => {
        expect(createInitialUiState({ isOpen: true, selectedBucket: 'Retirement' })).toEqual({
            isOpen: true,
            activeView: 'summary',
            selectedBucket: 'Retirement',
            selectedGoalType: null
        });
    });
});

describe('reduceUiState', () => {
    test('should handle open and close actions', () => {
        let state = createUiStateFixture();
        state = reduceUiState(state, { type: 'OPEN_MODAL' });
        expect(state.isOpen).toBe(true);
        state = reduceUiState(state, { type: 'CLOSE_MODAL' });
        expect(state.isOpen).toBe(false);
    });

    test('should select bucket and set active view', () => {
        const state = reduceUiState(createUiStateFixture(), { type: 'SELECT_BUCKET', bucket: 'Retirement' });
        expect(state.selectedBucket).toBe('Retirement');
        expect(state.activeView).toBe('bucket');
    });

    test('should ignore invalid view changes', () => {
        const state = reduceUiState(createUiStateFixture(), { type: 'SELECT_VIEW', view: 'invalid' });
        expect(state.activeView).toBe('summary');
    });

    test('should reset to initial state', () => {
        const state = reduceUiState(createUiStateFixture({ isOpen: true }), { type: 'RESET' });
        expect(state).toEqual(createInitialUiState());
    });

    test('should return initial state for invalid input', () => {
        const state = reduceUiState(null, null);
        expect(state).toEqual(createInitialUiState());
    });
});

describe('getActiveView', () => {
    test('should default to summary for invalid input', () => {
        expect(getActiveView(null)).toBe('summary');
    });

    test('should return bucket for bucket view', () => {
        expect(getActiveView({ activeView: 'bucket' })).toBe('bucket');
    });
});

describe('getSelectedBucket', () => {
    test('should prefer selected bucket when valid', () => {
        const bucketMap = createBucketMapFixture();
        const selected = getSelectedBucket({ selectedBucket: 'Retirement' }, bucketMap);
        expect(selected).toBe('Retirement');
    });

    test('should fall back to first sorted bucket', () => {
        const bucketMap = createBucketMapFixture();
        const selected = getSelectedBucket({}, bucketMap);
        expect(selected).toBe('Education');
    });

    test('should return null when bucket map empty', () => {
        expect(getSelectedBucket({}, {})).toBeNull();
    });
});

describe('buildBucketSelectOptions', () => {
    test('should build summary and bucket options', () => {
        const bucketMap = createBucketMapFixture();
        const options = buildBucketSelectOptions(bucketMap);
        expect(options[0]).toEqual({
            value: 'SUMMARY',
            label: '📊 Summary View',
            isSummary: true
        });
        expect(options[1].label).toBe('📁 Education');
        expect(options[2].label).toBe('📁 Retirement');
    });

    test('should return summary option for invalid map', () => {
        expect(buildBucketSelectOptions(null)).toEqual([
            { value: 'SUMMARY', label: '📊 Summary View', isSummary: true }
        ]);
    });
});

describe('bucket helpers', () => {
    test('should return goal types excluding total', () => {
        const bucketMap = createBucketMapFixture();
        const goalTypes = getBucketGoalTypes(bucketMap.Retirement);
        expect(goalTypes).toEqual(['GENERAL_WEALTH_ACCUMULATION', 'CASH_MANAGEMENT']);
    });

    test('should calculate bucket total return', () => {
        const bucketMap = createBucketMapFixture();
        const totalReturn = calculateBucketTotalReturn(bucketMap.Retirement);
        expect(totalReturn).toBe(150);
    });
});

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
