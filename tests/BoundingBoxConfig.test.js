import { describe, it, expect } from 'vitest';
import { getBoundingBoxesForBackground, getSpriteCountForBackground, BACKGROUND_CONFIG } from '../js/config/BoundingBoxConfig.js';

describe('BoundingBoxConfig', () => {
  it('should return bounding boxes for a known background', () => {
    const filename = 'bookcase.png';
    const boundingBoxes = getBoundingBoxesForBackground(filename);
    expect(boundingBoxes).toEqual(BACKGROUND_CONFIG[filename].boundingBoxes);
  });

  it('should return an empty array for an unknown background', () => {
    const filename = 'unknown.png';
    const boundingBoxes = getBoundingBoxesForBackground(filename);
    expect(boundingBoxes).toEqual([]);
  });

  it('should return sprite count for a known background', () => {
    const filename = 'bookcase.png';
    const spriteCount = getSpriteCountForBackground(filename);
    expect(spriteCount).toBe(BACKGROUND_CONFIG[filename].spriteCount);
  });

  it('should return default sprite count for an unknown background', () => {
    const filename = 'unknown.png';
    const spriteCount = getSpriteCountForBackground(filename);
    expect(spriteCount).toBe(50);
  });
});