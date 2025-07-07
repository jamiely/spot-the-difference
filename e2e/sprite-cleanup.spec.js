import { test, expect } from '@playwright/test';

test.describe('Sprite Cleanup Between Levels', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the game with seed for reproducible testing
        await page.goto('http://localhost:3000/?seed=12345');
        
        // Wait for the game to be ready
        await page.waitForSelector('#start-game');
    });

    test('should remove all sprites when transitioning between levels', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for initial sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Count initial sprites
        const initialSprites = await page.locator('.game-sprite').count();
        expect(initialSprites).toBeGreaterThan(0);
        
        // Get the specific sprite elements for tracking
        const initialSpriteIds = await page.locator('.game-sprite').evaluateAll(sprites => 
            sprites.map(sprite => ({
                left: sprite.style.left,
                top: sprite.style.top,
                src: sprite.src
            }))
        );
        
        // Complete the level quickly using the reveal feature
        await page.keyboard.press('!');
        
        // Handle the level completion modal
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            // If there's a level progression modal, handle it
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
        } catch (error) {
            // Modals might not appear in all test scenarios
            console.log('Modal handling skipped');
        }
        
        // Wait a moment for level transition
        await page.waitForTimeout(1000);
        
        // Check that new sprites are loaded (different from the initial ones)
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        const newSprites = await page.locator('.game-sprite').count();
        expect(newSprites).toBeGreaterThan(0);
        
        // Verify that the new sprites are actually different from the initial ones
        const newSpriteIds = await page.locator('.game-sprite').evaluateAll(sprites => 
            sprites.map(sprite => ({
                left: sprite.style.left,
                top: sprite.style.top,
                src: sprite.src
            }))
        );
        
        // At least some sprites should be in different positions or be different sprites
        const identicalSprites = newSpriteIds.filter(newSprite => 
            initialSpriteIds.some(oldSprite => 
                oldSprite.left === newSprite.left && 
                oldSprite.top === newSprite.top && 
                oldSprite.src === newSprite.src
            )
        );
        
        // Not all sprites should be identical (indicating proper cleanup and regeneration)
        expect(identicalSprites.length).toBeLessThan(Math.min(initialSpriteIds.length, newSpriteIds.length));
    });

    test('should remove all difference markers when transitioning between levels', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Reveal all differences to create markers
        await page.keyboard.press('!');
        
        // Wait for difference markers to appear
        await page.waitForSelector('.difference-marker', { timeout: 5000 });
        
        const initialMarkers = await page.locator('.difference-marker').count();
        expect(initialMarkers).toBeGreaterThan(0);
        
        // Handle level completion and progression
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            // If there's a level progression modal, accept it
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
        } catch (error) {
            console.log('Modal handling skipped');
        }
        
        // Wait for level transition
        await page.waitForTimeout(1000);
        
        // Check that no old difference markers remain
        const remainingMarkers = await page.locator('.difference-marker').count();
        expect(remainingMarkers).toBe(0);
    });

    test('should clear sprite positioning data between levels', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to load
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Get sprite positions from first level
        const firstLevelPositions = await page.locator('.game-sprite').evaluateAll(sprites => 
            sprites.map(sprite => {
                const rect = sprite.getBoundingClientRect();
                return {
                    x: rect.left,
                    y: rect.top,
                    className: sprite.className
                };
            })
        );
        
        // Complete the level
        await page.keyboard.press('!');
        
        // Handle modals
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
        } catch (error) {
            console.log('Modal handling skipped');
        }
        
        // Wait for new level to load
        await page.waitForTimeout(1000);
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Get sprite positions from second level
        const secondLevelPositions = await page.locator('.game-sprite').evaluateAll(sprites => 
            sprites.map(sprite => {
                const rect = sprite.getBoundingClientRect();
                return {
                    x: rect.left,
                    y: rect.top,
                    className: sprite.className
                };
            })
        );
        
        // Verify positions are different (indicating proper cleanup and regeneration)
        expect(secondLevelPositions.length).toBeGreaterThan(0);
        
        // At least some positions should be different
        const identicalPositions = secondLevelPositions.filter(newPos => 
            firstLevelPositions.some(oldPos => 
                Math.abs(oldPos.x - newPos.x) < 5 && Math.abs(oldPos.y - newPos.y) < 5
            )
        );
        
        expect(identicalPositions.length).toBeLessThan(Math.min(firstLevelPositions.length, secondLevelPositions.length));
    });

    test('should not have orphaned sprites in DOM after level transition', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to load
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Complete the level
        await page.keyboard.press('!');
        
        // Handle modals
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
        } catch (error) {
            console.log('Modal handling skipped');
        }
        
        // Wait for new level
        await page.waitForTimeout(1000);
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Check that all sprites are properly contained within game boards
        const orphanedSprites = await page.evaluate(() => {
            const allSprites = document.querySelectorAll('.game-sprite');
            const leftBoard = document.getElementById('game-board-left');
            const rightBoard = document.getElementById('game-board-right');
            
            const orphaned = [];
            allSprites.forEach(sprite => {
                if (!leftBoard.contains(sprite) && !rightBoard.contains(sprite)) {
                    orphaned.push({
                        src: sprite.src,
                        parent: sprite.parentElement ? sprite.parentElement.id : 'no parent'
                    });
                }
            });
            
            return orphaned;
        });
        
        expect(orphanedSprites).toEqual([]);
    });

    test('should maintain proper sprite count range between levels', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to load
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        const firstLevelSpriteCount = await page.locator('.game-sprite').count();
        expect(firstLevelSpriteCount).toBeGreaterThan(0);
        expect(firstLevelSpriteCount).toBeLessThan(100); // Reasonable upper bound
        
        // Complete the level
        await page.keyboard.press('!');
        
        // Handle modals
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
        } catch (error) {
            console.log('Modal handling skipped');
        }
        
        // Wait for new level
        await page.waitForTimeout(1000);
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        const secondLevelSpriteCount = await page.locator('.game-sprite').count();
        expect(secondLevelSpriteCount).toBeGreaterThan(0);
        expect(secondLevelSpriteCount).toBeLessThan(100); // Reasonable upper bound
        
        // Sprite counts should be in a reasonable range and potentially different
        expect(Math.abs(firstLevelSpriteCount - secondLevelSpriteCount)).toBeLessThanOrEqual(20);
    });
});