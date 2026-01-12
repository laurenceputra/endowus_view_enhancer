/**
 * Unit tests for Goal Portfolio Viewer utility functions
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
    formatGrowthPercentFromEndingBalance,
    buildMergedInvestmentData,
    getPerformanceCacheKey,
    isCacheFresh,
    isCacheRefreshAllowed,
    formatPercentage,
    getWindowStartDate,
    calculateReturnFromTimeSeries,
    mapReturnsTableToWindowReturns,
    calculateWeightedWindowReturns,
    summarizePerformanceMetrics,
    derivePerformanceWindows
} = require('../tampermonkey/goal_portfolio_viewer.user.js');

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

describe('formatGrowthPercentFromEndingBalance', () => {
    test('should calculate growth percentage correctly for positive returns', () => {
        // Principal: 100, Return: 10, Ending Balance: 110
        // Growth = 10 / 100 * 100 = 10%
        expect(formatGrowthPercentFromEndingBalance(10, 110)).toBe('10.00%');
    });

    test('should calculate growth percentage for negative returns', () => {
        // Principal: 100, Return: -10, Ending Balance: 90
        // Growth = -10 / 100 * 100 = -10%
        expect(formatGrowthPercentFromEndingBalance(-10, 90)).toBe('-10.00%');
    });

    test('should handle zero return', () => {
        expect(formatGrowthPercentFromEndingBalance(0, 100)).toBe('0.00%');
    });

    test('should return dash for zero denominator', () => {
        expect(formatGrowthPercentFromEndingBalance(100, 100)).toBe('-');
    });

    test('should return dash for invalid inputs', () => {
        expect(formatGrowthPercentFromEndingBalance(NaN, 100)).toBe('-');
        expect(formatGrowthPercentFromEndingBalance(10, NaN)).toBe('-');
        expect(formatGrowthPercentFromEndingBalance(Infinity, 100)).toBe('-');
    });

    test('should handle string inputs that are convertible', () => {
        expect(formatGrowthPercentFromEndingBalance('10', '110')).toBe('10.00%');
    });

    test('should handle large percentage gains', () => {
        // Principal: 100, Return: 200, Ending Balance: 300
        // Growth = 200 / 100 * 100 = 200%
        expect(formatGrowthPercentFromEndingBalance(200, 300)).toBe('200.00%');
    });

    test('should handle fractional percentages', () => {
        // Principal: 100, Return: 0.5, Ending Balance: 100.5
        // Growth = 0.5 / 100 * 100 = 0.5%
        expect(formatGrowthPercentFromEndingBalance(0.5, 100.5)).toBe('0.50%');
    });
});

describe('getPerformanceCacheKey', () => {
    test('should generate performance cache key', () => {
        expect(getPerformanceCacheKey('goal-123')).toBe('gpv_performance_goal-123');
    });
});

describe('isCacheFresh', () => {
    test('should return true when within max age', () => {
        const now = 1_000_000;
        const fetchedAt = now - 1000;
        expect(isCacheFresh(fetchedAt, 7 * 24 * 60 * 60 * 1000, now)).toBe(true);
    });

    test('should return false when stale', () => {
        const now = 1_000_000;
        const fetchedAt = now - (8 * 24 * 60 * 60 * 1000);
        expect(isCacheFresh(fetchedAt, 7 * 24 * 60 * 60 * 1000, now)).toBe(false);
    });

    test('should return false for invalid inputs', () => {
        expect(isCacheFresh('invalid', 1000, 2000)).toBe(false);
        expect(isCacheFresh(1000, 'invalid', 2000)).toBe(false);
    });

    test('should return false when exactly at max age boundary', () => {
        const now = 1_000_000;
        const maxAge = 1000;
        const fetchedAt = now - maxAge;
        // Implementation uses `nowMs - fetchedTime < maxAge`
        // When nowMs - fetchedTime === maxAge (exactly at boundary), cache is stale
        expect(isCacheFresh(fetchedAt, maxAge, now)).toBe(false);
    });

    test('should return false when one millisecond over max age', () => {
        const now = 1_000_000;
        const maxAge = 1000;
        const fetchedAt = now - maxAge - 1;
        expect(isCacheFresh(fetchedAt, maxAge, now)).toBe(false);
    });

    test('should return false for zero max age', () => {
        const now = 1_000_000;
        const fetchedAt = now;
        // maxAge <= 0 returns false
        expect(isCacheFresh(fetchedAt, 0, now)).toBe(false);
    });

    test('should handle negative max age', () => {
        const now = 1_000_000;
        const fetchedAt = now;
        expect(isCacheFresh(fetchedAt, -1000, now)).toBe(false);
    });

    test('should handle future fetchedAt timestamp', () => {
        const now = 1_000_000;
        const fetchedAt = now + 1000;
        expect(isCacheFresh(fetchedAt, 1000, now)).toBe(true);
    });

    test('should return false for NaN inputs', () => {
        expect(isCacheFresh(NaN, 1000, 2000)).toBe(false);
        expect(isCacheFresh(1000, NaN, 2000)).toBe(false);
        expect(isCacheFresh(1000, 1000, NaN)).toBe(false);
    });

    test('should return false for Infinity inputs', () => {
        expect(isCacheFresh(Infinity, 1000, 2000)).toBe(false);
        expect(isCacheFresh(1000, Infinity, 2000)).toBe(false);
        expect(isCacheFresh(1000, 1000, Infinity)).toBe(false);
    });
});

describe('isCacheRefreshAllowed', () => {
    test('should allow refresh when cache is older than min age', () => {
        const now = 1_000_000;
        const fetchedAt = now - 10_000;
        expect(isCacheRefreshAllowed(fetchedAt, 5000, now)).toBe(true);
    });

    test('should block refresh when cache is newer than min age', () => {
        const now = 1_000_000;
        const fetchedAt = now - 1000;
        expect(isCacheRefreshAllowed(fetchedAt, 5000, now)).toBe(false);
    });

    test('should return false for invalid inputs', () => {
        expect(isCacheRefreshAllowed('invalid', 1000, 2000)).toBe(false);
        expect(isCacheRefreshAllowed(1000, 'invalid', 2000)).toBe(false);
        expect(isCacheRefreshAllowed(1000, 1000, NaN)).toBe(false);
    });
});

describe('formatPercentage', () => {
    test('should format positive percentage with sign', () => {
        expect(formatPercentage(0.1234)).toBe('+12.34%');
    });

    test('should format negative percentage', () => {
        expect(formatPercentage(-0.05)).toBe('-5.00%');
    });

    test('should format zero without sign', () => {
        expect(formatPercentage(0)).toBe('0.00%');
    });

    test('should return dash for invalid input', () => {
        expect(formatPercentage('invalid')).toBe('-');
    });

    test('should return dash for null input', () => {
        expect(formatPercentage(null)).toBe('-');
    });

    test('should return dash for undefined input', () => {
        expect(formatPercentage(undefined)).toBe('-');
    });

    test('should return dash for NaN', () => {
        expect(formatPercentage(NaN)).toBe('-');
    });

    test('should return dash for Infinity', () => {
        expect(formatPercentage(Infinity)).toBe('-');
        expect(formatPercentage(-Infinity)).toBe('-');
    });

    test('should handle very small percentages', () => {
        expect(formatPercentage(0.0001)).toBe('+0.01%');
        expect(formatPercentage(-0.0001)).toBe('-0.01%');
    });

    test('should handle very large percentages', () => {
        expect(formatPercentage(10)).toBe('+1000.00%');
        expect(formatPercentage(-5)).toBe('-500.00%');
    });
});

describe('getWindowStartDate', () => {
    const timeSeries = [
        { date: '2024-05-30', amount: 100 },
        { date: '2024-05-31', amount: 110 },
        { date: '2024-06-03', amount: 120 }
    ];

    test('should return 1M start date based on latest data point', () => {
        const startDate = getWindowStartDate('oneMonth', timeSeries, null);
        expect(startDate.toISOString().slice(0, 10)).toBe('2024-05-03');
    });

    test('should return YTD start date when provided', () => {
        const startDate = getWindowStartDate('ytd', timeSeries, { ytdStartDate: '2024-02-01' });
        expect(startDate.toISOString().slice(0, 10)).toBe('2024-02-01');
    });

    test('should return null for empty time series', () => {
        expect(getWindowStartDate('oneMonth', [], null)).toBeNull();
    });

    test('should return null for invalid window key', () => {
        expect(getWindowStartDate('invalid', timeSeries, null)).toBeNull();
    });

    test('should handle 6-month window', () => {
        const startDate = getWindowStartDate('sixMonth', timeSeries, null);
        expect(startDate.toISOString().slice(0, 10)).toBe('2023-12-03');
    });

    test('should handle 1-year window', () => {
        const startDate = getWindowStartDate('oneYear', timeSeries, null);
        expect(startDate.toISOString().slice(0, 10)).toBe('2023-06-03');
    });

    test('should handle 3-year window', () => {
        const startDate = getWindowStartDate('threeYear', timeSeries, null);
        expect(startDate.toISOString().slice(0, 10)).toBe('2021-06-03');
    });

    test('should fallback to beginning of year for YTD without performanceDates', () => {
        const startDate = getWindowStartDate('ytd', timeSeries, null);
        expect(startDate.getFullYear()).toBe(2024);
        expect(startDate.getMonth()).toBe(0); // January
        expect(startDate.getDate()).toBe(1);
    });

    test('should handle invalid performanceDates object', () => {
        const startDate = getWindowStartDate('ytd', timeSeries, { ytdStartDate: 'invalid-date' });
        expect(startDate.getFullYear()).toBe(2024);
        expect(startDate.getMonth()).toBe(0);
    });
});

describe('summarizePerformanceMetrics', () => {
    test('should preserve zero-valued summary amounts', () => {
        const metrics = summarizePerformanceMetrics([
            {
                totalCumulativeReturnAmount: 0,
                gainOrLossTable: {
                    netInvestment: { allTimeValue: 0 }
                },
                endingBalanceAmount: 0
            }
        ], []);

        expect(metrics.totalReturnAmount).toBe(0);
        expect(metrics.netInvestmentAmount).toBe(0);
        expect(metrics.endingBalanceAmount).toBe(0);
    });
});

describe('calculateReturnFromTimeSeries', () => {
    test('should calculate return using nearest available start date', () => {
        const timeSeries = [
            { date: '2024-05-30', amount: 100 },
            { date: '2024-05-31', amount: 110 },
            { date: '2024-06-03', amount: 120 }
        ];
        const startDate = new Date('2024-06-01');
        const result = calculateReturnFromTimeSeries(timeSeries, startDate);
        expect(result).toBeCloseTo(120 / 110 - 1, 6);
    });

    test('should return null when start point amount is zero', () => {
        const timeSeries = [
            { date: '2024-06-01', amount: 0 },
            { date: '2024-06-02', amount: 100 }
        ];
        const result = calculateReturnFromTimeSeries(timeSeries, new Date('2024-06-01'));
        expect(result).toBeNull();
    });

    test('should return null when end point amount is zero or negative', () => {
        const timeSeries = [
            { date: '2024-06-01', amount: 100 },
            { date: '2024-06-02', amount: 0 }
        ];
        const result = calculateReturnFromTimeSeries(timeSeries, new Date('2024-06-01'));
        expect(result).toBeNull();

        const timeSeriesNegative = [
            { date: '2024-06-01', amount: 100 },
            { date: '2024-06-02', amount: -50 }
        ];
        const resultNegative = calculateReturnFromTimeSeries(timeSeriesNegative, new Date('2024-06-01'));
        expect(resultNegative).toBeNull();
    });

    test('should return null for null startDate', () => {
        const timeSeries = [
            { date: '2024-06-01', amount: 100 },
            { date: '2024-06-02', amount: 110 }
        ];
        expect(calculateReturnFromTimeSeries(timeSeries, null)).toBeNull();
    });

    test('should return null for undefined startDate', () => {
        const timeSeries = [
            { date: '2024-06-01', amount: 100 },
            { date: '2024-06-02', amount: 110 }
        ];
        expect(calculateReturnFromTimeSeries(timeSeries, undefined)).toBeNull();
    });

    test('should return null for empty time series', () => {
        expect(calculateReturnFromTimeSeries([], new Date('2024-06-01'))).toBeNull();
    });

    test('should return null when no point found before startDate', () => {
        const timeSeries = [
            { date: '2024-06-10', amount: 100 },
            { date: '2024-06-11', amount: 110 }
        ];
        const result = calculateReturnFromTimeSeries(timeSeries, new Date('2024-06-01'));
        expect(result).toBeNull();
    });

    test('should handle negative returns correctly', () => {
        const timeSeries = [
            { date: '2024-06-01', amount: 100 },
            { date: '2024-06-02', amount: 80 }
        ];
        const result = calculateReturnFromTimeSeries(timeSeries, new Date('2024-06-01'));
        expect(result).toBeCloseTo(-0.2, 6);
    });

    test('should handle very small amounts', () => {
        const timeSeries = [
            { date: '2024-06-01', amount: 0.01 },
            { date: '2024-06-02', amount: 0.02 }
        ];
        const result = calculateReturnFromTimeSeries(timeSeries, new Date('2024-06-01'));
        expect(result).toBeCloseTo(1, 6);
    });
});

describe('mapReturnsTableToWindowReturns', () => {
    test('should map returns table values', () => {
        const returnsTable = {
            twr: {
                oneMonthValue: 0.02,
                sixMonthValue: 0.08,
                oneYearValue: 0.12,
                threeYearValue: 0.3,
                ytdValue: 0.05
            }
        };
        expect(mapReturnsTableToWindowReturns(returnsTable)).toEqual({
            oneMonth: 0.02,
            sixMonth: 0.08,
            ytd: 0.05,
            oneYear: 0.12,
            threeYear: 0.3
        });
    });

    test('should return empty object for null input', () => {
        expect(mapReturnsTableToWindowReturns(null)).toEqual({});
    });

    test('should return empty object for undefined input', () => {
        expect(mapReturnsTableToWindowReturns(undefined)).toEqual({});
    });

    test('should return empty object for non-object input', () => {
        expect(mapReturnsTableToWindowReturns('string')).toEqual({});
        expect(mapReturnsTableToWindowReturns(123)).toEqual({});
    });

    test('should return empty object when twr is missing', () => {
        expect(mapReturnsTableToWindowReturns({})).toEqual({});
        expect(mapReturnsTableToWindowReturns({ other: {} })).toEqual({});
    });

    test('should handle partial twr data', () => {
        const returnsTable = {
            twr: {
                oneMonthValue: 0.02,
                oneYearValue: 0.12
            }
        };
        const result = mapReturnsTableToWindowReturns(returnsTable);
        expect(result.oneMonth).toBe(0.02);
        expect(result.oneYear).toBe(0.12);
        expect(result.sixMonth).toBeNull();
        expect(result.ytd).toBeNull();
        expect(result.threeYear).toBeNull();
    });

    test('should handle zero values correctly', () => {
        const returnsTable = {
            twr: {
                oneMonthValue: 0,
                sixMonthValue: 0,
                oneYearValue: 0
            }
        };
        const result = mapReturnsTableToWindowReturns(returnsTable);
        expect(result.oneMonth).toBe(0);
        expect(result.sixMonth).toBe(0);
        expect(result.oneYear).toBe(0);
    });

    test('should handle negative values correctly', () => {
        const returnsTable = {
            twr: {
                oneMonthValue: -0.05,
                ytdValue: -0.1
            }
        };
        const result = mapReturnsTableToWindowReturns(returnsTable);
        expect(result.oneMonth).toBe(-0.05);
        expect(result.ytd).toBe(-0.1);
    });
});

describe('derivePerformanceWindows', () => {
    test('should use returns table values when available', () => {
        const returnsTable = {
            twr: {
                oneMonthValue: 0.02,
                sixMonthValue: 0.08,
                oneYearValue: 0.12,
                threeYearValue: 0.3,
                ytdValue: 0.05
            }
        };
        const timeSeries = [
            { date: '2024-01-01', amount: 100 },
            { date: '2024-06-01', amount: 120 }
        ];
        const result = derivePerformanceWindows(returnsTable, null, timeSeries);
        expect(result.oneMonth).toBe(0.02);
        expect(result.sixMonth).toBe(0.08);
        expect(result.oneYear).toBe(0.12);
        expect(result.threeYear).toBe(0.3);
        expect(result.ytd).toBe(0.05);
    });

    test('should fall back to time series data when returns table is missing', () => {
        const timeSeries = [
            { date: '2023-08-01', amount: 90 },
            { date: '2024-01-01', amount: 100 },
            { date: '2024-02-01', amount: 110 },
            { date: '2024-03-01', amount: 120 }
        ];
        const result = derivePerformanceWindows({}, null, timeSeries);
        expect(result.oneMonth).toBeCloseTo(0.0909, 3);
        expect(result.sixMonth).toBeCloseTo(0.3333, 3);
    });
});

describe('calculateWeightedWindowReturns', () => {
    test('should weight TWR window returns by net investment', () => {
        const responses = [
            {
                returnsTable: {
                    twr: {
                        oneMonthValue: 0.01,
                        oneYearValue: 0.1,
                        ytdValue: 0.08
                    }
                },
                gainOrLossTable: {
                    netInvestment: { allTimeValue: 100 }
                }
            },
            {
                returnsTable: {
                    twr: {
                        oneMonthValue: 0.03,
                        oneYearValue: 0.2,
                        ytdValue: 0.04
                    }
                },
                gainOrLossTable: {
                    netInvestment: { allTimeValue: 300 }
                }
            }
        ];
        const result = calculateWeightedWindowReturns(responses, null);
        expect(result.oneMonth).toBeCloseTo((0.01 * 100 + 0.03 * 300) / 400, 6);
        expect(result.oneYear).toBeCloseTo((0.1 * 100 + 0.2 * 300) / 400, 6);
        expect(result.ytd).toBeCloseTo((0.08 * 100 + 0.04 * 300) / 400, 6);
    });

    test('should exclude goals without TWR window data', () => {
        const responses = [
            {
                returnsTable: {
                    twr: {
                        oneYearValue: 0.1
                    }
                },
                gainOrLossTable: {
                    netInvestment: { allTimeValue: 200 }
                }
            },
            {
                returnsTable: {
                    oneYear: 0.3
                },
                timeSeries: {
                    data: [
                        { date: '2024-01-01', amount: 100 },
                        { date: '2024-06-01', amount: 140 }
                    ]
                },
                gainOrLossTable: {
                    netInvestment: { allTimeValue: 800 }
                }
            }
        ];
        const result = calculateWeightedWindowReturns(responses, null);
        expect(result.oneYear).toBeCloseTo(0.1, 6);
        expect(result.oneMonth).toBeNull();
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
        expect(result.Retirement._meta.endingBalanceTotal).toBe(1000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.endingBalanceAmount).toBe(1000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.totalCumulativeReturn).toBe(100);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals).toHaveLength(1);
    });

    test('should extract bucket from goal name separator', () => {
        const performanceData = [{ goalId: 'goal1', totalCumulativeReturn: { amount: 50 } }];
        const investibleData = [{
            goalId: 'goal1',
            goalName: 'Emergency Fund - Cash Buffer',
            investmentGoalType: 'CASH_MANAGEMENT',
            totalInvestmentAmount: { display: { amount: 500 } }
        }];
        const summaryData = [{ goalId: 'goal1' }];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result).toHaveProperty('Emergency Fund');
        expect(result['Emergency Fund'].CASH_MANAGEMENT.goals[0].goalBucket).toBe('Emergency Fund');
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

        expect(result.Retirement._meta.endingBalanceTotal).toBe(3000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.endingBalanceAmount).toBe(3000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.totalCumulativeReturn).toBe(300);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals).toHaveLength(2);
    });

    test('should normalize investment and return amounts from nested shapes', () => {
        const performanceData = [
            { goalId: 'goal1', totalCumulativeReturn: { display: { amount: 75 } } }
        ];

        const investibleData = [
            {
                goalId: 'goal1',
                goalName: 'Emergency - Buffer',
                investmentGoalType: 'CASH_MANAGEMENT',
                totalInvestmentAmount: { amount: 1500 }
            }
        ];

        const summaryData = [{ goalId: 'goal1' }];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result.Emergency._meta.endingBalanceTotal).toBe(1500);
        expect(result.Emergency.CASH_MANAGEMENT.endingBalanceAmount).toBe(1500);
        expect(result.Emergency.CASH_MANAGEMENT.totalCumulativeReturn).toBe(75);
        expect(result.Emergency.CASH_MANAGEMENT.goals[0].endingBalanceAmount).toBe(1500);
        expect(result.Emergency.CASH_MANAGEMENT.goals[0].totalCumulativeReturn).toBe(75);
    });

    test('should add pending processing amount to performance total investment value', () => {
        const performanceData = [
            {
                goalId: 'goal1',
                totalInvestmentValue: { amount: 124038.45 },
                pendingProcessingAmount: { amount: 6396.52 },
                totalCumulativeReturn: { amount: 563.58 }
            }
        ];

        const investibleData = [
            {
                goalId: 'goal1',
                goalName: 'Retirement - Portfolio',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: { display: { amount: 100000 } }
            }
        ];

        const summaryData = [
            {
                goalId: 'goal1',
                goalName: 'Retirement - Portfolio',
                investmentGoalType: 'GENERAL_WEALTH_ACCUMULATION'
            }
        ];

        const result = buildMergedInvestmentData(performanceData, investibleData, summaryData);

        expect(result.Retirement._meta.endingBalanceTotal).toBeCloseTo(130434.97, 2);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.endingBalanceAmount).toBeCloseTo(130434.97, 2);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals[0].endingBalanceAmount).toBeCloseTo(130434.97, 2);
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
        expect(result.Test[''].goals[0].endingBalanceAmount).toBeNull();
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

        expect(result.Retirement._meta.endingBalanceTotal).toBe(1000); // Only goal1 counted
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.endingBalanceAmount).toBe(1000);
        expect(result.Retirement.GENERAL_WEALTH_ACCUMULATION.goals).toHaveLength(2); // Both goals present
    });
});
