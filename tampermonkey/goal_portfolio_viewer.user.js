// ==UserScript==
// @name         Goal Portfolio Viewer
// @namespace    https://github.com/laurenceputra/goal-portfolio-viewer
// @version      2.7.0
// @description  View and organize your investment portfolio by buckets with a modern interface. Groups goals by bucket names and displays comprehensive portfolio analytics. Currently supports Endowus (Singapore).
// @author       laurenceputra
// @match        https://app.sg.endowus.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_cookie
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/laurenceputra/goal-portfolio-viewer/main/tampermonkey/goal_portfolio_viewer.user.js
// @downloadURL  https://raw.githubusercontent.com/laurenceputra/goal-portfolio-viewer/main/tampermonkey/goal_portfolio_viewer.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // Logic
    // ============================================

    const DEBUG = false;
    const REMAINING_TARGET_ALERT_THRESHOLD = 2;
    const DEBUG_AUTH = false;

    const API_ENDPOINTS = {
        performance: '/v1/goals/performance',
        investible: '/v2/goals/investible',
        summaryPattern: /\/v1\/goals(?:[?#]|$)/
    };

    // Export surface for tests; populated as helpers become available.
    // When set before load, window.__GPV_DISABLE_AUTO_INIT prevents DOM auto-init (used in tests).
    const testExports = {};

    function logDebug(message, data) {
        if (!DEBUG) {
            return;
        }
        if (data && typeof data === 'object') {
            const sanitized = { ...data };
            delete sanitized.investment;
            delete sanitized.endingBalanceAmount;
            delete sanitized.totalCumulativeReturn;
            delete sanitized.netInvestmentAmount;
            console.log(message, sanitized);
            return;
        }
        console.log(message);
    }

    /**
     * Get storage key for a goal's target percentage
     * @param {string} goalId - Unique goal identifier
     * @returns {string} Storage key
     */
    function getGoalTargetKey(goalId) {
        return `goal_target_pct_${goalId}`;
    }

    /**
     * Get storage key for a goal's fixed toggle state
     * @param {string} goalId - Unique goal identifier
     * @returns {string} Storage key
     */
    function getGoalFixedKey(goalId) {
        return `goal_fixed_${goalId}`;
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

    function extractBucketName(goalName) {
        if (!goalName || typeof goalName !== 'string') {
            return 'Uncategorized';
        }
        const trimmed = goalName.trim();
        if (!trimmed) {
            return 'Uncategorized';
        }
        const separatorIndex = trimmed.indexOf(' - ');
        if (separatorIndex === -1) {
            return trimmed;
        }
        const bucket = trimmed.substring(0, separatorIndex).trim();
        return bucket || 'Uncategorized';
    }

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

    function sortGoalTypes(goalTypeKeys) {
        const preferred = ['GENERAL_WEALTH_ACCUMULATION', 'PASSIVE_INCOME', 'CASH_MANAGEMENT'];
        const others = goalTypeKeys.filter(k => !preferred.includes(k)).sort();
        const sorted = [];
        preferred.forEach(p => { 
            if (goalTypeKeys.includes(p)) sorted.push(p); 
        });
        return [...sorted, ...others];
    }

    function detectEndpointKey(url) {
        if (typeof url !== 'string') {
            return null;
        }
        if (url.includes(API_ENDPOINTS.performance)) {
            return 'performance';
        }
        if (url.includes(API_ENDPOINTS.investible)) {
            return 'investible';
        }
        if (API_ENDPOINTS.summaryPattern.test(url)) {
            return 'summary';
        }
        return null;
    }

    // MONEY_FORMATTER uses en-US locale to avoid narrow no-break space rendering differences across environments,
    // while keeping the currency fixed to SGD. This maintains consistent formatting without relying on locale-specific symbols.
    const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'SGD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    function formatMoney(val) {
        if (typeof val === 'number' && !isNaN(val)) {
            return MONEY_FORMATTER.format(val);
        }
        return '-';
    }

    function toFiniteNumber(value, fallback = null) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : fallback;
    }

    function formatPercentValue(value, options = {}) {
        const fallback = options.fallback ?? '-';
        const numericValue = toFiniteNumber(value, null);
        if (numericValue === null) {
            return fallback;
        }
        const multiplier = toFiniteNumber(options.multiplier ?? 1, null);
        if (multiplier === null) {
            return fallback;
        }
        const sign = options.showSign && numericValue > 0 ? '+' : '';
        return `${sign}${(numericValue * multiplier).toFixed(2)}%`;
    }

    function formatPercentDisplay(value, options = {}) {
        return formatPercentValue(value, {
            multiplier: options.multiplier ?? 1,
            fallback: options.fallback,
            showSign: false
        });
    }

    function formatGrowthPercentFromEndingBalance(totalReturn, endingBalance) {
        // Calculate growth percentage as: return / principal * 100
        // where principal = ending balance - return
        // Example: if you invested $100 and now have $110, return is $10
        // Growth = 10 / 100 * 100 = 10%
        const numericReturn = toFiniteNumber(totalReturn, null);
        const numericEndingBalance = toFiniteNumber(endingBalance, null);
        if (numericReturn === null || numericEndingBalance === null) {
            return '-';
        }
        const principal = numericEndingBalance - numericReturn;
        if (principal <= 0) {
            return '-';
        }
        return ((numericReturn / principal) * 100).toFixed(2) + '%';
    }

    function getReturnClass(value) {
        const numericValue = toFiniteNumber(value, null);
        if (numericValue === null) {
            return '';
        }
        return numericValue >= 0 ? 'positive' : 'negative';
    }

    function calculatePercentOfType(amount, total) {
        const numericAmount = toFiniteNumber(amount, null);
        const numericTotal = toFiniteNumber(total, null);
        if (numericAmount === null || numericTotal === null || numericTotal <= 0) {
            return 0;
        }
        return (numericAmount / numericTotal) * 100;
    }

    function calculateGoalDiff(currentAmount, targetPercent, adjustedTypeTotal) {
        const numericCurrent = toFiniteNumber(currentAmount, null);
        const numericTarget = toFiniteNumber(targetPercent, null);
        const numericTotal = toFiniteNumber(adjustedTypeTotal, null);
        if (
            targetPercent === null
            || targetPercent === undefined
            || numericCurrent === null
            || numericTarget === null
            || numericTotal === null
            || numericTotal <= 0
        ) {
            return { diffAmount: null, diffClass: '' };
        }
        const targetAmount = (numericTarget / 100) * numericTotal;
        const diffAmount = numericCurrent - targetAmount;
        const threshold = numericCurrent * 0.05;
        const diffClass = Math.abs(diffAmount) > threshold ? 'negative' : 'positive';
        return {
            diffAmount,
            diffClass
        };
    }

    function isDashboardRoute(url, originFallback = 'https://app.sg.endowus.com') {
        if (typeof url !== 'string' || !url) {
            return false;
        }
        try {
            const target = new URL(url, originFallback);
            return target.pathname === '/dashboard' || target.pathname === '/dashboard/';
        } catch (_error) {
            return false;
        }
    }

    // ============================================
    // Allocation Model Helpers
    // ============================================

    function calculateFixedTargetPercent(currentAmount, adjustedTypeTotal) {
        const numericCurrent = Number(currentAmount);
        const numericTotal = Number(adjustedTypeTotal);
        if (!Number.isFinite(numericCurrent) || !Number.isFinite(numericTotal) || numericTotal <= 0) {
            return null;
        }
        return (numericCurrent / numericTotal) * 100;
    }

    function calculateRemainingTargetPercent(targetPercents) {
        if (!Array.isArray(targetPercents)) {
            return 100;
        }
        const sum = targetPercents.reduce((total, targetPercent) => {
            const numericTarget = Number(targetPercent);
            if (!Number.isFinite(numericTarget)) {
                return total;
            }
            return total + numericTarget;
        }, 0);
        const remaining = 100 - sum;
        return Number.isFinite(remaining) ? remaining : 100;
    }

    function isRemainingTargetAboveThreshold(remainingTargetPercent, threshold = REMAINING_TARGET_ALERT_THRESHOLD) {
        const numericRemaining = Number(remainingTargetPercent);
        const numericThreshold = Number(threshold);
        if (!Number.isFinite(numericRemaining) || !Number.isFinite(numericThreshold)) {
            return false;
        }
        return numericRemaining > numericThreshold;
    }

    function sortGoalsByName(goals) {
        const safeGoals = Array.isArray(goals) ? goals : [];
        return safeGoals.slice().sort((left, right) => {
            const leftName = String(left?.goalName || '');
            const rightName = String(right?.goalName || '');
            const nameCompare = leftName.localeCompare(rightName, 'en', { sensitivity: 'base' });
            if (nameCompare !== 0) {
                return nameCompare;
            }
            const leftId = String(left?.goalId || '');
            const rightId = String(right?.goalId || '');
            return leftId.localeCompare(rightId, 'en', { sensitivity: 'base' });
        });
    }

    function buildGoalTypeAllocationModel(goals, totalTypeAmount, adjustedTotal, goalTargets, goalFixed) {
        const safeGoals = sortGoalsByName(goals);
        const safeTargets = goalTargets || {};
        const safeFixed = goalFixed || {};
        const goalModels = safeGoals.map(goal => {
            const endingBalanceAmount = goal.endingBalanceAmount || 0;
            const percentOfType = calculatePercentOfType(
                endingBalanceAmount,
                totalTypeAmount
            );
            const isFixed = safeFixed[goal.goalId] === true;
            const targetPercent = isFixed
                ? calculateFixedTargetPercent(endingBalanceAmount, adjustedTotal)
                : (typeof safeTargets[goal.goalId] === 'number'
                    ? safeTargets[goal.goalId]
                    : null);
            const diffInfo = calculateGoalDiff(endingBalanceAmount, targetPercent, adjustedTotal);
            const returnPercent = typeof goal.simpleRateOfReturnPercent === 'number'
                && Number.isFinite(goal.simpleRateOfReturnPercent)
                ? goal.simpleRateOfReturnPercent
                : null;
            const returnValue = goal.totalCumulativeReturn || 0;
            return {
                goalId: goal.goalId,
                goalName: goal.goalName,
                endingBalanceAmount,
                percentOfType,
                isFixed,
                targetPercent,
                diffAmount: diffInfo.diffAmount,
                diffClass: diffInfo.diffClass,
                returnValue,
                returnPercent
            };
        });
        const remainingTargetPercent = calculateRemainingTargetPercent(
            goalModels.map(goal => goal.targetPercent)
        );
        return {
            goalModels,
            remainingTargetPercent
        };
    }

    function computeGoalTypeViewState(
        goals,
        totalTypeAmount,
        adjustedTotal,
        goalTargets,
        goalFixed
    ) {
        const allocationModel = buildGoalTypeAllocationModel(
            goals,
            totalTypeAmount,
            adjustedTotal,
            goalTargets,
            goalFixed
        );
        const goalModelsById = allocationModel.goalModels.reduce((acc, goal) => {
            if (goal?.goalId) {
                acc[goal.goalId] = goal;
            }
            return acc;
        }, {});
        return {
            ...allocationModel,
            goalModelsById,
            adjustedTotal
        };
    }

    function getProjectedInvestmentValue(projectedInvestmentsState, bucket, goalType) {
        if (!projectedInvestmentsState || typeof projectedInvestmentsState !== 'object') {
            return 0;
        }
        const key = getProjectedInvestmentKey(bucket, goalType);
        const value = projectedInvestmentsState[key];
        return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

    function buildDiffCellData(currentAmount, targetPercent, adjustedTypeTotal) {
        const diffInfo = calculateGoalDiff(currentAmount, targetPercent, adjustedTypeTotal);
        const diffDisplay = diffInfo.diffAmount === null ? '-' : formatMoney(diffInfo.diffAmount);
        return {
            diffDisplay,
            diffClassName: diffInfo.diffClass ? `gpv-diff-cell ${diffInfo.diffClass}` : 'gpv-diff-cell'
        };
    }

    function resolveGoalTypeActionTarget(target) {
        if (!target || typeof target.closest !== 'function') {
            return null;
        }
        const targetInput = target.closest('.gpv-target-input');
        if (targetInput) {
            return { type: 'target', element: targetInput };
        }
        const fixedToggle = target.closest('.gpv-fixed-toggle-input');
        if (fixedToggle) {
            return { type: 'fixed', element: fixedToggle };
        }
        return null;
    }

    function buildSummaryViewModel(bucketMap) {
        if (!bucketMap || typeof bucketMap !== 'object') {
            return { buckets: [] };
        }
        const buckets = Object.keys(bucketMap)
            .sort()
            .map(bucketName => {
                const bucketObj = bucketMap[bucketName];
                if (!bucketObj) {
                    return null;
                }
                const goalTypes = Object.keys(bucketObj).filter(key => key !== '_meta');
                const bucketTotalReturn = goalTypes.reduce((total, goalType) => {
                    const value = bucketObj[goalType]?.totalCumulativeReturn;
                    return total + (Number.isFinite(value) ? value : 0);
                }, 0);
                const orderedTypes = sortGoalTypes(goalTypes);
                const endingBalanceTotal = bucketObj._meta?.endingBalanceTotal || 0;
                return {
                    bucketName,
                    endingBalanceAmount: endingBalanceTotal,
                    totalReturn: bucketTotalReturn,
                    endingBalanceDisplay: formatMoney(endingBalanceTotal),
                    returnDisplay: formatMoney(bucketTotalReturn),
                    growthDisplay: formatGrowthPercentFromEndingBalance(
                        bucketTotalReturn,
                        endingBalanceTotal
                    ),
                    returnClass: getReturnClass(bucketTotalReturn),
                    goalTypes: orderedTypes
                        .map(goalType => {
                            const group = bucketObj[goalType];
                            if (!group) {
                                return null;
                            }
                            const typeReturn = group.totalCumulativeReturn || 0;
                            return {
                                goalType,
                                displayName: getDisplayGoalType(goalType),
                                endingBalanceAmount: group.endingBalanceAmount || 0,
                                endingBalanceDisplay: formatMoney(group.endingBalanceAmount),
                                returnAmount: typeReturn,
                                returnDisplay: formatMoney(typeReturn),
                                growthDisplay: formatGrowthPercentFromEndingBalance(
                                    typeReturn,
                                    group.endingBalanceAmount
                                ),
                                returnClass: getReturnClass(typeReturn)
                            };
                        })
                        .filter(Boolean)
                };
            })
            .filter(Boolean);
        return { buckets };
    }

    function buildBucketDetailViewModel(
        bucketName,
        bucketMap,
        projectedInvestmentsState,
        goalTargetById,
        goalFixedById
    ) {
        if (!bucketMap || typeof bucketMap !== 'object' || !bucketName) {
            return null;
        }
        const bucketObj = bucketMap[bucketName];
        if (!bucketObj) {
            return null;
        }
        const goalTypes = Object.keys(bucketObj).filter(key => key !== '_meta');
        const bucketTotalReturn = goalTypes.reduce((total, goalType) => {
            const value = bucketObj[goalType]?.totalCumulativeReturn;
            return total + (Number.isFinite(value) ? value : 0);
        }, 0);
        const orderedTypes = sortGoalTypes(goalTypes);
        const projectedInvestments = projectedInvestmentsState || {};
        const goalTargets = goalTargetById || {};
        const goalFixed = goalFixedById || {};
        const endingBalanceTotal = bucketObj._meta?.endingBalanceTotal || 0;

        return {
            bucketName,
            endingBalanceAmount: endingBalanceTotal,
            totalReturn: bucketTotalReturn,
            endingBalanceDisplay: formatMoney(endingBalanceTotal),
            returnDisplay: formatMoney(bucketTotalReturn),
            growthDisplay: formatGrowthPercentFromEndingBalance(
                bucketTotalReturn,
                endingBalanceTotal
            ),
            returnClass: getReturnClass(bucketTotalReturn),
            goalTypes: orderedTypes
                .map(goalType => {
                    const group = bucketObj[goalType];
                    if (!group) {
                        return null;
                    }
                    const typeReturn = group.totalCumulativeReturn || 0;
                    const projectedAmount = getProjectedInvestmentValue(projectedInvestments, bucketName, goalType);
                    const adjustedTotal = (group.endingBalanceAmount || 0) + projectedAmount;
                    const goals = Array.isArray(group.goals) ? group.goals : [];
                    const allocationModel = buildGoalTypeAllocationModel(
                        goals,
                        group.endingBalanceAmount || 0,
                        adjustedTotal,
                        goalTargets,
                        goalFixed
                    );
                    return {
                        goalType,
                        displayName: getDisplayGoalType(goalType),
                        endingBalanceAmount: group.endingBalanceAmount || 0,
                        endingBalanceDisplay: formatMoney(group.endingBalanceAmount),
                        totalReturn: typeReturn,
                        returnDisplay: formatMoney(typeReturn),
                        growthDisplay: formatGrowthPercentFromEndingBalance(
                            typeReturn,
                            group.endingBalanceAmount
                        ),
                        returnClass: getReturnClass(typeReturn),
                        projectedAmount,
                        adjustedTotal,
                        remainingTargetPercent: allocationModel.remainingTargetPercent,
                        remainingTargetDisplay: formatPercentDisplay(allocationModel.remainingTargetPercent),
                        remainingTargetIsHigh: isRemainingTargetAboveThreshold(allocationModel.remainingTargetPercent),
                        goals: allocationModel.goalModels.map(goal => ({
                            ...goal,
                            endingBalanceDisplay: formatMoney(goal.endingBalanceAmount),
                            percentOfTypeDisplay: formatPercentDisplay(goal.percentOfType),
                            targetDisplay: goal.targetPercent !== null ? goal.targetPercent.toFixed(2) : '',
                            diffDisplay: goal.diffAmount === null ? '-' : formatMoney(goal.diffAmount),
                            returnDisplay: formatMoney(goal.returnValue),
                            returnPercentDisplay: formatPercentDisplay(goal.returnPercent, { multiplier: 100 }),
                            returnClass: getReturnClass(goal.returnValue)
                        }))
                    };
                })
                .filter(Boolean)
        };
    }

    function collectGoalIds(bucketObj) {
        if (!bucketObj || typeof bucketObj !== 'object') {
            return [];
        }
        return Object.keys(bucketObj).filter(key => key !== '_meta').reduce((goalIds, goalType) => {
            const group = bucketObj[goalType];
            const goals = Array.isArray(group?.goals) ? group.goals : [];
            goals.forEach(goal => {
                if (goal?.goalId) {
                    goalIds.push(goal.goalId);
                }
            });
            return goalIds;
        }, []);
    }

    function buildGoalTargetById(goalIds, getTargetFn) {
        if (!Array.isArray(goalIds) || typeof getTargetFn !== 'function') {
            return {};
        }
        return goalIds.reduce((acc, goalId) => {
            const value = getTargetFn(goalId);
            if (typeof value === 'number' && Number.isFinite(value)) {
                acc[goalId] = value;
            }
            return acc;
        }, {});
    }

    function buildGoalFixedById(goalIds, getFixedFn) {
        if (!Array.isArray(goalIds) || typeof getFixedFn !== 'function') {
            return {};
        }
        return goalIds.reduce((acc, goalId) => {
            const value = getFixedFn(goalId);
            if (value === true) {
                acc[goalId] = true;
            }
            return acc;
        }, {});
    }

    function normalizeGoalId(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).trim();
    }

    function normalizeGoalName(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).trim();
    }

    function normalizeGoalType(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).trim();
    }

    function normalizePerformanceData(performanceData) {
        if (!Array.isArray(performanceData)) {
            return [];
        }
        return performanceData
            .map(item => ({
                goalId: normalizeGoalId(item?.goalId),
                totalInvestmentValue: item?.totalInvestmentValue,
                pendingProcessingAmount: item?.pendingProcessingAmount,
                totalCumulativeReturn: item?.totalCumulativeReturn,
                simpleRateOfReturnPercent: Number.isFinite(item?.simpleRateOfReturnPercent)
                    ? item.simpleRateOfReturnPercent
                    : null
            }))
            .filter(item => item.goalId);
    }

    function normalizeInvestibleData(investibleData) {
        if (!Array.isArray(investibleData)) {
            return [];
        }
        return investibleData
            .map(item => ({
                goalId: normalizeGoalId(item?.goalId),
                goalName: normalizeGoalName(item?.goalName),
                investmentGoalType: normalizeGoalType(item?.investmentGoalType),
                totalInvestmentAmount: item?.totalInvestmentAmount
            }))
            .filter(item => item.goalId);
    }

    function normalizeSummaryData(summaryData) {
        if (!Array.isArray(summaryData)) {
            return [];
        }
        return summaryData
            .map(item => ({
                goalId: normalizeGoalId(item?.goalId),
                goalName: normalizeGoalName(item?.goalName),
                investmentGoalType: normalizeGoalType(item?.investmentGoalType)
            }))
            .filter(item => item.goalId);
    }

    /**
     * Merges data from all three API endpoints into a structured bucket map
     * @param {Array} performanceData - Performance API data
     * @param {Array} investibleData - Investible API data
     * @param {Array} summaryData - Summary API data
     * @returns {Object|null} Bucket map with aggregated data, or null if API data incomplete
     * Structure: { bucketName: { _meta: { endingBalanceTotal: number }, goalType: { endingBalanceAmount, totalCumulativeReturn, goals: [] } } }
     */
    function buildMergedInvestmentData(performanceData, investibleData, summaryData) {
        if (!performanceData || !investibleData || !summaryData) {
            return null;
        }

        if (!Array.isArray(performanceData) || !Array.isArray(investibleData) || !Array.isArray(summaryData)) {
            return null;
        }

        const normalizedPerformance = normalizePerformanceData(performanceData);
        const normalizedInvestible = normalizeInvestibleData(investibleData);
        const normalizedSummary = normalizeSummaryData(summaryData);

        const investibleMap = {};
        normalizedInvestible.forEach(item => investibleMap[item.goalId] = item);

        const summaryMap = {};
        normalizedSummary.forEach(item => summaryMap[item.goalId] = item);

        const bucketMap = {};

        normalizedPerformance.forEach(perf => {
            const invest = investibleMap[perf.goalId] || {};
            const summary = summaryMap[perf.goalId] || {};
            const goalName = invest.goalName || summary.goalName || '';
            // Extract bucket name using "Bucket Name - Goal Description" convention
            const goalBucket = extractBucketName(goalName);
            // Note: investible API `totalInvestmentAmount` is misnamed and represents ending balance.
            // We map it internally to endingBalanceAmount to avoid confusing it with principal invested.
            const performanceEndingBalance = extractAmount(perf.totalInvestmentValue);
            const pendingProcessingAmount = extractAmount(perf.pendingProcessingAmount);
            let endingBalanceAmount = performanceEndingBalance !== null
                ? performanceEndingBalance
                : extractAmount(invest.totalInvestmentAmount);
            if (Number.isFinite(endingBalanceAmount) && Number.isFinite(pendingProcessingAmount)) {
                endingBalanceAmount += pendingProcessingAmount;
            }
            const cumulativeReturn = extractAmount(perf.totalCumulativeReturn);
            const safeEndingBalanceAmount = Number.isFinite(endingBalanceAmount) ? endingBalanceAmount : 0;
            const safeCumulativeReturn = Number.isFinite(cumulativeReturn) ? cumulativeReturn : 0;
            
            const goalObj = {
                goalId: perf.goalId,
                goalName: goalName,
                goalBucket: goalBucket,
                goalType: invest.investmentGoalType || summary.investmentGoalType || '',
                endingBalanceAmount: Number.isFinite(endingBalanceAmount) ? endingBalanceAmount : null,
                totalCumulativeReturn: Number.isFinite(cumulativeReturn) ? cumulativeReturn : null,
                simpleRateOfReturnPercent: perf.simpleRateOfReturnPercent
            };

            if (!bucketMap[goalBucket]) {
                bucketMap[goalBucket] = {
                    _meta: {
                        endingBalanceTotal: 0
                    }
                };
            }
            
            if (!bucketMap[goalBucket][goalObj.goalType]) {
                bucketMap[goalBucket][goalObj.goalType] = {
                    endingBalanceAmount: 0,
                    totalCumulativeReturn: 0,
                    goals: []
                };
            }
            
            bucketMap[goalBucket][goalObj.goalType].goals.push(goalObj);

            bucketMap[goalBucket][goalObj.goalType].endingBalanceAmount += safeEndingBalanceAmount;
            bucketMap[goalBucket]._meta.endingBalanceTotal += safeEndingBalanceAmount;
            bucketMap[goalBucket][goalObj.goalType].totalCumulativeReturn += safeCumulativeReturn;
        });

        return bucketMap;
    }

    // ============================================
    // Performance Logic
    // ============================================

    const PERFORMANCE_WINDOWS = {
        oneMonth: { key: 'oneMonth', label: '1M' },
        sixMonth: { key: 'sixMonth', label: '6M' },
        ytd: { key: 'ytd', label: 'YTD' },
        oneYear: { key: 'oneYear', label: '1Y' },
        threeYear: { key: 'threeYear', label: '3Y' }
    };

    function getPerformanceCacheKey(goalId) {
        return `gpv_performance_${goalId}`;
    }

    function isCacheFresh(fetchedAt, maxAgeMs, nowMs = Date.now()) {
        const fetchedTime = Number(fetchedAt);
        const maxAge = Number(maxAgeMs);
        if (!Number.isFinite(fetchedTime) || !Number.isFinite(maxAge) || maxAge <= 0) {
            return false;
        }
        return nowMs - fetchedTime < maxAge;
    }

    function isCacheRefreshAllowed(fetchedAt, minAgeMs, nowMs = Date.now()) {
        const minAge = Number(minAgeMs);
        const fetchedTime = Number(fetchedAt);
        const nowTime = Number(nowMs);
        if (!Number.isFinite(minAge) || minAge <= 0 || !Number.isFinite(fetchedTime) || !Number.isFinite(nowTime)) {
            return false;
        }
        return nowTime - fetchedTime >= minAge;
    }

    function formatPercentage(value) {
        return formatPercentValue(value, { multiplier: 100, showSign: true });
    }

    function normalizeTimeSeriesData(timeSeriesData) {
        if (!Array.isArray(timeSeriesData)) {
            return [];
        }
        return timeSeriesData
            .map(entry => {
                const date = new Date(entry?.date);
                const amount = entry?.amount != null ? Number(entry.amount) : NaN;
                const cumulativeNetInvestmentAmount = entry?.cumulativeNetInvestmentAmount != null
                    ? Number(entry.cumulativeNetInvestmentAmount)
                    : NaN;
                if (!Number.isFinite(date?.getTime()) || !Number.isFinite(amount)) {
                    return null;
                }
                return {
                    date,
                    dateString: entry.date,
                    amount,
                    cumulativeNetInvestmentAmount: Number.isFinite(cumulativeNetInvestmentAmount)
                        ? cumulativeNetInvestmentAmount
                        : null
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    function getLatestTimeSeriesPoint(timeSeriesData, isNormalized = false) {
        const normalized = isNormalized
            ? (Array.isArray(timeSeriesData) ? timeSeriesData : [])
            : normalizeTimeSeriesData(timeSeriesData);
        return normalized.length ? normalized[normalized.length - 1] : null;
    }

    function findNearestPointOnOrBefore(timeSeriesData, targetDate, isNormalized = false) {
        const normalized = isNormalized
            ? (Array.isArray(timeSeriesData) ? timeSeriesData : [])
            : normalizeTimeSeriesData(timeSeriesData);
        if (!normalized.length) {
            return null;
        }
        const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
        if (!Number.isFinite(target?.getTime())) {
            return null;
        }
        for (let i = normalized.length - 1; i >= 0; i -= 1) {
            if (normalized[i].date.getTime() <= target.getTime()) {
                return normalized[i];
            }
        }
        return null;
    }

    function getPerformanceDate(performanceDates, keys) {
        if (!performanceDates || typeof performanceDates !== 'object') {
            return null;
        }
        for (const key of keys) {
            if (performanceDates[key]) {
                const date = new Date(performanceDates[key]);
                if (Number.isFinite(date.getTime())) {
                    return date;
                }
            }
        }
        return null;
    }

    function getWindowStartDate(windowKey, timeSeriesData, performanceDates, isNormalized = false) {
        const normalized = isNormalized
            ? (Array.isArray(timeSeriesData) ? timeSeriesData : [])
            : normalizeTimeSeriesData(timeSeriesData);
        const latestPoint = getLatestTimeSeriesPoint(normalized, true);
        if (!latestPoint) {
            return null;
        }
        const latestDate = latestPoint.date;
        const startDate = new Date(latestDate.getTime());

        switch (windowKey) {
            case 'oneMonth':
                startDate.setMonth(startDate.getMonth() - 1);
                return startDate;
            case 'sixMonth':
                startDate.setMonth(startDate.getMonth() - 6);
                return startDate;
            case 'oneYear':
                startDate.setFullYear(startDate.getFullYear() - 1);
                return startDate;
            case 'threeYear':
                startDate.setFullYear(startDate.getFullYear() - 3);
                return startDate;
            case 'ytd': {
                const ytdDate = getPerformanceDate(performanceDates, ['ytd', 'ytdStartDate', 'yearStartDate']);
                if (ytdDate) {
                    return ytdDate;
                }
                return new Date(latestDate.getFullYear(), 0, 1);
            }
            default:
                return null;
        }
    }

    function calculateReturnFromTimeSeries(timeSeriesData, startDate) {
        if (!startDate) {
            return null;
        }
        const normalized = normalizeTimeSeriesData(timeSeriesData);
        const startPoint = findNearestPointOnOrBefore(normalized, startDate, true);
        const endPoint = getLatestTimeSeriesPoint(normalized, true);
        if (!startPoint || !endPoint) {
            return null;
        }
        if (!Number.isFinite(startPoint.amount) || startPoint.amount === 0) {
            return null;
        }
        const startNetInvestment = startPoint.cumulativeNetInvestmentAmount;
        const endNetInvestment = endPoint.cumulativeNetInvestmentAmount;
        let adjustedEndAmount = endPoint.amount;
        if (Number.isFinite(startNetInvestment) && Number.isFinite(endNetInvestment)) {
            adjustedEndAmount = endPoint.amount - (endNetInvestment - startNetInvestment);
        }
        if (!Number.isFinite(adjustedEndAmount)) {
            return null;
        }
        return (adjustedEndAmount / startPoint.amount) - 1;
    }

    function extractReturnPercent(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (value && typeof value === 'object') {
            const possibleKeys = ['returnPercent', 'rateOfReturn', 'return', 'percent'];
            for (const key of possibleKeys) {
                const candidate = value[key];
                if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                    return candidate;
                }
            }
        }
        return null;
    }

    function mapReturnsTableToWindowReturns(returnsTable) {
        if (!returnsTable || typeof returnsTable !== 'object') {
            return {};
        }
        const twrTable = returnsTable.twr && typeof returnsTable.twr === 'object'
            ? returnsTable.twr
            : null;
        if (!twrTable) {
            return {};
        }
        return {
            oneMonth: extractReturnPercent(twrTable.oneMonthValue),
            sixMonth: extractReturnPercent(twrTable.sixMonthValue),
            ytd: extractReturnPercent(twrTable.ytdValue),
            oneYear: extractReturnPercent(twrTable.oneYearValue),
            threeYear: extractReturnPercent(twrTable.threeYearValue)
        };
    }

    function derivePerformanceWindows(returnsTable, performanceDates, timeSeriesData) {
        const mappedReturns = mapReturnsTableToWindowReturns(returnsTable);
        const windows = {};
        Object.values(PERFORMANCE_WINDOWS).forEach(window => {
            const existingValue = mappedReturns[window.key];
            if (existingValue !== null && existingValue !== undefined) {
                windows[window.key] = existingValue;
                return;
            }
            const startDate = getWindowStartDate(window.key, timeSeriesData, performanceDates);
            const fallbackValue = calculateReturnFromTimeSeries(timeSeriesData, startDate);
            windows[window.key] = fallbackValue;
        });
        return windows;
    }

    function mergeTimeSeriesByDate(timeSeriesCollection, seriesAreNormalized = false) {
        const totals = new Map();
        if (!Array.isArray(timeSeriesCollection)) {
            return [];
        }
        timeSeriesCollection.forEach(series => {
            const normalized = seriesAreNormalized
                ? (Array.isArray(series) ? series : [])
                : normalizeTimeSeriesData(series);
            normalized.forEach(point => {
                const existing = totals.get(point.dateString);
                if (existing) {
                    existing.amount += point.amount;
                } else {
                    totals.set(point.dateString, {
                        date: point.date,
                        dateString: point.dateString,
                        amount: point.amount
                    });
                }
            });
        });
        return Array.from(totals.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(entry => ({ date: entry.dateString, amount: entry.amount }));
    }

    function getTimeSeriesWindow(timeSeriesData, startDate, isNormalized = false) {
        const normalized = isNormalized
            ? (Array.isArray(timeSeriesData) ? timeSeriesData : [])
            : normalizeTimeSeriesData(timeSeriesData);
        if (!startDate) {
            return normalized.map(point => ({
                date: point.dateString,
                amount: point.amount
            }));
        }
        const targetDate = startDate instanceof Date ? startDate : new Date(startDate);
        if (!Number.isFinite(targetDate?.getTime())) {
            return [];
        }
        return normalized
            .filter(point => point.date.getTime() >= targetDate.getTime())
            .map(point => ({ date: point.dateString, amount: point.amount }));
    }

    function extractAmount(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (value && typeof value === 'object') {
            const nestedAmount = value.amount;
            if (typeof nestedAmount === 'number' && Number.isFinite(nestedAmount)) {
                return nestedAmount;
            }
            const displayAmount = value.display?.amount;
            if (typeof displayAmount === 'number' && Number.isFinite(displayAmount)) {
                return displayAmount;
            }
        }
        return null;
    }

    function calculateWeightedAverage(values, weights) {
        if (!Array.isArray(values) || !Array.isArray(weights) || values.length !== weights.length) {
            return null;
        }
        let total = 0;
        let totalWeight = 0;
        values.forEach((value, index) => {
            const numericValue = toFiniteNumber(value, null);
            const weight = toFiniteNumber(weights[index], null);
            if (numericValue !== null && weight !== null && weight > 0) {
                total += numericValue * weight;
                totalWeight += weight;
            }
        });
        if (totalWeight === 0) {
            return null;
        }
        return total / totalWeight;
    }

    function calculateWeightedWindowReturns(performanceResponses) {
        const responses = Array.isArray(performanceResponses) ? performanceResponses : [];
        const windowKeys = Object.values(PERFORMANCE_WINDOWS).map(window => window.key);
        const valuesByWindow = {};
        const weightsByWindow = {};

        windowKeys.forEach(key => {
            valuesByWindow[key] = [];
            weightsByWindow[key] = [];
        });

        responses.forEach(response => {
            const mappedReturns = mapReturnsTableToWindowReturns(response?.returnsTable);
            const netInvestmentValue = extractAmount(
                response?.gainOrLossTable?.netInvestment?.allTimeValue
            ) ?? extractAmount(response?.netInvestmentAmount ?? response?.netInvestment);
            const weight = Number.isFinite(netInvestmentValue) && netInvestmentValue > 0 ? netInvestmentValue : null;

            if (!weight) {
                return;
            }

            windowKeys.forEach(windowKey => {
                const mappedValue = mappedReturns[windowKey];
                if (typeof mappedValue === 'number' && Number.isFinite(mappedValue)) {
                    valuesByWindow[windowKey].push(mappedValue);
                    weightsByWindow[windowKey].push(weight);
                }
            });
        });

        const weightedReturns = {};
        windowKeys.forEach(windowKey => {
            weightedReturns[windowKey] = calculateWeightedAverage(
                valuesByWindow[windowKey],
                weightsByWindow[windowKey]
            );
        });

        return weightedReturns;
    }

    function summarizePerformanceMetrics(performanceResponses, mergedTimeSeries) {
        const responses = Array.isArray(performanceResponses) ? performanceResponses : [];
        const netInvestments = [];
        const totalReturns = [];
        const simpleReturns = [];
        const twrReturns = [];
        const annualisedIrrReturns = [];
        let totalReturnAmount = 0;
        let totalReturnSeen = false;
        let netFeesAmount = 0;
        let netFeesSeen = false;
        let netInvestmentAmount = 0;
        let netInvestmentSeen = false;
        let endingBalanceAmount = 0;
        let endingBalanceSeen = false;

        responses.forEach(response => {
            const totalReturnValue = extractAmount(response?.totalCumulativeReturnAmount);
            const netInvestmentValue = extractAmount(
                response?.gainOrLossTable?.netInvestment?.allTimeValue
            ) ?? extractAmount(response?.netInvestmentAmount ?? response?.netInvestment);
            const accessFeeValue = extractAmount(response?.gainOrLossTable?.accessFeeCharged?.allTimeValue);
            const trailerFeeValue = extractAmount(response?.gainOrLossTable?.trailerFeeRebates?.allTimeValue);
            const endingBalanceValue = extractAmount(
                response?.endingBalanceAmount ?? response?.totalBalanceAmount ?? response?.marketValueAmount
            );

            if (Number.isFinite(totalReturnValue)) {
                totalReturnSeen = true;
                totalReturnAmount += totalReturnValue;
            }
            if (Number.isFinite(accessFeeValue) || Number.isFinite(trailerFeeValue)) {
                netFeesSeen = true;
                netFeesAmount += (Number.isFinite(accessFeeValue) ? accessFeeValue : 0)
                    - (Number.isFinite(trailerFeeValue) ? trailerFeeValue : 0);
            }
            if (Number.isFinite(netInvestmentValue)) {
                netInvestmentSeen = true;
                netInvestmentAmount += netInvestmentValue;
            }
            if (Number.isFinite(endingBalanceValue)) {
                endingBalanceSeen = true;
                endingBalanceAmount += endingBalanceValue;
            }

            const netWeight = Number.isFinite(netInvestmentValue) ? netInvestmentValue : 0;
            if (Number.isFinite(netWeight) && netWeight > 0) {
                netInvestments.push(netWeight);
                totalReturns.push(response?.totalCumulativeReturnPercent);
                simpleReturns.push(response?.simpleRateOfReturnPercent ?? response?.simpleReturnPercent);
                twrReturns.push(
                    response?.returnsTable?.twr?.allTimeValue
                    ?? response?.timeWeightedReturnPercent
                    ?? response?.twrPercent
                );
                annualisedIrrReturns.push(
                    response?.returnsTable?.annualisedIrr?.allTimeValue
                );
            }
        });

        if (endingBalanceAmount === 0 && Array.isArray(mergedTimeSeries) && mergedTimeSeries.length) {
            const latest = mergedTimeSeries[mergedTimeSeries.length - 1];
            if (Number.isFinite(latest?.amount)) {
                endingBalanceAmount = latest.amount;
                endingBalanceSeen = true;
            }
        }

        const totalReturnPercent = calculateWeightedAverage(totalReturns, netInvestments);
        const simpleReturnPercent = calculateWeightedAverage(simpleReturns, netInvestments);
        const twrPercent = calculateWeightedAverage(twrReturns, netInvestments);
        const annualisedIrrPercent = calculateWeightedAverage(annualisedIrrReturns, netInvestments);

        // Note: We intentionally do not infer netInvestmentAmount from mergedTimeSeries, because
        // the time series typically represents market value over time, not cumulative net investment.
        // Using market value as net investment would produce inaccurate financial metrics.

        return {
            totalReturnPercent,
            simpleReturnPercent,
            twrPercent,
            annualisedIrrPercent,
            totalReturnAmount: totalReturnSeen ? totalReturnAmount : null,
            netFeesAmount: netFeesSeen ? netFeesAmount : null,
            netInvestmentAmount: netInvestmentSeen ? netInvestmentAmount : null,
            endingBalanceAmount: endingBalanceSeen ? endingBalanceAmount : null
        };
    }

    function createSequentialRequestQueue({ delayMs, waitFn }) {
        const delay = Number(delayMs) || 0;
        const wait = waitFn || (ms => new Promise(resolve => setTimeout(resolve, ms)));

        return async function runSequential(items, requestFn) {
            const results = [];
            if (!Array.isArray(items) || typeof requestFn !== 'function') {
                return results;
            }
            for (let index = 0; index < items.length; index += 1) {
                try {
                    const value = await requestFn(items[index]);
                    results.push({ status: 'fulfilled', value, item: items[index] });
                } catch (error) {
                    results.push({ status: 'rejected', reason: error, item: items[index] });
                }
                if (index < items.length - 1 && delay > 0) {
                    await wait(delay);
                }
            }
            return results;
        };
    }

    // ============================================
    // Browser-Only Code (Skip in Node.js/Testing Environment)
    // ============================================
    // Everything below this point requires browser APIs (window, document, etc.)
    // and should not execute when running tests in Node.js.
    if (typeof window !== 'undefined') {

    // ============================================
    // Adapters/State
    // ============================================
    const apiData = {
        performance: null,
        investible: null,
        summary: null
    };
    const ENDPOINT_HANDLERS = {
        performance: data => {
            apiData.performance = data;
            GM_setValue('api_performance', JSON.stringify(data));
            logDebug('[Goal Portfolio Viewer] Intercepted performance data');
        },
        investible: data => {
            apiData.investible = data;
            GM_setValue('api_investible', JSON.stringify(data));
            logDebug('[Goal Portfolio Viewer] Intercepted investible data');
        },
        summary: data => {
            if (!Array.isArray(data)) {
                return;
            }
            apiData.summary = data;
            GM_setValue('api_summary', JSON.stringify(data));
            logDebug('[Goal Portfolio Viewer] Intercepted summary data');
        }
    };

    async function handleInterceptedResponse(url, readData) {
        const endpointKey = detectEndpointKey(url);
        if (!endpointKey) {
            return;
        }
        const handler = ENDPOINT_HANDLERS[endpointKey];
        if (typeof handler !== 'function') {
            return;
        }
        try {
            const data = await readData();
            handler(data);
        } catch (error) {
            console.error('[Goal Portfolio Viewer] Error parsing API response:', error);
        }
    }

    function logAuthDebug(message, data) {
        if (!DEBUG_AUTH) {
            return;
        }
        if (data && typeof data === 'object') {
            console.log(message, data);
            return;
        }
        console.log(message);
    }
    const PERFORMANCE_ENDPOINT = 'https://bff.prod.silver.endowus.com/v1/performance';
    const REQUEST_DELAY_MS = 500;
    const PERFORMANCE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    const PERFORMANCE_CACHE_REFRESH_MIN_AGE_MS = 24 * 60 * 60 * 1000;
    const PERFORMANCE_CHART_WINDOW = PERFORMANCE_WINDOWS.oneYear.key;
    const PERFORMANCE_REQUEST_TIMEOUT_MS = 10000;

    // Non-persistent storage for projected investments (resets on reload)
    // Key format: "bucketName|goalType" -> projected amount
    const projectedInvestments = {};

    const goalPerformanceData = {};
    let performanceRequestHeaders = null;
    let gmCookieAuthToken = null;
    let gmCookieDumped = false;
    const performanceRequestQueue = createSequentialRequestQueue({
        delayMs: REQUEST_DELAY_MS
    });

    // ============================================
    // API Interception via Monkey Patching
    // ============================================
    
    // Store original functions
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    // Fetch interception
    window.fetch = async function(...args) {
        extractAuthHeaders(args[0], args[1]);
        const response = await originalFetch.apply(this, args);
        const url = args[0];
        await handleInterceptedResponse(url, () => response.clone().json());
        return response;
    };

    // XMLHttpRequest interception
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._url = url;
        this._headers = {};
        return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        if (this._headers) {
            this._headers[header] = value;
        }
        return originalXHRSetRequestHeader.apply(this, [header, value]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        const url = this._url;
        extractAuthHeaders(url, { headers: this._headers });
        
        if (url && typeof url === 'string') {
            this.addEventListener('load', function() {
                handleInterceptedResponse(url, () => Promise.resolve(JSON.parse(this.responseText)));
            });
        }
        
        return originalXHRSend.apply(this, args);
    };

    logDebug('[Goal Portfolio Viewer] API interception initialized');

    // ============================================
    // Storage Management
    // ============================================

    const GoalTargetStore = {
        getTarget(goalId) {
            try {
                const key = getGoalTargetKey(goalId);
                const value = GM_getValue(key, null);
                return value !== null ? parseFloat(value) : null;
            } catch (e) {
                console.error('[Goal Portfolio Viewer] Error loading goal target percentage:', e);
                return null;
            }
        },
        setTarget(goalId, percentage) {
            try {
                const key = getGoalTargetKey(goalId);
                const validPercentage = Math.max(0, Math.min(100, parseFloat(percentage)));
                GM_setValue(key, validPercentage);
                logDebug(`[Goal Portfolio Viewer] Saved goal target percentage for ${goalId}: ${validPercentage}%`);
                return validPercentage;
            } catch (e) {
                console.error('[Goal Portfolio Viewer] Error saving goal target percentage:', e);
                return Math.max(0, Math.min(100, parseFloat(percentage)));
            }
        },
        clearTarget(goalId) {
            try {
                const key = getGoalTargetKey(goalId);
                GM_deleteValue(key);
                logDebug(`[Goal Portfolio Viewer] Deleted goal target percentage for ${goalId}`);
            } catch (e) {
                console.error('[Goal Portfolio Viewer] Error deleting goal target percentage:', e);
            }
        },
        getFixed(goalId) {
            try {
                const key = getGoalFixedKey(goalId);
                return GM_getValue(key, false) === true;
            } catch (e) {
                console.error('[Goal Portfolio Viewer] Error loading goal fixed state:', e);
                return false;
            }
        },
        setFixed(goalId, isFixed) {
            try {
                const key = getGoalFixedKey(goalId);
                GM_setValue(key, isFixed === true);
                logDebug(`[Goal Portfolio Viewer] Saved goal fixed state for ${goalId}: ${isFixed === true}`);
            } catch (e) {
                console.error('[Goal Portfolio Viewer] Error saving goal fixed state:', e);
            }
        },
        clearFixed(goalId) {
            try {
                const key = getGoalFixedKey(goalId);
                GM_deleteValue(key);
                logDebug(`[Goal Portfolio Viewer] Deleted goal fixed state for ${goalId}`);
            } catch (e) {
                console.error('[Goal Portfolio Viewer] Error deleting goal fixed state:', e);
            }
        }
    };
    
    /**
     * Load previously intercepted API data from Tampermonkey storage
     */
    function loadStoredData(apiDataState) {
        try {
            const storedPerformance = GM_getValue('api_performance', null);
            const storedInvestible = GM_getValue('api_investible', null);
            const storedSummary = GM_getValue('api_summary', null);
            
            if (storedPerformance) {
                const parsed = JSON.parse(storedPerformance);
                if (parsed && typeof parsed === 'object') {
                    apiDataState.performance = parsed;
                    logDebug('[Goal Portfolio Viewer] Loaded performance data from storage');
                } else {
                    GM_deleteValue('api_performance');
                }
            }
            if (storedInvestible) {
                const parsed = JSON.parse(storedInvestible);
                if (parsed && typeof parsed === 'object') {
                    apiDataState.investible = parsed;
                    logDebug('[Goal Portfolio Viewer] Loaded investible data from storage');
                } else {
                    GM_deleteValue('api_investible');
                }
            }
            if (storedSummary) {
                const parsed = JSON.parse(storedSummary);
                if (Array.isArray(parsed)) {
                    apiDataState.summary = parsed;
                    logDebug('[Goal Portfolio Viewer] Loaded summary data from storage');
                } else {
                    GM_deleteValue('api_summary');
                }
            }
        } catch (e) {
            console.error('[Goal Portfolio Viewer] Error loading stored data:', e);
        }
    }

    /**
     * Set projected investment for a specific goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     * @param {number} amount - Projected investment amount
     */
    function setProjectedInvestment(projectedInvestmentsState, bucket, goalType, amount) {
        const key = getProjectedInvestmentKey(bucket, goalType);
        const validAmount = parseFloat(amount) || 0;
        projectedInvestmentsState[key] = validAmount;
        logDebug(`[Goal Portfolio Viewer] Set projected investment for ${bucket}|${goalType}: ${validAmount}`);
    }

    /**
     * Clear projected investment for a specific goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     */
    function clearProjectedInvestment(projectedInvestmentsState, bucket, goalType) {
        const key = getProjectedInvestmentKey(bucket, goalType);
        delete projectedInvestmentsState[key];
        logDebug(`[Goal Portfolio Viewer] Cleared projected investment for ${bucket}|${goalType}`);
    }

    // ============================================
    // Performance Data Fetching
    // ============================================

    function getHeaderValue(headers, key) {
        if (!headers) {
            return null;
        }
        if (headers instanceof Headers) {
            return headers.get(key);
        }
        if (typeof headers === 'object') {
            return headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()] || null;
        }
        return null;
    }

    function getCookieValue(name) {
        if (typeof document === 'undefined' || !document.cookie) {
            return null;
        }
        const entries = document.cookie.split(';').map(entry => entry.trim());
        const match = entries.find(entry => entry.startsWith(`${name}=`));
        if (!match) {
            return null;
        }
        const value = match.slice(name.length + 1);
        if (!value) {
            return null;
        }
        try {
            return decodeURIComponent(value);
        } catch (_error) {
            // Fallback to raw value if decoding fails due to malformed encoding
            return value;
        }
    }

    function selectAuthCookieToken(cookies) {
        if (!Array.isArray(cookies) || !cookies.length) {
            return null;
        }
        const httpOnlyCookie = cookies.find(cookie => cookie?.httpOnly);
        return (httpOnlyCookie || cookies[0])?.value || null;
    }

    function findCookieValue(cookies, name) {
        if (!Array.isArray(cookies)) {
            return null;
        }
        return cookies.find(cookie => cookie?.name === name)?.value || null;
    }

    function getCookieValueByNames(names) {
        for (const name of names) {
            const value = getCookieValue(name);
            if (value) {
                return { name, value };
            }
        }
        return null;
    }

    function listCookieByQuery(query) {
        return new Promise(resolve => {
            GM_cookie.list(query, cookies => resolve(cookies || []));
        });
    }

    function dumpAvailableCookies() {
        if (gmCookieDumped || !DEBUG_AUTH) {
            return;
        }
        gmCookieDumped = true;
        listCookieByQuery({})
            .then(cookies => {
                // Debug-only: log a safe summary of available GM_cookie entries
                const summary = cookies.map(cookie => ({
                    domain: cookie.domain,
                    path: cookie.path,
                    name: cookie.name
                }));
                logAuthDebug('[Goal Portfolio Viewer][DEBUG_AUTH] Available GM_cookie entries:', summary);
            })
            .catch(error => {
                console.error('[Goal Portfolio Viewer][DEBUG_AUTH] Failed to list GM_cookie entries:', error);
            });
    }

    function getAuthTokenFromGMCookie() {
        if (gmCookieAuthToken) {
            return Promise.resolve(gmCookieAuthToken);
        }
        if (typeof GM_cookie === 'undefined' || typeof GM_cookie.list !== 'function') {
            return Promise.resolve(null);
        }
        return new Promise(resolve => {
            dumpAvailableCookies();
            const cookieNames = ['webapp-sg-access-token', 'webapp-sg-accessToken'];
            const queries = [
                { domain: '.endowus.com', path: '/', name: cookieNames[0] },
                { domain: '.endowus.com', path: '/', name: cookieNames[1] },
                { domain: 'app.sg.endowus.com', path: '/', name: cookieNames[0] },
                { domain: 'app.sg.endowus.com', path: '/', name: cookieNames[1] }
            ];
            const tryNext = index => {
                if (index >= queries.length) {
                    resolve(null);
                    return;
                }
                listCookieByQuery(queries[index]).then(cookies => {
                    const token = selectAuthCookieToken(cookies) || findCookieValue(cookies, cookieNames[1]);
                    if (token) {
                        gmCookieAuthToken = token;
                        resolve(token);
                        return;
                    }
                    tryNext(index + 1);
                });
            };
            tryNext(0);
        });
    }

    function buildAuthorizationValue(token) {
        if (!token || typeof token !== 'string') {
            return null;
        }
        if (token.toLowerCase().startsWith('bearer ')) {
            return token;
        }
        return `Bearer ${token}`;
    }

    async function getFallbackAuthHeaders() {
        const gmCookieToken = await getAuthTokenFromGMCookie();
        const cookieNames = ['webapp-sg-access-token', 'webapp-sg-accessToken'];
        const cookieValue = getCookieValueByNames(cookieNames);
        const token = gmCookieToken || cookieValue?.value || null;
        const deviceId = getCookieValue('webapp-deviceId');
        // Policy: do not read localStorage for auth-related identifiers.
        const clientId = null;

        return {
            authorization: buildAuthorizationValue(token),
            'client-id': clientId,
            'device-id': deviceId
        };
    }

    function extractAuthHeaders(requestUrl, requestInit) {
        const url = typeof requestUrl === 'string' ? requestUrl : requestUrl?.url;
        if (!url || !url.includes('endowus.com')) {
            if (DEBUG_AUTH && url) {
                logAuthDebug('[Goal Portfolio Viewer][DEBUG_AUTH] Skipping header extraction for non-endowus.com URL:', url);
            }
            return;
        }
        const headers = requestInit?.headers || requestUrl?.headers || null;
        const authorization = getHeaderValue(headers, 'authorization');
        const clientId = getHeaderValue(headers, 'client-id');
        const deviceId = getHeaderValue(headers, 'device-id');

        if (authorization || clientId || deviceId) {
            performanceRequestHeaders = {
                authorization,
                'client-id': clientId,
                'device-id': deviceId
            };
        }
    }

    async function buildPerformanceRequestHeaders() {
        const headers = new Headers();
        const fallbackHeaders = await getFallbackAuthHeaders();
        const mergedHeaders = {
            ...fallbackHeaders
        };
        if (performanceRequestHeaders) {
            Object.entries(performanceRequestHeaders).forEach(([key, value]) => {
                if (value) {
                    mergedHeaders[key] = value;
                }
            });
        }
        Object.entries(mergedHeaders).forEach(([key, value]) => {
            if (value) {
                headers.set(key, value);
            }
        });
        return headers;
    }

    function readPerformanceCache(goalId) {
        try {
            const key = getPerformanceCacheKey(goalId);
            const stored = GM_getValue(key, null);
            if (!stored) {
                return null;
            }
            const parsed = JSON.parse(stored);
            const fetchedAt = parsed?.fetchedAt;
            const response = parsed?.response;
            const hasValidShape = typeof fetchedAt === 'number' && fetchedAt > 0 && response && typeof response === 'object';
            if (!parsed || !hasValidShape || !isCacheFresh(fetchedAt, PERFORMANCE_CACHE_MAX_AGE_MS)) {
                GM_deleteValue(key);
                return null;
            }
            return parsed;
        } catch (_error) {
            console.error('[Goal Portfolio Viewer] Error reading performance cache:', _error);
            return null;
        }
    }
    testExports.readPerformanceCache = readPerformanceCache;

    function writePerformanceCache(goalId, responseData) {
        try {
            const key = getPerformanceCacheKey(goalId);
            const payload = {
                fetchedAt: Date.now(),
                response: responseData
            };
            GM_setValue(key, JSON.stringify(payload));
        } catch (_error) {
            console.error('[Goal Portfolio Viewer] Error writing performance cache:', _error);
        }
    }
    testExports.writePerformanceCache = writePerformanceCache;

    function getCachedPerformanceResponse(goalId) {
        const cached = readPerformanceCache(goalId);
        if (!cached) {
            return null;
        }
        return cached.response || null;
    }
    testExports.getCachedPerformanceResponse = getCachedPerformanceResponse;

    async function fetchPerformanceForGoal(goalId) {
        const url = `${PERFORMANCE_ENDPOINT}?displayCcy=SGD&goalId=${encodeURIComponent(goalId)}`;
        const headers = await buildPerformanceRequestHeaders();
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let timeoutId = null;
        if (controller) {
            timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_REQUEST_TIMEOUT_MS);
        }

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers,
            signal: controller ? controller.signal : undefined
        }).finally(() => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        });
        const cloned = response.clone();
        if (!response.ok) {
            throw new Error(`Performance request failed: ${response.status}`);
        }
        return cloned.json();
    }

    async function ensurePerformanceData(goalIds) {
        const results = {};
        const idsToFetch = [];

        goalIds.forEach(goalId => {
            if (!goalId) {
                return;
            }
            if (goalPerformanceData[goalId]) {
                results[goalId] = goalPerformanceData[goalId];
                return;
            }
            const cached = getCachedPerformanceResponse(goalId);
            if (cached) {
                goalPerformanceData[goalId] = cached;
                results[goalId] = cached;
            } else {
                idsToFetch.push(goalId);
            }
        });

        if (!idsToFetch.length) {
            return results;
        }

        const queueResults = await performanceRequestQueue(idsToFetch, async goalId => {
            try {
                const data = await fetchPerformanceForGoal(goalId);
                writePerformanceCache(goalId, data);
                goalPerformanceData[goalId] = data;
                return data;
            } catch (error) {
                console.warn('[Goal Portfolio Viewer] Performance fetch failed:', error);
                return null;
            }
        });

        queueResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                results[result.item] = result.value;
            }
        });

        return results;
    }

    function buildGoalTypePerformanceSummary(performanceResponses) {
        if (!performanceResponses.length) {
            return null;
        }
        const normalizedSeriesCollection = performanceResponses.map(response =>
            normalizeTimeSeriesData(response?.timeSeries?.data || [])
        );
        const mergedSeries = mergeTimeSeriesByDate(normalizedSeriesCollection, true);
        const normalizedMergedSeries = normalizeTimeSeriesData(mergedSeries);
        const primaryPerformanceDates = performanceResponses[0]?.performanceDates;
        const windowStart = getWindowStartDate(
            PERFORMANCE_CHART_WINDOW,
            normalizedMergedSeries,
            primaryPerformanceDates,
            true
        );
        const windowSeries = getTimeSeriesWindow(normalizedMergedSeries, windowStart, true);
        const windowReturns = performanceResponses.length === 1
            ? derivePerformanceWindows(
                performanceResponses[0]?.returnsTable,
                primaryPerformanceDates,
                performanceResponses[0]?.timeSeries?.data || []
            )
            : calculateWeightedWindowReturns(performanceResponses);

        const metrics = summarizePerformanceMetrics(performanceResponses, normalizedMergedSeries);

        return {
            mergedSeries,
            windowSeries,
            windowReturns,
            metrics
        };
    }

    function getLatestPerformanceCacheTimestamp(goalIds) {
        if (!Array.isArray(goalIds)) {
            return null;
        }
        let latestFetchedAt = null;
        goalIds.forEach(goalId => {
            const cached = readPerformanceCache(goalId);
            const fetchedAt = cached?.fetchedAt;
            if (typeof fetchedAt === 'number' && Number.isFinite(fetchedAt)) {
                if (latestFetchedAt === null || fetchedAt > latestFetchedAt) {
                    latestFetchedAt = fetchedAt;
                }
            }
        });
        return latestFetchedAt;
    }

    function clearPerformanceCache(goalIds) {
        if (!Array.isArray(goalIds)) {
            return;
        }
        goalIds.forEach(goalId => {
            if (!goalId) {
                return;
            }
            const key = getPerformanceCacheKey(goalId);
            GM_deleteValue(key);
            delete goalPerformanceData[goalId];
        });
    }
    testExports.clearPerformanceCache = clearPerformanceCache;

    // ============================================
    // UI
    // ============================================

    const PERFORMANCE_CHART_DEFAULT_WIDTH = 400;
    const PERFORMANCE_CHART_DEFAULT_HEIGHT = 110;
    const PERFORMANCE_CHART_MIN_WIDTH = 240;
    const PERFORMANCE_CHART_MIN_HEIGHT = 90;
    const PERFORMANCE_CHART_MAX_HEIGHT = 180;
    // Aspect ratio tuned for typical container widths (≈240–800px) to keep charts readable
    // while staying within PERFORMANCE_CHART_MIN_HEIGHT and PERFORMANCE_CHART_MAX_HEIGHT.
    const PERFORMANCE_CHART_ASPECT_RATIO = 0.28;
    // Debounce timeout for chart resize operations. Balance between responsiveness
    // and reducing re-renders during continuous resize events.
    const CHART_RESIZE_DEBOUNCE_MS = 140;

    function getChartHeightForWidth(width) {
        const safeWidth = Math.max(PERFORMANCE_CHART_MIN_WIDTH, Number(width) || PERFORMANCE_CHART_DEFAULT_WIDTH);
        const targetHeight = Math.round(safeWidth * PERFORMANCE_CHART_ASPECT_RATIO);
        return Math.min(
            PERFORMANCE_CHART_MAX_HEIGHT,
            Math.max(PERFORMANCE_CHART_MIN_HEIGHT, targetHeight || PERFORMANCE_CHART_DEFAULT_HEIGHT)
        );
    }
    testExports.getChartHeightForWidth = getChartHeightForWidth;

    function getChartPadding(chartWidth, chartHeight) {
        const base = Math.min(chartWidth, chartHeight);
        return Math.min(22, Math.max(12, Math.round(base * 0.18)));
    }

    function getChartDimensions(container) {
        if (!container || typeof container.getBoundingClientRect !== 'function') {
            return {
                width: PERFORMANCE_CHART_DEFAULT_WIDTH,
                height: PERFORMANCE_CHART_DEFAULT_HEIGHT
            };
        }
        const rect = container.getBoundingClientRect();
        const width = Math.max(PERFORMANCE_CHART_MIN_WIDTH, Math.round(rect.width));
        const baseHeight = rect.height ? Math.round(rect.height) : getChartHeightForWidth(width);
        const height = Math.max(PERFORMANCE_CHART_MIN_HEIGHT, baseHeight);
        return {
            width: width || PERFORMANCE_CHART_DEFAULT_WIDTH,
            height: height || PERFORMANCE_CHART_DEFAULT_HEIGHT
        };
    }
    testExports.getChartDimensions = getChartDimensions;

    function renderPerformanceChart(chartWrapper, series, dimensionsOverride) {
        if (!chartWrapper) {
            return;
        }
        const dimensions = dimensionsOverride || getChartDimensions(chartWrapper);
        const svg = createLineChartSvg(series, dimensions.width, dimensions.height);
        chartWrapper.innerHTML = '';
        chartWrapper.appendChild(svg);
    }
    testExports.renderPerformanceChart = renderPerformanceChart;

    function initializePerformanceChart(chartWrapper, series) {
        if (typeof ResizeObserver === 'undefined' || !chartWrapper) {
            renderPerformanceChart(chartWrapper, series);
            return null;
        }

        let resizeTimer = null;
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) {
                return;
            }
            const { width, height } = entry.contentRect;
            if (!width || !height) {
                return;
            }
            const targetHeight = getChartHeightForWidth(width);
            if (Math.round(height) !== targetHeight) {
                chartWrapper.style.height = `${targetHeight}px`;
            }
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!chartWrapper.isConnected) {
                    observer.disconnect();
                    return;
                }
                renderPerformanceChart(chartWrapper, series, {
                    width: Math.max(PERFORMANCE_CHART_MIN_WIDTH, Math.round(width)),
                    height: Math.max(PERFORMANCE_CHART_MIN_HEIGHT, Math.round(targetHeight))
                });
            }, CHART_RESIZE_DEBOUNCE_MS);
        });

        observer.observe(chartWrapper);

        return () => {
            clearTimeout(resizeTimer);
            observer.disconnect();
        };
    }

    function createLineChartSvg(series, chartWidth, chartHeight) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const widthValue = Math.max(PERFORMANCE_CHART_MIN_WIDTH, Number(chartWidth) || PERFORMANCE_CHART_DEFAULT_WIDTH);
        const heightValue = Math.max(PERFORMANCE_CHART_MIN_HEIGHT, Number(chartHeight) || PERFORMANCE_CHART_DEFAULT_HEIGHT);
        // Add 100px left padding and 50px right padding for proper spacing
        const leftPadding = 100;
        const rightPadding = 50;
        const totalHorizontalPadding = leftPadding + rightPadding;
        // ViewBox shows full width since we now handle padding internally
        const viewBoxWidth = widthValue;
        svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${heightValue}`);
        svg.setAttribute('class', 'gpv-performance-chart');

        if (!Array.isArray(series) || series.length < 2) {
            const emptyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            // Position at center of viewBox (accounting for left and right padding)
            emptyText.setAttribute('x', `${leftPadding + (viewBoxWidth - totalHorizontalPadding) / 2}`);
            emptyText.setAttribute('y', `${heightValue / 2}`);
            emptyText.setAttribute('text-anchor', 'middle');
            emptyText.setAttribute('class', 'gpv-performance-chart-empty');
            emptyText.textContent = 'No chart data';
            svg.appendChild(emptyText);
            return svg;
        }

        const amounts = series.map(point => Number(point.amount)).filter(val => Number.isFinite(val));
        if (amounts.length < 2) {
            return svg;
        }

        const minValue = Math.min(...amounts);
        const maxValue = Math.max(...amounts);
        const range = maxValue - minValue || 1;
        // Use full width for padding calculation
        const padding = getChartPadding(widthValue, heightValue);
        // Chart dimensions account for left padding, right padding, and internal padding
        const width = Math.max(1, widthValue - leftPadding - rightPadding - padding * 2);
        const height = Math.max(1, heightValue - padding * 2);

        const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        axisGroup.setAttribute('class', 'gpv-performance-chart-axis');

        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', `${leftPadding + padding}`);
        xAxis.setAttribute('x2', `${leftPadding + padding + width}`);
        xAxis.setAttribute('y1', `${padding + height}`);
        xAxis.setAttribute('y2', `${padding + height}`);
        axisGroup.appendChild(xAxis);

        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', `${leftPadding + padding}`);
        yAxis.setAttribute('x2', `${leftPadding + padding}`);
        yAxis.setAttribute('y1', `${padding}`);
        yAxis.setAttribute('y2', `${padding + height}`);
        axisGroup.appendChild(yAxis);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const trendPositive = amounts[amounts.length - 1] >= amounts[0];
        const strokeColor = trendPositive ? '#10b981' : '#ef4444';

        const points = series.map((point, index) => {
            const x = leftPadding + padding + (index / (series.length - 1)) * width;
            const y = padding + height - ((point.amount - minValue) / range) * height;
            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        });

        path.setAttribute('d', points.join(' '));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        const tickValues = [maxValue, (maxValue + minValue) / 2, minValue];
        tickValues.forEach((value, index) => {
            const y = padding + height - ((value - minValue) / range) * height;
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', `${leftPadding + padding - 3}`);
            tick.setAttribute('x2', `${leftPadding + padding}`);
            tick.setAttribute('y1', `${y}`);
            tick.setAttribute('y2', `${y}`);
            tick.setAttribute('class', 'gpv-performance-chart-tick');
            axisGroup.appendChild(tick);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', `${leftPadding + padding - 6}`);
            label.setAttribute('y', `${y + 3}`);
            label.setAttribute('text-anchor', 'end');
            label.setAttribute('class', 'gpv-performance-chart-label');
            label.textContent = formatMoney(value);
            axisGroup.appendChild(label);

            if (index === 1) {
                const grid = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                grid.setAttribute('x1', `${leftPadding + padding}`);
                grid.setAttribute('x2', `${leftPadding + padding + width}`);
                grid.setAttribute('y1', `${y}`);
                grid.setAttribute('y2', `${y}`);
                grid.setAttribute('class', 'gpv-performance-chart-grid');
                axisGroup.appendChild(grid);
            }
        });

        const formatDateLabel = dateString => {
            const date = new Date(dateString);
            if (!Number.isFinite(date.getTime())) {
                return dateString;
            }
            return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
        };

        const xLabels = [
            { value: series[0].date, anchor: 'start', x: leftPadding + padding },
            { value: series[series.length - 1].date, anchor: 'end', x: leftPadding + padding + width }
        ];

        xLabels.forEach(labelInfo => {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', `${labelInfo.x}`);
            const labelY = Math.min(heightValue - 6, padding + height + 12);
            label.setAttribute('y', `${labelY}`);
            label.setAttribute('text-anchor', labelInfo.anchor);
            label.setAttribute('class', 'gpv-performance-chart-label');
            label.textContent = formatDateLabel(labelInfo.value);
            axisGroup.appendChild(label);
        });

        const axisTitleX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        axisTitleX.setAttribute('x', `${leftPadding + padding + width / 2}`);
        axisTitleX.setAttribute('y', `${Math.min(heightValue - 2, padding + height + 20)}`);
        axisTitleX.setAttribute('text-anchor', 'middle');
        axisTitleX.setAttribute('class', 'gpv-performance-chart-title');
        axisTitleX.textContent = 'Date';

        const axisTitleY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        axisTitleY.setAttribute('x', `${Math.max(leftPadding + 4, leftPadding + padding - 10)}`);
        axisTitleY.setAttribute('y', `${Math.max(12, padding - 6)}`);
        axisTitleY.setAttribute('text-anchor', 'start');
        axisTitleY.setAttribute('class', 'gpv-performance-chart-title');
        axisTitleY.textContent = 'Value (SGD)';

        const highlightIndices = [0, Math.floor(series.length / 2), series.length - 1];
        const pointGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pointGroup.setAttribute('class', 'gpv-performance-chart-points');
        highlightIndices.forEach(index => {
            const point = series[index];
            if (!point) {
                return;
            }
            const x = leftPadding + padding + (index / (series.length - 1)) * width;
            const y = padding + height - ((point.amount - minValue) / range) * height;
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', `${x}`);
            circle.setAttribute('cy', `${y}`);
            circle.setAttribute('r', '2.5');
            circle.setAttribute('class', 'gpv-performance-chart-point');
            pointGroup.appendChild(circle);
        });

        svg.appendChild(axisGroup);
        svg.appendChild(axisTitleX);
        svg.appendChild(axisTitleY);
        svg.appendChild(path);
        svg.appendChild(pointGroup);
        return svg;
    }
    testExports.createLineChartSvg = createLineChartSvg;

    function buildPerformanceWindowGrid(windowReturns) {
        const grid = document.createElement('div');
        grid.className = 'gpv-performance-window-grid';

        const items = [
            { label: '1M', value: windowReturns?.oneMonth },
            { label: '6M', value: windowReturns?.sixMonth },
            { label: 'YTD', value: windowReturns?.ytd },
            { label: '1Y', value: windowReturns?.oneYear },
            { label: '3Y', value: windowReturns?.threeYear }
        ];

        items.forEach(item => {
            const tile = document.createElement('div');
            tile.className = 'gpv-performance-window-tile';

            const label = document.createElement('div');
            label.className = 'gpv-performance-window-label';
            label.textContent = item.label;

            const value = document.createElement('div');
            value.className = 'gpv-performance-window-value';
            value.textContent = formatPercentage(item.value);
            if (typeof item.value === 'number') {
                value.classList.add(item.value >= 0 ? 'positive' : 'negative');
            }

            tile.appendChild(label);
            tile.appendChild(value);
            grid.appendChild(tile);
        });

        return grid;
    }
    testExports.buildPerformanceWindowGrid = buildPerformanceWindowGrid;

    function buildPerformanceMetricsTable(metrics) {
        const table = document.createElement('table');
        table.className = 'gpv-performance-metrics-table';

        const tbody = document.createElement('tbody');
        const rows = [
            { label: 'Total Return %', value: formatPercentage(metrics?.totalReturnPercent) },
            { label: 'TWR %', value: formatPercentage(metrics?.twrPercent) },
            { label: 'Annualised IRR', value: formatPercentage(metrics?.annualisedIrrPercent) },
            { label: 'Gain / Loss', value: formatMoney(metrics?.totalReturnAmount) },
            { label: 'Net Fees', value: formatMoney(metrics?.netFeesAmount) },
            { label: 'Net Investment', value: formatMoney(metrics?.netInvestmentAmount) },
            { label: 'Ending Balance', value: formatMoney(metrics?.endingBalanceAmount) }
        ];

        rows.forEach(row => {
            const tr = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.className = 'gpv-performance-metric-label';
            labelCell.textContent = row.label;

            const valueCell = document.createElement('td');
            valueCell.className = 'gpv-performance-metric-value';
            valueCell.textContent = row.value;

            tr.appendChild(labelCell);
            tr.appendChild(valueCell);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        return table;
    }

    function renderGoalTypePerformance(typeSection, goalIds, cleanupCallbacks) {
        const performanceContainer = document.createElement('div');
        performanceContainer.className = 'gpv-performance-container';

        const loading = document.createElement('div');
        loading.className = 'gpv-performance-loading';
        loading.textContent = 'Loading performance data...';
        performanceContainer.appendChild(loading);

        typeSection.appendChild(performanceContainer);

        const refreshFootnote = document.createElement('div');
        refreshFootnote.className = 'gpv-performance-cache-note';
        refreshFootnote.textContent = 'Performance data is cached for 7 days. You can refresh it once every 24 hours.';

        const refreshButton = document.createElement('button');
        refreshButton.className = 'gpv-performance-refresh-btn';
        refreshButton.type = 'button';

        function setRefreshButtonState(latestFetchedAt) {
            const canRefresh = isCacheRefreshAllowed(
                latestFetchedAt,
                PERFORMANCE_CACHE_REFRESH_MIN_AGE_MS
            );
            refreshButton.disabled = !canRefresh;
            refreshButton.textContent = canRefresh ? 'Clear cache & refresh' : 'Refresh available after 24 hours';
            refreshButton.title = canRefresh
                ? 'Clear cached performance data and fetch the latest values.'
                : 'Performance data can be refreshed once every 24 hours.';
        }

        function renderPerformanceSummary(summary) {
            const windowGrid = buildPerformanceWindowGrid(summary.windowReturns);
            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'gpv-performance-chart-wrapper';
            const metricsTable = buildPerformanceMetricsTable(summary.metrics);

            const detailRow = document.createElement('div');
            detailRow.className = 'gpv-performance-detail-row';
            detailRow.appendChild(chartWrapper);
            detailRow.appendChild(metricsTable);

            performanceContainer.appendChild(windowGrid);
            performanceContainer.appendChild(detailRow);

            const footerRow = document.createElement('div');
            footerRow.className = 'gpv-performance-footer-row';
            footerRow.appendChild(refreshFootnote);
            footerRow.appendChild(refreshButton);
            performanceContainer.appendChild(footerRow);

            requestAnimationFrame(() => {
                if (!chartWrapper.isConnected) {
                    return;
                }
                const initialWidth = chartWrapper.getBoundingClientRect().width;
                chartWrapper.style.height = `${getChartHeightForWidth(initialWidth)}px`;
                const cleanup = initializePerformanceChart(chartWrapper, summary.windowSeries);
                if (typeof cleanup === 'function' && Array.isArray(cleanupCallbacks)) {
                    cleanupCallbacks.push(cleanup);
                }
            });
        }

        function loadPerformanceData() {
            ensurePerformanceData(goalIds).then(performanceMap => {
                if (!performanceContainer.isConnected) {
                    return;
                }
                const responses = goalIds
                    .map(goalId => performanceMap[goalId])
                    .filter(Boolean);
                const summary = buildGoalTypePerformanceSummary(responses);

                performanceContainer.innerHTML = '';
                if (!summary) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'gpv-performance-loading';
                    emptyState.textContent = 'Performance data unavailable.';
                    performanceContainer.appendChild(emptyState);
                    return;
                }

                renderPerformanceSummary(summary);
                const latestFetchedAt = getLatestPerformanceCacheTimestamp(goalIds);
                setRefreshButtonState(latestFetchedAt);
            });
        }

        refreshButton.addEventListener('click', () => {
            const latestFetchedAt = getLatestPerformanceCacheTimestamp(goalIds);
            if (!isCacheRefreshAllowed(latestFetchedAt, PERFORMANCE_CACHE_REFRESH_MIN_AGE_MS)) {
                setRefreshButtonState(latestFetchedAt);
                return;
            }
            refreshButton.disabled = true;
            refreshButton.textContent = 'Refreshing...';
            clearPerformanceCache(goalIds);
            performanceContainer.innerHTML = '';
            performanceContainer.appendChild(loading);
            loadPerformanceData();
        });

        loadPerformanceData();
    }
    
    function buildBucketStatsMarkup({
        endingBalanceDisplay,
        returnDisplay,
        returnClass,
        growthDisplay,
        returnLabel
    }) {
        return `
            <div class="gpv-stat-item">
                <span class="gpv-stat-label">Balance</span>
                <span class="gpv-stat-value">${endingBalanceDisplay}</span>
            </div>
            <div class="gpv-stat-item">
                <span class="gpv-stat-label">${returnLabel}</span>
                <span class="gpv-stat-value ${returnClass}">${returnDisplay}</span>
            </div>
            <div class="gpv-stat-item">
                <span class="gpv-stat-label">Growth</span>
                <span class="gpv-stat-value ${returnClass}">${growthDisplay}</span>
            </div>
        `;
    }

    function renderSummaryView(contentDiv, summaryViewModel, onBucketSelect) {
        contentDiv.innerHTML = '';

        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'gpv-summary-container';

        summaryViewModel.buckets.forEach(bucketModel => {
            const bucketCard = document.createElement('div');
            bucketCard.className = 'gpv-bucket-card';
            bucketCard.dataset.bucket = bucketModel.bucketName;
            bucketCard.setAttribute('role', 'button');
            bucketCard.setAttribute('tabindex', '0');
            if (typeof onBucketSelect === 'function') {
                bucketCard.addEventListener('click', () => onBucketSelect(bucketModel.bucketName));
                bucketCard.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onBucketSelect(bucketModel.bucketName);
                    }
                });
            }

            const bucketHeader = document.createElement('div');
            bucketHeader.className = 'gpv-bucket-header';
            
            const bucketTitle = document.createElement('h2');
            bucketTitle.className = 'gpv-bucket-title';
            bucketTitle.textContent = bucketModel.bucketName;
            
            const bucketStats = document.createElement('div');
            bucketStats.className = 'gpv-stats gpv-bucket-stats';
            bucketStats.innerHTML = buildBucketStatsMarkup({
                endingBalanceDisplay: bucketModel.endingBalanceDisplay,
                returnDisplay: bucketModel.returnDisplay,
                returnClass: bucketModel.returnClass,
                growthDisplay: bucketModel.growthDisplay,
                returnLabel: 'Return'
            });
            
            bucketHeader.appendChild(bucketTitle);
            bucketHeader.appendChild(bucketStats);
            bucketCard.appendChild(bucketHeader);

            bucketModel.goalTypes.forEach(goalTypeModel => {
                const typeRow = document.createElement('div');
                typeRow.className = 'gpv-goal-type-row';
                typeRow.innerHTML = `
                    <span class="gpv-goal-type-name">${goalTypeModel.displayName}</span>
                    <span class="gpv-goal-type-stat">Balance: ${goalTypeModel.endingBalanceDisplay}</span>
                    <span class="gpv-goal-type-stat">Return: ${goalTypeModel.returnDisplay}</span>
                    <span class="gpv-goal-type-stat">Growth: ${goalTypeModel.growthDisplay}</span>
                `;
                bucketCard.appendChild(typeRow);
            });

            summaryContainer.appendChild(bucketCard);
        });

        contentDiv.appendChild(summaryContainer);
    }
    testExports.renderSummaryView = renderSummaryView;

    function renderBucketView(
        contentDiv,
        bucketViewModel,
        mergedInvestmentDataState,
        projectedInvestmentsState,
        cleanupCallbacks
    ) {
        contentDiv.innerHTML = '';
        if (!bucketViewModel) {
            return;
        }

        const bucketHeader = document.createElement('div');
        bucketHeader.className = 'gpv-detail-header';
        
        const bucketTitle = document.createElement('h2');
        bucketTitle.className = 'gpv-detail-title';
        bucketTitle.textContent = bucketViewModel.bucketName;
        
        const bucketStats = document.createElement('div');
        bucketStats.className = 'gpv-stats gpv-detail-stats';
        bucketStats.innerHTML = buildBucketStatsMarkup({
            endingBalanceDisplay: bucketViewModel.endingBalanceDisplay,
            returnDisplay: bucketViewModel.returnDisplay,
            returnClass: bucketViewModel.returnClass,
            growthDisplay: bucketViewModel.growthDisplay,
            returnLabel: 'Return'
        });
        
        bucketHeader.appendChild(bucketTitle);
        bucketHeader.appendChild(bucketStats);
        contentDiv.appendChild(bucketHeader);

        bucketViewModel.goalTypes.forEach(goalTypeModel => {
            const typeGrowth = goalTypeModel.growthDisplay;
            
            const typeSection = document.createElement('div');
            typeSection.className = 'gpv-type-section';
            typeSection.dataset.bucket = bucketViewModel.bucketName;
            typeSection.dataset.goalType = goalTypeModel.goalType;
            
            const typeHeader = document.createElement('div');
            typeHeader.className = 'gpv-type-header';
            
            // Get current projected investment for this goal type
            const currentProjectedInvestment = goalTypeModel.projectedAmount;
            
            typeHeader.innerHTML = `
                <h3>${goalTypeModel.displayName}</h3>
                <div class="gpv-type-summary">
                    <span>Balance: ${goalTypeModel.endingBalanceDisplay}</span>
                    <span>Return: ${goalTypeModel.returnDisplay}</span>
                    <span>Growth: ${typeGrowth}</span>
                </div>
            `;
            
            typeSection.appendChild(typeHeader);

            renderGoalTypePerformance(
                typeSection,
                goalTypeModel.goals.map(goal => goal.goalId).filter(Boolean),
                cleanupCallbacks
            );

            // Add projected investment input section as sibling after performance container
            const projectedInputContainer = document.createElement('div');
            projectedInputContainer.className = 'gpv-projected-input-container';
            projectedInputContainer.innerHTML = `
                <label class="gpv-projected-label">
                    <span class="gpv-projected-icon">💡</span>
                    <span>Add Projected Investment (simulation only):</span>
                </label>
                <input 
                    type="number" 
                    class="gpv-projected-input" 
                    step="100"
                    value="${currentProjectedInvestment > 0 ? currentProjectedInvestment : ''}"
                    placeholder="Enter amount"
                    data-bucket="${bucketViewModel.bucketName}"
                    data-goal-type="${goalTypeModel.goalType}"
                />
            `;
            
            typeSection.appendChild(projectedInputContainer);
            
            // Add event listener for projected investment input
            const projectedInput = projectedInputContainer.querySelector('.gpv-projected-input');
            projectedInput.addEventListener('input', function() {
                handleProjectedInvestmentChange(
                    this,
                    bucketViewModel.bucketName,
                    goalTypeModel.goalType,
                    typeSection,
                    mergedInvestmentDataState,
                    projectedInvestmentsState
                );
            });

            const table = document.createElement('table');
            table.className = 'gpv-table gpv-goal-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="gpv-goal-name-header">Goal Name</th>
                        <th>Balance</th>
                        <th>% of Goal Type</th>
                        <th class="gpv-fixed-header">Fixed</th>
                        <th class="gpv-target-header">
                            <div>Target %</div>
                            <div class="gpv-remaining-target ${goalTypeModel.remainingTargetIsHigh ? 'gpv-remaining-alert' : ''}">Remaining: ${goalTypeModel.remainingTargetDisplay}</div>
                        </th>
                        <th>Diff</th>
                        <th>Cumulative Return</th>
                        <th>Return %</th>
                    </tr>
                </thead>
            `;

            const tbody = document.createElement('tbody');

            const goalModelsById = goalTypeModel.goals.reduce((acc, goalModel) => {
                if (goalModel?.goalId) {
                    acc[goalModel.goalId] = goalModel;
                }
                return acc;
            }, {});

            goalTypeModel.goals.forEach(goalModel => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="gpv-goal-name">${goalModel.goalName}</td>
                    <td>${goalModel.endingBalanceDisplay}</td>
                    <td>${goalModel.percentOfTypeDisplay}</td>
                    <td class="gpv-fixed-cell">
                        <label class="gpv-fixed-toggle">
                            <input 
                                type="checkbox"
                                class="gpv-fixed-toggle-input"
                                data-goal-id="${goalModel.goalId}"
                                ${goalModel.isFixed ? 'checked' : ''}
                            />
                            <span class="gpv-toggle-slider"></span>
                        </label>
                    </td>
                    <td class="gpv-target-cell">
                        <input 
                            type="number" 
                            class="gpv-target-input" 
                            min="0" 
                            max="100" 
                            step="0.01"
                            value="${goalModel.targetDisplay}"
                            placeholder="Set target"
                            data-goal-id="${goalModel.goalId}"
                            data-fixed="${goalModel.isFixed ? 'true' : 'false'}"
                            ${goalModel.isFixed ? 'disabled' : ''}
                        />
                    </td>
                    <td class="gpv-diff-cell ${goalModel.diffClass}">${goalModel.diffDisplay}</td>
                    <td class="${goalModel.returnClass}">${goalModel.returnDisplay}</td>
                    <td class="${goalModel.returnClass}">${goalModel.returnPercentDisplay}</td>
                `;

                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            typeSection.appendChild(table);

            typeSection.addEventListener('input', event => {
                const resolved = resolveGoalTypeActionTarget(event.target);
                if (!resolved || resolved.type !== 'target') {
                    return;
                }
                const goalId = resolved.element.dataset.goalId;
                const goalModel = goalModelsById[goalId];
                if (!goalModel) {
                    return;
                }
                handleGoalTargetChange(
                    resolved.element,
                    goalModel.goalId,
                    goalModel.endingBalanceAmount,
                    goalTypeModel.endingBalanceAmount,
                    bucketViewModel.bucketName,
                    goalTypeModel.goalType,
                    typeSection,
                    mergedInvestmentDataState,
                    projectedInvestmentsState
                );
            });

            typeSection.addEventListener('change', event => {
                const resolved = resolveGoalTypeActionTarget(event.target);
                if (!resolved || resolved.type !== 'fixed') {
                    return;
                }
                const goalId = resolved.element.dataset.goalId;
                if (!goalModelsById[goalId]) {
                    return;
                }
                handleGoalFixedToggle(
                    resolved.element,
                    goalId,
                    bucketViewModel.bucketName,
                    goalTypeModel.goalType,
                    typeSection,
                    mergedInvestmentDataState,
                    projectedInvestmentsState
                );
            });
            contentDiv.appendChild(typeSection);
        });
    }

    function buildGoalTypeAllocationSnapshot(
        bucket,
        goalType,
        mergedInvestmentDataState,
        projectedInvestmentsState
    ) {
        const bucketObj = mergedInvestmentDataState[bucket];
        const group = bucketObj?.[goalType];
        if (!group) {
            return null;
        }
        const goals = Array.isArray(group.goals) ? group.goals : [];
        const goalIds = goals.map(goal => goal.goalId).filter(Boolean);
        const goalTargets = buildGoalTargetById(goalIds, GoalTargetStore.getTarget);
        const goalFixed = buildGoalFixedById(goalIds, GoalTargetStore.getFixed);
        const totalTypeAmount = group.endingBalanceAmount || 0;
        const projectedAmount = getProjectedInvestmentValue(projectedInvestmentsState, bucket, goalType);
        const adjustedTotal = totalTypeAmount + projectedAmount;
        return computeGoalTypeViewState(
            goals,
            totalTypeAmount,
            adjustedTotal,
            goalTargets,
            goalFixed
        );
    }

    function refreshGoalTypeSection(
        typeSection,
        bucket,
        goalType,
        mergedInvestmentDataState,
        projectedInvestmentsState,
        options = {}
    ) {
        const snapshot = buildGoalTypeAllocationSnapshot(
            bucket,
            goalType,
            mergedInvestmentDataState,
            projectedInvestmentsState
        );
        if (!snapshot) {
            return;
        }
        const remainingTarget = typeSection.querySelector('.gpv-remaining-target');
        if (remainingTarget) {
            remainingTarget.textContent = `Remaining: ${formatPercentDisplay(snapshot.remainingTargetPercent)}`;
            remainingTarget.classList.toggle(
                'gpv-remaining-alert',
                isRemainingTargetAboveThreshold(snapshot.remainingTargetPercent)
            );
        }
        const rows = typeSection.querySelectorAll('.gpv-goal-table tbody tr');
        const forceTargetRefresh = options.forceTargetRefresh === true;
        rows.forEach(row => {
            const targetInput = row.querySelector('.gpv-target-input');
            const diffCell = row.querySelector('.gpv-diff-cell');
            if (!targetInput) {
                return;
            }
            const goalId = targetInput.dataset.goalId;
            const goalModel = snapshot.goalModelsById[goalId];
            if (!goalModel) {
                return;
            }
            targetInput.dataset.fixed = goalModel.isFixed ? 'true' : 'false';
            targetInput.disabled = goalModel.isFixed;
            if (goalModel.isFixed || forceTargetRefresh) {
                targetInput.value = goalModel.targetPercent !== null ? goalModel.targetPercent.toFixed(2) : '';
            }
            if (diffCell) {
                diffCell.textContent = goalModel.diffAmount === null ? '-' : formatMoney(goalModel.diffAmount);
                diffCell.className = goalModel.diffClass
                    ? `gpv-diff-cell ${goalModel.diffClass}`
                    : 'gpv-diff-cell';
            }
        });
    }

    /**
     * Handle changes to goal target percentage input
     * @param {HTMLInputElement} input - Input element
     * @param {string} goalId - Goal ID
     * @param {number} currentEndingBalance - Current ending balance amount for this goal
     * @param {number} totalTypeEndingBalance - Total ending balance amount for the goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     * @param {HTMLElement} typeSection - Goal type section container
     * @param {Object} mergedInvestmentDataState - Current merged data map
     */
    function handleGoalTargetChange(
        input,
        goalId,
        currentEndingBalance,
        totalTypeEndingBalance,
        bucket,
        goalType,
        typeSection,
        mergedInvestmentDataState,
        projectedInvestmentsState
    ) {
        if (input.dataset.fixed === 'true') {
            return;
        }
        const value = input.value;
        const row = input.closest('tr');
        const diffCell = row.querySelector('.gpv-diff-cell');
        
        if (value === '') {
            // Clear the target if input is empty
            GoalTargetStore.clearTarget(goalId);
            diffCell.textContent = '-';
            diffCell.className = 'gpv-diff-cell';
            refreshGoalTypeSection(
                typeSection,
                bucket,
                goalType,
                mergedInvestmentDataState,
                projectedInvestmentsState
            );
            return;
        }
        
        const targetPercent = parseFloat(value);
        
        // Validate input
        if (isNaN(targetPercent)) {
            // Invalid number - show error feedback
            input.style.borderColor = '#dc2626';
            setTimeout(() => {
                input.style.borderColor = '';
            }, 1000);
            return;
        }
        
        // Save to storage (this will clamp to 0-100 automatically)
        const savedValue = GoalTargetStore.setTarget(goalId, targetPercent);
        
        // Check if value was clamped and provide feedback
        if (savedValue !== targetPercent) {
            // Value was clamped - update input to show actual stored value
            input.value = savedValue.toFixed(2);
            // Show warning briefly
            input.style.borderColor = '#f59e0b';
            setTimeout(() => {
                input.style.borderColor = '';
            }, 1000);
        }
        
        // Get projected investment and calculate adjusted total
        const projectedAmount = getProjectedInvestmentValue(projectedInvestmentsState, bucket, goalType);
        const adjustedTypeTotal = totalTypeEndingBalance + projectedAmount;
        
        // Update difference display in dollar amount
        const diffData = buildDiffCellData(currentEndingBalance, savedValue, adjustedTypeTotal);
        diffCell.textContent = diffData.diffDisplay;
        diffCell.className = diffData.diffClassName;

        refreshGoalTypeSection(
            typeSection,
            bucket,
            goalType,
            mergedInvestmentDataState,
            projectedInvestmentsState
        );
    }
    testExports.handleGoalTargetChange = handleGoalTargetChange;

    function handleGoalFixedToggle(
        input,
        goalId,
        bucket,
        goalType,
        typeSection,
        mergedInvestmentDataState,
        projectedInvestmentsState
    ) {
        const isFixed = input.checked === true;

        if (isFixed) {
            GoalTargetStore.setFixed(goalId, true);
        } else {
            GoalTargetStore.clearFixed(goalId);
        }

        refreshGoalTypeSection(
            typeSection,
            bucket,
            goalType,
            mergedInvestmentDataState,
            projectedInvestmentsState,
            { forceTargetRefresh: true }
        );
    }
    testExports.handleGoalFixedToggle = handleGoalFixedToggle;

    /**
     * Handle changes to projected investment input
     * @param {HTMLInputElement} input - Input element
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     * @param {HTMLElement} typeSection - The type section element containing the table
     */
    function handleProjectedInvestmentChange(
        input,
        bucket,
        goalType,
        typeSection,
        mergedInvestmentDataState,
        projectedInvestmentsState
    ) {
        const value = input.value;
        
        if (value === '' || value === '0') {
            // Clear the projected investment if input is empty or zero
            clearProjectedInvestment(projectedInvestmentsState, bucket, goalType);
        } else {
            const amount = parseFloat(value);
            
            // Validate input
            if (isNaN(amount)) {
                // Invalid number - show error feedback
                input.style.borderColor = '#dc2626';
                setTimeout(() => {
                    input.style.borderColor = '';
                }, 1000);
                return;
            }
            
            // Save the projected investment
            setProjectedInvestment(projectedInvestmentsState, bucket, goalType, amount);
            
            // Show success feedback
            input.style.borderColor = '#10b981';
            setTimeout(() => {
                input.style.borderColor = '';
            }, 500);
        }
        
        // Recalculate all diffs in this goal type section
        const tbody = typeSection.querySelector('.gpv-goal-table tbody');
        if (tbody) {
            refreshGoalTypeSection(
                typeSection,
                bucket,
                goalType,
                mergedInvestmentDataState,
                projectedInvestmentsState
            );
        }
    }
    testExports.handleProjectedInvestmentChange = handleProjectedInvestmentChange;

    // ============================================
    // UI: Styles
    // ============================================
    
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Modern Portfolio Viewer Styles */
            
            .gpv-trigger-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 999999;
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #fff;
                border: none;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            }
            
            .gpv-trigger-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .gpv-trigger-btn:active {
                transform: translateY(0);
            }
            
            .gpv-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(8px);
                z-index: 1000000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: gpv-fadeIn 0.2s ease;
            }
            
            @keyframes gpv-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .gpv-container {
                background: #ffffff;
                border-radius: 20px;
                padding: 0;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                position: relative;
                max-height: 85vh;
                max-width: 1200px;
                width: 90vw;
                min-width: 800px;
                display: flex;
                flex-direction: column;
                animation: gpv-slideUp 0.3s ease;
            }
            
            @keyframes gpv-slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .gpv-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                border-bottom: 1px solid #e5e7eb;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px 20px 0 0;
            }
            
            .gpv-header h1 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: #ffffff;
                font-size: 24px;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-weight: 300;
            }
            
            .gpv-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }
            
            .gpv-controls {
                padding: 12px 24px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .gpv-select-label {
                font-weight: 600;
                color: #1f2937;
                font-size: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-select {
                padding: 10px 18px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                color: #1f2937;
                background: #ffffff;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                min-width: 220px;
            }
            
            .gpv-select:hover {
                border-color: #667eea;
            }
            
            .gpv-select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .gpv-content {
                overflow-y: auto;
                padding: 16px 24px;
                flex: 1;
            }
            
            /* Summary View Styles */
            
            .gpv-summary-container {
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            
            .gpv-bucket-card {
                background: #ffffff;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .gpv-bucket-card:hover {
                border-color: #667eea;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                transform: translateY(-2px);
            }

            .gpv-bucket-card:focus-visible {
                outline: 3px solid rgba(102, 126, 234, 0.7);
                outline-offset: 2px;
            }
            
            .gpv-bucket-header {
                margin-bottom: 12px;
            }
            
            .gpv-bucket-title {
                font-size: 19px;
                font-weight: 700;
                color: #111827;
                margin: 0 0 10px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-stats {
                display: flex;
                gap: 24px;
            }

            .gpv-bucket-stats {
                flex-wrap: wrap;
            }
            
            .gpv-stat-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .gpv-stat-label {
                font-size: 12px;
                font-weight: 600;
                color: #4b5563;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .gpv-stat-value {
                font-size: 18px;
                font-weight: 700;
                color: #111827;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-stat-value.positive {
                color: #059669;
            }
            
            .gpv-stat-value.negative {
                color: #dc2626;
            }
            
            .gpv-goal-type-row {
                display: flex;
                gap: 16px;
                padding: 10px 12px;
                background: #f9fafb;
                border-radius: 8px;
                margin-bottom: 8px;
                align-items: center;
            }
            
            .gpv-goal-type-name {
                font-weight: 700;
                color: #1f2937;
                min-width: 120px;
                font-size: 14px;
            }
            
            .gpv-goal-type-stat {
                font-size: 13px;
                color: #4b5563;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            /* Detail View Styles */
            
            .gpv-detail-header {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e5e7eb;
            }
            
            .gpv-detail-title {
                font-size: 22px;
                font-weight: 700;
                color: #111827;
                margin: 0 0 12px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-detail-stats {
                gap: 28px;
                flex-wrap: nowrap;
            }
            
            .gpv-type-section {
                margin-bottom: 24px;
            }
            
            .gpv-type-header {
                margin-bottom: 12px;
            }
            
            .gpv-type-header h3 {
                font-size: 17px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 8px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-type-summary {
                display: flex;
                gap: 20px;
                font-size: 14px;
                color: #4b5563;
                font-weight: 500;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            /* Table Styles */
            
            .gpv-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-table thead tr {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .gpv-table th {
                padding: 10px 14px;
                text-align: right;
                font-weight: 700;
                font-size: 12px;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                white-space: nowrap;
            }

            .gpv-table th.gpv-goal-name-header {
                text-align: left;
            }

            .gpv-fixed-header {
                text-align: center;
            }
            
            .gpv-table td {
                padding: 10px 14px;
                text-align: right;
                font-size: 14px;
                color: #1f2937;
                border-top: 1px solid #e5e7eb;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-table tbody tr {
                transition: background-color 0.2s ease;
            }
            
            .gpv-table tbody tr:hover {
                background-color: #f3f4f6;
            }
            
            .gpv-table .gpv-goal-name {
                text-align: left;
                font-weight: 600;
                color: #111827;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-table .positive {
                color: #059669;
                font-weight: 700;
            }
            
            .gpv-table .negative {
                color: #dc2626;
                font-weight: 700;
            }
            
            /* Target Input Styles */
            
            .gpv-target-cell {
                padding: 6px 8px !important;
            }

            .gpv-target-header {
                text-align: right;
            }

            .gpv-remaining-target {
                margin-top: 4px;
                font-size: 11px;
                color: #fef3c7;
                font-weight: 500;
            }

            .gpv-remaining-target.gpv-remaining-alert {
                color: #ffffff;
                background: #f97316;
                border-radius: 999px;
                padding: 2px 6px;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .gpv-fixed-cell {
                text-align: center;
                white-space: nowrap;
            }

            .gpv-fixed-toggle {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
                vertical-align: middle;
            }

            .gpv-fixed-toggle-input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .gpv-toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #9ca3af;
                transition: 0.2s;
                border-radius: 999px;
            }

            .gpv-toggle-slider:before {
                position: absolute;
                content: '';
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
                background-color: #ffffff;
                transition: 0.2s;
                border-radius: 50%;
            }

            .gpv-fixed-toggle-input:checked + .gpv-toggle-slider {
                background-color: #4f46e5;
            }

            .gpv-fixed-toggle-input:checked + .gpv-toggle-slider:before {
                transform: translateX(16px);
            }

            .gpv-target-input {
                width: 70px;
                padding: 4px 8px;
                border: 2px solid #e5e7eb;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                color: #1f2937;
                background: #ffffff;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-target-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .gpv-target-input:hover {
                border-color: #667eea;
            }
            
            .gpv-target-input::placeholder {
                color: #9ca3af;
                font-weight: 400;
                font-size: 12px;
            }
            
            /* Remove spinner arrows in Chrome, Safari, Edge, Opera */
            .gpv-target-input::-webkit-outer-spin-button,
            .gpv-target-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            
            /* Remove spinner arrows in Firefox */
            .gpv-target-input[type=number] {
                -moz-appearance: textfield;
            }
            
            .gpv-diff-cell {
                font-weight: 700;
                font-size: 14px;
                text-align: center;
            }
            
            .gpv-diff-cell.positive {
                color: #059669;
            }
            
            .gpv-diff-cell.negative {
                color: #dc2626;
            }
            
            /* Projected Investment Input Styles */
            
            .gpv-projected-input-container {
                margin-top: 12px;
                margin-bottom: 12px;
                padding: 12px;
                background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
                border: 2px dashed #0284c7;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .gpv-projected-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                font-weight: 600;
                color: #0c4a6e;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                white-space: nowrap;
            }
            
            .gpv-projected-icon {
                font-size: 16px;
            }
            
            .gpv-projected-input {
                width: 140px;
                padding: 6px 12px;
                border: 2px solid #0284c7;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                color: #0c4a6e;
                background: #ffffff;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .gpv-projected-input:focus {
                outline: none;
                border-color: #0369a1;
                box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
            }
            
            .gpv-projected-input:hover {
                border-color: #0369a1;
            }
            
            .gpv-projected-input::placeholder {
                color: #075985;
                font-weight: 400;
                font-size: 13px;
            }
            
            /* Remove spinner arrows for projected input */
            .gpv-projected-input::-webkit-outer-spin-button,
            .gpv-projected-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            
            .gpv-projected-input[type=number] {
                -moz-appearance: textfield;
            }

            /* Performance Chart + Metrics */

            .gpv-performance-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                align-items: stretch;
                padding: 12px;
                border-radius: 10px;
                background: #f8fafc;
                border: 1px solid #e5e7eb;
                margin-bottom: 14px;
            }

            .gpv-performance-detail-row {
                display: flex;
                gap: 20px;
                align-items: stretch;
            }

            .gpv-performance-footer-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            .gpv-performance-cache-note {
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .gpv-performance-refresh-btn {
                background: #ffffff;
                border: 1px solid #cbd5f5;
                color: #4c1d95;
                font-size: 12px;
                font-weight: 700;
                padding: 6px 12px;
                border-radius: 999px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .gpv-performance-refresh-btn:hover:not(:disabled) {
                border-color: #a78bfa;
                color: #5b21b6;
                box-shadow: 0 2px 6px rgba(76, 29, 149, 0.18);
            }

            .gpv-performance-refresh-btn:disabled {
                cursor: not-allowed;
                opacity: 0.6;
                box-shadow: none;
            }

            .gpv-performance-loading {
                font-size: 14px;
                font-weight: 600;
                color: #64748b;
                width: 100%;
                text-align: center;
                padding: 12px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .gpv-performance-chart-wrapper {
                flex: 1;
                min-width: 240px;
                min-height: 90px;
                height: auto;
            }

            .gpv-performance-chart {
                width: 100%;
                height: 100%;
                display: block;
            }

            .gpv-performance-chart-axis line {
                stroke: #cbd5f5;
                stroke-width: 1;
            }

            .gpv-performance-chart-grid {
                stroke: #e2e8f0;
                stroke-width: 1;
                stroke-dasharray: 2 2;
            }

            .gpv-performance-chart-tick {
                stroke: #94a3b8;
                stroke-width: 1;
            }

            .gpv-performance-chart-label {
                font-size: 9px;
                fill: #64748b;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .gpv-performance-chart-title {
                font-size: 9px;
                fill: #475569;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .gpv-performance-chart-point {
                fill: #1f2937;
            }

            .gpv-performance-chart-empty {
                font-size: 12px;
                fill: #94a3b8;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .gpv-performance-window-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 8px;
                width: 100%;
            }

            .gpv-performance-window-tile {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 6px 8px;
                text-align: center;
            }

            .gpv-performance-window-label {
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .gpv-performance-window-value {
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
            }

            .gpv-performance-window-value.positive {
                color: #059669;
            }

            .gpv-performance-window-value.negative {
                color: #dc2626;
            }

            .gpv-performance-metrics-table {
                width: 100%;
                max-width: 320px;
                border-collapse: collapse;
                font-size: 13px;
            }

            .gpv-performance-detail-row .gpv-performance-chart-wrapper {
                flex: 1;
                min-width: 240px;
            }

            .gpv-performance-metrics-table tr {
                border-bottom: 1px solid #e5e7eb;
            }

            .gpv-performance-metrics-table tr:last-child {
                border-bottom: none;
            }

            .gpv-performance-metric-label {
                text-align: left;
                color: #475569;
                font-weight: 600;
                padding: 6px 4px;
            }

            .gpv-performance-metric-value {
                text-align: right;
                color: #0f172a;
                font-weight: 700;
                padding: 6px 4px;
            }
            
            /* Scrollbar Styles */
            
            .gpv-content::-webkit-scrollbar {
                width: 8px;
            }
            
            .gpv-content::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            
            .gpv-content::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }
            
            .gpv-content::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // Controller
    // ============================================

    function showOverlay() {
        let old = document.getElementById('gpv-overlay');
        if (old) {
            if (Array.isArray(old.gpvCleanupCallbacks)) {
                old.gpvCleanupCallbacks.forEach(callback => {
                    if (typeof callback === 'function') {
                        callback();
                    }
                });
                old.gpvCleanupCallbacks.length = 0;
            }
            old.remove();
        }

        const data = buildMergedInvestmentData(
            apiData.performance,
            apiData.investible,
            apiData.summary
        );
        if (!data) {
            logDebug('[Goal Portfolio Viewer] Not all API data available yet');
            alert('Please wait for portfolio data to load, then try again.');
            return;
        }
        logDebug('[Goal Portfolio Viewer] Data merged successfully');

        const overlay = document.createElement('div');
        overlay.id = 'gpv-overlay';
        overlay.className = 'gpv-overlay';

        const container = document.createElement('div');
        container.className = 'gpv-container';
        const cleanupCallbacks = [];
        container.gpvCleanupCallbacks = cleanupCallbacks;
        overlay.gpvCleanupCallbacks = cleanupCallbacks;

        const header = document.createElement('div');
        header.className = 'gpv-header';
        
        const title = document.createElement('h1');
        title.textContent = 'Portfolio Viewer';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'gpv-close-btn';
        closeBtn.innerHTML = '✕';
        function teardownOverlay() {
            if (!overlay.isConnected) {
                return;
            }
            if (!Array.isArray(cleanupCallbacks)) {
                return;
            }
            cleanupCallbacks.forEach(callback => {
                if (typeof callback === 'function') {
                    callback();
                }
            });
            cleanupCallbacks.length = 0;
        }

        function closeOverlay() {
            if (!overlay.isConnected) {
                return;
            }
            teardownOverlay();
            overlay.remove();
        }

        closeBtn.onclick = closeOverlay;
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        container.appendChild(header);

        const controls = document.createElement('div');
        controls.className = 'gpv-controls';
        
        const selectLabel = document.createElement('label');
        selectLabel.textContent = 'View:';
        selectLabel.className = 'gpv-select-label';
        
        const select = document.createElement('select');
        select.className = 'gpv-select';
        
        const summaryOption = document.createElement('option');
        summaryOption.value = 'SUMMARY';
        summaryOption.textContent = '📊 Summary View';
        select.appendChild(summaryOption);

        Object.keys(data).sort().forEach(bucket => {
            const opt = document.createElement('option');
            opt.value = bucket;
            opt.textContent = `📁 ${bucket}`;
            select.appendChild(opt);
        });

        controls.appendChild(selectLabel);
        controls.appendChild(select);
        container.appendChild(controls);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'gpv-content';
        container.appendChild(contentDiv);

        function renderView(value) {
            if (value === 'SUMMARY') {
                const summaryViewModel = buildSummaryViewModel(data);
                renderSummaryView(contentDiv, summaryViewModel, onBucketSelect);
                return;
            }
            const bucketObj = data[value];
            const goalIds = collectGoalIds(bucketObj);
            const goalTargetById = buildGoalTargetById(goalIds, GoalTargetStore.getTarget);
            const goalFixedById = buildGoalFixedById(goalIds, GoalTargetStore.getFixed);
            const bucketViewModel = buildBucketDetailViewModel(
                value,
                data,
                projectedInvestments,
                goalTargetById,
                goalFixedById
            );
            renderBucketView(
                contentDiv,
                bucketViewModel,
                data,
                projectedInvestments,
                cleanupCallbacks
            );
        }

        function onBucketSelect(bucket) {
            if (!bucket || !data[bucket]) {
                return;
            }
            select.value = bucket;
            renderView(bucket);
        }

        renderView('SUMMARY');

        select.onchange = function() {
            renderView(select.value);
        };

        overlay.appendChild(container);
        
        // Close overlay when clicking outside the container
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                closeOverlay();
            }
        };
        
        document.body.appendChild(overlay);
    }

    // ============================================
    // Controller: Initialization
    // ============================================
    
    let portfolioButton = null;
    let lastUrl = window.location.href;
    
    function shouldShowButton() {
        return isDashboardRoute(window.location.href, window.location.origin);
    }
    
    function createButton() {
        if (!portfolioButton) {
            portfolioButton = document.createElement('button');
            portfolioButton.className = 'gpv-trigger-btn';
            portfolioButton.textContent = '📊 Portfolio Viewer';
            portfolioButton.onclick = showOverlay;
        }
        return portfolioButton;
    }
    
    function updateButtonVisibility() {
        if (!document.body) return;
        
        const shouldShow = shouldShowButton();
        const buttonExists = portfolioButton && portfolioButton.parentNode;
        
        if (shouldShow && !buttonExists) {
            // Show button
            const btn = createButton();
            document.body.appendChild(btn);
            logDebug('[Goal Portfolio Viewer] Button shown on dashboard');
        } else if (!shouldShow && buttonExists) {
            // Hide button
            portfolioButton.remove();
            logDebug('[Goal Portfolio Viewer] Button hidden (not on dashboard)');
        }
    }
    
    function handleUrlChange() {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            logDebug('[Goal Portfolio Viewer] URL changed to:', { url: currentUrl });
            updateButtonVisibility();
        }
    }
    
    function startUrlMonitoring() {
        if (window.__gpvUrlMonitorCleanup) {
            window.__gpvUrlMonitorCleanup();
        }

        lastUrl = window.location.href;
        updateButtonVisibility();

        // Debounce function to limit how often handleUrlChange can be called
        let urlCheckTimeout = null;
        const debouncedUrlCheck = () => {
            if (urlCheckTimeout) {
                clearTimeout(urlCheckTimeout);
            }
            urlCheckTimeout = setTimeout(handleUrlChange, 100);
        };

        // Listen to popstate event for browser back/forward navigation
        window.addEventListener('popstate', handleUrlChange);

        // Override pushState to detect programmatic navigation
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            const result = originalPushState.apply(this, args);
            handleUrlChange();
            return result;
        };

        // Override replaceState to detect programmatic navigation
        const originalReplaceState = history.replaceState;
        history.replaceState = function(...args) {
            const result = originalReplaceState.apply(this, args);
            handleUrlChange();
            return result;
        };

        const intervalId = window.setInterval(handleUrlChange, 500);

        const appRoot = document.querySelector('#root')
            || document.querySelector('#app')
            || document.querySelector('main');
        let observer = null;

        if (appRoot) {
            // Use MutationObserver as a fallback for navigation patterns not caught by History API
            observer = new MutationObserver(debouncedUrlCheck);
            observer.observe(appRoot, {
                childList: true,
                subtree: true
            });
        }

        window.__gpvUrlMonitorCleanup = () => {
            window.removeEventListener('popstate', handleUrlChange);
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
            window.clearInterval(intervalId);
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (urlCheckTimeout) {
                clearTimeout(urlCheckTimeout);
                urlCheckTimeout = null;
            }
            window.__gpvUrlMonitorCleanup = null;
        };

        logDebug('[Goal Portfolio Viewer] URL monitoring started with History API hooks');
    }
    
    function init() {
        // Load stored API data
        loadStoredData(apiData);

        if (DEBUG_AUTH) {
            getAuthTokenFromGMCookie();
        }
        
        if (document.body) {
            injectStyles();
            startUrlMonitoring();
        } else {
            setTimeout(init, 100);
        }
    }

    // Wait for DOM to be ready
    if (!window.__GPV_DISABLE_AUTO_INIT) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    } // End of browser-only code

    // ============================================
    // Conditional Export for Testing (Node.js only)
    // ============================================
    // This allows tests to import pure logic functions without duplication.
    // The userscript remains standalone in the browser (no imports/exports).
    // In Node.js (test/CI), these functions are programmatically accessible.
    // Pattern: Keep all logic in ONE place (this file), test the real implementation.
    if (typeof module !== 'undefined' && module.exports) {
        const baseExports = {
            getGoalTargetKey,
            getGoalFixedKey,
            getProjectedInvestmentKey,
            extractBucketName,
            getDisplayGoalType,
            sortGoalTypes,
            detectEndpointKey,
            formatMoney,
            toFiniteNumber,
            formatPercentValue,
            formatPercentDisplay,
            formatGrowthPercentFromEndingBalance,
            getReturnClass,
            calculatePercentOfType,
            calculateGoalDiff,
            isDashboardRoute,
            calculateFixedTargetPercent,
            calculateRemainingTargetPercent,
            isRemainingTargetAboveThreshold,
            buildGoalTypeAllocationModel,
            getProjectedInvestmentValue,
            buildDiffCellData,
            sortGoalsByName,
            resolveGoalTypeActionTarget,
            buildSummaryViewModel,
            buildBucketDetailViewModel,
            collectGoalIds,
            buildGoalTargetById,
            buildGoalFixedById,
            normalizeGoalId,
            normalizeGoalName,
            normalizeGoalType,
            normalizePerformanceData,
            normalizeInvestibleData,
            normalizeSummaryData,
            buildMergedInvestmentData,
            getPerformanceCacheKey,
            isCacheFresh,
            isCacheRefreshAllowed,
            formatPercentage,
            normalizeTimeSeriesData,
            getLatestTimeSeriesPoint,
            findNearestPointOnOrBefore,
            getPerformanceDate,
            getWindowStartDate,
            calculateReturnFromTimeSeries,
            mapReturnsTableToWindowReturns,
            mergeTimeSeriesByDate,
            getTimeSeriesWindow,
            extractAmount,
            calculateWeightedAverage,
            calculateWeightedWindowReturns,
            summarizePerformanceMetrics,
            derivePerformanceWindows,
            createSequentialRequestQueue
        };

        module.exports = { ...baseExports, ...testExports };
    }

})();
