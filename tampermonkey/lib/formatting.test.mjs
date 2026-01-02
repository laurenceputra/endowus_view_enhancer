import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
    getGoalTargetKey,
    getProjectedInvestmentKey,
    getDisplayGoalType,
    sortGoalTypes,
    formatMoney,
    formatGrowthPercent,
    buildMergedInvestmentData
} = require('../endowus_portfolio_viewer.user.js');

describe('getGoalTargetKey', () => {
    it('builds a target percentage storage key', () => {
        expect(getGoalTargetKey('goal-123')).toBe('goal_target_pct_goal-123');
    });
});

describe('getProjectedInvestmentKey', () => {
    it('combines bucket and goal type into a key', () => {
        expect(getProjectedInvestmentKey('Retirement', 'GENERAL_WEALTH_ACCUMULATION'))
            .toBe('Retirement|GENERAL_WEALTH_ACCUMULATION');
    });
});

describe('getDisplayGoalType', () => {
    it('maps known goal types to display labels', () => {
        expect(getDisplayGoalType('GENERAL_WEALTH_ACCUMULATION')).toBe('Investment');
        expect(getDisplayGoalType('CASH_MANAGEMENT')).toBe('Cash');
        expect(getDisplayGoalType('PASSIVE_INCOME')).toBe('Income');
    });

    it('falls back to the raw goal type for unknown values', () => {
        expect(getDisplayGoalType('CUSTOM_GOAL')).toBe('CUSTOM_GOAL');
    });
});

describe('sortGoalTypes', () => {
    it('prioritizes preferred goal types and sorts the rest', () => {
        const sorted = sortGoalTypes([
            'CASH_MANAGEMENT',
            'OTHER',
            'GENERAL_WEALTH_ACCUMULATION',
            'PASSIVE_INCOME',
            'ALTERNATIVE'
        ]);

        expect(sorted).toEqual([
            'GENERAL_WEALTH_ACCUMULATION',
            'PASSIVE_INCOME',
            'CASH_MANAGEMENT',
            'ALTERNATIVE',
            'OTHER'
        ]);
    });
});

describe('formatMoney', () => {
    it('formats numbers as currency with commas', () => {
        expect(formatMoney(1234)).toBe('$1,234.00');
    });

    it('returns dash for non-number values', () => {
        expect(formatMoney(NaN)).toBe('-');
        expect(formatMoney('1234')).toBe('-');
    });
});

describe('formatGrowthPercent', () => {
    it('calculates growth percentage based on principal', () => {
        expect(formatGrowthPercent(10, 110)).toBe('10.00%');
    });

    it('returns dash for invalid inputs or zero principal', () => {
        expect(formatGrowthPercent(0, 0)).toBe('-');
        expect(formatGrowthPercent('foo', 100)).toBe('-');
    });
});

describe('buildMergedInvestmentData', () => {
    it('returns null for missing or invalid data sets', () => {
        expect(buildMergedInvestmentData(null, [], [])).toBeNull();
        expect(buildMergedInvestmentData([], 'nope', [])).toBeNull();
    });

    it('merges performance, investible, and summary data into buckets', () => {
        const performanceData = [
            {
                goalId: 'goal-1',
                totalCumulativeReturn: { amount: 10 },
                simpleRateOfReturnPercent: 5
            }
        ];
        const investibleData = [
            {
                goalId: 'goal-1',
                goalName: 'Retirement - Core Portfolio',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: { display: { amount: 100 } }
            }
        ];
        const summaryData = [
            {
                goalId: 'goal-1',
                goalName: 'Retirement - Core Portfolio',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION'
            }
        ];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result).toEqual({
            Retirement: {
                total: 100,
                GENERAL_WEALTH_ACCUMULATION: {
                    totalInvestmentAmount: 100,
                    totalCumulativeReturn: 10,
                    goals: [
                        {
                            goalId: 'goal-1',
                            goalName: 'Retirement - Core Portfolio',
                            goalBucket: 'Retirement',
                            goalType: 'GENERAL_WEALTH_ACCUMULATION',
                            totalInvestmentAmount: 100,
                            totalCumulativeReturn: 10,
                            simpleRateOfReturnPercent: 5
                        }
                    ]
                }
            }
        });
    });
});
