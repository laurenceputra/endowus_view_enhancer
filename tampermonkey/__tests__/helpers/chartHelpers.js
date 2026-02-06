const PERFORMANCE_CHART_DEFAULT_WIDTH = 400;
const PERFORMANCE_CHART_DEFAULT_HEIGHT = 110;
const PERFORMANCE_CHART_MIN_WIDTH = 240;
const PERFORMANCE_CHART_MIN_HEIGHT = 90;
const PERFORMANCE_CHART_MAX_HEIGHT = 180;
const PERFORMANCE_CHART_LEFT_PADDING = 100;
const PERFORMANCE_CHART_RIGHT_PADDING = 50;
const PERFORMANCE_CHART_ASPECT_RATIO = 0.28;

function formatMoney(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return '-';
    }
    const formatter = new Intl.NumberFormat('en-SG', {
        style: 'currency',
        currency: 'SGD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return formatter.format(numericValue);
}

function formatPercent(value, options = {}) {
    if (value === null || value === undefined) {
        return options.fallback ?? '-';
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return options.fallback ?? '-';
    }
    const multiplier = Number(options.multiplier) || 1;
    const showSign = options.showSign === true;
    const valueWithMultiplier = numericValue * multiplier;
    const sign = showSign && valueWithMultiplier >= 0 ? '+' : '';
    return `${sign}${valueWithMultiplier.toFixed(2)}%`;
}

function getChartHeightForWidth(width) {
    const safeWidth = Math.max(PERFORMANCE_CHART_MIN_WIDTH, Number(width) || PERFORMANCE_CHART_DEFAULT_WIDTH);
    const targetHeight = Math.round(safeWidth * PERFORMANCE_CHART_ASPECT_RATIO);
    return Math.min(
        PERFORMANCE_CHART_MAX_HEIGHT,
        Math.max(PERFORMANCE_CHART_MIN_HEIGHT, targetHeight || PERFORMANCE_CHART_DEFAULT_HEIGHT)
    );
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

function getChartPadding(chartWidth, chartHeight) {
    const base = Math.min(chartWidth, chartHeight);
    return Math.min(22, Math.max(12, Math.round(base * 0.18)));
}

function getChartLayout(chartWidth, chartHeight) {
    const widthValue = Math.max(PERFORMANCE_CHART_MIN_WIDTH, Number(chartWidth) || PERFORMANCE_CHART_DEFAULT_WIDTH);
    const heightValue = Math.max(PERFORMANCE_CHART_MIN_HEIGHT, Number(chartHeight) || PERFORMANCE_CHART_DEFAULT_HEIGHT);
    const padding = getChartPadding(widthValue, heightValue);
    const plotWidth = Math.max(
        1,
        widthValue - PERFORMANCE_CHART_LEFT_PADDING - PERFORMANCE_CHART_RIGHT_PADDING - padding * 2
    );
    const plotHeight = Math.max(1, heightValue - padding * 2);
    return {
        widthValue,
        heightValue,
        padding,
        plotWidth,
        plotHeight,
        leftPadding: PERFORMANCE_CHART_LEFT_PADDING,
        rightPadding: PERFORMANCE_CHART_RIGHT_PADDING
    };
}

function getChartSeriesStats(series) {
    const amounts = series.map(point => Number(point.amount)).filter(val => Number.isFinite(val));
    if (amounts.length < 2) {
        return null;
    }
    const minValue = Math.min(...amounts);
    const maxValue = Math.max(...amounts);
    return {
        amounts,
        minValue,
        maxValue,
        range: maxValue - minValue || 1
    };
}

function getChartPoint(series, index, layout, minValue, range) {
    const x = layout.leftPadding + layout.padding + (index / (series.length - 1)) * layout.plotWidth;
    const y = layout.padding + layout.plotHeight - ((series[index].amount - minValue) / range) * layout.plotHeight;
    return { x, y };
}

function formatChartDateLabel(dateString) {
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
}

function appendChartXAxisLabels(axisGroup, series, layout) {
    const xLabels = [
        { value: series[0].date, anchor: 'start', x: layout.leftPadding + layout.padding },
        {
            value: series[series.length - 1].date,
            anchor: 'end',
            x: layout.leftPadding + layout.padding + layout.plotWidth
        }
    ];

    xLabels.forEach(labelInfo => {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', `${labelInfo.x}`);
        const labelY = Math.min(layout.heightValue - 6, layout.padding + layout.plotHeight + 12);
        label.setAttribute('y', `${labelY}`);
        label.setAttribute('text-anchor', labelInfo.anchor);
        label.setAttribute('class', 'gpv-performance-chart-label');
        label.textContent = formatChartDateLabel(labelInfo.value);
        axisGroup.appendChild(label);
    });
}

function buildChartAxisGroup(layout, minValue, maxValue, range, series) {
    const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    axisGroup.setAttribute('class', 'gpv-performance-chart-axis');

    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', `${layout.leftPadding + layout.padding}`);
    xAxis.setAttribute('x2', `${layout.leftPadding + layout.padding + layout.plotWidth}`);
    xAxis.setAttribute('y1', `${layout.padding + layout.plotHeight}`);
    xAxis.setAttribute('y2', `${layout.padding + layout.plotHeight}`);
    axisGroup.appendChild(xAxis);

    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', `${layout.leftPadding + layout.padding}`);
    yAxis.setAttribute('x2', `${layout.leftPadding + layout.padding}`);
    yAxis.setAttribute('y1', `${layout.padding}`);
    yAxis.setAttribute('y2', `${layout.padding + layout.plotHeight}`);
    axisGroup.appendChild(yAxis);

    const tickValues = [maxValue, (maxValue + minValue) / 2, minValue];
    tickValues.forEach((value, index) => {
        const y = layout.padding + layout.plotHeight - ((value - minValue) / range) * layout.plotHeight;
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', `${layout.leftPadding + layout.padding - 3}`);
        tick.setAttribute('x2', `${layout.leftPadding + layout.padding}`);
        tick.setAttribute('y1', `${y}`);
        tick.setAttribute('y2', `${y}`);
        tick.setAttribute('class', 'gpv-performance-chart-tick');
        axisGroup.appendChild(tick);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', `${layout.leftPadding + layout.padding - 6}`);
        label.setAttribute('y', `${y + 3}`);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('class', 'gpv-performance-chart-label');
        label.textContent = formatMoney(value);
        axisGroup.appendChild(label);

        if (index === 1) {
            const grid = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            grid.setAttribute('x1', `${layout.leftPadding + layout.padding}`);
            grid.setAttribute('x2', `${layout.leftPadding + layout.padding + layout.plotWidth}`);
            grid.setAttribute('y1', `${y}`);
            grid.setAttribute('y2', `${y}`);
            grid.setAttribute('class', 'gpv-performance-chart-grid');
            axisGroup.appendChild(grid);
        }
    });

    appendChartXAxisLabels(axisGroup, series, layout);

    return axisGroup;
}

function buildChartPath(series, layout, minValue, range) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const trendPositive = series[series.length - 1].amount >= series[0].amount;
    const strokeColor = trendPositive ? '#10b981' : '#ef4444';

    const points = series.map((point, index) => {
        const coords = getChartPoint(series, index, layout, minValue, range);
        return `${index === 0 ? 'M' : 'L'} ${coords.x.toFixed(2)} ${coords.y.toFixed(2)}`;
    });

    path.setAttribute('d', points.join(' '));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    return path;
}

function buildChartPointGroup(series, layout, minValue, range) {
    const highlightIndices = [0, Math.floor(series.length / 2), series.length - 1];
    const pointGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    pointGroup.setAttribute('class', 'gpv-performance-chart-points');
    highlightIndices.forEach(index => {
        const point = series[index];
        if (!point) {
            return;
        }
        const coords = getChartPoint(series, index, layout, minValue, range);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', `${coords.x}`);
        circle.setAttribute('cy', `${coords.y}`);
        circle.setAttribute('r', '2.5');
        circle.setAttribute('class', 'gpv-performance-chart-point');
        pointGroup.appendChild(circle);
    });
    return pointGroup;
}

function buildChartAxisTitles(layout) {
    const axisTitleX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    axisTitleX.setAttribute('x', `${layout.leftPadding + layout.padding + layout.plotWidth / 2}`);
    axisTitleX.setAttribute('y', `${Math.min(layout.heightValue - 2, layout.padding + layout.plotHeight + 20)}`);
    axisTitleX.setAttribute('text-anchor', 'middle');
    axisTitleX.setAttribute('class', 'gpv-performance-chart-title');
    axisTitleX.textContent = 'Date';

    const axisTitleY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    axisTitleY.setAttribute('x', `${Math.max(layout.leftPadding + 4, layout.leftPadding + layout.padding - 10)}`);
    axisTitleY.setAttribute('y', `${Math.max(12, layout.padding - 6)}`);
    axisTitleY.setAttribute('text-anchor', 'start');
    axisTitleY.setAttribute('class', 'gpv-performance-chart-title');
    axisTitleY.textContent = 'Value (SGD)';

    return { axisTitleX, axisTitleY };
}

function createLineChartSvg(series, chartWidth, chartHeight) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const layout = getChartLayout(chartWidth, chartHeight);
    const totalHorizontalPadding = layout.leftPadding + layout.rightPadding;
    svg.setAttribute('viewBox', `0 0 ${layout.widthValue} ${layout.heightValue}`);
    svg.setAttribute('class', 'gpv-performance-chart');

    if (!Array.isArray(series) || series.length < 2) {
        const emptyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        emptyText.setAttribute('x', `${layout.leftPadding + (layout.widthValue - totalHorizontalPadding) / 2}`);
        emptyText.setAttribute('y', `${layout.heightValue / 2}`);
        emptyText.setAttribute('text-anchor', 'middle');
        emptyText.setAttribute('class', 'gpv-performance-chart-empty');
        emptyText.textContent = 'No chart data';
        svg.appendChild(emptyText);
        return svg;
    }

    const stats = getChartSeriesStats(series);
    if (!stats) {
        return svg;
    }

    const axisGroup = buildChartAxisGroup(layout, stats.minValue, stats.maxValue, stats.range, series);
    const path = buildChartPath(series, layout, stats.minValue, stats.range);
    const pointGroup = buildChartPointGroup(series, layout, stats.minValue, stats.range);
    const axisTitles = buildChartAxisTitles(layout);

    svg.appendChild(axisGroup);
    svg.appendChild(axisTitles.axisTitleX);
    svg.appendChild(axisTitles.axisTitleY);
    svg.appendChild(path);
    svg.appendChild(pointGroup);
    return svg;
}

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
        value.textContent = formatPercent(item.value, { multiplier: 100, showSign: true });
        if (typeof item.value === 'number') {
            value.classList.add(item.value >= 0 ? 'positive' : 'negative');
        }

        tile.appendChild(label);
        tile.appendChild(value);
        grid.appendChild(tile);
    });

    return grid;
}

module.exports = {
    getChartHeightForWidth,
    getChartDimensions,
    createLineChartSvg,
    buildPerformanceWindowGrid
};
