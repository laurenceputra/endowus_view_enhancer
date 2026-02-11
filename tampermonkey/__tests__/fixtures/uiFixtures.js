function createBucketMapFixture() {
    return {
        Education: {
            _meta: {
                endingBalanceTotal: 0
            },
            GENERAL_WEALTH_ACCUMULATION: {
                endingBalanceAmount: 0,
                totalCumulativeReturn: 0,
                goals: []
            }
        },
        Retirement: {
            _meta: {
                endingBalanceTotal: 3000
            },
            GENERAL_WEALTH_ACCUMULATION: {
                endingBalanceAmount: 2000,
                totalCumulativeReturn: 200,
                goals: [
                    {
                        goalId: 'g2',
                        goalName: 'Retirement - Growth',
                        endingBalanceAmount: 800,
                        totalCumulativeReturn: 80,
                        simpleRateOfReturnPercent: 0.1,
                        windowReturns: {
                            oneMonth: 0.0123,
                            sixMonth: null,
                            ytd: 0.015,
                            oneYear: 0.0605,
                            threeYear: 0.1201
                        }
                    },
                    {
                        goalId: 'g1',
                        goalName: 'Retirement - Core',
                        endingBalanceAmount: 1200,
                        totalCumulativeReturn: 120,
                        simpleRateOfReturnPercent: 0.1,
                        windowReturns: {
                            oneMonth: 0.0042,
                            sixMonth: 0.0231,
                            ytd: -0.008,
                            oneYear: 0.0805,
                            threeYear: null
                        }
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
                        simpleRateOfReturnPercent: -0.05,
                        windowReturns: {
                            oneMonth: null,
                            sixMonth: null,
                            ytd: null,
                            oneYear: null,
                            threeYear: null
                        }
                    }
                ]
            }
        }
    };
}

function createPerformanceCacheFixture() {
    return {
        g1: {
            fetchedAt: Date.now(),
            response: {
                returnsTable: {
                    twr: {
                        oneMonthValue: 0.0042,
                        sixMonthValue: { returnPercent: 0.0231 },
                        ytdValue: -0.008,
                        oneYearValue: 0.0805,
                        threeYearValue: null
                    }
                }
            }
        },
        g2: {
            fetchedAt: Date.now(),
            response: {
                returnsTable: {
                    twr: {
                        oneMonthValue: { returnPercent: 'invalid' },
                        sixMonthValue: 0.0123
                    }
                }
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
    createPerformanceCacheFixture,
    createProjectedInvestmentFixture,
    createGoalTargetFixture,
    createGoalFixedFixture
};
