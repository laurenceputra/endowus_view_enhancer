/**
 * Tests for demo mock data structure validation
 * 
 * These tests ensure that the generated mock data matches the expected structure
 * that the userscript requires, particularly for performanceTimeSeries data.
 */

/* global __dirname */

const fs = require('fs');
const path = require('path');

describe('Demo Mock Data Structure', () => {
    let mockData;
    
    beforeAll(() => {
        const mockDataPath = path.join(__dirname, '../demo/mock-data.json');
        const mockDataJson = fs.readFileSync(mockDataPath, 'utf8');
        mockData = JSON.parse(mockDataJson);
    });
    
    describe('Top-level structure', () => {
        test('should have all required top-level keys', () => {
            expect(mockData).toHaveProperty('performance');
            expect(mockData).toHaveProperty('investible');
            expect(mockData).toHaveProperty('summary');
            expect(mockData).toHaveProperty('performanceTimeSeries');
        });
        
        test('should have arrays for performance, investible, and summary', () => {
            expect(Array.isArray(mockData.performance)).toBe(true);
            expect(Array.isArray(mockData.investible)).toBe(true);
            expect(Array.isArray(mockData.summary)).toBe(true);
        });
        
        test('should have object for performanceTimeSeries', () => {
            expect(typeof mockData.performanceTimeSeries).toBe('object');
            expect(mockData.performanceTimeSeries).not.toBeNull();
        });
        
        test('should have matching number of goals across all endpoints', () => {
            const performanceCount = mockData.performance.length;
            const investibleCount = mockData.investible.length;
            const summaryCount = mockData.summary.length;
            const timeSeriesCount = Object.keys(mockData.performanceTimeSeries).length;
            
            expect(performanceCount).toBeGreaterThan(0);
            expect(performanceCount).toBe(investibleCount);
            expect(performanceCount).toBe(summaryCount);
            expect(performanceCount).toBe(timeSeriesCount);
        });
    });
    
    describe('Performance endpoint structure', () => {
        test('should have valid structure for each goal', () => {
            mockData.performance.forEach(goal => {
                expect(goal).toHaveProperty('goalId');
                expect(goal).toHaveProperty('totalCumulativeReturn');
                expect(goal).toHaveProperty('simpleRateOfReturnPercent');
                expect(goal).toHaveProperty('totalInvestmentValue');
                
                expect(typeof goal.goalId).toBe('string');
                expect(typeof goal.totalCumulativeReturn).toBe('object');
                expect(typeof goal.totalCumulativeReturn.amount).toBe('number');
                expect(typeof goal.simpleRateOfReturnPercent).toBe('number');
                expect(typeof goal.totalInvestmentValue).toBe('object');
                expect(typeof goal.totalInvestmentValue.amount).toBe('number');
            });
        });
    });
    
    describe('Investible endpoint structure', () => {
        test('should have valid structure for each goal', () => {
            mockData.investible.forEach(goal => {
                expect(goal).toHaveProperty('goalId');
                expect(goal).toHaveProperty('goalName');
                expect(goal).toHaveProperty('investmentGoalType');
                expect(goal).toHaveProperty('totalInvestmentAmount');
                expect(goal).toHaveProperty('targetAmount');
                expect(goal).toHaveProperty('targetAllocation');
                
                expect(typeof goal.goalId).toBe('string');
                expect(typeof goal.goalName).toBe('string');
                expect(typeof goal.investmentGoalType).toBe('string');
                expect(typeof goal.totalInvestmentAmount).toBe('object');
                expect(typeof goal.totalInvestmentAmount.display).toBe('object');
                expect(typeof goal.totalInvestmentAmount.display.amount).toBe('number');
                expect(typeof goal.targetAmount).toBe('number');
                expect(typeof goal.targetAllocation).toBe('number');
            });
        });
        
        test('should have bucket-prefixed goal names', () => {
            mockData.investible.forEach(goal => {
                // Goal names should be in format "Bucket Name - Goal Details"
                expect(goal.goalName).toMatch(/^[^-]+ - /);
            });
        });
    });
    
    describe('PerformanceTimeSeries structure (CRITICAL)', () => {
        test('should have entry for each goal ID', () => {
            mockData.performance.forEach(perfGoal => {
                expect(mockData.performanceTimeSeries).toHaveProperty(perfGoal.goalId);
            });
        });
        
        test('should have correct nested structure for each goal', () => {
            Object.entries(mockData.performanceTimeSeries).forEach(([_goalId, data]) => {
                // Required top-level fields
                expect(data).toHaveProperty('timeSeries');
                expect(data).toHaveProperty('returnsTable');
                expect(data).toHaveProperty('totalCumulativeReturnPercent');
                expect(data).toHaveProperty('totalCumulativeReturnAmount');
                expect(data).toHaveProperty('cumulativeInvested');
                
                expect(typeof data.timeSeries).toBe('object');
                expect(typeof data.returnsTable).toBe('object');
                expect(typeof data.totalCumulativeReturnPercent).toBe('number');
                expect(typeof data.totalCumulativeReturnAmount).toBe('number');
                expect(typeof data.cumulativeInvested).toBe('number');
            });
        });
        
        test('should have timeSeries.data array with valid structure', () => {
            Object.entries(mockData.performanceTimeSeries).forEach(([_goalId, data]) => {
                expect(data.timeSeries).toHaveProperty('data');
                expect(Array.isArray(data.timeSeries.data)).toBe(true);
                expect(data.timeSeries.data.length).toBeGreaterThan(0);
                
                // Check structure of time series data points
                data.timeSeries.data.forEach(point => {
                    expect(point).toHaveProperty('date');
                    expect(point).toHaveProperty('amount');
                    expect(point).toHaveProperty('cumulativeNetInvestmentAmount');
                    
                    expect(typeof point.date).toBe('string');
                    expect(typeof point.amount).toBe('number');
                    expect(typeof point.cumulativeNetInvestmentAmount).toBe('number');
                    
                    // Date should be in YYYY-MM-DD format
                    expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                });
            });
        });
        
        test('should have returnsTable.twr with all required window values', () => {
            Object.entries(mockData.performanceTimeSeries).forEach(([_goalId, data]) => {
                // CRITICAL: returnsTable must have twr nested object
                expect(data.returnsTable).toHaveProperty('twr');
                expect(typeof data.returnsTable.twr).toBe('object');
                
                const twr = data.returnsTable.twr;
                
                // All window return values must be present
                expect(twr).toHaveProperty('allTimeValue');
                expect(twr).toHaveProperty('oneMonthValue');
                expect(twr).toHaveProperty('sixMonthValue');
                expect(twr).toHaveProperty('ytdValue');
                expect(twr).toHaveProperty('oneYearValue');
                expect(twr).toHaveProperty('threeYearValue');
                
                // All values must be numbers
                expect(typeof twr.allTimeValue).toBe('number');
                expect(typeof twr.oneMonthValue).toBe('number');
                expect(typeof twr.sixMonthValue).toBe('number');
                expect(typeof twr.ytdValue).toBe('number');
                expect(typeof twr.oneYearValue).toBe('number');
                expect(typeof twr.threeYearValue).toBe('number');
                
                // Values should be finite
                expect(Number.isFinite(twr.allTimeValue)).toBe(true);
                expect(Number.isFinite(twr.oneMonthValue)).toBe(true);
                expect(Number.isFinite(twr.sixMonthValue)).toBe(true);
                expect(Number.isFinite(twr.ytdValue)).toBe(true);
                expect(Number.isFinite(twr.oneYearValue)).toBe(true);
                expect(Number.isFinite(twr.threeYearValue)).toBe(true);
            });
        });
        
        test('should have realistic return value ranges', () => {
            Object.entries(mockData.performanceTimeSeries).forEach(([_goalId, data]) => {
                const twr = data.returnsTable.twr;
                
                // Window returns should be in reasonable range (-50% to +100%)
                expect(twr.allTimeValue).toBeGreaterThan(-0.5);
                expect(twr.allTimeValue).toBeLessThan(1.0);
                
                expect(twr.oneMonthValue).toBeGreaterThan(-0.5);
                expect(twr.oneMonthValue).toBeLessThan(1.0);
                
                // Cumulative return amount should be realistic
                expect(Math.abs(data.totalCumulativeReturnAmount)).toBeLessThan(1000000);
            });
        });
    });
    
    describe('Bucket structure', () => {
        test('should have expected buckets (House Purchase and Retirement)', () => {
            const buckets = new Set();
            mockData.investible.forEach(goal => {
                const bucketName = goal.goalName.split(' - ')[0];
                buckets.add(bucketName);
            });
            
            expect(buckets.has('House Purchase')).toBe(true);
            expect(buckets.has('Retirement')).toBe(true);
        });
        
        test('should have multiple goals per bucket', () => {
            const bucketGoalCount = {};
            mockData.investible.forEach(goal => {
                const bucketName = goal.goalName.split(' - ')[0];
                bucketGoalCount[bucketName] = (bucketGoalCount[bucketName] || 0) + 1;
            });
            
            expect(bucketGoalCount['House Purchase']).toBeGreaterThanOrEqual(3);
            expect(bucketGoalCount['Retirement']).toBeGreaterThanOrEqual(3);
        });
    });
    
    describe('Data consistency', () => {
        test('should have matching goal IDs across all endpoints', () => {
            const performanceIds = new Set(mockData.performance.map(g => g.goalId));
            const investibleIds = new Set(mockData.investible.map(g => g.goalId));
            const summaryIds = new Set(mockData.summary.map(g => g.goalId));
            const timeSeriesIds = new Set(Object.keys(mockData.performanceTimeSeries));
            
            // All IDs should match
            expect([...performanceIds].sort()).toEqual([...investibleIds].sort());
            expect([...performanceIds].sort()).toEqual([...summaryIds].sort());
            expect([...performanceIds].sort()).toEqual([...timeSeriesIds].sort());
        });
        
        test('should have consistent return values', () => {
            mockData.performance.forEach(perfGoal => {
                const tsData = mockData.performanceTimeSeries[perfGoal.goalId];
                
                // simpleRateOfReturnPercent should match twr.allTimeValue
                expect(Math.abs(perfGoal.simpleRateOfReturnPercent - tsData.returnsTable.twr.allTimeValue))
                    .toBeLessThan(0.001); // Allow small floating point difference
            });
        });
    });
});
