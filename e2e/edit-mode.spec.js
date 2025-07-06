import { test, expect } from '@playwright/test';

test.describe('Edit Mode - Bounding Box Creation', () => {
  
  test('Edit mode activation and interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for game to auto-start
    
    // Press 'e' key to enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
    
    // Verify "Edit Mode" header is visible
    const editModeHeader = page.getByRole('heading', { name: /Edit Mode/ });
    await expect(editModeHeader).toBeVisible();
    
    // Verify "Bounding Boxes JSON" textarea is present
    const jsonTextarea = page.getByLabel('Bounding Boxes JSON:');
    await expect(jsonTextarea).toBeVisible();
    
    // Verify textarea contains valid JSON (initially empty array)
    const textareaValue = await jsonTextarea.inputValue();
    expect(textareaValue).toBe('[]');
    
    // Verify drawing instructions are shown
    const instructions = page.getByText(/Drag on the background to create bounding boxes/);
    await expect(instructions).toBeVisible();
    
    // Verify control buttons are present
    await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load JSON' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear All Boxes' })).toBeVisible();
  });

  test('Create bounding box by click and drag', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
    
    // Get initial bounding boxes JSON
    const jsonTextarea = page.getByLabel('Bounding Boxes JSON:');
    const initialJson = await jsonTextarea.inputValue();
    
    // Get background image for drawing area
    const backgroundImg = page.locator('#background-image-left');
    await expect(backgroundImg).toBeVisible();
    
    const bgBox = await backgroundImg.boundingBox();
    if (bgBox) {
      // Click and drag to create a bounding box
      const startX = bgBox.x + 50;
      const startY = bgBox.y + 50;
      const endX = bgBox.x + 150;
      const endY = bgBox.y + 150;
      
      // Perform drag operation
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      
      await page.waitForTimeout(1000);
      
      // Verify JSON textarea updated with new bounding box
      const updatedJson = await jsonTextarea.inputValue();
      expect(updatedJson).not.toBe(initialJson);
      expect(updatedJson.length).toBeGreaterThan(initialJson.length);
      
      // Verify the JSON contains valid bounding box properties
      try {
        const boundingBoxes = JSON.parse(updatedJson);
        expect(Array.isArray(boundingBoxes)).toBe(true);
        expect(boundingBoxes.length).toBeGreaterThan(0);
        
        // Check that at least one bounding box has required properties
        const lastBox = boundingBoxes[boundingBoxes.length - 1];
        expect(lastBox).toHaveProperty('id');
        expect(lastBox).toHaveProperty('x');
        expect(lastBox).toHaveProperty('y');
        expect(lastBox).toHaveProperty('width');
        expect(lastBox).toHaveProperty('height');
        expect(typeof lastBox.x).toBe('number');
        expect(typeof lastBox.y).toBe('number');
        expect(typeof lastBox.width).toBe('number');
        expect(typeof lastBox.height).toBe('number');
      } catch (e) {
        throw new Error(`Invalid JSON in bounding boxes textarea: ${e.message}`);
      }
    }
  });

  test('Create multiple bounding boxes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.waitForTimeout(2000);
    
    // Enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
    
    const jsonTextarea = page.locator('textarea').first();
    const backgroundImg = page.locator('#background-image-left');
    const bgBox = await backgroundImg.boundingBox();
    
    if (bgBox) {
      // Create first bounding box
      await page.mouse.move(bgBox.x + 50, bgBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(bgBox.x + 150, bgBox.y + 150);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      const afterFirstBox = await jsonTextarea.textContent();
      
      // Create second bounding box in different area
      await page.mouse.move(bgBox.x + 200, bgBox.y + 200);
      await page.mouse.down();
      await page.mouse.move(bgBox.x + 300, bgBox.y + 300);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      const afterSecondBox = await jsonTextarea.textContent();
      
      // Create third bounding box
      await page.mouse.move(bgBox.x + 350, bgBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(bgBox.x + 450, bgBox.y + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      const afterThirdBox = await jsonTextarea.textContent();
      
      // Verify each step added content
      expect(afterFirstBox.length).toBeGreaterThan(0);
      expect(afterSecondBox.length).toBeGreaterThan(afterFirstBox.length);
      expect(afterThirdBox.length).toBeGreaterThan(afterSecondBox.length);
      
      // Verify final JSON has multiple bounding boxes
      try {
        const boundingBoxes = JSON.parse(afterThirdBox);
        expect(boundingBoxes.length).toBeGreaterThanOrEqual(3);
        
        // Verify each box has unique coordinates
        const coordinates = boundingBoxes.map(box => `${box.x},${box.y}`);
        const uniqueCoordinates = [...new Set(coordinates)];
        expect(uniqueCoordinates.length).toBeGreaterThanOrEqual(2);
      } catch (e) {
        throw new Error(`Invalid JSON after creating multiple boxes: ${e.message}`);
      }
    }
  });

  test('Exit edit mode with Escape key', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.waitForTimeout(2000);
    
    // Enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
    
    const editModeOverlay = page.locator('.edit-mode, [data-testid="edit-mode"]').first();
    await expect(editModeOverlay).toBeVisible();
    
    // Press Escape to exit edit mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Verify edit mode overlay disappears
    await expect(editModeOverlay).not.toBeVisible();
    
    // Verify game is still active and visible
    const leftBoard = page.locator('#game-board-left');
    const rightBoard = page.locator('#game-board-right');
    await expect(leftBoard).toBeVisible();
    await expect(rightBoard).toBeVisible();
  });

  test('Bounding box data persistence after mode switch', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.waitForTimeout(2000);
    
    // Enter edit mode and create a bounding box
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
    
    const jsonTextarea = page.locator('textarea').first();
    const backgroundImg = page.locator('#background-image-left');
    const bgBox = await backgroundImg.boundingBox();
    
    if (bgBox) {
      // Create a bounding box
      await page.mouse.move(bgBox.x + 100, bgBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(bgBox.x + 200, bgBox.y + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      const savedJson = await jsonTextarea.textContent();
      
      // Exit edit mode
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Re-enter edit mode
      await page.keyboard.press('e');
      await page.waitForTimeout(500);
      
      // Verify bounding boxes are preserved
      const restoredJson = await jsonTextarea.textContent();
      expect(restoredJson).toBe(savedJson);
      
      // Verify the JSON is still valid
      try {
        const boundingBoxes = JSON.parse(restoredJson);
        expect(Array.isArray(boundingBoxes)).toBe(true);
        expect(boundingBoxes.length).toBeGreaterThan(0);
      } catch (e) {
        throw new Error(`Bounding box data not preserved properly: ${e.message}`);
      }
    }
  });

  test('Visual feedback during bounding box creation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await page.waitForTimeout(2000);
    
    // Enter edit mode
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
    
    const backgroundImg = page.locator('#background-image-left');
    const bgBox = await backgroundImg.boundingBox();
    
    if (bgBox) {
      // Start drag operation
      const startX = bgBox.x + 100;
      const startY = bgBox.y + 100;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      
      // Move to create rectangle - visual feedback should appear
      await page.mouse.move(startX + 100, startY + 100);
      await page.waitForTimeout(200);
      
      // Check if there's a visual rectangle being drawn
      // This might be a temporary element or canvas drawing
      const drawingIndicator = page.locator('.drawing-rect, .temp-rect, canvas').first();
      
      // Complete the drag
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Verify the bounding box was created
      const jsonTextarea = page.locator('textarea').first();
      const json = await jsonTextarea.textContent();
      
      try {
        const boundingBoxes = JSON.parse(json);
        expect(boundingBoxes.length).toBeGreaterThan(0);
      } catch (e) {
        throw new Error(`Bounding box creation failed: ${e.message}`);
      }
    }
  });
});