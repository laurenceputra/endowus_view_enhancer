let mapping = null;
// Create overlay button
const btn = document.createElement('button');
btn.id = "endowus-portfolio-btn";
btn.textContent = "Portfolio Viewer";

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
    preferred.forEach(p => { if (goalTypeKeys.includes(p)) sorted.push(p); });
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
    return ( (a / denom) * 100 ).toFixed(2) + '%';
}

function renderSummaryView(contentDiv) {
    contentDiv.innerHTML = '';

    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'endowus-summary-container';

    // Sort buckets alphabetically for consistent display
    Object.keys(mapping).sort().forEach(bucket => {
        // Skip any non-bucket keys if present
        const bucketObj = mapping[bucket];
        if (!bucketObj) return;

        // Calculate bucket total return
        let bucketTotalReturn = 0;
        const goalTypes = Object.keys(bucketObj).filter(k => k !== 'total');
        goalTypes.forEach(goalType => {
            bucketTotalReturn += bucketObj[goalType].totalCumulativeReturn || 0;
        });

        const bucketHeader = document.createElement('h2');
        const totalDisplay = formatMoney(bucketObj.total);
        const returnDisplay = formatMoney(bucketTotalReturn);
        const growthDisplay = formatGrowthPercent(bucketTotalReturn, bucketObj.total);
        bucketHeader.textContent = `${bucket} (Total: ${totalDisplay}, Total Return: ${returnDisplay}, Growth: ${growthDisplay})`;
        summaryContainer.appendChild(bucketHeader);

        // For each goalType in a defined order
        const orderedTypes = sortGoalTypes(goalTypes);
        orderedTypes.forEach(goalType => {
            const group = bucketObj[goalType];
            if (!group) return;
            const typeTotalDisplay = formatMoney(group.totalInvestmentAmount);
            const typeReturnDisplay = formatMoney(group.totalCumulativeReturn);
            const typeGrowthDisplay = formatGrowthPercent(group.totalCumulativeReturn, group.totalInvestmentAmount);
            const typeHeader = document.createElement('h3');
            typeHeader.textContent = `${getDisplayGoalType(goalType)} — Total: ${typeTotalDisplay} | Total Return: ${typeReturnDisplay} | Growth: ${typeGrowthDisplay}`;
            summaryContainer.appendChild(typeHeader);
        });

        // small spacer
        const hr = document.createElement('hr');
        summaryContainer.appendChild(hr);
    });

    contentDiv.appendChild(summaryContainer);
}

function renderBucketView(contentDiv, bucket) {
    contentDiv.innerHTML = '';
    const bucketObj = mapping[bucket];
    if (!bucketObj) return;

    // Calculate bucket total return
    let bucketTotalReturn = 0;
    const goalTypes = Object.keys(bucketObj).filter(k => k !== 'total');
    goalTypes.forEach(goalType => {
        bucketTotalReturn += bucketObj[goalType].totalCumulativeReturn || 0;
    });

    // Bucket summary at top
    const bucketHeader = document.createElement('h2');
    const totalDisplay = formatMoney(bucketObj.total);
    const returnDisplay = formatMoney(bucketTotalReturn);
    const growthDisplay = formatGrowthPercent(bucketTotalReturn, bucketObj.total);
    bucketHeader.textContent = `${bucket} (Total: ${totalDisplay}, Total Return: ${returnDisplay}, Growth: ${growthDisplay})`;
    contentDiv.appendChild(bucketHeader);

    const orderedTypes = sortGoalTypes(goalTypes);
    orderedTypes.forEach(goalType => {
        const group = bucketObj[goalType];
        if (!group) return;

        const typeReturn = group.totalCumulativeReturn || 0;
        const typeGrowth = formatGrowthPercent(typeReturn, group.totalInvestmentAmount);
        const typeHeader = document.createElement('h3');
        typeHeader.textContent = `${getDisplayGoalType(goalType)} (Total: ${formatMoney(group.totalInvestmentAmount)}, Total Return: ${formatMoney(typeReturn)}, Growth: ${typeGrowth})`;
        contentDiv.appendChild(typeHeader);

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Goal Name</th>
                <th>Investment Amount</th>
                <th>% of Goal Type</th>
                <th>Cumulative Return</th>
                <th>Return %</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        group.goals.forEach(item => {
            const percentOfType = group.totalInvestmentAmount > 0
                ? ((item.totalInvestmentAmount || 0) / group.totalInvestmentAmount * 100).toFixed(2)
                : '0.00';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:left;">${item.goalName}</td>
                <td>${formatMoney(item.totalInvestmentAmount)}</td>
                <td>${percentOfType}%</td>
                <td>${formatMoney(item.totalCumulativeReturn)}</td>
                <td>${item.simpleRateOfReturnPercent !== null && item.simpleRateOfReturnPercent !== undefined ? (item.simpleRateOfReturnPercent * 100).toFixed(2) + '%' : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        contentDiv.appendChild(table);
    });
}

function showOverlayTable() {
    // Remove existing overlay if present
    let old = document.getElementById('endowus-portfolio-overlay');
    if (old) old.remove();

    // Create overlay background
    const overlay = document.createElement('div');
    overlay.id = 'endowus-portfolio-overlay';

    // Table container
    const container = document.createElement('div');
    container.id = 'endowus-portfolio-container';

    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.id = 'endowus-portfolio-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => overlay.remove();
    container.appendChild(closeBtn);

    // Dropdown selector
    const select = document.createElement('select');
    select.id = 'endowus-portfolio-select';
    const summaryOption = document.createElement('option');
    summaryOption.value = 'SUMMARY';
    summaryOption.textContent = 'Summary';
    select.appendChild(summaryOption);

    // Add bucket options (sorted alphabetically)
    Object.keys(mapping).sort().forEach(bucket => {
        const opt = document.createElement('option');
        opt.value = bucket;
        opt.textContent = bucket;
        select.appendChild(opt);
    });

    container.appendChild(select);

    // Dynamic content area
    const contentDiv = document.createElement('div');
    contentDiv.id = 'endowus-portfolio-content';
    container.appendChild(contentDiv);

    // Initial render = Summary
    renderSummaryView(contentDiv);

    // On change render selected view
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

btn.onclick = function() {
    browser.runtime.sendMessage({ action: "getInvestmentMapping" }).then(function(response, err) {
        mapping = response.data.merged;
        showOverlayTable();
    });
};

document.body.appendChild(btn);

