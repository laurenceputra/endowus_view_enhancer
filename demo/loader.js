/**
 * Standalone version of Goal Portfolio Viewer for demo purposes
 * This version doesn't require Tampermonkey and works with mock data
 */

(function() {
    'use strict';

    // Load the userscript code by copying relevant parts
    // Since we can't easily modify the original userscript, we'll fetch it and evaluate it
    
    // For the demo, we need to bypass the URL checking
    // Override the shouldShowButton function to always return true
    const originalShouldShowButton = window.shouldShowButton;
    
    // Inject a global flag to indicate we're in demo mode
    window.__GPV_DEMO_MODE__ = true;
    
    // Load the main userscript
    fetch('../tampermonkey/goal_portfolio_viewer.user.js')
        .then(response => response.text())
        .then(scriptContent => {
            // Remove the userscript metadata block
            scriptContent = scriptContent.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');
            
            // Modify shouldShowButton to always return true in demo mode
            scriptContent = scriptContent.replace(
                /function shouldShowButton\(\) \{[\s\S]*?return.*?;[\s\S]*?\}/,
                'function shouldShowButton() { if (window.__GPV_DEMO_MODE__) return true; return window.location.href === "https://app.sg.endowus.com/dashboard"; }'
            );
            
            // Evaluate the script
            eval(scriptContent);
            
            console.log('[Demo] Userscript loaded successfully');
            
            // Create and show the trigger button
            if (typeof createButton === 'function' && typeof updateButtonVisibility === 'function') {
                setTimeout(() => {
                    updateButtonVisibility();
                }, 500);
            }
        })
        .catch(error => {
            console.error('[Demo] Failed to load userscript:', error);
            alert('Failed to load the userscript. Please check the console for details.');
        });
})();
