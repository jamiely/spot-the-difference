import { describe, it, expect } from 'vitest';
import { SPRITE_CONFIG } from '../js/config/SpriteConfig.js';

describe('SPRITE_CONFIG', () => {
  it('should return correct size from dimensions', () => {
    const size = SPRITE_CONFIG.getSizeFromDimensions(100, 200, 50);
    expect(size.width).toBe(25);
    expect(size.height).toBe(50);
  });

  it('should return target size if dimensions are not provided', () => {
    const size = SPRITE_CONFIG.getSizeFromDimensions(null, null, 50);
    expect(size.width).toBe(50);
    expect(size.height).toBe(50);
  });

  it('should return correct size in pixels based on container dimensions', () => {
    const size = SPRITE_CONFIG.getSizeInPixels(800, 600);
    expect(size).toBe(150); // Math.floor(600 * 0.25)
  });

  it('should return the correct size ratio', () => {
    expect(SPRITE_CONFIG.getSizeRatio()).toBe(0.25);
  });

  it('should return CSS size in pixels when dimensions are provided', () => {
    const cssSize = SPRITE_CONFIG.getCSSSize(100, 200);
    expect(cssSize.width).toBe('25px');
    expect(cssSize.height).toBe('50px');
  });

  it('should return CSS size in percentage when dimensions are not provided', () => {
    const cssSize = SPRITE_CONFIG.getCSSSize(null, null);
    expect(cssSize.width).toBe('25%');
    expect(cssSize.height).toBe('25%');
  });
});