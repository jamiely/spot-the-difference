import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScalingUtils } from '../js/utils/ScalingUtils.js';

// Local interfaces for testing
interface TemplateDimensions {
    renderWidth: number;
    renderHeight: number;
}

interface ScalingFactor {
    scaleX: number;
    scaleY: number;
}

interface ScaledCoordinates {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface SpriteCoordinates {
    x: number;
    y: number;
    width?: number;
    height?: number;
}

describe('ScalingUtils', () => {
    let mockBackgroundElement: HTMLElement;

    beforeEach(() => {
        mockBackgroundElement = {
            getBoundingClientRect: vi.fn(() => ({
                width: 320,
                height: 480,
                x: 0,
                y: 0,
                top: 0,
                right: 320,
                bottom: 480,
                left: 0,
                toJSON: () => ({})
            } as DOMRect))
        } as unknown as HTMLElement;
    });

    describe('calculateScalingFactor', () => {
        it('should calculate correct scaling factors', () => {
            const templateDimensions: TemplateDimensions = { renderWidth: 400, renderHeight: 600 };
            const actualDimensions = { width: 320, height: 480 };

            const result: ScalingFactor = ScalingUtils.calculateScalingFactor(templateDimensions, actualDimensions);

            expect(result.scaleX).toBe(0.8); // 320 / 400
            expect(result.scaleY).toBe(0.8); // 480 / 600
        });

        it('should handle different aspect ratios', () => {
            const templateDimensions: TemplateDimensions = { renderWidth: 800, renderHeight: 600 };
            const actualDimensions = { width: 400, height: 450 };

            const result: ScalingFactor = ScalingUtils.calculateScalingFactor(templateDimensions, actualDimensions);

            expect(result.scaleX).toBe(0.5); // 400 / 800
            expect(result.scaleY).toBe(0.75); // 450 / 600
        });

        it('should handle edge case of zero dimensions', () => {
            const templateDimensions: TemplateDimensions = { renderWidth: 0, renderHeight: 600 };
            const actualDimensions = { width: 400, height: 450 };

            const result: ScalingFactor = ScalingUtils.calculateScalingFactor(templateDimensions, actualDimensions);

            expect(result.scaleX).toBe(Infinity); // 400 / 0
            expect(result.scaleY).toBe(0.75); // 450 / 600
        });
    });

    describe('scaleCoordinates', () => {
        it('should scale coordinates correctly', () => {
            const coordinates: SpriteCoordinates = { x: 100, y: 150, width: 40, height: 40 };
            const scalingFactors: ScalingFactor = { scaleX: 0.8, scaleY: 0.6 };

            const result: ScaledCoordinates = ScalingUtils.scaleCoordinates(coordinates, scalingFactors);

            expect(result.x).toBe(80); // 100 * 0.8
            expect(result.y).toBe(90); // 150 * 0.6
            expect(result.width).toBe(32); // 40 * 0.8
            expect(result.height).toBe(24); // 40 * 0.6
        });

        it('should handle negative coordinates', () => {
            const coordinates: SpriteCoordinates = { x: -50, y: -30, width: 20, height: 30 };
            const scalingFactors: ScalingFactor = { scaleX: 2.0, scaleY: 1.5 };

            const result: ScaledCoordinates = ScalingUtils.scaleCoordinates(coordinates, scalingFactors);

            expect(result.x).toBe(-100); // -50 * 2.0
            expect(result.y).toBe(-45); // -30 * 1.5
            expect(result.width).toBe(40); // 20 * 2.0
            expect(result.height).toBe(45); // 30 * 1.5
        });

        it('should handle zero scaling factors', () => {
            const coordinates: SpriteCoordinates = { x: 100, y: 150, width: 40, height: 40 };
            const scalingFactors: ScalingFactor = { scaleX: 0, scaleY: 0 };

            const result: ScaledCoordinates = ScalingUtils.scaleCoordinates(coordinates, scalingFactors);

            expect(result.x).toBe(0); // 100 * 0
            expect(result.y).toBe(0); // 150 * 0
            expect(result.width).toBe(0); // 40 * 0
            expect(result.height).toBe(0); // 40 * 0
        });
    });

    describe('unscaleCoordinates', () => {
        it('should reverse scale coordinates correctly', () => {
            const scaledCoordinates: ScaledCoordinates = { x: 80, y: 90, width: 32, height: 24 };
            const scalingFactors: ScalingFactor = { scaleX: 0.8, scaleY: 0.6 };

            const result: SpriteCoordinates = ScalingUtils.unscaleCoordinates(scaledCoordinates, scalingFactors);

            expect(result.x).toBe(100); // 80 / 0.8
            expect(result.y).toBe(150); // 90 / 0.6
            expect(result.width).toBe(40); // 32 / 0.8
            expect(result.height).toBe(40); // 24 / 0.6
        });

        it('should handle zero scaling factors', () => {
            const scaledCoordinates: ScaledCoordinates = { x: 80, y: 90, width: 32, height: 24 };
            const scalingFactors: ScalingFactor = { scaleX: 0, scaleY: 0 };

            const result: SpriteCoordinates = ScalingUtils.unscaleCoordinates(scaledCoordinates, scalingFactors);

            expect(result.x).toBe(Infinity); // 80 / 0
            expect(result.y).toBe(Infinity); // 90 / 0
            expect(result.width).toBe(Infinity); // 32 / 0
            expect(result.height).toBe(Infinity); // 24 / 0
        });
    });

    describe('getActualBackgroundDimensions', () => {
        it('should extract actual dimensions from element', () => {
            const result = ScalingUtils.getActualBackgroundDimensions(mockBackgroundElement);

            expect(result.width).toBe(320);
            expect(result.height).toBe(480);
        });

        it('should handle element with different bounding rect', () => {
            const elementWithDifferentRect = {
                getBoundingClientRect: vi.fn(() => ({
                    width: 100,
                    height: 150,
                    x: 0,
                    y: 0,
                    top: 0,
                    right: 100,
                    bottom: 150,
                    left: 0,
                    toJSON: () => ({})
                } as DOMRect))
            } as unknown as HTMLElement;

            const result = ScalingUtils.getActualBackgroundDimensions(elementWithDifferentRect);

            expect(result.width).toBe(100);
            expect(result.height).toBe(150);
        });
    });

    describe('createScalingContext', () => {
        it('should create scaling context with template data', () => {
            const template = {
                backgroundDimensions: {
                    originalDimensions: { width: 1024, height: 1536 },
                    renderDimensions: { width: 400, height: 600 }
                }
            };

            const result = ScalingUtils.createScalingContext(
                template as any, 
                mockBackgroundElement
            );

            expect(result).toBeDefined();
            expect(result.scalingFactor).toBeDefined();
            expect(result.scalingFactor.scaleX).toBe(0.8); // 320 / 400
            expect(result.scalingFactor.scaleY).toBe(0.8); // 480 / 600
        });

        it('should handle template without background dimensions', () => {
            const template = {};

            const result = ScalingUtils.createScalingContext(
                template as any, 
                mockBackgroundElement
            );

            expect(result).toBe(null);
        });
    });

    describe('isScalingNeeded', () => {
        it('should detect when scaling is needed', () => {
            const scalingContext = {
                templateDimensions: { renderWidth: 400, renderHeight: 600 },
                actualDimensions: { width: 200, height: 300 }
            };

            const result = ScalingUtils.isScalingNeeded(scalingContext, 1);

            expect(result).toBe(true);
        });

        it('should detect when scaling is not needed', () => {
            const scalingContext = {
                templateDimensions: { renderWidth: 400, renderHeight: 600 },
                actualDimensions: { width: 400, height: 600 }
            };

            const result = ScalingUtils.isScalingNeeded(scalingContext, 1);

            expect(result).toBe(false);
        });

        it('should respect tolerance parameter', () => {
            const scalingContext = {
                templateDimensions: { renderWidth: 400, renderHeight: 600 },
                actualDimensions: { width: 399, height: 599 }
            };

            // With small tolerance, should need scaling
            expect(ScalingUtils.isScalingNeeded(scalingContext, 0.5)).toBe(true);

            // With large tolerance, should not need scaling
            expect(ScalingUtils.isScalingNeeded(scalingContext, 2)).toBe(false);
        });
    });

    describe('scaleAllSprites', () => {
        it('should scale all sprites in a template', () => {
            const template = {
                sprites: [
                    { id: 'sprite1', src: 'sprite1.png', x: 100, y: 150, width: 40, height: 40 },
                    { id: 'sprite2', src: 'sprite2.png', x: 200, y: 250, width: 40, height: 40 }
                ]
            };

            const scalingContext = {
                scalingFactor: { scaleX: 0.8, scaleY: 0.6 }
            };

            const result = ScalingUtils.scaleAllSprites(template as any, scalingContext);

            expect(result).toHaveLength(2);
            expect(result[0].x).toBe(80); // 100 * 0.8
            expect(result[0].y).toBe(90); // 150 * 0.6
            expect(result[1].x).toBe(160); // 200 * 0.8
            expect(result[1].y).toBe(150); // 250 * 0.6
        });

        it('should handle empty sprite array', () => {
            const template = {
                sprites: []
            };

            const scalingContext = {
                scalingFactor: { scaleX: 0.8, scaleY: 0.6 }
            };

            const result = ScalingUtils.scaleAllSprites(template as any, scalingContext);

            expect(result).toEqual([]);
        });

        it('should return original sprites when no scaling context', () => {
            const template = {
                sprites: [
                    { id: 'sprite1', src: 'sprite1.png', x: 100, y: 150, width: 40, height: 40 }
                ]
            };

            const result = ScalingUtils.scaleAllSprites(template as any, null);

            expect(result).toEqual(template.sprites);
        });
    });
});