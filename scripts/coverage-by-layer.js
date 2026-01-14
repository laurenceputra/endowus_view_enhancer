#!/usr/bin/env node

// Simple layer coverage reporter:
// - Core userscript file
// - Overall totals
//
// Usage (after running jest --coverage):
// node scripts/coverage-by-layer.js

const fs = require('fs');
const path = require('path');

const SUMMARY_PATH = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
const USERSCRIPT_PATH = 'tampermonkey/goal_portfolio_viewer.user.js';

function percent(value) {
    return `${value.toFixed(2)}%`;
}

function loadSummary() {
    const raw = fs.readFileSync(SUMMARY_PATH, 'utf8');
    return JSON.parse(raw);
}

function formatRow(label, data) {
    const cols = [
        label.padEnd(18, ' '),
        `S:${percent(data.statements.pct || 0)}`.padEnd(12, ' '),
        `B:${percent(data.branches.pct || 0)}`.padEnd(12, ' '),
        `F:${percent(data.functions.pct || 0)}`.padEnd(12, ' '),
        `L:${percent(data.lines.pct || 0)}`.padEnd(12, ' ')
    ];
    return cols.join(' ');
}

function main() {
    if (!fs.existsSync(SUMMARY_PATH)) {
        console.error('coverage/coverage-summary.json not found. Run `npm run test:coverage` first.');
        process.exit(1);
    }
    const summary = loadSummary();
    const total = summary.total;
    const userscript = summary[USERSCRIPT_PATH];

    console.log('Layered Coverage (userscript vs overall)');
    console.log(formatRow('Userscript', userscript || { statements: {}, branches: {}, functions: {}, lines: {} }));
    console.log(formatRow('Overall', total));
}

main();
