let mapping = null;
// Create overlay button
const btn = document.createElement('button');
btn.id = "endowus-portfolio-btn";
btn.textContent = "Portfolio Viewer";

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

    // Build table HTML for each goalBucket
    Object.keys(mapping).forEach(bucket => {
        const bucketHeader = document.createElement('h2');
        bucketHeader.textContent = `${bucket} (Total: ${mapping[bucket].total?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'})`;
        container.appendChild(bucketHeader);

        Object.keys(mapping[bucket]).forEach(goalType => {
            if (goalType === "total") return;
            const group = mapping[bucket][goalType];

            // GoalType header with total
            const typeHeader = document.createElement('h3');
            typeHeader.textContent = `${goalType} (Total: ${group.totalInvestmentAmount?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'})`;
            container.appendChild(typeHeader);

            const table = document.createElement('table');

            // Table header
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

            // Table body
            const tbody = document.createElement('tbody');
            group.goals.forEach(item => {
                const percentOfType = group.totalInvestmentAmount > 0
                    ? ((item.totalInvestmentAmount || 0) / group.totalInvestmentAmount * 100).toFixed(2)
                    : '0.00';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:left;">${item.goalName}</td>
                    <td>${item.totalInvestmentAmount?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'}</td>
                    <td>${percentOfType}%</td>
                    <td>${item.totalCumulativeReturn?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'}</td>
                    <td>${item.simpleRateOfReturnPercent !== null && item.simpleRateOfReturnPercent !== undefined ? (item.simpleRateOfReturnPercent * 100).toFixed(2) + '%' : '-'}</td>
                `;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.appendChild(table);
        });
    });

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