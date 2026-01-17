/**
 * Automated Screenshot Capture for Goal Portfolio Viewer Demo
 * 
 * This script uses Playwright to automate screenshot capture of the demo,
 * including scrolling to capture the complete bucket details view.
 * 
 * Usage: node take-screenshots.js
 * 
 * Requirements:
 *   npm install playwright
 *   npx playwright install chromium
 */

const fs = require('fs');
const path = require('path');

async function takeScreenshots() {
    // Check if playwright is available
    let playwright;
    try {
        playwright = require('playwright');
    } catch (error) {
        console.error('\n❌ Playwright not installed!');
        console.error('\nTo use automated screenshots, install Playwright:');
        console.error('  npm install playwright');
        console.error('  npx playwright install chromium');
        console.error('\nFor manual screenshots, run: python3 take-screenshots.py\n');
        process.exit(1);
    }

    const demoDir = __dirname;
    const assetsDir = path.join(path.dirname(demoDir), 'assets');
    const demoHtmlPath = path.join(demoDir, 'demo-clean.html');
    const demoUrl = `file://${demoHtmlPath}`;

    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    console.log('\n' + '='.repeat(70));
    console.log('GOAL PORTFOLIO VIEWER - AUTOMATED SCREENSHOT CAPTURE');
    console.log('='.repeat(70));
    console.log(`\nDemo URL: ${demoUrl}`);
    console.log(`Assets directory: ${assetsDir}\n`);

    // Launch browser
    console.log('🌐 Launching browser...');
    const browser = await playwright.chromium.launch({
        headless: true
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    try {
        // Navigate to demo page
        console.log('📂 Loading demo page...');
        await page.goto(demoUrl, { waitUntil: 'networkidle' });
        
        // Wait for the trigger button to appear
        console.log('⏳ Waiting for Portfolio Viewer button...');
        await page.waitForSelector('.gpv-trigger-btn', { timeout: 10000 });
        
        // Click the trigger button
        console.log('🖱️  Clicking Portfolio Viewer button...');
        await page.click('.gpv-trigger-btn');
        
        // Wait for modal to appear
        await page.waitForSelector('.gpv-overlay', { timeout: 5000 });
        await page.waitForTimeout(1000); // Wait for animations
        
        // Screenshot 1: Summary view
        console.log('📸 Capturing summary view...');
        await page.screenshot({
            path: path.join(assetsDir, 'screenshot-summary.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: screenshot-summary.png');
        
        // Screenshot 2: House Purchase bucket detail
        console.log('📸 Capturing House Purchase bucket detail...');
        
        // Select House Purchase from dropdown
        await page.selectOption('select.gpv-bucket-dropdown', { label: 'House Purchase' });
        await page.waitForTimeout(1000); // Wait for view to update
        
        // Take screenshot of top section
        await page.screenshot({
            path: path.join(assetsDir, 'screenshot-house-purchase-detail-top.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: screenshot-house-purchase-detail-top.png');
        
        // Scroll the content panel to bottom to show goals table
        await page.evaluate(() => {
            const content = document.querySelector('.gpv-content');
            if (content) {
                content.scrollTo(0, content.scrollHeight);
            }
        });
        await page.waitForTimeout(500); // Wait for scroll
        
        // Take screenshot of scrolled view showing goals table
        await page.screenshot({
            path: path.join(assetsDir, 'screenshot-house-purchase-detail-bottom.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: screenshot-house-purchase-detail-bottom.png');
        
        // Screenshot 3: Retirement bucket detail
        console.log('📸 Capturing Retirement bucket detail...');
        
        // Scroll back to top first
        await page.evaluate(() => {
            const content = document.querySelector('.gpv-content');
            if (content) {
                content.scrollTo(0, 0);
            }
        });
        await page.waitForTimeout(300);
        
        // Select Retirement from dropdown
        await page.selectOption('select.gpv-bucket-dropdown', { label: 'Retirement' });
        await page.waitForTimeout(1000); // Wait for view to update
        
        // Take screenshot of top section
        await page.screenshot({
            path: path.join(assetsDir, 'screenshot-retirement-detail-top.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: screenshot-retirement-detail-top.png');
        
        // Scroll to bottom
        await page.evaluate(() => {
            const content = document.querySelector('.gpv-content');
            if (content) {
                content.scrollTo(0, content.scrollHeight);
            }
        });
        await page.waitForTimeout(500);
        
        // Take screenshot of scrolled view
        await page.screenshot({
            path: path.join(assetsDir, 'screenshot-retirement-detail-bottom.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: screenshot-retirement-detail-bottom.png');
        
        console.log('\n✅ All screenshots captured successfully!');
        console.log(`\n📁 Screenshots saved to: ${assetsDir}\n`);
        
    } catch (error) {
        console.error('\n❌ Error capturing screenshots:', error.message);
        console.error('\nTry manual screenshots with: python3 take-screenshots.py\n');
        throw error;
    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    takeScreenshots()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { takeScreenshots };
