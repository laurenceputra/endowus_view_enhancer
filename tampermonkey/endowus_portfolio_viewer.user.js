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
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js
// @downloadURL  https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // Data Storage
    // ============================================
    const apiData = {
        performance: null,
        investible: null,
        summary: null
    };

    let mergedInvestmentData = null;
    
    // Non-persistent storage for projected investments (resets on reload)
    // Key format: "bucketName|goalType" -> projected amount
    const projectedInvestments = {};

    // ============================================
    // API Interception via Monkey Patching
    // ============================================
    
    // Store original functions
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // Fetch interception
    window.fetch = async function(...args) {
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
        return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        const url = this._url;
        
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
    function loadStoredData() {
        try {
            const storedPerformance = GM_getValue('api_performance', null);
            const storedInvestible = GM_getValue('api_investible', null);
            const storedSummary = GM_getValue('api_summary', null);
            
            if (storedPerformance) {
                apiData.performance = JSON.parse(storedPerformance);
                console.log('[Endowus Portfolio Viewer] Loaded performance data from storage');
            }
            if (storedInvestible) {
                apiData.investible = JSON.parse(storedInvestible);
                console.log('[Endowus Portfolio Viewer] Loaded investible data from storage');
            }
            if (storedSummary) {
                apiData.summary = JSON.parse(storedSummary);
                console.log('[Endowus Portfolio Viewer] Loaded summary data from storage');
            }
        } catch (e) {
            console.error('[Endowus Portfolio Viewer] Error loading stored data:', e);
        }
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
     * Get storage key for a goal type's projected investment
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     * @returns {string} Storage key
     */
    function getProjectedInvestmentKey(bucket, goalType) {
        return `${bucket}|${goalType}`;
    }

    /**
     * Get projected investment for a specific goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     * @returns {number} Projected investment amount (0 if not set)
     */
    function getProjectedInvestment(bucket, goalType) {
        const key = getProjectedInvestmentKey(bucket, goalType);
        return projectedInvestments[key] || 0;
    }

    /**
     * Set projected investment for a specific goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     * @param {number} amount - Projected investment amount
     */
    function setProjectedInvestment(bucket, goalType, amount) {
        const key = getProjectedInvestmentKey(bucket, goalType);
        const validAmount = Math.max(0, parseFloat(amount) || 0);
        projectedInvestments[key] = validAmount;
        console.log(`[Endowus Portfolio Viewer] Set projected investment for ${bucket}|${goalType}: ${validAmount}`);
    }

    /**
     * Clear projected investment for a specific goal type
     * @param {string} bucket - Bucket name
     * @param {string} goalType - Goal type
     */
    function clearProjectedInvestment(bucket, goalType) {
        const key = getProjectedInvestmentKey(bucket, goalType);
        delete projectedInvestments[key];
        console.log(`[Endowus Portfolio Viewer] Cleared projected investment for ${bucket}|${goalType}`);
    }

    // ============================================
    // Data Processing Logic
    // ============================================
    
    /**
     * Merges data from all three API endpoints into a structured bucket map
     * @returns {Object|null} Bucket map with aggregated data, or null if API data incomplete
     * Structure: { bucketName: { total: number, goalType: { totalInvestmentAmount, totalCumulativeReturn, goals: [] } } }
     */
    function mergeAPIResponses() {
        if (!apiData.performance || !apiData.investible || !apiData.summary) {
            console.log('[Endowus Portfolio Viewer] Not all API data available yet');
            return null;
        }

        // Validate that all data sources are arrays
        if (!Array.isArray(apiData.performance) || !Array.isArray(apiData.investible) || !Array.isArray(apiData.summary)) {
            console.log('[Endowus Portfolio Viewer] API data is not in expected array format');
            return null;
        }

        const investibleMap = {};
        apiData.investible.forEach(item => investibleMap[item.goalId] = item);

        const summaryMap = {};
        apiData.summary.forEach(item => summaryMap[item.goalId] = item);

        const bucketMap = {};

        apiData.performance.forEach(perf => {
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

        mergedInvestmentData = bucketMap;
        console.log('[Endowus Portfolio Viewer] Data merged successfully');
        return bucketMap;
    }

    // ============================================
    // UI Helper Functions
    // ============================================
    
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

    // ============================================
    // UI Rendering Functions
    // ============================================
    
    function renderSummaryView(contentDiv) {
        contentDiv.innerHTML = '';

        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'epv-summary-container';

        Object.keys(mergedInvestmentData).sort().forEach(bucket => {
            const bucketObj = mergedInvestmentData[bucket];
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

    function renderBucketView(contentDiv, bucket) {
        contentDiv.innerHTML = '';
        const bucketObj = mergedInvestmentData[bucket];
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
            const currentProjectedInvestment = getProjectedInvestment(bucket, goalType);
            
            typeHeader.innerHTML = `
                <h3>${getDisplayGoalType(goalType)}</h3>
                <div class="epv-type-summary">
                    <span>Total: ${formatMoney(group.totalInvestmentAmount)}</span>
                    <span>Return: ${formatMoney(typeReturn)}</span>
                    <span>Growth: ${typeGrowth}</span>
                </div>
            `;
            
            // Add projected investment input
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
                    min="0" 
                    step="100"
                    value="${currentProjectedInvestment > 0 ? currentProjectedInvestment : ''}"
                    placeholder="Enter amount"
                    data-bucket="${bucket}"
                    data-goal-type="${goalType}"
                />
            `;
            
            typeHeader.appendChild(projectedInputContainer);
            
            // Add event listener for projected investment input
            const projectedInput = projectedInputContainer.querySelector('.epv-projected-input');
            projectedInput.addEventListener('input', function() {
                handleProjectedInvestmentChange(this, bucket, goalType, typeSection);
            });
            
            typeSection.appendChild(typeHeader);

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
            const projectedAmount = getProjectedInvestment(bucket, goalType);
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
                    handleGoalTargetChange(this, item.goalId, item.totalInvestmentAmount, group.totalInvestmentAmount, bucket, goalType);
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
    function handleGoalTargetChange(input, goalId, currentAmount, totalTypeAmount, bucket, goalType) {
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
        const projectedAmount = getProjectedInvestment(bucket, goalType);
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
    function handleProjectedInvestmentChange(input, bucket, goalType, typeSection) {
        const value = input.value;
        
        if (value === '' || value === '0') {
            // Clear the projected investment if input is empty or zero
            clearProjectedInvestment(bucket, goalType);
        } else {
            const amount = parseFloat(value);
            
            // Validate input
            if (isNaN(amount) || amount < 0) {
                // Invalid number - show error feedback
                input.style.borderColor = '#dc2626';
                setTimeout(() => {
                    input.style.borderColor = '';
                }, 1000);
                return;
            }
            
            // Save the projected investment
            setProjectedInvestment(bucket, goalType, amount);
            
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
                        const bucketObj = mergedInvestmentData[bucket];
                        if (bucketObj && bucketObj[goalType]) {
                            const totalTypeAmount = bucketObj[goalType].totalInvestmentAmount;
                            const projectedAmount = getProjectedInvestment(bucket, goalType);
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

    function showOverlay() {
        let old = document.getElementById('epv-overlay');
        if (old) old.remove();

        const data = mergeAPIResponses();
        if (!data) {
            alert('Please wait for portfolio data to load, then try again.');
            return;
        }

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

        renderSummaryView(contentDiv);

        select.onchange = function() {
            const val = select.value;
            if (val === 'SUMMARY') {
                renderSummaryView(contentDiv);
            } else {
                renderBucketView(contentDiv, val);
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
    // Modern CSS Styles
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
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px dashed #f59e0b;
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
                color: #78350f;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                white-space: nowrap;
            }
            
            .epv-projected-icon {
                font-size: 16px;
            }
            
            .epv-projected-input {
                width: 140px;
                padding: 6px 12px;
                border: 2px solid #f59e0b;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                color: #78350f;
                background: #ffffff;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-projected-input:focus {
                outline: none;
                border-color: #d97706;
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
            }
            
            .epv-projected-input:hover {
                border-color: #d97706;
            }
            
            .epv-projected-input::placeholder {
                color: #a16207;
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
    // Initialization
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
        loadStoredData();
        
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

})();
