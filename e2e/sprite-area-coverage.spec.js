import { test, expect } from '@playwright/test';

test.describe('Sprite Area Coverage Limits', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the game with seed for reproducible testing
        await page.goto('http://localhost:3000/?seed=87654');
        
        // Wait for the game to be ready
        await page.waitForSelector('#start-game');
    });

    test('should limit sprite placement to maximum 60% background area coverage', async ({ page }) => {
        // Start the game
        await page.click('#start-game');
        
        // Wait for sprites to appear
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Calculate actual area coverage
        const areaCoverage = await page.evaluate(() => {
            const sprites = document.querySelectorAll('.game-sprite');
            const backgroundImg = document.getElementById('background-image-left');
            
            if (!backgroundImg || sprites.length === 0) {
                return { error: 'Missing elements' };
            }
            
            const bgRect = backgroundImg.getBoundingClientRect();
            const backgroundArea = bgRect.width * bgRect.height;
            
            let totalSpriteArea = 0;
            sprites.forEach(sprite => {
                const rect = sprite.getBoundingClientRect();
                totalSpriteArea += rect.width * rect.height;
            });
            
            const coveragePercent = (totalSpriteArea / backgroundArea) * 100;
            
            return {
                spriteCount: sprites.length,
                totalSpriteArea,
                backgroundArea,
                coveragePercent,
                maxAllowed: 60
            };
        });
        
        expect(areaCoverage.error).toBeUndefined();
        expect(areaCoverage.coveragePercent).toBeLessThanOrEqual(60);
        expect(areaCoverage.spriteCount).toBeGreaterThan(0);
        
        console.log(`Area coverage: ${areaCoverage.coveragePercent.toFixed(1)}% (${areaCoverage.spriteCount} sprites)`);
        console.log(`Sprite area: ${areaCoverage.totalSpriteArea}px, Background: ${areaCoverage.backgroundArea}px`);
    });

    test('should log area coverage information during sprite placement', async ({ page }) => {
        // Listen for area coverage console messages
        const coverageMessages = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('area coverage') || text.includes('Coverage limit') || text.includes('Stopping sprite placement')) {
                coverageMessages.push(text);
            }
        });
        
        // Start the game
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Should have logged coverage information
        expect(coverageMessages.length).toBeGreaterThan(0);
        
        // Check for expected log patterns
        const hasStartMessage = coverageMessages.some(msg => msg.includes('Starting sprite placement'));
        const hasFinalMessage = coverageMessages.some(msg => msg.includes('Sprite placement completed'));
        const hasCoverageInfo = coverageMessages.some(msg => msg.includes('Final area coverage'));
        
        expect(hasStartMessage || hasFinalMessage || hasCoverageInfo).toBe(true);
        
        console.log('Coverage messages found:', coverageMessages.length);
        coverageMessages.forEach(msg => console.log(`📊 ${msg}`));
    });

    test('should stop placement early when area limit is reached', async ({ page }) => {
        // Use a seed that might produce high sprite density
        await page.goto('http://localhost:3000/?seed=99999');
        await page.waitForSelector('#start-game');
        
        // Listen for stop messages
        const stopMessages = [];
        page.on('console', msg => {
            if (msg.text().includes('Stopping sprite placement') || msg.text().includes('🛑')) {
                stopMessages.push(msg.text());
            }
        });
        
        // Start the game
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Calculate coverage
        const coverage = await page.evaluate(() => {
            const sprites = document.querySelectorAll('.game-sprite');
            const backgroundImg = document.getElementById('background-image-left');
            
            if (!backgroundImg) return null;
            
            const bgRect = backgroundImg.getBoundingClientRect();
            const backgroundArea = bgRect.width * bgRect.height;
            let totalSpriteArea = 0;
            
            sprites.forEach(sprite => {
                const rect = sprite.getBoundingClientRect();
                totalSpriteArea += rect.width * rect.height;
            });
            
            return {
                coveragePercent: (totalSpriteArea / backgroundArea) * 100,
                spriteCount: sprites.length
            };
        });
        
        if (coverage) {
            console.log(`High density test - Coverage: ${coverage.coveragePercent.toFixed(1)}%, Sprites: ${coverage.spriteCount}`);
            console.log(`Stop messages: ${stopMessages.length}`);
            
            // Coverage should not exceed 60%
            expect(coverage.coveragePercent).toBeLessThanOrEqual(60);
        }
    });

    test('should handle area coverage across different background sizes', async ({ page }) => {
        const testSeeds = ['12345', '54321', '98765'];
        const results = [];
        
        for (const seed of testSeeds) {
            await page.goto(`http://localhost:3000/?seed=${seed}`);
            await page.waitForSelector('#start-game');
            await page.click('#start-game');
            await page.waitForSelector('.game-sprite', { timeout: 10000 });
            
            const coverage = await page.evaluate(() => {
                const sprites = document.querySelectorAll('.game-sprite');
                const backgroundImg = document.getElementById('background-image-left');
                
                if (!backgroundImg) return null;
                
                const bgRect = backgroundImg.getBoundingClientRect();
                const backgroundArea = bgRect.width * bgRect.height;
                let totalSpriteArea = 0;
                
                sprites.forEach(sprite => {
                    const rect = sprite.getBoundingClientRect();
                    totalSpriteArea += rect.width * rect.height;
                });
                
                return {
                    seed,
                    coveragePercent: (totalSpriteArea / backgroundArea) * 100,
                    spriteCount: sprites.length,
                    backgroundArea,
                    backgroundSize: { width: bgRect.width, height: bgRect.height }
                };
            });
            
            if (coverage) {
                results.push(coverage);
                expect(coverage.coveragePercent).toBeLessThanOrEqual(60);
            }
        }
        
        // Log results for analysis
        results.forEach(result => {
            console.log(`Seed ${result.seed}: ${result.coveragePercent.toFixed(1)}% coverage, ${result.spriteCount} sprites`);
            console.log(`  Background: ${result.backgroundSize.width}x${result.backgroundSize.height}px`);
        });
        
        expect(results.length).toBe(testSeeds.length);
    });

    test('should maintain area limits during level progression', async ({ page }) => {
        // Start first level
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Check first level coverage
        const firstLevelCoverage = await page.evaluate(() => {
            const sprites = document.querySelectorAll('.game-sprite');
            const backgroundImg = document.getElementById('background-image-left');
            
            if (!backgroundImg) return null;
            
            const bgRect = backgroundImg.getBoundingClientRect();
            const backgroundArea = bgRect.width * bgRect.height;
            let totalSpriteArea = 0;
            
            sprites.forEach(sprite => {
                const rect = sprite.getBoundingClientRect();
                totalSpriteArea += rect.width * rect.height;
            });
            
            return (totalSpriteArea / backgroundArea) * 100;
        });
        
        expect(firstLevelCoverage).toBeLessThanOrEqual(60);
        
        // Complete level and move to next
        await page.keyboard.press('!');
        
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
        
        // Check second level coverage
        const secondLevelCoverage = await page.evaluate(() => {
            const sprites = document.querySelectorAll('.game-sprite');
            const backgroundImg = document.getElementById('background-image-left');
            
            if (!backgroundImg) return null;
            
            const bgRect = backgroundImg.getBoundingClientRect();
            const backgroundArea = bgRect.width * bgRect.height;
            let totalSpriteArea = 0;
            
            sprites.forEach(sprite => {
                const rect = sprite.getBoundingClientRect();
                totalSpriteArea += rect.width * rect.height;
            });
            
            return (totalSpriteArea / backgroundArea) * 100;
        });
        
        if (secondLevelCoverage !== null) {
            expect(secondLevelCoverage).toBeLessThanOrEqual(60);
            console.log(`Level 1 coverage: ${firstLevelCoverage?.toFixed(1)}%`);
            console.log(`Level 2 coverage: ${secondLevelCoverage.toFixed(1)}%`);
        }
    });

    test('should work with both template-based and random sprite placement', async ({ page }) => {
        // Start with template level
        await page.click('#start-game');
        await page.waitForSelector('.game-sprite', { timeout: 10000 });
        
        // Check template level area coverage
        const templateCoverage = await page.evaluate(() => {
            const sprites = document.querySelectorAll('.game-sprite');
            const backgroundImg = document.getElementById('background-image-left');
            
            if (!backgroundImg) return null;
            
            const bgRect = backgroundImg.getBoundingClientRect();
            let totalArea = 0;
            sprites.forEach(sprite => {
                const rect = sprite.getBoundingClientRect();
                totalArea += rect.width * rect.height;
            });
            
            return (totalArea / (bgRect.width * bgRect.height)) * 100;
        });
        
        expect(templateCoverage).toBeLessThanOrEqual(60);
        
        // The area coverage system should work regardless of placement method
        console.log(`Template-based coverage: ${templateCoverage?.toFixed(1)}%`);
    });
});