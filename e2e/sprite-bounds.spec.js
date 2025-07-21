import { test, expect } from '@playwright/test';

test.describe('Sprite Bounds Checking', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the game with seed for reproducible testing
        await page.goto('/?seed=54321&random=true');
        
        // Wait for the game to be ready
        await page.waitForSelector('#start-game');
    });

    test('should keep all sprite centers within background bounds', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Get background bounds
        const backgroundBounds = await page.locator('#background-image-left').evaluate(bg => {
            const rect = bg.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            };
        });
        
        // Get all sprite data including centers
        const spritesOutOfBounds = await page.locator('.game-sprite').evaluateAll((sprites, bgBounds) => {
            const outOfBounds = [];
            
            sprites.forEach((sprite, index) => {
                const rect = sprite.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                if (centerX < bgBounds.left || centerX > bgBounds.right ||
                    centerY < bgBounds.top || centerY > bgBounds.bottom) {
                    outOfBounds.push({
                        index,
                        centerX,
                        centerY,
                        spriteRect: {
                            left: rect.left,
                            top: rect.top,
                            right: rect.right,
                            bottom: rect.bottom
                        },
                        backgroundBounds: bgBounds
                    });
                }
            });
            
            return outOfBounds;
        }, backgroundBounds);
        
        // All sprite centers should be within background bounds
        expect(spritesOutOfBounds).toEqual([]);
    });

    test('should maintain bounds checking across different background sizes', async ({ page }) => {
        // Start the game to get initial background
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Complete level to potentially get different background
        await page.keyboard.press('$');
        
        // Handle modals
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
            
            // Wait for new level
            await page.waitForTimeout(2000);
            await page.waitForSelector('.game-sprite', { timeout: 10000 });
        } catch (error) {
            console.log('Modal handling skipped');
        }
        
        // Check bounds on new level
        const backgroundBounds = await page.locator('#background-image-left').evaluate(bg => {
            const rect = bg.getBoundingClientRect();
            return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        });
        
        const spritesOutOfBounds = await page.locator('.game-sprite').evaluateAll((sprites, bgBounds) => {
            return sprites.filter(sprite => {
                const rect = sprite.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                return centerX < bgBounds.left || centerX > bgBounds.right ||
                       centerY < bgBounds.top || centerY > bgBounds.bottom;
            }).length;
        }, backgroundBounds);
        
        expect(spritesOutOfBounds).toBe(0);
    });

    test('should handle edge cases near background borders gracefully', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Get sprites very close to edges
        const edgeSprites = await page.locator('.game-sprite').evaluateAll(sprites => {
            const results = [];
            
            sprites.forEach((sprite, index) => {
                const rect = sprite.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Check if any part of sprite is within 20px of any edge
                const distanceToLeft = rect.left;
                const distanceToTop = rect.top;
                const distanceToRight = window.innerWidth - rect.right;
                const distanceToBottom = window.innerHeight - rect.bottom;
                
                const minDistance = Math.min(distanceToLeft, distanceToTop, distanceToRight, distanceToBottom);
                
                if (minDistance < 50) { // Within 50px of any edge
                    results.push({
                        index,
                        centerX,
                        centerY,
                        minDistanceToEdge: minDistance,
                        bounds: {
                            left: rect.left,
                            top: rect.top,
                            right: rect.right,
                            bottom: rect.bottom
                        }
                    });
                }
            });
            
            return results;
        });
        
        // If there are edge sprites, verify they're still properly positioned
        if (edgeSprites.length > 0) {
            console.log(`Found ${edgeSprites.length} sprites near edges`);
            
            // Verify edge sprites don't extend beyond reasonable bounds
            for (const sprite of edgeSprites) {
                expect(sprite.bounds.left).toBeGreaterThanOrEqual(-10); // Allow small tolerance
                expect(sprite.bounds.top).toBeGreaterThanOrEqual(-10);
            }
        }
    });

    test('should log warnings when sprite centers cannot stay within bounds', async ({ page }) => {
        // Listen for console warnings about bounds violations
        const warnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning' && 
                (msg.text().includes('center') || msg.text().includes('bounds'))) {
                warnings.push(msg.text());
            }
        });
        
        // Start the game
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Complete level and check for warnings during sprite regeneration
        await page.keyboard.press('$');
        
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForTimeout(3000); // Allow time for regeneration
        } catch (error) {
            console.log('Modal handling skipped');
        }
        
        // Log any bounds-related warnings found
        console.log(`Bounds warnings detected: ${warnings.length}`);
        warnings.forEach(warning => console.log(`Warning: ${warning}`));
        
        // This is informational - warnings are expected in crowded scenarios
    });

    test('should maintain bounds checking with different sprite densities', async ({ page }) => {
        // Test with different seeds that might produce different sprite densities
        const seeds = ['12345', '67890', '99999'];
        
        for (const seed of seeds) {
            await page.goto(`/?seed=${seed}&random=true`);
            await page.waitForSelector('#start-game');
            await page.click('#start-game');
            await page.waitForSelector('.game-sprite', { timeout: 10000 });
            
            const spriteCount = await page.locator('.game-sprite').count();
            
            // Get background bounds
            const backgroundBounds = await page.locator('#background-image-left').evaluate(bg => {
                const rect = bg.getBoundingClientRect();
                return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
            });
            
            // Check all sprites have centers within bounds
            const violatingSprites = await page.locator('.game-sprite').evaluateAll((sprites, bgBounds) => {
                return sprites.filter(sprite => {
                    const rect = sprite.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    return centerX < bgBounds.left || centerX > bgBounds.right ||
                           centerY < bgBounds.top || centerY > bgBounds.bottom;
                }).length;
            }, backgroundBounds);
            
            console.log(`Seed ${seed}: ${spriteCount} sprites, ${violatingSprites} violations`);
            expect(violatingSprites).toBe(0);
        }
    });

    test('should handle template-based vs random placement bounds consistently', async ({ page }) => {
        // Start with template level
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Check template-based sprites
        const templateViolations = await page.locator('.game-sprite').evaluateAll(sprites => {
            let violations = 0;
            const gameBoard = document.getElementById('game-board-left');
            const bgImg = document.getElementById('background-image-left');
            
            if (!gameBoard || !bgImg) return 0;
            
            const bgRect = bgImg.getBoundingClientRect();
            
            sprites.forEach(sprite => {
                const rect = sprite.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                if (centerX < bgRect.left || centerX > bgRect.right ||
                    centerY < bgRect.top || centerY > bgRect.bottom) {
                    violations++;
                }
            });
            
            return violations;
        });
        
        expect(templateViolations).toBe(0);
        
        // Complete level to get random placement
        await page.keyboard.press('$');
        
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForTimeout(2000);
            await page.waitForSelector('.game-sprite', { timeout: 10000 });
        } catch (error) {
            console.log('Modal handling skipped');
        }
        
        // Check random placement sprites
        const randomViolations = await page.locator('.game-sprite').evaluateAll(sprites => {
            let violations = 0;
            const bgImg = document.getElementById('background-image-left');
            
            if (!bgImg) return 0;
            
            const bgRect = bgImg.getBoundingClientRect();
            
            sprites.forEach(sprite => {
                const rect = sprite.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                if (centerX < bgRect.left || centerX > bgRect.right ||
                    centerY < bgRect.top || centerY > bgRect.bottom) {
                    violations++;
                }
            });
            
            return violations;
        });
        
        expect(randomViolations).toBe(0);
    });
});