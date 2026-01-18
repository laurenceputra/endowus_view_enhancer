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
const http = require('http');

// Simple HTTP server for serving demo files
function startServer(directory, port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let filePath = path.join(directory, req.url === '/' ? 'demo-clean.html' : req.url);
            
            // Security: prevent directory traversal
            if (!filePath.startsWith(directory)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                
                // Set content type
                const ext = path.extname(filePath);
                const contentType = {
                    '.html': 'text/html',
                    '.js': 'text/javascript',
                    '.json': 'application/json',
                    '.png': 'image/png'
                }[ext] || 'text/plain';
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
        });
        
        server.listen(port, () => {
            resolve(server);
        });
        
        server.on('error', reject);
    });
}

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
    const docsDir = path.join(path.dirname(demoDir), 'docs');
    const port = 8765;
    const demoUrl = `http://localhost:${port}/demo-clean.html`;

    // Ensure docs directory exists
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    console.log('\n' + '='.repeat(70));
    console.log('GOAL PORTFOLIO VIEWER - AUTOMATED SCREENSHOT CAPTURE');
    console.log('='.repeat(70));
    console.log(`\nDemo URL: ${demoUrl}`);
    console.log(`Docs directory: ${docsDir}\n`);

    // Start HTTP server
    console.log(`🌐 Starting local server on port ${port}...`);
    const server = await startServer(demoDir, port);
    console.log('   ✓ Server started');

    // Launch browser
    console.log('🌐 Launching browser...');
    const browser = await playwright.chromium.launch({
        headless: true
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        console.log('Browser console:', msg.text());
    });
    
    page.on('pageerror', error => {
        console.error('Browser error:', error);
    });

    try {
        // Navigate to demo page
        console.log('📂 Loading demo page...');
        await page.goto(demoUrl, { waitUntil: 'networkidle' });
        
        // Wait a bit for scripts to initialize
        await page.waitForTimeout(2000);
        
        // Check if button exists
        const buttonExists = await page.$('.gpv-trigger-btn');
        if (!buttonExists) {
            // Debug: capture console logs
            console.log('⚠️  Button not found, checking console logs...');
            const logs = await page.evaluate(() => {
                return window.__consoleLogs || [];
            });
            console.log('Console logs:', logs);
            
            // Take debug screenshot
            await page.screenshot({
                path: path.join(docsDir, 'debug-screenshot.png'),
                fullPage: true
            });
            console.log('   ✓ Saved debug screenshot: debug-screenshot.png');
            
            // Check if userscript loaded
            const userscriptLoaded = await page.evaluate(() => {
                return !!window.portfolioViewerDebug || document.querySelector('.gpv-trigger-btn');
            });
            console.log('Userscript loaded:', userscriptLoaded);
        }
        
        // Wait for the trigger button to appear
        console.log('⏳ Waiting for Portfolio Viewer button...');
        await page.waitForSelector('.gpv-trigger-btn', { timeout: 20000 });
        
        // Click the trigger button
        console.log('🖱️  Clicking Portfolio Viewer button...');
        await page.click('.gpv-trigger-btn');
        
        // Wait for modal to appear
        await page.waitForSelector('.gpv-overlay', { timeout: 5000 });
        await page.waitForTimeout(1000); // Wait for animations
        
        // Screenshot 1: Summary view
        console.log('📸 Capturing summary view...');
        await page.screenshot({
            path: path.join(docsDir, 'screenshot-summary.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: screenshot-summary.png');
        
        // Screenshot 2: House Purchase bucket detail
        console.log('📸 Capturing House Purchase bucket detail...');
        
        // Debug: check available options
        const options = await page.$$eval('select.gpv-select option', opts => 
            opts.map(opt => ({ value: opt.value, text: opt.textContent }))
        );
        console.log('   Available options:', options);
        
        // Select House Purchase from dropdown
        await page.selectOption('select.gpv-select', options.find(opt => opt.text.includes('House Purchase'))?.value || 'House Purchase');
        await page.waitForTimeout(1000); // Wait for view to update
        
        // Take screenshot of top section (performance graph)
        await page.screenshot({
            path: path.join(docsDir, 'house-purchase-performance.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: house-purchase-performance.png');
        
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
            path: path.join(docsDir, 'house-purchase-goals.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: house-purchase-goals.png');
        
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
        
        // Select Retirement from dropdown using value
        await page.selectOption('select.gpv-select', 'Retirement');
        await page.waitForTimeout(1000); // Wait for view to update
        
        // Take screenshot of top section (performance graph)
        await page.screenshot({
            path: path.join(docsDir, 'retirement-performance.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: retirement-performance.png');
        
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
            path: path.join(docsDir, 'retirement-goals.png'),
            fullPage: false
        });
        console.log('   ✓ Saved: retirement-goals.png');
        
        console.log('\n✅ All screenshots captured successfully!');
        console.log(`\n📁 Screenshots saved to: ${docsDir}\n`);
        
    } catch (error) {
        console.error('\n❌ Error capturing screenshots:', error.message);
        console.error('\nTry manual screenshots with: python3 take-screenshots.py\n');
        throw error;
    } finally {
        await browser.close();
        server.close();
        console.log('🛑 Server stopped');
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
