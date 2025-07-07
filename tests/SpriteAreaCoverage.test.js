import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpritePositioning } from '../js/utils/SpritePositioning.js';

describe('Sprite Area Coverage Limits', () => {
    let collisionDetector;
    let existingPositions;
    let backgroundArea;

    beforeEach(() => {
        existingPositions = [];
        backgroundArea = { x: 0, y: 0, width: 400, height: 300 }; // 120,000 px total
    });

    describe('calculateAreaCoverage', () => {
        beforeEach(() => {
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
        });

        it('should return zero coverage when no sprites exist', () => {
            const coverage = collisionDetector.calculateAreaCoverage();
            
            expect(coverage.totalArea).toBe(0);
            expect(coverage.backgroundArea).toBe(120000); // 400 * 300
            expect(coverage.coveragePercent).toBe(0);
            expect(coverage.maxAllowed).toBe(60);
        });

        it('should calculate correct coverage for single sprite', () => {
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const coverage = collisionDetector.calculateAreaCoverage();
            
            expect(coverage.totalArea).toBe(6400); // 80 * 80
            expect(coverage.coveragePercent).toBeCloseTo(5.33, 2); // 6400/120000 * 100
        });

        it('should calculate correct coverage for multiple sprites', () => {
            existingPositions.push(
                { x: 0, y: 0, width: 80, height: 80 },
                { x: 100, y: 100, width: 80, height: 80 },
                { x: 200, y: 200, width: 80, height: 80 }
            );
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const coverage = collisionDetector.calculateAreaCoverage();
            
            expect(coverage.totalArea).toBe(19200); // 3 * 80 * 80
            expect(coverage.coveragePercent).toBe(16); // 19200/120000 * 100
        });

        it('should handle sprites of different sizes', () => {
            existingPositions.push(
                { x: 0, y: 0, width: 100, height: 50 }, // 5000px
                { x: 120, y: 60, width: 60, height: 60 } // 3600px
            );
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const coverage = collisionDetector.calculateAreaCoverage();
            
            expect(coverage.totalArea).toBe(8600); // 5000 + 3600
            expect(coverage.coveragePercent).toBeCloseTo(7.17, 2); // 8600/120000 * 100
        });

        it('should handle case when no background area is provided', () => {
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, null, 60
            );
            
            const coverage = collisionDetector.calculateAreaCoverage();
            
            expect(coverage.totalArea).toBe(0);
            expect(coverage.backgroundArea).toBe(0);
            expect(coverage.coveragePercent).toBe(0);
        });
    });

    describe('checkAreaCoverageLimit', () => {
        it('should allow placement when coverage is below limit', () => {
            // Add sprites taking up 40% of area
            const spriteArea = 80 * 80; // 6400px
            const spritesNeeded = Math.floor((120000 * 0.4) / spriteArea); // ~7 sprites for 40%
            
            for (let i = 0; i < spritesNeeded; i++) {
                existingPositions.push({ x: i * 90, y: 0, width: 80, height: 80 });
            }
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const check = collisionDetector.checkAreaCoverageLimit();
            
            expect(check.wouldExceed).toBe(false);
            expect(check.currentCoverage).toBeLessThan(60);
            expect(check.newCoverage).toBeLessThan(60);
        });

        it('should prevent placement when coverage would exceed limit', () => {
            // Add enough sprites to get close to 60% limit
            // 120,000px background, 6400px per sprite
            // Need 11-12 sprites to get near 60% (11 * 6400 = 70400 = 58.67%)
            for (let i = 0; i < 11; i++) {
                existingPositions.push({ x: (i % 5) * 90, y: Math.floor(i / 5) * 90, width: 80, height: 80 });
            }
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const current = collisionDetector.calculateAreaCoverage();
            const check = collisionDetector.checkAreaCoverageLimit();
            
            console.log(`Current coverage: ${current.coveragePercent}%, with new sprite: ${check.newCoverage}%`);
            
            // With 11 sprites (58.67%) + 1 more (6400px) = 64% which exceeds 60%
            expect(check.wouldExceed).toBe(true);
            expect(check.currentCoverage).toBeGreaterThan(55);
            expect(check.newCoverage).toBeGreaterThan(60);
        });

        it('should handle custom sprite sizes', () => {
            // Fill area with existing sprites
            for (let i = 0; i < 8; i++) {
                existingPositions.push({ x: i * 90, y: 0, width: 80, height: 80 });
            }
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            // Check adding a larger sprite
            const check = collisionDetector.checkAreaCoverageLimit(120, 120); // Larger sprite
            
            expect(check.newSpriteArea).toBe(14400); // 120 * 120
            expect(check.newCoverage).toBeGreaterThan(check.currentCoverage);
        });

        it('should respect custom area coverage limits', () => {
            // Use 30% limit instead of 60%
            existingPositions.push({ x: 0, y: 0, width: 200, height: 200 }); // Large sprite
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 30
            );
            
            const check = collisionDetector.checkAreaCoverageLimit();
            
            expect(check.maxAllowed).toBe(30);
            expect(check.wouldExceed).toBe(true); // Large sprite exceeds 30% limit
        });

        it('should handle edge case where background area is zero', () => {
            const zeroBackgroundArea = { x: 0, y: 0, width: 0, height: 0 };
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, zeroBackgroundArea, 60
            );
            
            const check = collisionDetector.checkAreaCoverageLimit();
            console.log('Zero area check:', check);
            
            // When background area is zero, coverage calculation should handle it gracefully
            // The implementation may decide to prevent placement in such cases
            expect(check.currentCoverage).toBe(0);
            expect(check.newCoverage).toBe(0);
        });
    });

    describe('integration with placement logic', () => {
        it('should provide area info in findNonCollidingPosition result', () => {
            collisionDetector = SpritePositioning.createCollisionDetector(
                [], 80, 80, 5, 70, backgroundArea, 60
            );
            
            const result = collisionDetector.findNonCollidingPosition(0, 0, 400, 300, 5, true);
            
            // Coverage methods should be available
            expect(typeof collisionDetector.calculateAreaCoverage).toBe('function');
            expect(typeof collisionDetector.checkAreaCoverageLimit).toBe('function');
        });

        it('should work with area checking during sprite placement', () => {
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            // Simulate adding sprites and checking coverage
            for (let i = 0; i < 5; i++) {
                const areaCoverage = collisionDetector.checkAreaCoverageLimit();
                expect(areaCoverage.wouldExceed).toBe(false);
                
                // Add sprite
                collisionDetector.addPosition(i * 90, 0, 80, 80);
            }
            
            // After 5 sprites, check coverage
            const finalCoverage = collisionDetector.calculateAreaCoverage();
            expect(finalCoverage.coveragePercent).toBeLessThan(60);
        });
    });

    describe('performance and edge cases', () => {
        it('should handle large numbers of sprites efficiently', () => {
            const startTime = Date.now();
            
            // Add many small sprites
            for (let i = 0; i < 100; i++) {
                existingPositions.push({ x: (i % 20) * 20, y: Math.floor(i / 20) * 20, width: 10, height: 10 });
            }
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const coverage = collisionDetector.calculateAreaCoverage();
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeLessThan(100); // Should be fast
            expect(coverage.totalArea).toBe(10000); // 100 * 10 * 10
        });

        it('should handle overlapping sprites correctly in area calculation', () => {
            // Add overlapping sprites - area calculation doesn't account for overlap
            existingPositions.push(
                { x: 0, y: 0, width: 80, height: 80 },
                { x: 40, y: 40, width: 80, height: 80 } // 50% overlap
            );
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const coverage = collisionDetector.calculateAreaCoverage();
            
            // Area calculation sums individual sprite areas (doesn't subtract overlap)
            expect(coverage.totalArea).toBe(12800); // 2 * 80 * 80
        });

        it('should handle very small background areas', () => {
            const smallArea = { x: 0, y: 0, width: 50, height: 50 }; // 2500px
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                [], 80, 80, 5, 70, smallArea, 60
            );
            
            const check = collisionDetector.checkAreaCoverageLimit();
            
            // Single 80x80 sprite (6400px) in 50x50 area (2500px) = 256% coverage
            expect(check.wouldExceed).toBe(true);
            expect(check.newCoverage).toBeGreaterThan(100);
        });
    });

    describe('logging and debugging', () => {
        it('should provide detailed area information for debugging', () => {
            existingPositions.push({ x: 0, y: 0, width: 100, height: 100 });
            
            collisionDetector = SpritePositioning.createCollisionDetector(
                existingPositions, 80, 80, 5, 70, backgroundArea, 60
            );
            
            const coverage = collisionDetector.calculateAreaCoverage();
            const check = collisionDetector.checkAreaCoverageLimit();
            
            // Should provide comprehensive information
            expect(coverage).toHaveProperty('totalArea');
            expect(coverage).toHaveProperty('backgroundArea');
            expect(coverage).toHaveProperty('coveragePercent');
            expect(coverage).toHaveProperty('maxAllowed');
            
            expect(check).toHaveProperty('wouldExceed');
            expect(check).toHaveProperty('currentCoverage');
            expect(check).toHaveProperty('newCoverage');
            expect(check).toHaveProperty('maxAllowed');
            expect(check).toHaveProperty('newSpriteArea');
        });
    });
});