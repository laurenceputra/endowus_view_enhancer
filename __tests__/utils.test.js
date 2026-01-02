/**
 * Unit tests for Endowus Portfolio Viewer utility functions
 * 
 * These tests import pure logic functions directly from the userscript.
 * The userscript conditionally exports functions when running in Node.js,
 * allowing tests to target the real implementation without code duplication.
 */

const {
    getGoalTargetKey,
    getProjectedInvestmentKey,
    getDisplayGoalType,
    sortGoalTypes,
    formatMoney,
    formatGrowthPercent,
    buildMergedInvestmentData
} = require('../tampermonkey/endowus_portfolio_viewer.user.js');

describe('getGoalTargetKey', () => {
    test('should generate correct storage key format', () => {
        expect(getGoalTargetKey('goal123')).toBe('goal_target_pct_goal123');
    });

    test('should handle empty string', () => {
        expect(getGoalTargetKey('')).toBe('goal_target_pct_');
    });

    test('should handle special characters', () => {
        expect(getGoalTargetKey('goal-123-abc')).toBe('goal_target_pct_goal-123-abc');
    });
});

describe('getProjectedInvestmentKey', () => {
    test('should generate correct key with pipe separator', () => {
        expect(getProjectedInvestmentKey('Retirement', 'GENERAL_WEALTH_ACCUMULATION'))
            .toBe('Retirement|GENERAL_WEALTH_ACCUMULATION');
    });

    test('should handle empty strings', () => {
        expect(getProjectedInvestmentKey('', '')).toBe('|');
    });

    test('should preserve special characters', () => {
        expect(getProjectedInvestmentKey('Emergency-Fund', 'CASH_MANAGEMENT'))
            .toBe('Emergency-Fund|CASH_MANAGEMENT');
    });
});

