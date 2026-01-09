/**
 * Mock data generator for Goal Portfolio Viewer
 * Generates realistic test data for Personal and Holiday buckets with core-satellite strategy
 */

function generateMockData() {
    // Helper to generate goal IDs
    let goalIdCounter = 1;
    const generateGoalId = () => `mock-goal-${goalIdCounter++}`;
    
    // Helper to generate realistic investment amounts and returns
    const generateInvestment = (baseAmount) => {
        const variation = 0.8 + Math.random() * 0.4; // 80%-120% of base
        return Math.round(baseAmount * variation * 100) / 100;
    };
    
    const generateReturn = (investmentAmount, minReturn = -0.05, maxReturn = 0.15) => {
        const returnRate = minReturn + Math.random() * (maxReturn - minReturn);
        return Math.round(investmentAmount * returnRate * 100) / 100;
    };
    
    // Create goals for a bucket
    const createGoals = (bucketName, goalTypes) => {
        return goalTypes.map(goalType => {
            const baseAmount = goalType.baseAmount;
            const investment = generateInvestment(baseAmount);
            const returns = generateReturn(investment, goalType.minReturn || -0.05, goalType.maxReturn || 0.15);
            const simpleRateOfReturn = investment !== 0 ? returns / investment : 0;
            
            return {
                goalId: generateGoalId(),
                goalName: `${bucketName} - ${goalType.name}`,
                goalBucket: bucketName,
                goalType: 'GENERAL_WEALTH_ACCUMULATION',
                totalInvestmentAmount: investment,
                totalCumulativeReturn: returns,
                simpleRateOfReturnPercent: simpleRateOfReturn
            };
        });
    };
    
    // Define Personal bucket goals (larger investments)
    const personalGoals = createGoals('Personal', [
        { name: 'Core', baseAmount: 50000, minReturn: 0.05, maxReturn: 0.12 },
        { name: 'Tech', baseAmount: 15000, minReturn: -0.02, maxReturn: 0.20 },
        { name: 'China', baseAmount: 12000, minReturn: -0.08, maxReturn: 0.18 },
        { name: 'Megatrends', baseAmount: 10000, minReturn: 0.03, maxReturn: 0.15 },
        { name: 'Real Estate', baseAmount: 8000, minReturn: 0.02, maxReturn: 0.10 }
    ]);
    
    // Define Holiday bucket goals (smaller investments)
    const holidayGoals = createGoals('Holiday', [
        { name: 'Core', baseAmount: 20000, minReturn: 0.04, maxReturn: 0.10 },
        { name: 'Tech', baseAmount: 5000, minReturn: -0.03, maxReturn: 0.18 },
        { name: 'China', baseAmount: 4000, minReturn: -0.10, maxReturn: 0.15 },
        { name: 'Megatrends', baseAmount: 3000, minReturn: 0.02, maxReturn: 0.12 },
        { name: 'Real Estate', baseAmount: 3000, minReturn: 0.01, maxReturn: 0.08 }
    ]);
    
    // Combine all goals
    const allGoals = [...personalGoals, ...holidayGoals];
    
    // Create API response structures
    const performanceData = allGoals.map(goal => ({
        goalId: goal.goalId,
        totalCumulativeReturn: {
            amount: goal.totalCumulativeReturn
        },
        simpleRateOfReturnPercent: goal.simpleRateOfReturnPercent
    }));
    
    const investibleData = allGoals.map(goal => ({
        goalId: goal.goalId,
        goalName: goal.goalName,
        investmentGoalType: goal.goalType,
        totalInvestmentAmount: {
            display: {
                amount: goal.totalInvestmentAmount
            }
        }
    }));
    
    const summaryData = allGoals.map(goal => ({
        goalId: goal.goalId,
        goalName: goal.goalName,
        investmentGoalType: goal.goalType
    }));
    
    return {
        performance: performanceData,
        investible: investibleData,
        summary: summaryData
    };
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateMockData };
}
