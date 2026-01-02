(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.EndowusFormatting = factory();
    }
})(typeof window !== 'undefined' ? window : globalThis, function() {
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

    return { formatMoney, formatGrowthPercent };
});
