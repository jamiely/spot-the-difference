import { test, expect } from '@playwright/test';

test.describe('Debug Modal Issues', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
    });

    test('should debug modal state when game ends', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for the game to start and sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Check initial state
        const modalElement = await page.locator('.game-modal-overlay');
        const isInitiallyVisible = await modalElement.isVisible();
        console.log('Modal initially visible:', isInitiallyVisible);
        
        // Check test mode
        const testMode = await page.evaluate(() => {
            return window.game ? window.game.isTestMode : 'game not found';
        });
        console.log('Test mode:', testMode);
        
        // Use the reveal all differences feature
        await page.keyboard.press('$');
        
        // Wait a bit for any async operations
        await page.waitForTimeout(2000);
        
        // Check if modal exists and its state
        const modalExists = await modalElement.count();
        console.log('Modal elements found:', modalExists);
        
        if (modalExists > 0) {
            const modalDisplay = await modalElement.evaluate(el => el.style.display);
            const modalVisible = await modalElement.isVisible();
            console.log('Modal display style:', modalDisplay);
            console.log('Modal visible:', modalVisible);
            
            // Check if game is active
            const gameActive = await page.evaluate(() => {
                return window.game ? window.game.isGameActive : 'game not found';
            });
            console.log('Game active:', gameActive);
            
            // Check differences found
            const differences = await page.evaluate(() => {
                return window.game ? {
                    total: window.game.differences.length,
                    found: window.game.foundDifferences.length
                } : 'game not found';
            });
            console.log('Differences:', differences);
        }
        
        // Force show modal for testing
        await page.evaluate(() => {
            if (window.game && window.game.modal) {
                window.game.modal.showAlert('Test Modal', 'This is a test modal');
            }
        });
        
        // Wait for the forced modal
        await page.waitForTimeout(1000);
        const forcedModalVisible = await modalElement.isVisible();
        console.log('Forced modal visible:', forcedModalVisible);
    });
});