// ==UserScript==
// @name         Endowus Portfolio Viewer
// @namespace    https://github.com/laurenceputra/endowus_view_enhancer
// @version      2.3.0
// @description  View and organize your Endowus portfolio by buckets with a modern interface. Groups goals by bucket names and displays comprehensive portfolio analytics.
// @author       laurenceputra
// @match        https://app.sg.endowus.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_cookie
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js
// @downloadURL  https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // Logic
    // ============================================

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

    function formatMoney(val) {
        if (typeof val === 'number' && !isNaN(val)) {
            return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return '-';
    }

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
        return `epv_performance_${goalId}`;
    }

    function isCacheFresh(fetchedAt, maxAgeMs, nowMs = Date.now()) {
        const fetchedTime = Number(fetchedAt);
        const maxAge = Number(maxAgeMs);
        if (!isFinite(fetchedTime) || !isFinite(maxAge) || maxAge <= 0) {
            return false;
        }
        return nowMs - fetchedTime < maxAge;
    }

    function formatPercentage(value) {
        if (value === null || value === undefined) {
            return '-';
        }
        const numericValue = Number(value);
        if (!isFinite(numericValue)) {
            return '-';
        }
        const sign = numericValue > 0 ? '+' : '';
        return `${sign}${(numericValue * 100).toFixed(2)}%`;
    }

    function normalizeTimeSeriesData(timeSeriesData) {
        if (!Array.isArray(timeSeriesData)) {
            return [];
        }
        return timeSeriesData
            .map(entry => {
                const date = new Date(entry?.date);
                const amount = Number(entry?.amount);
                if (!isFinite(date?.getTime()) || !isFinite(amount)) {
                    return null;
                }
                return {
                    date,
                    dateString: entry.date,
                    amount
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    function getLatestTimeSeriesPoint(timeSeriesData) {
        const normalized = normalizeTimeSeriesData(timeSeriesData);
        return normalized.length ? normalized[normalized.length - 1] : null;
    }

    function findNearestPointOnOrBefore(timeSeriesData, targetDate) {
        const normalized = normalizeTimeSeriesData(timeSeriesData);
        if (!normalized.length) {
            return null;
        }
        const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
        if (!isFinite(target?.getTime())) {
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
                if (isFinite(date.getTime())) {
                    return date;
                }
            }
        }
        return null;
    }

    function getWindowStartDate(windowKey, timeSeriesData, performanceDates) {
        const latestPoint = getLatestTimeSeriesPoint(timeSeriesData);
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
        const startPoint = findNearestPointOnOrBefore(timeSeriesData, startDate);
        const endPoint = getLatestTimeSeriesPoint(timeSeriesData);
        if (!startPoint || !endPoint) {
            return null;
        }
        if (startPoint.amount === 0) {
            return null;
        }
        if (endPoint.amount <= 0) {
            return null;
        }
        return (endPoint.amount / startPoint.amount) - 1;
    }

    function extractReturnPercent(value) {
        if (typeof value === 'number' && isFinite(value)) {
            return value;
        }
        if (value && typeof value === 'object') {
            const possibleKeys = ['returnPercent', 'rateOfReturn', 'return', 'percent'];
            for (const key of possibleKeys) {
                const candidate = value[key];
                if (typeof candidate === 'number' && isFinite(candidate)) {
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
        return mapReturnsTableToWindowReturns(returnsTable);
    }

    function mergeTimeSeriesByDate(timeSeriesCollection) {
        const totals = new Map();
        if (!Array.isArray(timeSeriesCollection)) {
            return [];
        }
        timeSeriesCollection.forEach(series => {
            const normalized = normalizeTimeSeriesData(series);
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

    function getTimeSeriesWindow(timeSeriesData, startDate) {
        if (!startDate) {
            return normalizeTimeSeriesData(timeSeriesData).map(point => ({
                date: point.dateString,
                amount: point.amount
            }));
        }
        const targetDate = startDate instanceof Date ? startDate : new Date(startDate);
        if (!isFinite(targetDate?.getTime())) {
            return [];
        }
        return normalizeTimeSeriesData(timeSeriesData)
            .filter(point => point.date.getTime() >= targetDate.getTime())
            .map(point => ({ date: point.dateString, amount: point.amount }));
    }

    function extractAmount(value) {
        if (typeof value === 'number' && isFinite(value)) {
            return value;
        }
        if (value && typeof value === 'object') {
            const nestedAmount = value.amount;
            if (typeof nestedAmount === 'number' && isFinite(nestedAmount)) {
                return nestedAmount;
            }
            const displayAmount = value.display?.amount;
            if (typeof displayAmount === 'number' && isFinite(displayAmount)) {
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
            const numericValue = Number(value);
            const weight = Number(weights[index]);
            if (isFinite(numericValue) && isFinite(weight) && weight > 0) {
                total += numericValue * weight;
                totalWeight += weight;
            }
        });
        if (totalWeight === 0) {
            return null;
        }
        return total / totalWeight;
    }

    function calculateWeightedWindowReturns(performanceResponses, fallbackPerformanceDates) {
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
            const weight = isFinite(netInvestmentValue) && netInvestmentValue > 0 ? netInvestmentValue : null;

            if (!weight) {
                return;
            }

            windowKeys.forEach(windowKey => {
                const mappedValue = mappedReturns[windowKey];
                if (typeof mappedValue === 'number' && isFinite(mappedValue)) {
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

            if (isFinite(totalReturnValue)) {
                totalReturnSeen = true;
                totalReturnAmount += totalReturnValue;
            }
            if (isFinite(accessFeeValue) || isFinite(trailerFeeValue)) {
                netFeesSeen = true;
                netFeesAmount += (isFinite(accessFeeValue) ? accessFeeValue : 0)
                    - (isFinite(trailerFeeValue) ? trailerFeeValue : 0);
            }
            if (isFinite(netInvestmentValue)) {
                netInvestmentSeen = true;
                netInvestmentAmount += netInvestmentValue;
            }
            if (isFinite(endingBalanceValue)) {
                endingBalanceSeen = true;
                endingBalanceAmount += endingBalanceValue;
            }

            const netWeight = isFinite(netInvestmentValue) ? netInvestmentValue : 0;
            if (isFinite(netWeight) && netWeight > 0) {
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
            if (isFinite(latest?.amount)) {
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

    const DEBUG_AUTH = false;
    const PERFORMANCE_ENDPOINT = 'https://bff.prod.silver.endowus.com/v1/performance';
    const REQUEST_DELAY_MS = 500;
    const PERFORMANCE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    const PERFORMANCE_CHART_WINDOW = PERFORMANCE_WINDOWS.oneYear.key;

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
        
        if (typeof url === 'string') {
            // Check more specific patterns first to avoid false matches
            if (url.includes('/v1/goals/performance')) {
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    console.log('[Endowus Portfolio Viewer] Intercepted performance data');
                    apiData.performance = data;
                    // Store in Tampermonkey storage
                    GM_setValue('api_performance', JSON.stringify(data));
                } catch (e) {
                    console.error('[Endowus Portfolio Viewer] Error parsing API response:', e);
                }
            } else if (url.includes('/v2/goals/investible')) {
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    console.log('[Endowus Portfolio Viewer] Intercepted investible data');
                    apiData.investible = data;
                    // Store in Tampermonkey storage
                    GM_setValue('api_investible', JSON.stringify(data));
                } catch (e) {
                    console.error('[Endowus Portfolio Viewer] Error parsing API response:', e);
                }
            } else if (url.match(/\/v1\/goals(?:[?#]|$)/)) {
                // Check for base goals endpoint (summary data)
                // Pattern ensures we match /v1/goals but not /v1/goals/{id} or other sub-paths
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    // Only store if data is an array (the summary endpoint returns an array of goals)
                    if (Array.isArray(data)) {
                        console.log('[Endowus Portfolio Viewer] Intercepted summary data');
                        apiData.summary = data;
                        // Store in Tampermonkey storage
                        GM_setValue('api_summary', JSON.stringify(data));
                    }
                } catch (e) {
                    console.error('[Endowus Portfolio Viewer] Error parsing API response:', e);
                }
            }
        }
        
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
            // Check more specific patterns first to avoid false matches
            if (url.includes('/v1/goals/performance')) {
                this.addEventListener('load', function() {
                    try {
                        const data = JSON.parse(this.responseText);
                        console.log('[Endowus Portfolio Viewer] Intercepted performance data (XHR)');
                        apiData.performance = data;
                        // Store in Tampermonkey storage
                        GM_setValue('api_performance', JSON.stringify(data));
                    } catch (e) {
                        console.error('[Endowus Portfolio Viewer] Error parsing XHR response:', e);
                    }
                });
            } else if (url.includes('/v2/goals/investible')) {
                this.addEventListener('load', function() {
                    try {
                        const data = JSON.parse(this.responseText);
                        console.log('[Endowus Portfolio Viewer] Intercepted investible data (XHR)');
                        apiData.investible = data;
                        // Store in Tampermonkey storage
                        GM_setValue('api_investible', JSON.stringify(data));
                    } catch (e) {
                        console.error('[Endowus Portfolio Viewer] Error parsing XHR response:', e);
                    }
                });
            } else if (url.match(/\/v1\/goals(?:[?#]|$)/)) {
                // Check for base goals endpoint (summary data)
                // Pattern ensures we match /v1/goals but not /v1/goals/{id} or other sub-paths
                this.addEventListener('load', function() {
                    try {
                        const data = JSON.parse(this.responseText);
                        // Only store if data is an array (the summary endpoint returns an array of goals)
                        if (Array.isArray(data)) {
                            console.log('[Endowus Portfolio Viewer] Intercepted summary data (XHR)');
                            apiData.summary = data;
                            // Store in Tampermonkey storage
                            GM_setValue('api_summary', JSON.stringify(data));
                        }
                    } catch (e) {
                        console.error('[Endowus Portfolio Viewer] Error parsing XHR response:', e);
                    }
                });
            }
        }
        
        return originalXHRSend.apply(this, args);
    };

    console.log('[Endowus Portfolio Viewer] API interception initialized');

    // ============================================
    // Storage Management
    // ============================================
    
    /**
     * Load previously intercepted API data from Tampermonkey storage
     */
    function loadStoredData(apiDataState) {
        try {
            const storedPerformance = GM_getValue('api_performance', null);
            const storedInvestible = GM_getValue('api_investible', null);
            const storedSummary = GM_getValue('api_summary', null);
            
            if (storedPerformance) {
                apiDataState.performance = JSON.parse(storedPerformance);
                console.log('[Endowus Portfolio Viewer] Loaded performance data from storage');
            }
            if (storedInvestible) {
                apiDataState.investible = JSON.parse(storedInvestible);
                console.log('[Endowus Portfolio Viewer] Loaded investible data from storage');
            }
            if (storedSummary) {
                apiDataState.summary = JSON.parse(storedSummary);
                console.log('[Endowus Portfolio Viewer] Loaded summary data from storage');
            }
        } catch (e) {
            console.error('[Endowus Portfolio Viewer] Error loading stored data:', e);
        }
    }

    /**
     * Get target percentage for a specific goal
     * @param {string} goalId - Goal ID
     * @returns {number|null} Target percentage or null if not set
     */
    function getGoalTargetPercentage(goalId) {
        try {
            const key = getGoalTargetKey(goalId);
            const value = GM_getValue(key, null);
            return value !== null ? parseFloat(value) : null;
        } catch (e) {
            console.error('[Endowus Portfolio Viewer] Error loading goal target percentage:', e);
            return null;
        }
    }

    /**
     * Set target percentage for a specific goal
     * @param {string} goalId - Goal ID
     * @param {number} percentage - Target percentage (0-100)
     * @returns {number} The actual value stored (after clamping)
     */
    function setGoalTargetPercentage(goalId, percentage) {
        try {
            const key = getGoalTargetKey(goalId);
            const validPercentage = Math.max(0, Math.min(100, parseFloat(percentage)));
            GM_setValue(key, validPercentage);
            console.log(`[Endowus Portfolio Viewer] Saved goal target percentage for ${goalId}: ${validPercentage}%`);
            return validPercentage;
        } catch (e) {
            console.error('[Endowus Portfolio Viewer] Error saving goal target percentage:', e);
            return Math.max(0, Math.min(100, parseFloat(percentage)));
        }
    }

    /**
     * Delete target percentage for a specific goal
     * @param {string} goalId - Goal ID
     */
    function deleteGoalTargetPercentage(goalId) {
        try {
            const key = getGoalTargetKey(goalId);
            GM_deleteValue(key);
            console.log(`[Endowus Portfolio Viewer] Deleted goal target percentage for ${goalId}`);
        } catch (e) {
            console.error('[Endowus Portfolio Viewer] Error deleting goal target percentage:', e);
        }
    }

    /**
     * Get projected investment for a specific goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     * @returns {number} Projected investment amount (0 if not set)
     */
    function getProjectedInvestment(projectedInvestmentsState, bucket, goalType) {
        const key = getProjectedInvestmentKey(bucket, goalType);
        return projectedInvestmentsState[key] || 0;
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
        console.log(`[Endowus Portfolio Viewer] Set projected investment for ${bucket}|${goalType}: ${validAmount}`);
    }

    /**
     * Clear projected investment for a specific goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     */
    function clearProjectedInvestment(projectedInvestmentsState, bucket, goalType) {
        const key = getProjectedInvestmentKey(bucket, goalType);
        delete projectedInvestmentsState[key];
        console.log(`[Endowus Portfolio Viewer] Cleared projected investment for ${bucket}|${goalType}`);
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
        } catch (error) {
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
                // eslint-disable-next-line no-console
                console.log('[Endowus Portfolio Viewer][DEBUG_AUTH] Available GM_cookie entries:', summary);
            })
            .catch(error => {
                // eslint-disable-next-line no-console
                console.error('[Endowus Portfolio Viewer][DEBUG_AUTH] Failed to list GM_cookie entries:', error);
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
        const clientId = localStorage.getItem('client-id') || localStorage.getItem('clientId') || null;

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
                // eslint-disable-next-line no-console
                console.log('[Endowus Portfolio Viewer][DEBUG_AUTH] Skipping header extraction for non-endowus.com URL:', url);
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
            return JSON.parse(stored);
        } catch (error) {
            console.error('[Endowus Portfolio Viewer] Error reading performance cache:', error);
            return null;
        }
    }

    function writePerformanceCache(goalId, responseData) {
        try {
            const key = getPerformanceCacheKey(goalId);
            const payload = {
                fetchedAt: Date.now(),
                response: responseData
            };
            GM_setValue(key, JSON.stringify(payload));
        } catch (error) {
            console.error('[Endowus Portfolio Viewer] Error writing performance cache:', error);
        }
    }

    function getCachedPerformanceResponse(goalId) {
        const cached = readPerformanceCache(goalId);
        if (!cached) {
            return null;
        }
        if (!isCacheFresh(cached.fetchedAt, PERFORMANCE_CACHE_MAX_AGE_MS)) {
            return null;
        }
        return cached.response || null;
    }

    async function fetchPerformanceForGoal(goalId) {
        const url = `${PERFORMANCE_ENDPOINT}?displayCcy=SGD&goalId=${encodeURIComponent(goalId)}`;
        const headers = await buildPerformanceRequestHeaders();
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers
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
                console.warn('[Endowus Portfolio Viewer] Performance fetch failed:', error);
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
        const mergedSeries = mergeTimeSeriesByDate(
            performanceResponses.map(response => response?.timeSeries?.data || [])
        );
        const primaryPerformanceDates = performanceResponses[0]?.performanceDates;
        const windowStart = getWindowStartDate(
            PERFORMANCE_CHART_WINDOW,
            mergedSeries,
            primaryPerformanceDates
        );
        const windowSeries = getTimeSeriesWindow(mergedSeries, windowStart);
        const windowReturns = performanceResponses.length === 1
            ? derivePerformanceWindows(
                performanceResponses[0]?.returnsTable,
                primaryPerformanceDates,
                performanceResponses[0]?.timeSeries?.data || []
            )
            : calculateWeightedWindowReturns(performanceResponses, primaryPerformanceDates);

        const metrics = summarizePerformanceMetrics(performanceResponses, mergedSeries);

        return {
            mergedSeries,
            windowSeries,
            windowReturns,
            metrics
        };
    }

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

    function renderPerformanceChart(chartWrapper, series, dimensionsOverride) {
        if (!chartWrapper) {
            return;
        }
        const dimensions = dimensionsOverride || getChartDimensions(chartWrapper);
        const svg = createLineChartSvg(series, dimensions.width, dimensions.height);
        chartWrapper.innerHTML = '';
        chartWrapper.appendChild(svg);
    }

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
        svg.setAttribute('viewBox', `0 0 ${widthValue} ${heightValue}`);
        svg.setAttribute('class', 'epv-performance-chart');

        if (!Array.isArray(series) || series.length < 2) {
            const emptyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            emptyText.setAttribute('x', `${widthValue / 2}`);
            emptyText.setAttribute('y', `${heightValue / 2}`);
            emptyText.setAttribute('text-anchor', 'middle');
            emptyText.setAttribute('class', 'epv-performance-chart-empty');
            emptyText.textContent = 'No chart data';
            svg.appendChild(emptyText);
            return svg;
        }

        const amounts = series.map(point => Number(point.amount)).filter(val => isFinite(val));
        if (amounts.length < 2) {
            return svg;
        }

        const minValue = Math.min(...amounts);
        const maxValue = Math.max(...amounts);
        const range = maxValue - minValue || 1;
        const padding = getChartPadding(widthValue, heightValue);
        const width = Math.max(1, widthValue - padding * 2);
        const height = Math.max(1, heightValue - padding * 2);

        const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        axisGroup.setAttribute('class', 'epv-performance-chart-axis');

        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', `${padding}`);
        xAxis.setAttribute('x2', `${padding + width}`);
        xAxis.setAttribute('y1', `${padding + height}`);
        xAxis.setAttribute('y2', `${padding + height}`);
        axisGroup.appendChild(xAxis);

        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', `${padding}`);
        yAxis.setAttribute('x2', `${padding}`);
        yAxis.setAttribute('y1', `${padding}`);
        yAxis.setAttribute('y2', `${padding + height}`);
        axisGroup.appendChild(yAxis);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const trendPositive = amounts[amounts.length - 1] >= amounts[0];
        const strokeColor = trendPositive ? '#10b981' : '#ef4444';

        const points = series.map((point, index) => {
            const x = padding + (index / (series.length - 1)) * width;
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
            tick.setAttribute('x1', `${padding - 3}`);
            tick.setAttribute('x2', `${padding}`);
            tick.setAttribute('y1', `${y}`);
            tick.setAttribute('y2', `${y}`);
            tick.setAttribute('class', 'epv-performance-chart-tick');
            axisGroup.appendChild(tick);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', `${padding - 6}`);
            label.setAttribute('y', `${y + 3}`);
            label.setAttribute('text-anchor', 'end');
            label.setAttribute('class', 'epv-performance-chart-label');
            label.textContent = formatMoney(value);
            axisGroup.appendChild(label);

            if (index === 1) {
                const grid = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                grid.setAttribute('x1', `${padding}`);
                grid.setAttribute('x2', `${padding + width}`);
                grid.setAttribute('y1', `${y}`);
                grid.setAttribute('y2', `${y}`);
                grid.setAttribute('class', 'epv-performance-chart-grid');
                axisGroup.appendChild(grid);
            }
        });

        const formatDateLabel = dateString => {
            const date = new Date(dateString);
            if (!isFinite(date.getTime())) {
                return dateString;
            }
            return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
        };

        const xLabels = [
            { value: series[0].date, anchor: 'start', x: padding },
            { value: series[series.length - 1].date, anchor: 'end', x: padding + width }
        ];

        xLabels.forEach(labelInfo => {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', `${labelInfo.x}`);
            const labelY = Math.min(heightValue - 6, padding + height + 12);
            label.setAttribute('y', `${labelY}`);
            label.setAttribute('text-anchor', labelInfo.anchor);
            label.setAttribute('class', 'epv-performance-chart-label');
            label.textContent = formatDateLabel(labelInfo.value);
            axisGroup.appendChild(label);
        });

        const axisTitleX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        axisTitleX.setAttribute('x', `${padding + width / 2}`);
        axisTitleX.setAttribute('y', `${Math.min(heightValue - 2, padding + height + 20)}`);
        axisTitleX.setAttribute('text-anchor', 'middle');
        axisTitleX.setAttribute('class', 'epv-performance-chart-title');
        axisTitleX.textContent = 'Date';

        const axisTitleY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        axisTitleY.setAttribute('x', `${Math.max(4, padding - 10)}`);
        axisTitleY.setAttribute('y', `${Math.max(12, padding - 6)}`);
        axisTitleY.setAttribute('text-anchor', 'start');
        axisTitleY.setAttribute('class', 'epv-performance-chart-title');
        axisTitleY.textContent = 'Value (SGD)';

        const highlightIndices = [0, Math.floor(series.length / 2), series.length - 1];
        const pointGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pointGroup.setAttribute('class', 'epv-performance-chart-points');
        highlightIndices.forEach(index => {
            const point = series[index];
            if (!point) {
                return;
            }
            const x = padding + (index / (series.length - 1)) * width;
            const y = padding + height - ((point.amount - minValue) / range) * height;
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', `${x}`);
            circle.setAttribute('cy', `${y}`);
            circle.setAttribute('r', '2.5');
            circle.setAttribute('class', 'epv-performance-chart-point');
            pointGroup.appendChild(circle);
        });

        svg.appendChild(axisGroup);
        svg.appendChild(axisTitleX);
        svg.appendChild(axisTitleY);
        svg.appendChild(path);
        svg.appendChild(pointGroup);
        return svg;
    }

    function buildPerformanceWindowGrid(windowReturns) {
        const grid = document.createElement('div');
        grid.className = 'epv-performance-window-grid';

        const items = [
            { label: '1M', value: windowReturns?.oneMonth },
            { label: '6M', value: windowReturns?.sixMonth },
            { label: 'YTD', value: windowReturns?.ytd },
            { label: '1Y', value: windowReturns?.oneYear },
            { label: '3Y', value: windowReturns?.threeYear }
        ];

        items.forEach(item => {
            const tile = document.createElement('div');
            tile.className = 'epv-performance-window-tile';

            const label = document.createElement('div');
            label.className = 'epv-performance-window-label';
            label.textContent = item.label;

            const value = document.createElement('div');
            value.className = 'epv-performance-window-value';
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

    function buildPerformanceMetricsTable(metrics) {
        const table = document.createElement('table');
        table.className = 'epv-performance-metrics-table';

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
            labelCell.className = 'epv-performance-metric-label';
            labelCell.textContent = row.label;

            const valueCell = document.createElement('td');
            valueCell.className = 'epv-performance-metric-value';
            valueCell.textContent = row.value;

            tr.appendChild(labelCell);
            tr.appendChild(valueCell);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        return table;
    }

    function renderGoalTypePerformance(typeSection, goalIds) {
        const performanceContainer = document.createElement('div');
        performanceContainer.className = 'epv-performance-container';

        const loading = document.createElement('div');
        loading.className = 'epv-performance-loading';
        loading.textContent = 'Loading performance data...';
        performanceContainer.appendChild(loading);

        typeSection.appendChild(performanceContainer);

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
                emptyState.className = 'epv-performance-loading';
                emptyState.textContent = 'Performance data unavailable.';
                performanceContainer.appendChild(emptyState);
                return;
            }

            const windowGrid = buildPerformanceWindowGrid(summary.windowReturns);
            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'epv-performance-chart-wrapper';
            const metricsTable = buildPerformanceMetricsTable(summary.metrics);

            const detailRow = document.createElement('div');
            detailRow.className = 'epv-performance-detail-row';
            detailRow.appendChild(chartWrapper);
            detailRow.appendChild(metricsTable);

            performanceContainer.appendChild(windowGrid);
            performanceContainer.appendChild(detailRow);

            requestAnimationFrame(() => {
                if (!chartWrapper.isConnected) {
                    return;
                }
                const initialWidth = chartWrapper.getBoundingClientRect().width;
                chartWrapper.style.height = `${getChartHeightForWidth(initialWidth)}px`;
                initializePerformanceChart(chartWrapper, summary.windowSeries);
            });
        });
    }
    
    function renderSummaryView(contentDiv, mergedInvestmentDataState) {
        contentDiv.innerHTML = '';

        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'epv-summary-container';

        Object.keys(mergedInvestmentDataState).sort().forEach(bucket => {
            const bucketObj = mergedInvestmentDataState[bucket];
            if (!bucketObj) return;

            let bucketTotalReturn = 0;
            const goalTypes = Object.keys(bucketObj).filter(k => k !== 'total');
            goalTypes.forEach(goalType => {
                bucketTotalReturn += bucketObj[goalType].totalCumulativeReturn || 0;
            });

            const bucketCard = document.createElement('div');
            bucketCard.className = 'epv-bucket-card';

            const bucketHeader = document.createElement('div');
            bucketHeader.className = 'epv-bucket-header';
            
            const bucketTitle = document.createElement('h2');
            bucketTitle.className = 'epv-bucket-title';
            bucketTitle.textContent = bucket;
            
            const bucketStats = document.createElement('div');
            bucketStats.className = 'epv-bucket-stats';
            
            const totalDisplay = formatMoney(bucketObj.total);
            const returnDisplay = formatMoney(bucketTotalReturn);
            const growthDisplay = formatGrowthPercent(bucketTotalReturn, bucketObj.total);
            
            bucketStats.innerHTML = `
                <div class="epv-stat">
                    <span class="epv-stat-label">Total</span>
                    <span class="epv-stat-value">${totalDisplay}</span>
                </div>
                <div class="epv-stat">
                    <span class="epv-stat-label">Return</span>
                    <span class="epv-stat-value ${bucketTotalReturn >= 0 ? 'positive' : 'negative'}">${returnDisplay}</span>
                </div>
                <div class="epv-stat">
                    <span class="epv-stat-label">Growth</span>
                    <span class="epv-stat-value ${bucketTotalReturn >= 0 ? 'positive' : 'negative'}">${growthDisplay}</span>
                </div>
            `;
            
            bucketHeader.appendChild(bucketTitle);
            bucketHeader.appendChild(bucketStats);
            bucketCard.appendChild(bucketHeader);

            const orderedTypes = sortGoalTypes(goalTypes);
            orderedTypes.forEach(goalType => {
                const group = bucketObj[goalType];
                if (!group) return;
                
                const typeTotalDisplay = formatMoney(group.totalInvestmentAmount);
                const typeReturnDisplay = formatMoney(group.totalCumulativeReturn);
                const typeGrowthDisplay = formatGrowthPercent(group.totalCumulativeReturn, group.totalInvestmentAmount);
                
                const typeRow = document.createElement('div');
                typeRow.className = 'epv-goal-type-row';
                typeRow.innerHTML = `
                    <span class="epv-goal-type-name">${getDisplayGoalType(goalType)}</span>
                    <span class="epv-goal-type-stat">Total: ${typeTotalDisplay}</span>
                    <span class="epv-goal-type-stat">Return: ${typeReturnDisplay}</span>
                    <span class="epv-goal-type-stat">Growth: ${typeGrowthDisplay}</span>
                `;
                bucketCard.appendChild(typeRow);
            });

            summaryContainer.appendChild(bucketCard);
        });

        contentDiv.appendChild(summaryContainer);
    }

    function renderBucketView(contentDiv, bucket, mergedInvestmentDataState, projectedInvestmentsState) {
        contentDiv.innerHTML = '';
        const bucketObj = mergedInvestmentDataState[bucket];
        if (!bucketObj) return;

        let bucketTotalReturn = 0;
        const goalTypes = Object.keys(bucketObj).filter(k => k !== 'total');
        goalTypes.forEach(goalType => {
            bucketTotalReturn += bucketObj[goalType].totalCumulativeReturn || 0;
        });

        const bucketHeader = document.createElement('div');
        bucketHeader.className = 'epv-detail-header';
        
        const bucketTitle = document.createElement('h2');
        bucketTitle.className = 'epv-detail-title';
        bucketTitle.textContent = bucket;
        
        const bucketStats = document.createElement('div');
        bucketStats.className = 'epv-detail-stats';
        
        const totalDisplay = formatMoney(bucketObj.total);
        const returnDisplay = formatMoney(bucketTotalReturn);
        const growthDisplay = formatGrowthPercent(bucketTotalReturn, bucketObj.total);
        
        bucketStats.innerHTML = `
            <div class="epv-stat-item">
                <span class="epv-stat-label">Total Investment</span>
                <span class="epv-stat-value">${totalDisplay}</span>
            </div>
            <div class="epv-stat-item">
                <span class="epv-stat-label">Total Return</span>
                <span class="epv-stat-value ${bucketTotalReturn >= 0 ? 'positive' : 'negative'}">${returnDisplay}</span>
            </div>
            <div class="epv-stat-item">
                <span class="epv-stat-label">Growth</span>
                <span class="epv-stat-value ${bucketTotalReturn >= 0 ? 'positive' : 'negative'}">${growthDisplay}</span>
            </div>
        `;
        
        bucketHeader.appendChild(bucketTitle);
        bucketHeader.appendChild(bucketStats);
        contentDiv.appendChild(bucketHeader);

        const orderedTypes = sortGoalTypes(goalTypes);
        orderedTypes.forEach(goalType => {
            const group = bucketObj[goalType];
            if (!group) return;

            const typeReturn = group.totalCumulativeReturn || 0;
            const typeGrowth = formatGrowthPercent(typeReturn, group.totalInvestmentAmount);
            
            const typeSection = document.createElement('div');
            typeSection.className = 'epv-type-section';
            typeSection.dataset.bucket = bucket;
            typeSection.dataset.goalType = goalType;
            
            const typeHeader = document.createElement('div');
            typeHeader.className = 'epv-type-header';
            
            // Get current projected investment for this goal type
            const currentProjectedInvestment = getProjectedInvestment(projectedInvestmentsState, bucket, goalType);
            
            typeHeader.innerHTML = `
                <h3>${getDisplayGoalType(goalType)}</h3>
                <div class="epv-type-summary">
                    <span>Total: ${formatMoney(group.totalInvestmentAmount)}</span>
                    <span>Return: ${formatMoney(typeReturn)}</span>
                    <span>Growth: ${typeGrowth}</span>
                </div>
            `;
            
            typeSection.appendChild(typeHeader);

            renderGoalTypePerformance(
                typeSection,
                group.goals.map(goal => goal.goalId).filter(Boolean)
            );

            // Add projected investment input section as sibling after performance container
            const projectedInputContainer = document.createElement('div');
            projectedInputContainer.className = 'epv-projected-input-container';
            projectedInputContainer.innerHTML = `
                <label class="epv-projected-label">
                    <span class="epv-projected-icon">💡</span>
                    <span>Add Projected Investment (simulation only):</span>
                </label>
                <input 
                    type="number" 
                    class="epv-projected-input" 
                    step="100"
                    value="${currentProjectedInvestment > 0 ? currentProjectedInvestment : ''}"
                    placeholder="Enter amount"
                    data-bucket="${bucket}"
                    data-goal-type="${goalType}"
                />
            `;
            
            typeSection.appendChild(projectedInputContainer);
            
            // Add event listener for projected investment input
            const projectedInput = projectedInputContainer.querySelector('.epv-projected-input');
            projectedInput.addEventListener('input', function() {
                handleProjectedInvestmentChange(
                    this,
                    bucket,
                    goalType,
                    typeSection,
                    mergedInvestmentDataState,
                    projectedInvestmentsState
                );
            });

            const table = document.createElement('table');
            table.className = 'epv-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Goal Name</th>
                        <th>Investment Amount</th>
                        <th>% of Goal Type</th>
                        <th>Target %</th>
                        <th>Diff</th>
                        <th>Cumulative Return</th>
                        <th>Return %</th>
                    </tr>
                </thead>
            `;

            const tbody = document.createElement('tbody');
            
            // Get projected investment for this goal type
            const projectedAmount = getProjectedInvestment(projectedInvestmentsState, bucket, goalType);
            // Calculate adjusted total (current + projected)
            const adjustedTypeTotal = group.totalInvestmentAmount + projectedAmount;
            
            group.goals.forEach(item => {
                const percentOfType = group.totalInvestmentAmount > 0
                    ? ((item.totalInvestmentAmount || 0) / group.totalInvestmentAmount * 100).toFixed(2)
                    : '0.00';
                
                // Get target percentage for this goal
                const targetPercent = getGoalTargetPercentage(item.goalId);
                const targetValue = targetPercent !== null ? targetPercent.toFixed(2) : '';
                
                // Calculate difference in dollar amount
                // Key change: Use adjusted total (including projected investment) for target calculation
                let diffDisplay = '-';
                let diffClass = '';
                if (targetPercent !== null && adjustedTypeTotal > 0) {
                    // Calculate target amount: (target% of goal type) * (adjusted total including projected)
                    const targetAmount = (targetPercent / 100) * adjustedTypeTotal;
                    // Diff = current amount - target amount
                    const diffAmount = (item.totalInvestmentAmount || 0) - targetAmount;
                    diffDisplay = formatMoney(diffAmount);
                    
                    // Color is red if absolute diff is more than 5% of the goal's investment amount
                    const threshold = (item.totalInvestmentAmount || 0) * 0.05;
                    diffClass = Math.abs(diffAmount) > threshold ? 'negative' : 'positive';
                }
                    
                const returnPercent = item.simpleRateOfReturnPercent !== null && item.simpleRateOfReturnPercent !== undefined 
                    ? (item.simpleRateOfReturnPercent * 100).toFixed(2) + '%' 
                    : '-';
                
                const returnValue = item.totalCumulativeReturn || 0;
                const returnClass = returnValue >= 0 ? 'positive' : 'negative';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="epv-goal-name">${item.goalName}</td>
                    <td>${formatMoney(item.totalInvestmentAmount)}</td>
                    <td>${percentOfType}%</td>
                    <td class="epv-target-cell">
                        <input 
                            type="number" 
                            class="epv-target-input" 
                            min="0" 
                            max="100" 
                            step="0.01"
                            value="${targetValue}"
                            placeholder="Set target"
                            data-goal-id="${item.goalId}"
                        />
                    </td>
                    <td class="epv-diff-cell ${diffClass}">${diffDisplay}</td>
                    <td class="${returnClass}">${formatMoney(item.totalCumulativeReturn)}</td>
                    <td class="${returnClass}">${returnPercent}</td>
                `;
                
                // Add event listener to the target input
                const input = tr.querySelector('.epv-target-input');
                input.addEventListener('input', function() {
                    handleGoalTargetChange(
                        this,
                        item.goalId,
                        item.totalInvestmentAmount,
                        group.totalInvestmentAmount,
                        bucket,
                        goalType,
                        projectedInvestmentsState
                    );
                });
                
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            typeSection.appendChild(table);
            contentDiv.appendChild(typeSection);
        });
    }

    /**
     * Handle changes to goal target percentage input
     * @param {HTMLInputElement} input - Input element
     * @param {string} goalId - Goal ID
     * @param {number} currentAmount - Current investment amount for this goal
     * @param {number} totalTypeAmount - Total investment amount for the goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     */
    function handleGoalTargetChange(
        input,
        goalId,
        currentAmount,
        totalTypeAmount,
        bucket,
        goalType,
        projectedInvestmentsState
    ) {
        const value = input.value;
        const row = input.closest('tr');
        const diffCell = row.querySelector('.epv-diff-cell');
        
        if (value === '') {
            // Clear the target if input is empty
            deleteGoalTargetPercentage(goalId);
            diffCell.textContent = '-';
            diffCell.className = 'epv-diff-cell';
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
        const savedValue = setGoalTargetPercentage(goalId, targetPercent);
        
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
        const projectedAmount = getProjectedInvestment(projectedInvestmentsState, bucket, goalType);
        const adjustedTypeTotal = totalTypeAmount + projectedAmount;
        
        // Update difference display in dollar amount
        if (adjustedTypeTotal > 0) {
            // Calculate target amount: (target% of goal type) * (adjusted total including projected)
            const targetAmount = (savedValue / 100) * adjustedTypeTotal;
            // Diff = current amount - target amount
            const diffAmount = currentAmount - targetAmount;
            const diffDisplay = formatMoney(diffAmount);
            
            // Color is red if absolute diff is more than 5% of the goal's investment amount
            const threshold = currentAmount * 0.05;
            const diffClass = Math.abs(diffAmount) > threshold ? 'negative' : 'positive';
            
            diffCell.textContent = diffDisplay;
            diffCell.className = `epv-diff-cell ${diffClass}`;
        } else {
            diffCell.textContent = '-';
            diffCell.className = 'epv-diff-cell';
        }
    }

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
        const tbody = typeSection.querySelector('tbody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                const targetInput = row.querySelector('.epv-target-input');
                const diffCell = row.querySelector('.epv-diff-cell');
                
                if (targetInput && diffCell) {
                    const goalId = targetInput.dataset.goalId;
                    const targetPercent = getGoalTargetPercentage(goalId);
                    
                    if (targetPercent !== null) {
                        // Get the goal's investment amount from the row
                        const cells = row.querySelectorAll('td');
                        const investmentText = cells[1]?.textContent || '$0';
                        const currentAmount = parseFloat(investmentText.replace(/[$,]/g, '')) || 0;
                        
                        // Get total type amount from bucketObj
                        const bucketObj = mergedInvestmentDataState[bucket];
                        if (bucketObj && bucketObj[goalType]) {
                            const totalTypeAmount = bucketObj[goalType].totalInvestmentAmount;
                            const projectedAmount = getProjectedInvestment(projectedInvestmentsState, bucket, goalType);
                            const adjustedTypeTotal = totalTypeAmount + projectedAmount;
                            
                            if (adjustedTypeTotal > 0) {
                                // Calculate target amount with adjusted total
                                const targetAmount = (targetPercent / 100) * adjustedTypeTotal;
                                const diffAmount = currentAmount - targetAmount;
                                const diffDisplay = formatMoney(diffAmount);
                                
                                // Color is red if absolute diff is more than 5% of the goal's investment amount
                                const threshold = currentAmount * 0.05;
                                const diffClass = Math.abs(diffAmount) > threshold ? 'negative' : 'positive';
                                
                                diffCell.textContent = diffDisplay;
                                diffCell.className = `epv-diff-cell ${diffClass}`;
                            } else {
                                diffCell.textContent = '-';
                                diffCell.className = 'epv-diff-cell';
                            }
                        }
                    }
                }
            });
        }
    }

    // ============================================
    // UI: Styles
    // ============================================
    
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Modern Portfolio Viewer Styles */
            
            .epv-trigger-btn {
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
            
            .epv-trigger-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .epv-trigger-btn:active {
                transform: translateY(0);
            }
            
            .epv-overlay {
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
                animation: epv-fadeIn 0.2s ease;
            }
            
            @keyframes epv-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .epv-container {
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
                animation: epv-slideUp 0.3s ease;
            }
            
            @keyframes epv-slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .epv-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                border-bottom: 1px solid #e5e7eb;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px 20px 0 0;
            }
            
            .epv-header h1 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-close-btn {
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
            
            .epv-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }
            
            .epv-controls {
                padding: 12px 24px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .epv-select-label {
                font-weight: 600;
                color: #1f2937;
                font-size: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-select {
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
            
            .epv-select:hover {
                border-color: #667eea;
            }
            
            .epv-select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .epv-content {
                overflow-y: auto;
                padding: 16px 24px;
                flex: 1;
            }
            
            /* Summary View Styles */
            
            .epv-summary-container {
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            
            .epv-bucket-card {
                background: #ffffff;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 16px;
                transition: all 0.3s ease;
            }
            
            .epv-bucket-card:hover {
                border-color: #667eea;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                transform: translateY(-2px);
            }
            
            .epv-bucket-header {
                margin-bottom: 12px;
            }
            
            .epv-bucket-title {
                font-size: 19px;
                font-weight: 700;
                color: #111827;
                margin: 0 0 10px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-bucket-stats {
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
            }
            
            .epv-stat {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .epv-stat-label {
                font-size: 12px;
                font-weight: 600;
                color: #4b5563;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .epv-stat-value {
                font-size: 18px;
                font-weight: 700;
                color: #111827;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-stat-value.positive {
                color: #059669;
            }
            
            .epv-stat-value.negative {
                color: #dc2626;
            }
            
            .epv-goal-type-row {
                display: flex;
                gap: 16px;
                padding: 10px 12px;
                background: #f9fafb;
                border-radius: 8px;
                margin-bottom: 8px;
                align-items: center;
            }
            
            .epv-goal-type-name {
                font-weight: 700;
                color: #1f2937;
                min-width: 120px;
                font-size: 14px;
            }
            
            .epv-goal-type-stat {
                font-size: 13px;
                color: #4b5563;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            /* Detail View Styles */
            
            .epv-detail-header {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e5e7eb;
            }
            
            .epv-detail-title {
                font-size: 22px;
                font-weight: 700;
                color: #111827;
                margin: 0 0 12px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-detail-stats {
                display: flex;
                gap: 28px;
            }
            
            .epv-stat-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .epv-type-section {
                margin-bottom: 24px;
            }
            
            .epv-type-header {
                margin-bottom: 12px;
            }
            
            .epv-type-header h3 {
                font-size: 17px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 8px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-type-summary {
                display: flex;
                gap: 20px;
                font-size: 14px;
                color: #4b5563;
                font-weight: 500;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            /* Table Styles */
            
            .epv-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-table thead tr {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .epv-table th {
                padding: 10px 14px;
                text-align: left;
                font-weight: 700;
                font-size: 13px;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .epv-table td {
                padding: 10px 14px;
                text-align: right;
                font-size: 14px;
                color: #1f2937;
                border-top: 1px solid #e5e7eb;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-table tbody tr {
                transition: background-color 0.2s ease;
            }
            
            .epv-table tbody tr:hover {
                background-color: #f3f4f6;
            }
            
            .epv-table .epv-goal-name {
                text-align: left;
                font-weight: 600;
                color: #111827;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-table .positive {
                color: #059669;
                font-weight: 700;
            }
            
            .epv-table .negative {
                color: #dc2626;
                font-weight: 700;
            }
            
            /* Target Input Styles */
            
            .epv-target-cell {
                padding: 6px 8px !important;
            }
            
            .epv-target-input {
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
            
            .epv-target-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .epv-target-input:hover {
                border-color: #667eea;
            }
            
            .epv-target-input::placeholder {
                color: #9ca3af;
                font-weight: 400;
                font-size: 12px;
            }
            
            /* Remove spinner arrows in Chrome, Safari, Edge, Opera */
            .epv-target-input::-webkit-outer-spin-button,
            .epv-target-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            
            /* Remove spinner arrows in Firefox */
            .epv-target-input[type=number] {
                -moz-appearance: textfield;
            }
            
            .epv-diff-cell {
                font-weight: 700;
                font-size: 14px;
                text-align: center;
            }
            
            .epv-diff-cell.positive {
                color: #059669;
            }
            
            .epv-diff-cell.negative {
                color: #dc2626;
            }
            
            /* Projected Investment Input Styles */
            
            .epv-projected-input-container {
                margin-top: 12px;
                padding: 12px;
                background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
                border: 2px dashed #0284c7;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .epv-projected-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                font-weight: 600;
                color: #0c4a6e;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                white-space: nowrap;
            }
            
            .epv-projected-icon {
                font-size: 16px;
            }
            
            .epv-projected-input {
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
            
            .epv-projected-input:focus {
                outline: none;
                border-color: #0369a1;
                box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
            }
            
            .epv-projected-input:hover {
                border-color: #0369a1;
            }
            
            .epv-projected-input::placeholder {
                color: #075985;
                font-weight: 400;
                font-size: 13px;
            }
            
            /* Remove spinner arrows for projected input */
            .epv-projected-input::-webkit-outer-spin-button,
            .epv-projected-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            
            .epv-projected-input[type=number] {
                -moz-appearance: textfield;
            }

            /* Performance Chart + Metrics */

            .epv-performance-container {
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

            .epv-performance-detail-row {
                display: flex;
                gap: 20px;
                align-items: stretch;
            }

            .epv-performance-loading {
                font-size: 14px;
                font-weight: 600;
                color: #64748b;
                width: 100%;
                text-align: center;
                padding: 12px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .epv-performance-chart-wrapper {
                flex: 1;
                min-width: 240px;
                min-height: 90px;
                height: auto;
            }

            .epv-performance-chart {
                width: 100%;
                height: 100%;
                display: block;
            }

            .epv-performance-chart-axis line {
                stroke: #cbd5f5;
                stroke-width: 1;
            }

            .epv-performance-chart-grid {
                stroke: #e2e8f0;
                stroke-width: 1;
                stroke-dasharray: 2 2;
            }

            .epv-performance-chart-tick {
                stroke: #94a3b8;
                stroke-width: 1;
            }

            .epv-performance-chart-label {
                font-size: 9px;
                fill: #64748b;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .epv-performance-chart-title {
                font-size: 9px;
                fill: #475569;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .epv-performance-chart-point {
                fill: #1f2937;
            }

            .epv-performance-chart-baseline {
                stroke: #e2e8f0;
                stroke-width: 1;
            }

            .epv-performance-chart-empty {
                font-size: 12px;
                fill: #94a3b8;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .epv-performance-window-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 8px;
                width: 100%;
            }

            .epv-performance-window-tile {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 6px 8px;
                text-align: center;
            }

            .epv-performance-window-label {
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .epv-performance-window-value {
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
            }

            .epv-performance-window-value.positive {
                color: #059669;
            }

            .epv-performance-window-value.negative {
                color: #dc2626;
            }

            .epv-performance-metrics-table {
                width: 100%;
                max-width: 320px;
                border-collapse: collapse;
                font-size: 13px;
            }

            .epv-performance-detail-row .epv-performance-chart-wrapper {
                flex: 1;
                min-width: 240px;
            }

            .epv-performance-metrics-table tr {
                border-bottom: 1px solid #e5e7eb;
            }

            .epv-performance-metrics-table tr:last-child {
                border-bottom: none;
            }

            .epv-performance-metric-label {
                text-align: left;
                color: #475569;
                font-weight: 600;
                padding: 6px 4px;
            }

            .epv-performance-metric-value {
                text-align: right;
                color: #0f172a;
                font-weight: 700;
                padding: 6px 4px;
            }
            
            /* Scrollbar Styles */
            
            .epv-content::-webkit-scrollbar {
                width: 8px;
            }
            
            .epv-content::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            
            .epv-content::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }
            
            .epv-content::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // Controller
    // ============================================

    function showOverlay() {
        let old = document.getElementById('epv-overlay');
        if (old) old.remove();

        const data = buildMergedInvestmentData(
            apiData.performance,
            apiData.investible,
            apiData.summary
        );
        if (!data) {
            console.log('[Endowus Portfolio Viewer] Not all API data available yet');
            alert('Please wait for portfolio data to load, then try again.');
            return;
        }
        console.log('[Endowus Portfolio Viewer] Data merged successfully');

        const overlay = document.createElement('div');
        overlay.id = 'epv-overlay';
        overlay.className = 'epv-overlay';

        const container = document.createElement('div');
        container.className = 'epv-container';

        const header = document.createElement('div');
        header.className = 'epv-header';
        
        const title = document.createElement('h1');
        title.textContent = 'Portfolio Viewer';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'epv-close-btn';
        closeBtn.innerHTML = '✕';
        closeBtn.onclick = () => overlay.remove();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        container.appendChild(header);

        const controls = document.createElement('div');
        controls.className = 'epv-controls';
        
        const selectLabel = document.createElement('label');
        selectLabel.textContent = 'View:';
        selectLabel.className = 'epv-select-label';
        
        const select = document.createElement('select');
        select.className = 'epv-select';
        
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
        contentDiv.className = 'epv-content';
        container.appendChild(contentDiv);

        renderSummaryView(contentDiv, data);

        select.onchange = function() {
            const val = select.value;
            if (val === 'SUMMARY') {
                renderSummaryView(contentDiv, data);
            } else {
                renderBucketView(contentDiv, val, data, projectedInvestments);
            }
        };

        overlay.appendChild(container);
        
        // Close overlay when clicking outside the container
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
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
        return window.location.href === 'https://app.sg.endowus.com/dashboard';
    }
    
    function createButton() {
        if (!portfolioButton) {
            portfolioButton = document.createElement('button');
            portfolioButton.className = 'epv-trigger-btn';
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
            console.log('[Endowus Portfolio Viewer] Button shown on dashboard');
        } else if (!shouldShow && buttonExists) {
            // Hide button
            portfolioButton.remove();
            console.log('[Endowus Portfolio Viewer] Button hidden (not on dashboard)');
        }
    }
    
    function handleUrlChange() {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('[Endowus Portfolio Viewer] URL changed to:', currentUrl);
            updateButtonVisibility();
        }
    }
    
    function startUrlMonitoring() {
        // Check immediately
        updateButtonVisibility();
        
        // Debounce function to limit how often handleUrlChange can be called
        let urlCheckTimeout = null;
        const debouncedUrlCheck = () => {
            if (urlCheckTimeout) {
                clearTimeout(urlCheckTimeout);
            }
            urlCheckTimeout = setTimeout(handleUrlChange, 100);
        };
        
        // Use MutationObserver to detect URL changes in the SPA
        // This serves as a fallback for navigation patterns not caught by History API
        const observer = new MutationObserver(debouncedUrlCheck);
        
        // Observe changes to the entire document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Listen to popstate event for browser back/forward navigation
        window.addEventListener('popstate', handleUrlChange);
        
        // Override pushState to detect programmatic navigation
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            handleUrlChange();
        };
        
        // Override replaceState to detect programmatic navigation
        const originalReplaceState = history.replaceState;
        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            handleUrlChange();
        };
        
        console.log('[Endowus Portfolio Viewer] URL monitoring started with MutationObserver');
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
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
        module.exports = {
            getGoalTargetKey,
            getProjectedInvestmentKey,
            getDisplayGoalType,
            sortGoalTypes,
            formatMoney,
            formatGrowthPercent,
            buildMergedInvestmentData,
            getPerformanceCacheKey,
            isCacheFresh,
            formatPercentage,
            getWindowStartDate,
            calculateReturnFromTimeSeries,
            mapReturnsTableToWindowReturns,
            calculateWeightedWindowReturns,
            summarizePerformanceMetrics,
            derivePerformanceWindows
        };
    }

})();
