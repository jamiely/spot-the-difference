import { test, expect } from '@playwright/test';

test.describe('Sprite Obscuration Prevention', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the game with seed for reproducible testing and force random mode
        await page.goto('/?seed=12345&random=true');
        
        // Wait for the game to be ready
        await page.waitForSelector('#start-game');
    });

    test('should prevent sprites from being more than 90% obscured by other sprites', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Get all sprite positions and sizes
        const spriteData = await page.locator('.game-sprite').evaluateAll(sprites => {
            return sprites.map(sprite => {
                const rect = sprite.getBoundingClientRect();
                return {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    id: sprite.dataset.spriteSrc || sprite.src.split('/').pop()
                };
            });
        });
        
        // Check that no sprite is more than 70% obscured by others
        for (let i = 0; i < spriteData.length; i++) {
            const sprite = spriteData[i];
            let totalObscurationArea = 0;
            const spriteArea = sprite.width * sprite.height;
            
            for (let j = 0; j < spriteData.length; j++) {
                if (i !== j) {
                    const other = spriteData[j];
                    
                    // Calculate intersection area
                    const left = Math.max(sprite.x, other.x);
                    const right = Math.min(sprite.x + sprite.width, other.x + other.width);
                    const top = Math.max(sprite.y, other.y);
                    const bottom = Math.min(sprite.y + sprite.height, other.y + other.height);
                    
                    if (left < right && top < bottom) {
                        const intersectionArea = (right - left) * (bottom - top);
                        totalObscurationArea += intersectionArea;
                    }
                }
            }
            
            const obscurationPercentage = (totalObscurationArea / spriteArea) * 100;
            expect(obscurationPercentage).toBeLessThanOrEqual(90);
        }
    });

    test('should maintain reasonable sprite spacing to prevent over-crowding', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Count total sprites
        const spriteCount = await page.locator('.game-sprite').count();
        expect(spriteCount).toBeGreaterThan(0);
        
        // Get background area
        const backgroundArea = await page.locator('#background-image-left').evaluate(bg => {
            const rect = bg.getBoundingClientRect();
            return rect.width * rect.height;
        });
        
        // Calculate approximate sprite area coverage
        const averageSpriteSize = 80 * 80; // Approximate sprite size
        const totalSpriteArea = spriteCount * averageSpriteSize;
        const coveragePercentage = (totalSpriteArea / backgroundArea) * 100;
        
        // Should not exceed reasonable coverage to maintain playability
        expect(coveragePercentage).toBeLessThanOrEqual(200); // Reasonable upper bound allowing for overlap
    });

    test('should show proper sprite distribution across bounding boxes', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Get all sprite positions
        const spritePositions = await page.locator('.game-sprite').evaluateAll(sprites => {
            return sprites.map(sprite => {
                const rect = sprite.getBoundingClientRect();
                return {
                    centerX: rect.left + rect.width / 2,
                    centerY: rect.top + rect.height / 2
                };
            });
        });
        
        // Check that sprites are not all clustered in one tiny area
        const xPositions = spritePositions.map(pos => pos.centerX);
        const yPositions = spritePositions.map(pos => pos.centerY);
        
        const xRange = Math.max(...xPositions) - Math.min(...xPositions);
        const yRange = Math.max(...yPositions) - Math.min(...yPositions);
        
        // Should have reasonable distribution
        expect(xRange).toBeGreaterThan(100); // Sprites spread across at least 100px horizontally
        expect(yRange).toBeGreaterThan(100); // Sprites spread across at least 100px vertically
    });

    test('should handle sprite placement when area becomes crowded', async ({ page }) => {
        // Navigate with a high sprite count to test crowding
        await page.goto('/?seed=99999&random=true');
        await page.waitForSelector('#start-game');
        
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 15000 });
        
        // Even with high sprite count, should not crash or create invalid layouts
        const spriteCount = await page.locator('.game-sprite').count();
        expect(spriteCount).toBeGreaterThan(0);
        
        // Check that most sprites are visible and properly positioned
        const visibleSprites = await page.locator('.game-sprite:visible').count();
        expect(visibleSprites).toBeGreaterThanOrEqual(spriteCount - 5); // Allow some sprites to be hidden due to strict collision detection
        
        // Verify no sprites are positioned outside the game area
        const backgroundRect = await page.locator('#background-image-left').evaluate(bg => {
            const rect = bg.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom
            };
        });
        
        const outOfBoundsSprites = await page.locator('.game-sprite').evaluateAll((sprites, bgRect) => {
            return sprites.filter(sprite => {
                const rect = sprite.getBoundingClientRect();
                return rect.left < bgRect.left - 50 || // Allow some tolerance
                       rect.top < bgRect.top - 50 ||
                       rect.right > bgRect.right + 50 ||
                       rect.bottom > bgRect.bottom + 50;
            });
        }, backgroundRect);
        
        expect(outOfBoundsSprites.length).toBe(0);
    });

    test('should log obscuration warnings when placement is difficult', async ({ page }) => {
        // Listen for console warnings about obscuration
        const warnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning' && msg.text().includes('obscured')) {
                warnings.push(msg.text());
            }
        });
        
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Complete the level and move to next to trigger new sprite generation
        await page.keyboard.press('$');
        
        // Handle modals if they appear
        try {
            await page.waitForSelector('.game-modal-overlay', { timeout: 5000 });
            await page.click('[data-action="confirm"]');
            
            await page.waitForSelector('.game-modal-overlay', { timeout: 2000 });
            await page.click('[data-action="confirm"]');
            
            // Wait for new sprites to be generated
            await page.waitForTimeout(2000);
        } catch (error) {
            // Modals might not appear in test mode
        }
        
        // Check if any obscuration warnings were logged
        // This is informational - warnings are expected in crowded scenarios
        console.log(`Obscuration warnings detected: ${warnings.length}`);
        warnings.forEach(warning => console.log(`Warning: ${warning}`));
    });

    test('should maintain obscuration rules during random sprite placement', async ({ page }) => {
        // Start the game (already in random mode due to URL parameter)
        await page.click('#start-game');
        
        // Wait for random sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Verify obscuration rules still apply
        const spriteData = await page.locator('.game-sprite').evaluateAll(sprites => {
            return sprites.map(sprite => {
                const rect = sprite.getBoundingClientRect();
                return {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                };
            });
        });
        
        // Check obscuration for random placement
        let maxObscuration = 0;
        for (let i = 0; i < spriteData.length; i++) {
            const sprite = spriteData[i];
            let totalObscurationArea = 0;
            const spriteArea = sprite.width * sprite.height;
            
            for (let j = 0; j < spriteData.length; j++) {
                if (i !== j) {
                    const other = spriteData[j];
                    
                    const left = Math.max(sprite.x, other.x);
                    const right = Math.min(sprite.x + sprite.width, other.x + other.width);
                    const top = Math.max(sprite.y, other.y);
                    const bottom = Math.min(sprite.y + sprite.height, other.y + other.height);
                    
                    if (left < right && top < bottom) {
                        totalObscurationArea += (right - left) * (bottom - top);
                    }
                }
            }
            
            const obscurationPercentage = (totalObscurationArea / spriteArea) * 100;
            maxObscuration = Math.max(maxObscuration, obscurationPercentage);
        }
        
        // Random placement should also respect obscuration rules
        expect(maxObscuration).toBeLessThanOrEqual(90);
    });
});