let mapping = null;
// Create overlay button
const btn = document.createElement('button');
btn.textContent = "Portfolio Viewer";
btn.style.position = "fixed";
btn.style.top = "20px";
btn.style.right = "20px";
btn.style.zIndex = "9999";
btn.style.padding = "10px 18px";
btn.style.background = "#1976d2";
btn.style.color = "#fff";
btn.style.border = "none";
btn.style.borderRadius = "5px";
btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
btn.style.cursor = "pointer";
btn.style.fontSize = "16px";
btn.style.fontWeight = "bold";
btn.style.opacity = "0.95";
btn.addEventListener('mouseenter', () => btn.style.opacity = "1");
btn.addEventListener('mouseleave', () => btn.style.opacity = "0.95");

function showOverlayTable() {
    // Remove existing overlay if present
    let old = document.getElementById('endowus-portfolio-overlay');
    if (old) old.remove();

    // Create overlay background
    const overlay = document.createElement('div');
    overlay.id = 'endowus-portfolio-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    // Table container
    const container = document.createElement('div');
    container.style.background = '#fff';
    container.style.borderRadius = '10px';
    container.style.padding = '32px 32px 24px 32px';
    container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
    container.style.position = 'relative';
    container.style.maxHeight = '80vh';
    container.style.overflowY = 'auto';
    container.style.minWidth = '700px';

    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '12px';
    closeBtn.style.right = '18px';
    closeBtn.style.fontSize = '22px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#888';
    closeBtn.onclick = () => overlay.remove();
    container.appendChild(closeBtn);

    // Build table HTML for each goalBucket
    Object.keys(mapping).forEach(bucket => {
        const bucketHeader = document.createElement('h2');
        bucketHeader.textContent = `${bucket} (Total: ${mapping[bucket].total?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'})`;
        bucketHeader.style.marginTop = '24px';
        bucketHeader.style.marginBottom = '8px';
        container.appendChild(bucketHeader);

        Object.keys(mapping[bucket]).forEach(goalType => {
            if (goalType === "total") return;
            const group = mapping[bucket][goalType];

            // GoalType header with total
            const typeHeader = document.createElement('h3');
            typeHeader.textContent = `${goalType} (Total: ${group.totalInvestmentAmount?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'})`;
            typeHeader.style.margin = '12px 0 4px 0';
            container.appendChild(typeHeader);

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.marginBottom = '16px';
            table.style.borderCollapse = 'collapse';

            // Table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr style="background:#f0f0f0;">
                    <th style="padding:6px 12px;">Goal Name</th>
                    <th style="padding:6px 12px;">Investment Amount</th>
                    <th style="padding:6px 12px;">% of Goal Type</th>
                    <th style="padding:6px 12px;">Cumulative Return</th>
                    <th style="padding:6px 12px;">Return %</th>
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
                    <td style="padding:6px 12px;">${item.goalName}</td>
                    <td style="padding:6px 12px; text-align:right;">${item.totalInvestmentAmount?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'}</td>
                    <td style="padding:6px 12px; text-align:right;">${percentOfType}%</td>
                    <td style="padding:6px 12px; text-align:right;">${item.totalCumulativeReturn?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || '-'}</td>
                    <td style="padding:6px 12px; text-align:right;">${item.simpleRateOfReturnPercent !== null && item.simpleRateOfReturnPercent !== undefined ? (item.simpleRateOfReturnPercent * 100).toFixed(2) + '%' : '-'}</td>
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