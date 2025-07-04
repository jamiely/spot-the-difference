import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScalingUtils } from '../js/utils/ScalingUtils.js';

describe('ScalingUtils', () => {
    let mockTemplate;
    let mockBackgroundElement;

    beforeEach(() => {
        mockTemplate = {
            backgroundDimensions: {
                originalDimensions: { width: 1024, height: 1536 },
                renderDimensions: { width: 400, height: 600 }
            }
        };

        mockBackgroundElement = {
            getBoundingClientRect: vi.fn(() => ({
                width: 320,
                height: 480
            }))
        };
    });

    describe('calculateScalingFactor', () => {
        it('should calculate correct scaling factors', () => {
            const templateDimensions = { renderWidth: 400, renderHeight: 600 };
            const actualDimensions = { width: 320, height: 480 };

            const result = ScalingUtils.calculateScalingFactor(templateDimensions, actualDimensions);

            expect(result.scaleX).toBe(0.8); // 320/400
            expect(result.scaleY).toBe(0.8); // 480/600
        });

        it('should handle different aspect ratios', () => {
            const templateDimensions = { renderWidth: 400, renderHeight: 600 };
            const actualDimensions = { width: 200, height: 450 };

            const result = ScalingUtils.calculateScalingFactor(templateDimensions, actualDimensions);

            expect(result.scaleX).toBe(0.5); // 200/400
            expect(result.scaleY).toBe(0.75); // 450/600
        });
    });

    describe('scaleCoordinates', () => {
        it('should scale coordinates with renderDimensions', () => {
            const spriteCoords = {
                x: 100,
                y: 150,
                renderDimensions: { width: 80, height: 60 }
            };
            const scalingFactor = { scaleX: 0.8, scaleY: 0.8 };

            const result = ScalingUtils.scaleCoordinates(spriteCoords, scalingFactor);

            expect(result.x).toBe(80); // Math.round(100 * 0.8)
            expect(result.y).toBe(120); // Math.round(150 * 0.8)
            expect(result.width).toBe(64); // Math.round(80 * 0.8)
            expect(result.height).toBe(48); // Math.round(60 * 0.8)
        });

        it('should scale coordinates with legacy width/height', () => {
            const spriteCoords = {
                x: 100,
                y: 150,
                width: 80,
                height: 60
            };
            const scalingFactor = { scaleX: 0.8, scaleY: 0.8 };

            const result = ScalingUtils.scaleCoordinates(spriteCoords, scalingFactor);

            expect(result.x).toBe(80);
            expect(result.y).toBe(120);
            expect(result.width).toBe(64);
            expect(result.height).toBe(48);
        });

        it('should handle fractional scaling and round properly', () => {
            const spriteCoords = {
                x: 33,
                y: 66,
                renderDimensions: { width: 77, height: 55 }
            };
            const scalingFactor = { scaleX: 0.333, scaleY: 0.666 };

            const result = ScalingUtils.scaleCoordinates(spriteCoords, scalingFactor);

            expect(result.x).toBe(11); // Math.round(33 * 0.333)
            expect(result.y).toBe(44); // Math.round(66 * 0.666)
            expect(result.width).toBe(26); // Math.round(77 * 0.333)
            expect(result.height).toBe(37); // Math.round(55 * 0.666)
        });
    });

    describe('unscaleCoordinates', () => {
        it('should reverse scale coordinates correctly', () => {
            const spriteCoords = {
                x: 80,
                y: 120,
                width: 64,
                height: 48
            };
            const scalingFactor = { scaleX: 0.8, scaleY: 0.8 };

            const result = ScalingUtils.unscaleCoordinates(spriteCoords, scalingFactor);

            expect(result.x).toBe(100); // Math.round(80 / 0.8)
            expect(result.y).toBe(150); // Math.round(120 / 0.8)
            expect(result.width).toBe(80); // Math.round(64 / 0.8)
            expect(result.height).toBe(60); // Math.round(48 / 0.8)
        });

        it('should handle fractional unscaling', () => {
            const spriteCoords = {
                x: 11,
                y: 44,
                width: 26,
                height: 37
            };
            const scalingFactor = { scaleX: 0.333, scaleY: 0.666 };

            const result = ScalingUtils.unscaleCoordinates(spriteCoords, scalingFactor);

            expect(result.x).toBe(33); // Math.round(11 / 0.333)
            expect(result.y).toBe(66); // Math.round(44 / 0.666)
            expect(result.width).toBe(78); // Math.round(26 / 0.333)
            expect(result.height).toBe(56); // Math.round(37 / 0.666)
        });
    });

    describe('getActualBackgroundDimensions', () => {
        it('should get dimensions from background element', () => {
            const result = ScalingUtils.getActualBackgroundDimensions(mockBackgroundElement);

            expect(result.width).toBe(320);
            expect(result.height).toBe(480);
            expect(mockBackgroundElement.getBoundingClientRect).toHaveBeenCalled();
        });
    });

    describe('createScalingContext', () => {
        it('should create scaling context successfully', () => {
            const result = ScalingUtils.createScalingContext(mockTemplate, mockBackgroundElement);

            expect(result).toBeDefined();
            expect(result.templateDimensions).toEqual({
                renderWidth: 400,
                renderHeight: 600
            });
            expect(result.actualDimensions).toEqual({
                width: 320,
                height: 480
            });
            expect(result.scalingFactor).toEqual({
                scaleX: 0.8,
                scaleY: 0.8
            });
        });

        it('should return null for template without backgroundDimensions', () => {
            const templateWithoutDimensions = { name: 'test' };
            
            const result = ScalingUtils.createScalingContext(templateWithoutDimensions, mockBackgroundElement);

            expect(result).toBeNull();
        });

        it('should handle missing template', () => {
            const result = ScalingUtils.createScalingContext(null, mockBackgroundElement);

            expect(result).toBeNull();
        });
    });

    describe('scaleAllSprites', () => {
        it('should scale all sprites in template', () => {
            const template = {
                ...mockTemplate,
                sprites: [
                    {
                        id: 'sprite1',
                        x: 100,
                        y: 150,
                        renderDimensions: { width: 80, height: 60 }
                    },
                    {
                        id: 'sprite2',
                        x: 200,
                        y: 300,
                        renderDimensions: { width: 40, height: 30 }
                    }
                ]
            };

            const scalingContext = {
                scalingFactor: { scaleX: 0.8, scaleY: 0.8 }
            };

            const result = ScalingUtils.scaleAllSprites(template, scalingContext);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('sprite1');
            expect(result[0].x).toBe(80); // 100 * 0.8
            expect(result[0].y).toBe(120); // 150 * 0.8
            expect(result[1].id).toBe('sprite2');
            expect(result[1].x).toBe(160); // 200 * 0.8
            expect(result[1].y).toBe(240); // 300 * 0.8
        });

        it('should return original sprites when no scaling context', () => {
            const template = {
                sprites: [
                    { id: 'sprite1', x: 100, y: 150 }
                ]
            };

            const result = ScalingUtils.scaleAllSprites(template, null);

            expect(result).toEqual(template.sprites);
        });
    });

    describe('isScalingNeeded', () => {
        it('should return true when scaling is needed', () => {
            const scalingContext = {
                templateDimensions: { renderWidth: 400, renderHeight: 600 },
                actualDimensions: { width: 320, height: 480 }
            };

            const result = ScalingUtils.isScalingNeeded(scalingContext);

            expect(result).toBe(true);
        });

        it('should return false when dimensions match', () => {
            const scalingContext = {
                templateDimensions: { renderWidth: 400, renderHeight: 600 },
                actualDimensions: { width: 400, height: 600 }
            };

            const result = ScalingUtils.isScalingNeeded(scalingContext);

            expect(result).toBe(false);
        });

        it('should respect tolerance parameter', () => {
            const scalingContext = {
                templateDimensions: { renderWidth: 400, renderHeight: 600 },
                actualDimensions: { width: 402, height: 598 }
            };

            expect(ScalingUtils.isScalingNeeded(scalingContext, 1)).toBe(true);
            expect(ScalingUtils.isScalingNeeded(scalingContext, 5)).toBe(false);
        });

        it('should return false for null scaling context', () => {
            const result = ScalingUtils.isScalingNeeded(null);

            expect(result).toBe(false);
        });
    });
});