/**
 * E2E smoke tests for the demo dashboard.
 *
 * Usage: node demo/e2e-tests.js
 */

const fs = require('fs');
const path = require('path');
const { startDemoServer } = require('./mock-server');

function assertCondition(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function runE2ETests() {
    let playwright;
    try {
        playwright = require('playwright');
    } catch (error) {
        console.error('Playwright is required for E2E tests.');
        throw error;
    }

    const port = 8765;
    const demoUrl = `http://localhost:${port}/dashboard/`;
    const outputDir = process.env.E2E_SCREENSHOT_DIR
        ? path.resolve(process.env.E2E_SCREENSHOT_DIR)
        : path.join(__dirname, 'screenshots');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const server = await startDemoServer({ port });
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    try {
        await page.goto(demoUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__GPV_E2E_READY__ === true, null, { timeout: 20000 });

        const trigger = await page.$('.gpv-trigger-btn');
        assertCondition(trigger, 'Expected Portfolio Viewer trigger button to exist.');

        await page.click('.gpv-trigger-btn');
        await page.waitForSelector('.gpv-overlay', { timeout: 5000 });

        const summaryHeader = await page.$('.gpv-header');
        assertCondition(summaryHeader, 'Expected summary header to render.');

        await page.screenshot({
            path: path.join(outputDir, 'e2e-summary.png'),
            fullPage: false
        });

        const options = await page.$$eval('select.gpv-select option', opts =>
            opts.map(opt => opt.textContent)
        );
        assertCondition(options.some(text => text.includes('House Purchase')), 'Expected House Purchase option.');
        assertCondition(options.some(text => text.includes('Retirement')), 'Expected Retirement option.');

        await page.selectOption('select.gpv-select', 'House Purchase');
        await page.waitForFunction(
            () => {
                const title = document.querySelector('.gpv-detail-title');
                return title && title.textContent && title.textContent.includes('House Purchase');
            },
            null,
            { timeout: 5000 }
        );
        await page.waitForSelector('.gpv-content .gpv-fixed-toggle-input:checked', { timeout: 5000 });
        const fixedRow = await page.$('.gpv-content .gpv-fixed-toggle-input:checked');
        assertCondition(fixedRow, 'Expected at least one fixed toggle to be enabled in House Purchase view.');
        await page.screenshot({
            path: path.join(outputDir, 'e2e-house-purchase.png'),
            fullPage: false
        });

        await page.selectOption('select.gpv-select', 'Retirement');
        await page.waitForFunction(
            () => {
                const title = document.querySelector('.gpv-detail-title');
                return title && title.textContent && title.textContent.includes('Retirement');
            },
            null,
            { timeout: 5000 }
        );
        await page.screenshot({
            path: path.join(outputDir, 'e2e-retirement.png'),
            fullPage: false
        });
    } finally {
        await browser.close();
        server.close();
    }
}

if (require.main === module) {
    runE2ETests()
        .then(() => {
            console.log('E2E demo tests completed successfully.');
        })
        .catch(error => {
            console.error('E2E demo tests failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runE2ETests
};
