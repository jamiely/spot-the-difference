import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpritePositioning } from '../js/utils/SpritePositioning.js';
import type { CollisionViolation, ObscurationCheck } from '../js/utils/SpritePositioning.js';

interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface CollisionDetector {
    calculateIntersectionArea(rect1: Rectangle, rect2: Rectangle): number;
    checkObscurationViolation(x: number, y: number): ObscurationCheck;
    findNonCollidingPosition(x: number, y: number, width: number, height: number, maxAttempts: number): {
        x: number;
        y: number;
        attempts: number;
        violations: CollisionViolation[];
    };
    hasCollision(x: number, y: number): boolean;
    hasBasicCollision(x: number, y: number): boolean;
}

describe('Sprite Obscuration Prevention', () => {
    let collisionDetector: CollisionDetector;
    let existingPositions: Rectangle[];

    beforeEach(() => {
        existingPositions = [];
    });

    describe('calculateIntersectionArea', () => {
        beforeEach(() => {
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
        });

        it('should calculate zero intersection for non-overlapping rectangles', () => {
            const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
            const rect2: Rectangle = { x: 100, y: 100, width: 50, height: 50 };
            
            const intersection = collisionDetector.calculateIntersectionArea(rect1, rect2);
            expect(intersection).toBe(0);
        });

        it('should calculate full intersection for identical rectangles', () => {
            const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
            const rect2: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
            
            const intersection = collisionDetector.calculateIntersectionArea(rect1, rect2);
            expect(intersection).toBe(2500); // 50 * 50
        });

        it('should calculate partial intersection for overlapping rectangles', () => {
            const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
            const rect2: Rectangle = { x: 25, y: 25, width: 50, height: 50 };
            
            const intersection = collisionDetector.calculateIntersectionArea(rect1, rect2);
            expect(intersection).toBe(625); // 25 * 25
        });

        it('should handle edge-touching rectangles correctly', () => {
            const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
            const rect2: Rectangle = { x: 50, y: 0, width: 50, height: 50 };
            
            const intersection = collisionDetector.calculateIntersectionArea(rect1, rect2);
            expect(intersection).toBe(0);
        });
    });

    describe('checkObscurationViolation', () => {
        it('should allow placement when no existing sprites', () => {
            collisionDetector = SpritePositioning.createCollisionDetector([], 80, 80, 5, 70);
            
            const result = collisionDetector.checkObscurationViolation(0, 0);
            expect(result.hasViolation).toBe(false);
            expect(result.violations).toEqual([]);
        });

        it('should allow placement when obscuration is below threshold', () => {
            // Place first sprite
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Place second sprite with minimal overlap (less than 70%)
            const result = collisionDetector.checkObscurationViolation(60, 60);
            expect(result.hasViolation).toBe(false);
        });

        it('should prevent placement when new sprite would be too obscured', () => {
            // Place first sprite
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Try to place second sprite with significant overlap (more than 70%)
            // Position (20, 20) creates intersection from (20,20) to (80,80) = 60x60 = 3600px
            // New sprite area = 80x80 = 6400px
            // Obscuration = 3600/6400 = 56.25% (should be allowed)
            // Let's try (10, 10) instead for 70x70 = 4900px = 76.56% obscuration
            const result = collisionDetector.checkObscurationViolation(10, 10);
            console.log('Debug violations:', result.violations);
            expect(result.hasViolation).toBe(true);
            expect(result.violations.length).toBeGreaterThan(0);
            const newSpriteViolation = result.violations.find(v => v.type === 'new_sprite_obscured');
            if (newSpriteViolation) {
                expect(newSpriteViolation.obscurationPercentage).toBeGreaterThan(70);
            }
        });

        it('should prevent placement when existing sprite would be too obscured', () => {
            // Place first sprite
            existingPositions.push({ x: 20, y: 20, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Try to place second sprite that would significantly obscure the first
            // Position (0, 0) with existing at (20, 20) creates intersection from (20,20) to (80,80) = 60x60 = 3600px
            // Existing sprite area = 80x80 = 6400px  
            // Obscuration = 3600/6400 = 56.25% (should be allowed)
            // Let's try (10, 10) for 70x70 = 4900px = 76.56% obscuration
            const result = collisionDetector.checkObscurationViolation(10, 10);
            console.log('Debug existing violations:', result.violations);
            expect(result.hasViolation).toBe(true);
            expect(result.violations.some(v => v.type === 'existing_sprite_obscured')).toBe(true);
            
            const existingObscuredViolation = result.violations.find(v => v.type === 'existing_sprite_obscured');
            expect(existingObscuredViolation!.obscurationPercentage).toBeGreaterThan(70);
        });

        it('should handle multiple existing sprites correctly', () => {
            // Place two existing sprites
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            existingPositions.push({ x: 50, y: 50, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Try to place in a position that would be heavily obscured by both
            const result = collisionDetector.checkObscurationViolation(25, 25);
            expect(result.hasViolation).toBe(true);
        });

        it('should respect custom obscuration threshold', () => {
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            // Use 50% threshold instead of 70%
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 50);
            
            // Position (40, 40) creates intersection from (40,40) to (80,80) = 40x40 = 1600px
            // New sprite area = 80x80 = 6400px
            // Obscuration = 1600/6400 = 25% (should be allowed with 50% threshold)
            // Let's try (20, 20) for 60x60 = 3600px = 56.25% obscuration (should be rejected)
            const result = collisionDetector.checkObscurationViolation(20, 20);
            console.log('Debug custom threshold violations:', result.violations);
            expect(result.hasViolation).toBe(true);
        });
    });

    describe('findNonCollidingPosition', () => {
        it('should find valid positions when space allows', () => {
            // Small existing sprite in corner
            existingPositions.push({ x: 0, y: 0, width: 30, height: 30 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Should find position in large area
            const result = collisionDetector.findNonCollidingPosition(0, 0, 400, 400, 10);
            expect(result.violations).toEqual([]);
            expect(result.attempts).toBeLessThanOrEqual(10);
        });

        it('should report violations when no valid position found', () => {
            // Fill area with sprites to make placement difficult
            for (let x = 0; x < 200; x += 50) {
                for (let y = 0; y < 200; y += 50) {
                    existingPositions.push({ x, y, width: 80, height: 80 });
                }
            }
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            const result = collisionDetector.findNonCollidingPosition(0, 0, 200, 200, 5);
            expect(result.attempts).toBe(5);
            expect(result.violations.length).toBeGreaterThan(0);
        });

        it('should try multiple attempts before giving up', () => {
            existingPositions.push({ x: 50, y: 50, width: 100, height: 100 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Very constrained area
            const result = collisionDetector.findNonCollidingPosition(40, 40, 120, 120, 20);
            expect(result.attempts).toBeLessThanOrEqual(20);
        });
    });

    describe('integration with existing collision detection', () => {
        it('should maintain backward compatibility with hasCollision method', () => {
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Position that would cause significant obscuration should be detected as collision
            const hasCollision = collisionDetector.hasCollision(10, 10); // Should cause >70% obscuration
            console.log('Debug hasCollision result:', hasCollision);
            expect(hasCollision).toBe(true);
            
            // Position that's safe should not be detected as collision
            const hasCollisionSafe = collisionDetector.hasCollision(200, 200);
            expect(hasCollisionSafe).toBe(false);
        });

        it('should provide hasBasicCollision for simple buffer-based detection', () => {
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Position within buffer should be detected
            const hasBasicCollision = collisionDetector.hasBasicCollision(84, 0); // within 5px buffer
            expect(hasBasicCollision).toBe(true);
            
            // Position outside buffer should not be detected
            const hasBasicCollisionFar = collisionDetector.hasBasicCollision(100, 100);
            expect(hasBasicCollisionFar).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle zero-area sprites gracefully', () => {
            existingPositions.push({ x: 0, y: 0, width: 0, height: 0 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            const result = collisionDetector.checkObscurationViolation(0, 0);
            expect(result.hasViolation).toBe(false);
        });

        it('should handle sprites with different sizes', () => {
            // Large existing sprite
            existingPositions.push({ x: 0, y: 0, width: 120, height: 120 });
            // Small new sprite
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 40, 40, 5, 70);
            
            // Even small overlap might exceed 70% for small sprite
            const result = collisionDetector.checkObscurationViolation(10, 10);
            expect(result.hasViolation).toBe(true);
        });

        it('should handle 100% obscuration correctly', () => {
            existingPositions.push({ x: 0, y: 0, width: 80, height: 80 });
            collisionDetector = SpritePositioning.createCollisionDetector(existingPositions, 80, 80, 5, 70);
            
            // Exact same position should be 100% obscured
            const result = collisionDetector.checkObscurationViolation(0, 0);
            expect(result.hasViolation).toBe(true);
            expect(result.violations.some(v => v.obscurationPercentage === 100)).toBe(true);
        });
    });
});