describe('getDisplayGoalType', () => {
    test('should convert GENERAL_WEALTH_ACCUMULATION to Investment', () => {
        expect(getDisplayGoalType('GENERAL_WEALTH_ACCUMULATION')).toBe('Investment');
    });

    test('should convert CASH_MANAGEMENT to Cash', () => {
        expect(getDisplayGoalType('CASH_MANAGEMENT')).toBe('Cash');
    });

    test('should convert PASSIVE_INCOME to Income', () => {
        expect(getDisplayGoalType('PASSIVE_INCOME')).toBe('Income');
    });

    test('should return unknown types as-is', () => {
        expect(getDisplayGoalType('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
        expect(getDisplayGoalType('SRS')).toBe('SRS');
    });

    test('should handle empty string', () => {
        expect(getDisplayGoalType('')).toBe('');
    });
});

describe('sortGoalTypes', () => {
    test('should sort in preferred order', () => {
        const input = ['CASH_MANAGEMENT', 'GENERAL_WEALTH_ACCUMULATION', 'PASSIVE_INCOME'];
        const expected = ['GENERAL_WEALTH_ACCUMULATION', 'PASSIVE_INCOME', 'CASH_MANAGEMENT'];
        expect(sortGoalTypes(input)).toEqual(expected);
    });

    test('should handle partial preferred types', () => {
        const input = ['CASH_MANAGEMENT', 'OTHER_TYPE'];
        const expected = ['CASH_MANAGEMENT', 'OTHER_TYPE'];
        expect(sortGoalTypes(input)).toEqual(expected);
    });

    test('should sort non-preferred types alphabetically', () => {
        const input = ['ZTYPE', 'ATYPE', 'MTYPE'];
        const expected = ['ATYPE', 'MTYPE', 'ZTYPE'];
        expect(sortGoalTypes(input)).toEqual(expected);
    });

    test('should handle mixed preferred and non-preferred types', () => {
        const input = ['ZTYPE', 'GENERAL_WEALTH_ACCUMULATION', 'ATYPE', 'CASH_MANAGEMENT'];
        const expected = ['GENERAL_WEALTH_ACCUMULATION', 'CASH_MANAGEMENT', 'ATYPE', 'ZTYPE'];
        expect(sortGoalTypes(input)).toEqual(expected);
    });

    test('should handle empty array', () => {
        expect(sortGoalTypes([])).toEqual([]);
    });

    test('should not modify original array', () => {
        const input = ['CASH_MANAGEMENT', 'GENERAL_WEALTH_ACCUMULATION'];
        const original = [...input];
        sortGoalTypes(input);
        expect(input).toEqual(original);
    });
});

describe('formatMoney', () => {
    test('should format positive numbers correctly', () => {
        expect(formatMoney(1000)).toBe('$1,000.00');
        expect(formatMoney(1234567.89)).toBe('$1,234,567.89');
    });

    test('should format zero', () => {
        expect(formatMoney(0)).toBe('$0.00');
    });

    test('should format negative numbers', () => {
        expect(formatMoney(-1000)).toBe('$-1,000.00');
    });

    test('should handle decimal precision', () => {
        expect(formatMoney(10.5)).toBe('$10.50');
        expect(formatMoney(10.999)).toBe('$11.00');
    });

    test('should return dash for invalid inputs', () => {
        expect(formatMoney(NaN)).toBe('-');
        expect(formatMoney(undefined)).toBe('-');
        expect(formatMoney(null)).toBe('-');
        expect(formatMoney('invalid')).toBe('-');
    });

    test('should handle very large numbers', () => {
        const result = formatMoney(1000000000);
        expect(result).toMatch(/^\$1,000,000,000\.00$/);
    });
});

describe('formatGrowthPercent', () => {
    test('should calculate growth percentage correctly for positive returns', () => {
        // Investment: 100, Return: 10, Total: 110
        // Growth = 10 / 100 * 100 = 10%
        expect(formatGrowthPercent(10, 110)).toBe('10.00%');
    });

    test('should calculate growth percentage for negative returns', () => {
        // Investment: 100, Return: -10, Total: 90
        // Growth = -10 / 100 * 100 = -10%
        expect(formatGrowthPercent(-10, 90)).toBe('-10.00%');
    });

    test('should handle zero return', () => {
        expect(formatGrowthPercent(0, 100)).toBe('0.00%');
    });

    test('should return dash for zero denominator', () => {
        // If total - return = 0, denominator is 0
        expect(formatGrowthPercent(100, 100)).toBe('-');
    });

    test('should return dash for invalid inputs', () => {
        expect(formatGrowthPercent(NaN, 100)).toBe('-');
        expect(formatGrowthPercent(10, NaN)).toBe('-');
        expect(formatGrowthPercent(Infinity, 100)).toBe('-');
    });

    test('should handle string inputs that are convertible', () => {
        expect(formatGrowthPercent('10', '110')).toBe('10.00%');
    });

    test('should handle large percentage gains', () => {
        // Investment: 100, Return: 200, Total: 300
        // Growth = 200 / 100 * 100 = 200%
        expect(formatGrowthPercent(200, 300)).toBe('200.00%');
    });

    test('should handle fractional percentages', () => {
        // Investment: 100, Return: 0.5, Total: 100.5
        // Growth = 0.5 / 100 * 100 = 0.5%
        expect(formatGrowthPercent(0.5, 100.5)).toBe('0.50%');
    });
});

describe('buildMergedInvestmentData', () => {
    test('should return null if any data is missing', () => {
        expect(buildMergedInvestmentData(null, [], [])).toBeNull();
        expect(buildMergedInvestmentData([], null, [])).toBeNull();
        expect(buildMergedInvestmentData([], [], null)).toBeNull();
    });

    test('should return null if any data is not an array', () => {
        expect(buildMergedInvestmentData({}, [], [])).toBeNull();
        expect(buildMergedInvestmentData([], 'string', [])).toBeNull();
        expect(buildMergedInvestmentData([], [], 123)).toBeNull();
    });

    test('should merge data correctly for single goal', () => {
        const performanceData = [{
            goalId: 'goal1',
            totalCumulativeReturn: { amount: 100 },
            simpleRateOfReturnPercent: 0.1
        }];
        
        const investibleData = [{
            goalId: 'goal1',
            goalName: 'Retirement - Core Portfolio',
            investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
            totalInvestmentAmount: { display: { amount: 1000 } }
        }];
        
        const summaryData = [{
            goalId: 'goal1',
            goalName: 'Retirement - Core Portfolio',
            investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION'
        }];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result).toHaveProperty('Retirement');
        expect(result.Retirement.total).toBe(1000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.totalInvestmentAmount).toBe(1000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.totalCumulativeReturn).toBe(100);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals).toHaveLength(1);
    });

    test('should extract bucket from first word of goal name', () => {
        const performanceData = [{ goalId: 'goal1', totalCumulativeReturn: { amount: 50 } }];
        const investibleData = [{
            goalId: 'goal1',
            goalName: 'Emergency - Fund',
            investmentGoalType: 'CASH_MANAGEMENT',
            totalInvestmentAmount: { display: { amount: 500 } }
        }];
        const summaryData = [{ goalId: 'goal1' }];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result).toHaveProperty('Emergency');
        expect(result.Emergency.CASH_MANAGEMENT.goals[0].goalBucket).toBe('Emergency');
    });

    test('should use "Uncategorized" for goals without bucket name', () => {
        const performanceData = [{ goalId: 'goal1', totalCumulativeReturn: { amount: 50 } }];
        const investibleData = [{
            goalId: 'goal1',
            goalName: '',
            investmentGoalType: 'CASH_MANAGEMENT',
            totalInvestmentAmount: { display: { amount: 500 } }
        }];
        const summaryData = [{ goalId: 'goal1' }];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result).toHaveProperty('Uncategorized');
    });

    test('should aggregate multiple goals in same bucket and type', () => {
        const performanceData = [
            { goalId: 'goal1', totalCumulativeReturn: { amount: 100 } },
            { goalId: 'goal2', totalCumulativeReturn: { amount: 200 } }
        ];
        
        const investibleData = [
            {
                goalId: 'goal1',
                goalName: 'Retirement - Portfolio A',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: { display: { amount: 1000 } }
            },
            {
                goalId: 'goal2',
                goalName: 'Retirement - Portfolio B',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: { display: { amount: 2000 } }
            }
        ];
        
        const summaryData = [
            { goalId: 'goal1' },
            { goalId: 'goal2' }
        ];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result.Retirement.total).toBe(3000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.totalInvestmentAmount).toBe(3000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.totalCumulativeReturn).toBe(300);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals).toHaveLength(2);
    });

    test('should handle multiple buckets and goal types', () => {
        const performanceData = [
            { goalId: 'goal1', totalCumulativeReturn: { amount: 100 } },
            { goalId: 'goal2', totalCumulativeReturn: { amount: 50 } }
        ];
        
        const investibleData = [
            {
                goalId: 'goal1',
                goalName: 'Retirement - Portfolio',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: { display: { amount: 1000 } }
            },
            {
                goalId: 'goal2',
                goalName: 'Emergency - Fund',
                investmentGoalType: 'CASH_MANAGEMENT',
                totalInvestmentAmount: { display: { amount: 500 } }
            }
        ];
        
        const summaryData = [
            { goalId: 'goal1' },
            { goalId: 'goal2' }
        ];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result).toHaveProperty('Retirement');
        expect(result).toHaveProperty('Emergency');
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION).toBeDefined();
        expect(result.Emergency.CASH_MANAGEMENT).toBeDefined();
    });

    test('should handle missing optional fields gracefully', () => {
        const performanceData = [{ goalId: 'goal1' }];
        const investibleData = [{ goalId: 'goal1', goalName: 'Test - Goal' }];
        const summaryData = [{ goalId: 'goal1' }];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result).toBeDefined();
        expect(result.Test['']).toBeDefined();
        expect(result.Test[''].goals[0].totalInvestmentAmount).toBeNull();
        expect(result.Test[''].goals[0].totalCumulativeReturn).toBeNull();
    });

    test('should fallback to summary data if investible data missing fields', () => {
        const performanceData = [{ goalId: 'goal1', totalCumulativeReturn: { amount: 100 } }];
        const investibleData = [{ goalId: 'goal1' }];
        const summaryData = [{
            goalId: 'goal1',
            goalName: 'Retirement - Plan',
            investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION'
        }];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals[0].goalName).toBe('Retirement - Plan');
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals[0].goalType).toBe('GENERAL_WEALTH_ACCUMULATION');
    });

    test('should handle empty arrays', () => {
        const result = buildMergedInvestmentData([], [], []);
        expect(result).toEqual({});
    });

    test('should skip goals with non-numeric investment amounts in totals', () => {
        const performanceData = [
            { goalId: 'goal1', totalCumulativeReturn: { amount: 100 } },
            { goalId: 'goal2', totalCumulativeReturn: { amount: 50 } }
        ];
        
        const investibleData = [
            {
                goalId: 'goal1',
                goalName: 'Retirement - A',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: { display: { amount: 1000 } }
            },
            {
                goalId: 'goal2',
                goalName: 'Retirement - B',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: { display: {} } // Missing amount
            }
        ];
        
        const summaryData = [
            { goalId: 'goal1' },
            { goalId: 'goal2' }
        ];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result.Retirement.total).toBe(1000); // Only goal1 counted
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.totalInvestmentAmount).toBe(1000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals).toHaveLength(2); // Both goals present
    });
});
