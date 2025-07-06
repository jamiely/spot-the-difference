import { test, expect } from '@playwright/test';

test.describe('Debug Menu Functionality', () => {
  
  test('Debug menu access and background loading', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for game to auto-start
    
    // Press ? key to open debug menu
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    
    // Verify debug menu modal appears
    const debugMenu = page.locator('.debug-overlay');
    await expect(debugMenu).toBeVisible();
    
    // Verify debug menu has title
    const menuTitle = page.getByRole('heading', { name: 'Debug Menu' });
    await expect(menuTitle).toBeVisible();
    
    // Verify background dropdown is present and populated
    const backgroundSelect = page.getByLabel('Background:');
    await expect(backgroundSelect).toBeVisible();
    
    // Get available options
    const options = await backgroundSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(5); // Should have many background options
    
    // Verify Load button is present
    const loadButton = page.getByRole('button', { name: 'Load' });
    await expect(loadButton).toBeVisible();
    
    // Verify instructions are present
    await expect(page.getByText('Press "?" to toggle • ESC to close')).toBeVisible();
  });

  test('Load specific background via debug menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for game to auto-start
    
    // Get initial background source
    const leftBg = page.locator('#background-image-left');
    const rightBg = page.locator('#background-image-right');
    const initialLeftSrc = await leftBg.getAttribute('src');
    
    // Open debug menu
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    
    // Select classroom background
    const backgroundSelect = page.getByLabel('Background:');
    await backgroundSelect.selectOption('classroom');
    
    // Click Load button
    const loadButton = page.getByRole('button', { name: 'Load' });
    await loadButton.click();
    
    // Wait for background to load
    await page.waitForTimeout(3000);
    
    // Verify debug menu closes automatically
    const debugMenu = page.locator('.debug-overlay');
    await expect(debugMenu).not.toBeVisible();
    
    // Verify new background images load on both sides
    const newLeftSrc = await leftBg.getAttribute('src');
    const newRightSrc = await rightBg.getAttribute('src');
    
    // Background should have changed to classroom
    expect(newLeftSrc).toContain('classroom');
    expect(newRightSrc).toContain('classroom');
    expect(newLeftSrc).not.toBe(initialLeftSrc);
    
    // Verify sprites are present on the new background
    const leftSprites = page.locator('#game-board-left .game-sprite');
    const rightSprites = page.locator('#game-board-right .game-sprite');
    
    await expect(leftSprites.first()).toBeVisible();
    
    const leftCount = await leftSprites.count();
    const rightCount = await rightSprites.count();
    
    // Should have sprites and differences
    expect(leftCount).toBeGreaterThan(0);
    expect(rightCount).toBeLessThan(leftCount); // Differences mean fewer on right
  });

  test('Game functionality works with loaded background', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Load a different background via debug menu
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    
    const backgroundSelect = page.getByLabel('Background:');
    await backgroundSelect.selectOption('library');
    await page.getByRole('button', { name: 'Load' }).click();
    await page.waitForTimeout(3000);
    
    // Verify the game is functional with the new background
    // Check that background changed
    const leftBg = page.locator('#background-image-left');
    const bgSrc = await leftBg.getAttribute('src');
    expect(bgSrc).toContain('library');
    
    // Verify sprites are present and game is ready
    const leftSprites = page.locator('#game-board-left .game-sprite');
    const rightSprites = page.locator('#game-board-right .game-sprite');
    
    await expect(leftSprites.first()).toBeVisible();
    
    const leftCount = await leftSprites.count();
    const rightCount = await rightSprites.count();
    
    // Should have sprites and differences (right side has fewer)
    expect(leftCount).toBeGreaterThan(0);
    expect(rightCount).toBeLessThan(leftCount);
    
    // Verify score display is functional
    const scoreElement = page.locator('.score');
    await expect(scoreElement).toContainText('0');
  });

  test('Test multiple background switches', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    const leftBg = page.locator('#background-image-left');
    const backgroundSources = [];
    
    // Test switching between different backgrounds
    const backgrounds = ['classroom', 'library', 'gymnasium'];
    
    for (const bg of backgrounds) {
      await page.keyboard.press('?');
      await page.waitForTimeout(500);
      
      const backgroundSelect = page.getByLabel('Background:');
      await backgroundSelect.selectOption(bg);
      await page.getByRole('button', { name: 'Load' }).click();
      await page.waitForTimeout(2000);
      
      const currentSrc = await leftBg.getAttribute('src');
      backgroundSources.push(currentSrc);
      
      // Verify sprites are still present
      const sprites = page.locator('#game-board-left .game-sprite');
      await expect(sprites.first()).toBeVisible();
      
      // Verify background changed
      expect(currentSrc).toContain(bg);
    }
    
    // Verify we actually switched backgrounds
    const uniqueSources = [...new Set(backgroundSources)];
    expect(uniqueSources.length).toBe(3); // Should have 3 different backgrounds
  });

  test('Debug menu closes on escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Open debug menu
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    
    const debugMenu = page.locator('.debug-overlay');
    await expect(debugMenu).toBeVisible();
    
    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Verify menu closes
    await expect(debugMenu).not.toBeVisible();
    
    // Verify game is still functional
    await expect(page.locator('#game-board-left')).toBeVisible();
    await expect(page.locator('#game-board-right')).toBeVisible();
  });
});