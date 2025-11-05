// ==UserScript==
// @name         Endowus Portfolio Viewer
// @namespace    https://github.com/laurenceputra/endowus_view_enhancer
// @version      2.0.0
// @description  View and organize your Endowus portfolio by buckets with a modern interface. Groups goals by bucket names and displays comprehensive portfolio analytics.
// @author       laurenceputra
// @match        https://app.sg.endowus.com/*
// @grant        none
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
            if (url.includes('/v1/goals/performance') || 
                url.includes('/v2/goals/investible') || 
                url.includes('/v1/goals')) {
                
                // Clone response to read it
                const clonedResponse = response.clone();
                
                try {
                    const data = await clonedResponse.json();
                    
                    if (url.includes('/v1/goals/performance')) {
                        console.log('[Endowus Portfolio Viewer] Intercepted performance data');
                        apiData.performance = data;
                    } else if (url.includes('/v2/goals/investible')) {
                        console.log('[Endowus Portfolio Viewer] Intercepted investible data');
                        apiData.investible = data;
                    } else if (url.includes('/v1/goals') && !url.includes('/performance') && !url.includes('/investible')) {
                        console.log('[Endowus Portfolio Viewer] Intercepted summary data');
                        apiData.summary = data;
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
            if (url.includes('/v1/goals/performance') || 
                url.includes('/v2/goals/investible') || 
                url.includes('/v1/goals')) {
                
                this.addEventListener('load', function() {
                    try {
                        const data = JSON.parse(this.responseText);
                        
                        if (url.includes('/v1/goals/performance')) {
                            console.log('[Endowus Portfolio Viewer] Intercepted performance data (XHR)');
                            apiData.performance = data;
                        } else if (url.includes('/v2/goals/investible')) {
                            console.log('[Endowus Portfolio Viewer] Intercepted investible data (XHR)');
                            apiData.investible = data;
                        } else if (url.includes('/v1/goals') && !url.includes('/performance') && !url.includes('/investible')) {
                            console.log('[Endowus Portfolio Viewer] Intercepted summary data (XHR)');
                            apiData.summary = data;
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
    // Data Processing Logic
    // ============================================
    
    function mergeAPIResponses() {
        if (!apiData.performance || !apiData.investible || !apiData.summary) {
            console.log('[Endowus Portfolio Viewer] Not all API data available yet');
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
            const goalBucket = goalName.split(" ")[0] || "Uncategorized";
            
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
        console.log('[Endowus Portfolio Viewer] Data merged successfully:', mergedInvestmentData);
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
            default:
                return goalType;
        }
    }

    function sortGoalTypes(goalTypeKeys) {
        const preferred = ['GENERAL_WEALTH_ACCUMULATION', 'CASH_MANAGEMENT'];
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
        const a = Number(totalReturn);
        const t = Number(total);
        const denom = t - a;
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
            
            const typeHeader = document.createElement('div');
            typeHeader.className = 'epv-type-header';
            typeHeader.innerHTML = `
                <h3>${getDisplayGoalType(goalType)}</h3>
                <div class="epv-type-summary">
                    <span>Total: ${formatMoney(group.totalInvestmentAmount)}</span>
                    <span>Return: ${formatMoney(typeReturn)}</span>
                    <span>Growth: ${typeGrowth}</span>
                </div>
            `;
            typeSection.appendChild(typeHeader);

            const table = document.createElement('table');
            table.className = 'epv-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Goal Name</th>
                        <th>Investment Amount</th>
                        <th>% of Goal Type</th>
                        <th>Cumulative Return</th>
                        <th>Return %</th>
                    </tr>
                </thead>
            `;

            const tbody = document.createElement('tbody');
            group.goals.forEach(item => {
                const percentOfType = group.totalInvestmentAmount > 0
                    ? ((item.totalInvestmentAmount || 0) / group.totalInvestmentAmount * 100).toFixed(2)
                    : '0.00';
                    
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
                    <td class="${returnClass}">${formatMoney(item.totalCumulativeReturn)}</td>
                    <td class="${returnClass}">${returnPercent}</td>
                `;
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            typeSection.appendChild(table);
            contentDiv.appendChild(typeSection);
        });
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
                top: 20px;
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
                padding: 24px 32px;
                border-bottom: 1px solid #e5e7eb;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px 20px 0 0;
            }
            
            .epv-header h1 {
                margin: 0;
                font-size: 24px;
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
                padding: 20px 32px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .epv-select-label {
                font-weight: 600;
                color: #374151;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-select {
                padding: 8px 16px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #374151;
                background: #ffffff;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                min-width: 200px;
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
                padding: 24px 32px;
                flex: 1;
            }
            
            /* Summary View Styles */
            
            .epv-summary-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .epv-bucket-card {
                background: #ffffff;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 20px;
                transition: all 0.3s ease;
            }
            
            .epv-bucket-card:hover {
                border-color: #667eea;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                transform: translateY(-2px);
            }
            
            .epv-bucket-header {
                margin-bottom: 16px;
            }
            
            .epv-bucket-title {
                font-size: 20px;
                font-weight: 700;
                color: #111827;
                margin: 0 0 12px 0;
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
                font-weight: 500;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .epv-stat-value {
                font-size: 18px;
                font-weight: 700;
                color: #111827;
                font-family: 'Monaco', 'Courier New', monospace;
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
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
                margin-bottom: 8px;
                align-items: center;
            }
            
            .epv-goal-type-name {
                font-weight: 600;
                color: #374151;
                min-width: 120px;
            }
            
            .epv-goal-type-stat {
                font-size: 13px;
                color: #6b7280;
                font-family: 'Monaco', 'Courier New', monospace;
            }
            
            /* Detail View Styles */
            
            .epv-detail-header {
                margin-bottom: 24px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e5e7eb;
            }
            
            .epv-detail-title {
                font-size: 28px;
                font-weight: 700;
                color: #111827;
                margin: 0 0 16px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-detail-stats {
                display: flex;
                gap: 32px;
            }
            
            .epv-stat-item {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .epv-type-section {
                margin-bottom: 32px;
            }
            
            .epv-type-header {
                margin-bottom: 16px;
            }
            
            .epv-type-header h3 {
                font-size: 18px;
                font-weight: 700;
                color: #374151;
                margin: 0 0 8px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-type-summary {
                display: flex;
                gap: 20px;
                font-size: 14px;
                color: #6b7280;
                font-family: 'Monaco', 'Courier New', monospace;
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
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                font-size: 13px;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .epv-table td {
                padding: 12px 16px;
                text-align: right;
                font-size: 14px;
                color: #374151;
                border-top: 1px solid #e5e7eb;
                font-family: 'Monaco', 'Courier New', monospace;
            }
            
            .epv-table tbody tr {
                transition: background-color 0.2s ease;
            }
            
            .epv-table tbody tr:hover {
                background-color: #f9fafb;
            }
            
            .epv-table .epv-goal-name {
                text-align: left;
                font-weight: 500;
                color: #111827;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            
            .epv-table .positive {
                color: #059669;
                font-weight: 600;
            }
            
            .epv-table .negative {
                color: #dc2626;
                font-weight: 600;
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
    
    function init() {
        if (document.body) {
            injectStyles();
            
            const btn = document.createElement('button');
            btn.className = 'epv-trigger-btn';
            btn.textContent = '📊 Portfolio Viewer';
            btn.onclick = showOverlay;
            
            document.body.appendChild(btn);
            console.log('[Endowus Portfolio Viewer] UI initialized');
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
