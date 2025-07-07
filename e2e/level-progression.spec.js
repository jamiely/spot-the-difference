import { test, expect } from '@playwright/test';

test.describe('Level Progression System', () => {
  
  test('Should progress to next level after completing template level', async ({ page }) => {
    // Set up dialog handler to accept level progression
    page.on('dialog', async dialog => {
      console.log(`Dialog appeared: ${dialog.message()}`);
      await dialog.accept(); // Accept to continue to next level
    });
    
    await page.goto('/');
    await page.waitForTimeout(5000); // Wait for auto-start to complete
    
    // The game should auto-start, so verify it started properly
    const leftBg = page.locator('#background-image-left');
    const rightBg = page.locator('#background-image-right');
    await expect(leftBg).toBeVisible();
    await expect(rightBg).toBeVisible();
    
    // Get initial background source to verify it's a template
    const initialBgSrc = await leftBg.getAttribute('src');
    expect(initialBgSrc).toContain('bookcase'); // Template1 uses bookcase background
    
    // Verify sprites are present on both sides
    const leftSprites = page.locator('#game-board-left .game-sprite');
    const rightSprites = page.locator('#game-board-right .game-sprite');
    await expect(leftSprites.first()).toBeVisible();
    
    const leftCount = await leftSprites.count();
    const rightCount = await rightSprites.count();
    
    // Should have differences (right side has fewer sprites)
    expect(leftCount).toBeGreaterThan(0);
    expect(rightCount).toBeLessThan(leftCount);
    
    // Calculate how many differences to find
    const differencesToFind = leftCount - rightCount;
    console.log(`Need to find ${differencesToFind} differences`);
    
    // Find all differences by clicking on left-side sprites that don't have counterparts on right
    let foundDifferences = 0;
    for (let i = 0; i < leftCount; i++) {
      const leftSprite = leftSprites.nth(i);
      const spriteBox = await leftSprite.boundingBox();
      
      if (spriteBox) {
        // Click on the sprite center
        await page.mouse.click(spriteBox.x + spriteBox.width / 2, spriteBox.y + spriteBox.height / 2);
        await page.waitForTimeout(300);
        
        // Check if this created a difference marker
        const markers = page.locator('.difference-marker.found');
        const currentMarkerCount = await markers.count();
        
        if (currentMarkerCount > foundDifferences) {
          foundDifferences++;
          console.log(`Found difference ${foundDifferences}/${differencesToFind}`);
          
          if (foundDifferences >= differencesToFind) {
            break;
          }
        }
      }
    }
    
    // Wait for level completion dialog
    await page.waitForTimeout(1000);
    
    // Handle the level completion alert/confirm dialog
    page.on('dialog', async dialog => {
      console.log(`Dialog appeared: ${dialog.message()}`);
      // Accept to continue to next level
      await dialog.accept();
    });
    
    // Trigger the dialog if it hasn't appeared yet by finding the last difference
    if (foundDifferences < differencesToFind) {
      // Try clicking on more sprites to complete the level
      for (let i = 0; i < leftCount; i++) {
        const leftSprite = leftSprites.nth(i);
        const spriteBox = await leftSprite.boundingBox();
        
        if (spriteBox) {
          await page.mouse.click(spriteBox.x + spriteBox.width / 2, spriteBox.y + spriteBox.height / 2);
          await page.waitForTimeout(300);
        }
      }
    }
    
    // Wait for potential level transition and dialogs
    await page.waitForTimeout(5000);
    
    // Verify that backgrounds are still visible after level completion
    await expect(leftBg).toBeVisible();
    await expect(rightBg).toBeVisible();
    
    // Check if new background loaded - it should be different now!
    const newBgSrc = await leftBg.getAttribute('src');
    console.log(`Initial background: ${initialBgSrc}`);
    console.log(`New background: ${newBgSrc}`);
    
    // THIS IS THE MAIN ASSERTION - the background should change
    expect(newBgSrc).not.toBe(initialBgSrc);
    console.log(`✅ Successfully progressed from ${initialBgSrc} to ${newBgSrc}`);
    
    // Verify new level has sprites with differences
    await expect(leftSprites.first()).toBeVisible();
    const newLeftCount = await leftSprites.count();
    const newRightCount = await rightSprites.count();
    expect(newLeftCount).toBeGreaterThan(0);
    expect(newRightCount).toBeLessThan(newLeftCount);
    
    // Most importantly: verify backgrounds didn't disappear
    const leftBgDisplay = await leftBg.evaluate(el => window.getComputedStyle(el).display);
    const rightBgDisplay = await rightBg.evaluate(el => window.getComputedStyle(el).display);
    
    expect(leftBgDisplay).not.toBe('none');
    expect(rightBgDisplay).not.toBe('none');
    
    // Verify game boards are still visible
    const leftBoard = page.locator('#game-board-left');
    const rightBoard = page.locator('#game-board-right');
    await expect(leftBoard).toBeVisible();
    await expect(rightBoard).toBeVisible();
  });
  
  test('Should handle level progression with user declining next level', async ({ page }) => {
    await page.goto('/'); // Test actual level progression without test mode
    await page.waitForTimeout(3000);
    
    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.waitForTimeout(2000);
    
    // Verify initial state
    const leftBg = page.locator('#background-image-left');
    await expect(leftBg).toBeVisible();
    
    // Set up dialog handler to decline next level
    page.on('dialog', async dialog => {
      console.log(`Dialog: ${dialog.message()}`);
      if (dialog.message().includes('Ready for the next level?')) {
        await dialog.dismiss(); // Decline next level
      } else {
        await dialog.accept(); // Accept other dialogs
      }
    });
    
    // Complete the level (simplified - just use reveal all differences and click on actual sprites)
    await page.keyboard.press('!');
    await page.waitForTimeout(1000);
    
    // Click on left-side sprites to complete the level (avoid clicking markers which are non-interactive)
    const leftSprites = page.locator('#game-board-left .game-sprite');
    if (await leftSprites.count() > 0) {
      const firstSprite = leftSprites.first();
      const spriteBox = await firstSprite.boundingBox();
      if (spriteBox) {
        await page.mouse.click(spriteBox.x + spriteBox.width / 2, spriteBox.y + spriteBox.height / 2);
        await page.waitForTimeout(500);
      }
    }
    
    // After declining, game should stop but backgrounds should remain visible
    await page.waitForTimeout(2000);
    
    // Verify backgrounds are still visible
    await expect(leftBg).toBeVisible();
    const leftBgDisplay = await leftBg.evaluate(el => window.getComputedStyle(el).display);
    expect(leftBgDisplay).not.toBe('none');
    
    // Verify game is no longer active (start button should be enabled)
    const startButton = page.getByRole('button', { name: 'Start Game' });
    await expect(startButton).toBeEnabled();
  });
});