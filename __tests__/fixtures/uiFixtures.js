function createBucketMapFixture() {
    return {
        Education: {
            total: 0,
            GENERAL_WEALTH_ACCUMULATION: {
                totalInvestmentAmount: 0,
                totalCumulativeReturn: 0,
                goals: []
            }
        },
        Retirement: {
            total: 3000,
            GENERAL_WEALTH_ACCUMULATION: {
                totalInvestmentAmount: 2000,
                totalCumulativeReturn: 200,
                goals: [
                    {
                        goalId: 'g1',
                        goalName: 'Retirement - Core',
                        totalInvestmentAmount: 1200,
                        totalCumulativeReturn: 120,
                        simpleRateOfReturnPercent: 0.1
                    },
                    {
                        goalId: 'g2',
                        goalName: 'Retirement - Growth',
                        totalInvestmentAmount: 800,
                        totalCumulativeReturn: 80,
                        simpleRateOfReturnPercent: 0.1
                    }
                ]
            },
            CASH_MANAGEMENT: {
                totalInvestmentAmount: 1000,
                totalCumulativeReturn: -50,
                goals: [
                    {
                        goalId: 'g3',
                        goalName: 'Retirement - Cash',
                        totalInvestmentAmount: 1000,
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

function createUiStateFixture(overrides = {}) {
    return {
        isOpen: false,
        activeView: 'summary',
        selectedBucket: null,
        selectedGoalType: null,
        ...overrides
    };
}

module.exports = {
    createBucketMapFixture,
    createProjectedInvestmentFixture,
    createGoalTargetFixture,
    createUiStateFixture
};
