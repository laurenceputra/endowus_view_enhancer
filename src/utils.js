/**
 * Endowus Portfolio Viewer - Pure Logic Functions
 * 
 * This module contains testable pure functions extracted from the userscript.
 * These functions are imported by tests but NOT by the production userscript.
 * The userscript contains inline copies of these functions to remain self-contained.
 */

/**
 * Get storage key for a goal's target percentage
 * @param {string} goalId - Unique goal identifier
 * @returns {string} Storage key
 */
function getGoalTargetKey(goalId) {
    return `goal_target_pct_${goalId}`;
}

/**
 * Get storage key for a goal type's projected investment
 * @param {string} bucket - Bucket name
 * @param {string} goalType - Goal type
 * @returns {string} Storage key
 */
function getProjectedInvestmentKey(bucket, goalType) {
    return `${bucket}|${goalType}`;
}

/**
 * Convert internal goal type to display name
 * @param {string} goalType - Internal goal type identifier
 * @returns {string} Human-readable goal type
 */
function getDisplayGoalType(goalType) {
    switch (goalType) {
        case 'GENERAL_WEALTH_ACCUMULATION':
            return 'Investment';
        case 'CASH_MANAGEMENT':
            return 'Cash';
        case 'PASSIVE_INCOME':
            return 'Income';
        default:
            return goalType;
    }
}

/**
 * Sort goal types in preferred order
 * @param {string[]} goalTypeKeys - Array of goal type strings
 * @returns {string[]} Sorted array with preferred types first
 */
function sortGoalTypes(goalTypeKeys) {
    const preferred = ['GENERAL_WEALTH_ACCUMULATION', 'PASSIVE_INCOME', 'CASH_MANAGEMENT'];
    const others = goalTypeKeys.filter(k => !preferred.includes(k)).sort();
    const sorted = [];
    preferred.forEach(p => { 
        if (goalTypeKeys.includes(p)) sorted.push(p); 
    });
    return [...sorted, ...others];
}

/**
 * Format number as currency string
 * @param {number} val - Numeric value to format
 * @returns {string} Formatted currency string or '-' if invalid
 */
function formatMoney(val) {
    if (typeof val === 'number' && !isNaN(val)) {
        return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '-';
}

/**
 * Calculate and format growth percentage
 * Growth = return / principal * 100, where principal = total - return
 * @param {number} totalReturn - Total return amount
 * @param {number} total - Total current value
 * @returns {string} Formatted percentage string or '-' if invalid
 */
function formatGrowthPercent(totalReturn, total) {
    // Calculate growth percentage as: return / principal * 100
    // where principal = total - return (original investment)
    // Example: if you invested $100 and now have $110, return is $10
    // Growth = 10 / 100 * 100 = 10%
    const a = Number(totalReturn);
    const t = Number(total);
    const denom = t - a; // principal (original investment)
    if (!isFinite(a) || !isFinite(t) || denom === 0) return '-';
    return ((a / denom) * 100).toFixed(2) + '%';
}

/**
 * Merges data from all three API endpoints into a structured bucket map
 * @param {Array} performanceData - Performance API data
 * @param {Array} investibleData - Investible API data
 * @param {Array} summaryData - Summary API data
 * @returns {Object|null} Bucket map with aggregated data, or null if API data incomplete
 * Structure: { bucketName: { total: number, goalType: { totalInvestmentAmount, totalCumulativeReturn, goals: [] } } }
 */
function buildMergedInvestmentData(performanceData, investibleData, summaryData) {
    if (!performanceData || !investibleData || !summaryData) {
        return null;
    }

    if (!Array.isArray(performanceData) || !Array.isArray(investibleData) || !Array.isArray(summaryData)) {
        return null;
    }

    const investibleMap = {};
    investibleData.forEach(item => investibleMap[item.goalId] = item);

    const summaryMap = {};
    summaryData.forEach(item => summaryMap[item.goalId] = item);

    const bucketMap = {};

    performanceData.forEach(perf => {
        const invest = investibleMap[perf.goalId] || {};
        const summary = summaryMap[perf.goalId] || {};
        const goalName = invest.goalName || summary.goalName || "";
        // Extract bucket name from first word of goal name
        // Expected format: "BucketName - Goal Description" (e.g., "Retirement - Core Portfolio")
        const firstWord = goalName.trim().split(" ")[0];
        const goalBucket = (firstWord && firstWord.length > 0) ? firstWord : "Uncategorized";
        
        const goalObj = {
            goalId: perf.goalId,
            goalName: goalName,
            goalBucket: goalBucket,
            goalType: invest.investmentGoalType || summary.investmentGoalType || "",
            totalInvestmentAmount: invest.totalInvestmentAmount?.display?.amount || null,
            totalCumulativeReturn: perf.totalCumulativeReturn?.amount || null,
            simpleRateOfReturnPercent: perf.simpleRateOfReturnPercent || null
        };

        if (!bucketMap[goalBucket]) {
            bucketMap[goalBucket] = {
                total: 0
            };
        }
        
        if (!bucketMap[goalBucket][goalObj.goalType]) {
            bucketMap[goalBucket][goalObj.goalType] = {
                totalInvestmentAmount: 0,
                totalCumulativeReturn: 0,
                goals: []
            };
        }
        
        bucketMap[goalBucket][goalObj.goalType].goals.push(goalObj);
        
        if (typeof goalObj.totalInvestmentAmount === "number") {
            bucketMap[goalBucket][goalObj.goalType].totalInvestmentAmount += goalObj.totalInvestmentAmount;
            bucketMap[goalBucket].total += goalObj.totalInvestmentAmount;
        }
        
        if (typeof goalObj.totalCumulativeReturn === "number") {
            bucketMap[goalBucket][goalObj.goalType].totalCumulativeReturn += goalObj.totalCumulativeReturn;
        }
    });

    return bucketMap;
}

// Export functions for Node.js (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getGoalTargetKey,
        getProjectedInvestmentKey,
        getDisplayGoalType,
        sortGoalTypes,
        formatMoney,
        formatGrowthPercent,
        buildMergedInvestmentData
    };
}
