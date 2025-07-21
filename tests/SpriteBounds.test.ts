import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpritePositioning } from '../js/utils/SpritePositioning.js';

interface CollisionDetector {
    isSpriteCenterWithinBounds(spriteX: number, spriteY: number, boundsX: number, boundsY: number, boundsWidth: number, boundsHeight: number): boolean;
    findNonCollidingPosition(x: number, y: number, width: number, height: number, maxAttempts: number, ensureCenterInBounds?: boolean): {
        x: number;
        y: number;
        attempts: number;
        centerInBounds: boolean;
        violations: any[];
    };
}

describe('Sprite Bounds Checking', () => {
    let collisionDetector: CollisionDetector;
    let existingPositions: { x: number; y: number; width: number; height: number }[];

    beforeEach(() => {
        existingPositions = [];
    });

    describe('isSpriteCenterWithinBounds', () => {
        beforeEach(() => {
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
        });

        it('should return true when sprite center is within bounds', () => {
            // Sprite at (10, 10) with size 80x80 has center at (50, 50)
            // Bounds from (0, 0) to (200, 200)
            const isWithin = collisionDetector.isSpriteCenterWithinBounds(10, 10, 0, 0, 200, 200);
            expect(isWithin).toBe(true);
        });

        it('should return false when sprite center is outside left bound', () => {
            // Sprite at (0, 50) with size 80x80 has center at (40, 90)
            // Bounds from (50, 0) to (200, 200) - left edge at x=50
            const isWithin = collisionDetector.isSpriteCenterWithinBounds(0, 50, 50, 0, 200, 200);
            expect(isWithin).toBe(false);
        });

        it('should return false when sprite center is outside right bound', () => {
            // Sprite at (160, 50) with size 80x80 has center at (200, 90)
            // Bounds from (0, 0) to (180, 200) - right edge at x=180
            const isWithin = collisionDetector.isSpriteCenterWithinBounds(160, 50, 0, 0, 180, 200);
            expect(isWithin).toBe(false);
        });

        it('should return false when sprite center is outside top bound', () => {
            // Sprite at (50, 0) with size 80x80 has center at (90, 40)
            // Bounds from (0, 50) to (200, 200) - top edge at y=50
            const isWithin = collisionDetector.isSpriteCenterWithinBounds(50, 0, 0, 50, 200, 200);
            expect(isWithin).toBe(false);
        });

        it('should return false when sprite center is outside bottom bound', () => {
            // Sprite at (50, 160) with size 80x80 has center at (90, 200)
            // Bounds from (0, 0) to (200, 180) - bottom edge at y=180
            const isWithin = collisionDetector.isSpriteCenterWithinBounds(50, 160, 0, 0, 200, 180);
            expect(isWithin).toBe(false);
        });

        it('should handle edge cases correctly', () => {
            // Sprite center exactly on boundary should be within bounds
            // Sprite at (0, 0) with size 80x80 has center at (40, 40)
            // Bounds from (0, 0) to (40, 40) - center exactly on edge
            const isWithin = collisionDetector.isSpriteCenterWithinBounds(0, 0, 0, 0, 40, 40);
            expect(isWithin).toBe(true);
        });
    });

    describe('findNonCollidingPosition with bounds checking', () => {
        it('should find positions with centers within bounds when space allows', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            // Large area should allow finding valid positions
            const result = collisionDetector.findNonCollidingPosition(0, 0, 400, 400, 10, true);
            
            expect(result.centerInBounds).toBe(true);
            expect(result.violations).toEqual([]);
            
            // Verify center is actually within bounds
            const centerX = result.x + 40; // 80/2
            const centerY = result.y + 40; // 80/2
            expect(centerX).toBeGreaterThanOrEqual(0);
            expect(centerX).toBeLessThanOrEqual(400);
            expect(centerY).toBeGreaterThanOrEqual(0);
            expect(centerY).toBeLessThanOrEqual(400);
        });

        it('should respect ensureCenterInBounds=false for legacy behavior', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            // Small area where center bounds checking would be restrictive
            const result = collisionDetector.findNonCollidingPosition(0, 0, 100, 100, 10, false);
            
            // Should still find a position even if center might be outside bounds
            expect(result.attempts).toBeLessThanOrEqual(10);
        });

        it('should handle constrained areas by relaxing center bounds when necessary', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            // Very small area where keeping center in bounds is difficult
            const result = collisionDetector.findNonCollidingPosition(0, 0, 90, 90, 5, true);
            
            // Should still find a position, centerInBounds might be false due to constraints
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
        });

        it('should prioritize center bounds over obscuration when both conflict', () => {
            // Place existing sprites to create obscuration issues
            existingPositions.push({ x: 100, y: 100, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Area where center bounds and obscuration both matter
            const result = collisionDetector.findNonCollidingPosition(50, 50, 200, 200, 20, true);
            
            // Should attempt to satisfy both constraints
            expect(result.attempts).toBeLessThanOrEqual(20);
        });

        it('should return centerInBounds status in result', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            const result = collisionDetector.findNonCollidingPosition(0, 0, 400, 400, 5, true);
            
            expect(result).toHaveProperty('centerInBounds');
            expect(typeof result.centerInBounds).toBe('boolean');
        });
    });

    describe('integration with different sprite sizes', () => {
        it('should handle different sprite sizes correctly', () => {
            // Test with 40x40 sprite
            collisionDetector = SpritePositioning.createCollisionDetector([], 40, 40, 5, 70);
            
            const result = collisionDetector.findNonCollidingPosition(0, 0, 100, 100, 10, true);
            
            expect(result.centerInBounds).toBe(true);
            
            // Verify center calculation for 40x40 sprite
            const centerX = result.x + 20; // 40/2
            const centerY = result.y + 20; // 40/2
            expect(centerX).toBeGreaterThanOrEqual(0);
            expect(centerX).toBeLessThanOrEqual(100);
            expect(centerY).toBeGreaterThanOrEqual(0);
            expect(centerY).toBeLessThanOrEqual(100);
        });

        it('should handle large sprites in small areas', () => {
            // Test with 120x120 sprite in 100x100 area
            collisionDetector = SpritePositioning.createCollisionDetector([], 120, 120, 5, 70);
            
            const result = collisionDetector.findNonCollidingPosition(0, 0, 100, 100, 5, true);
            
            // Large sprite in small area - center bounds might not be achievable
            expect(result.centerInBounds).toBeDefined();
        });
    });

    describe('bounds checking with bounding boxes', () => {
        it('should work correctly with template bounding boxes', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            // Simulate bounding box positioning
            const boundingBox = { x: 50, y: 50, width: 200, height: 150 };
            
            const result = collisionDetector.findNonCollidingPosition(
                boundingBox.x, 
                boundingBox.y, 
                boundingBox.width, 
                boundingBox.height, 
                10, 
                true
            );
            
            expect(result.centerInBounds).toBe(true);
            
            // Verify center is within the bounding box
            const centerX = result.x + 40;
            const centerY = result.y + 40;
            expect(centerX).toBeGreaterThanOrEqual(boundingBox.x);
            expect(centerX).toBeLessThanOrEqual(boundingBox.x + boundingBox.width);
            expect(centerY).toBeGreaterThanOrEqual(boundingBox.y);
            expect(centerY).toBeLessThanOrEqual(boundingBox.y + boundingBox.height);
        });

        it('should handle narrow bounding boxes correctly', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            // Very narrow bounding box
            const result = collisionDetector.findNonCollidingPosition(0, 0, 50, 300, 5, true);
            
            // Should handle narrow areas appropriately
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle zero-size areas gracefully', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            const result = collisionDetector.findNonCollidingPosition(0, 0, 0, 0, 1, true);
            
            // Should not crash
            expect(result).toBeDefined();
            expect(result.centerInBounds).toBeDefined();
        });

        it('should handle negative area coordinates', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            const result = collisionDetector.findNonCollidingPosition(-50, -50, 200, 200, 1, true);
            
            // Should handle negative coordinates
            expect(result).toBeDefined();
        });

        it('should log warnings when bounds cannot be satisfied', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            collisionDetector = SpritePositioning.createCollisionDetector([], 100, 100, 5, 70);
            
            // Area too small for sprite center to be within bounds
            collisionDetector.findNonCollidingPosition(0, 0, 50, 50, 1, true);
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
