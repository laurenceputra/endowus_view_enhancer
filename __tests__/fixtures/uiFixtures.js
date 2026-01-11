function createBucketMapFixture() {
    return {
        Education: {
            endingBalanceTotal: 0,
            GENERAL_WEALTH_ACCUMULATION: {
                endingBalanceAmount: 0,
                totalCumulativeReturn: 0,
                goals: []
            }
        },
        Retirement: {
            endingBalanceTotal: 3000,
            GENERAL_WEALTH_ACCUMULATION: {
                endingBalanceAmount: 2000,
                totalCumulativeReturn: 200,
                goals: [
                    {
                        goalId: 'g1',
                        goalName: 'Retirement - Core',
                        endingBalanceAmount: 1200,
                        totalCumulativeReturn: 120,
                        simpleRateOfReturnPercent: 0.1
                    },
                    {
                        goalId: 'g2',
                        goalName: 'Retirement - Growth',
                        endingBalanceAmount: 800,
                        totalCumulativeReturn: 80,
                        simpleRateOfReturnPercent: 0.1
                    }
                ]
            },
            CASH_MANAGEMENT: {
                endingBalanceAmount: 1000,
                totalCumulativeReturn: -50,
                goals: [
                    {
                        goalId: 'g3',
                        goalName: 'Retirement - Cash',
                        endingBalanceAmount: 1000,
                        totalCumulativeReturn: -50,
                        simpleRateOfReturnPercent: -0.05
                    }
                ]
            }
        }
    };
}

function createProjectedInvestmentFixture() {
    return {
        'Retirement|GENERAL_WEALTH_ACCUMULATION': 500
    };
}

function createGoalTargetFixture() {
    return {
        g1: 60,
        g2: 40
    };
}

function createGoalFixedFixture() {
    return {
        g1: true
    };
}

module.exports = {
    createBucketMapFixture,
    createProjectedInvestmentFixture,
    createGoalTargetFixture,
    createGoalFixedFixture
};
