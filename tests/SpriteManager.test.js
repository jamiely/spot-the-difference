import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteManager } from '../js/components/SpriteManager.js';

// Mock dependencies
vi.mock('../js/utils/AssetConfigLoader.js', () => ({
  AssetConfigLoader: vi.fn().mockImplementation(() => ({
    getSprites: vi.fn(() => Promise.resolve(['sprite1.png', 'sprite2.png', 'sprite3.png'])),
    getSpriteInfo: vi.fn(() => Promise.resolve({ width: 50, height: 50 }))
  }))
}));

vi.mock('../js/config/SpriteConfig.js', () => ({
  SPRITE_CONFIG: {
    getCSSSize: vi.fn(() => ({ width: '50px', height: '50px' }))
  }
}));

describe('SpriteManager', () => {
  let spriteManager;
  let mockContainer;

  beforeEach(() => {
    mockContainer = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600, left: 0, top: 0 }))
    };

    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'game-container') {
          return mockContainer;
        }
        return null;
      }),
      createElement: vi.fn(() => ({ 
        style: {}, 
        tagName: 'IMG',
        parentNode: { removeChild: vi.fn() } 
      }))
    };

    global.Image = class {
      constructor() {
        setTimeout(() => this.onload(), 100);
      }
    };

    spriteManager = new SpriteManager('game-container');
  });

  it('should load available sprites', async () => {
    const sprites = await spriteManager.loadAvailableSprites();
    expect(sprites.length).toBe(3);
    expect(spriteManager.getLoadedSpritesCount()).toBe(3);
  });

  it('should get random sprites', async () => {
    await spriteManager.loadAvailableSprites();
    const randomSprites = spriteManager.getRandomSprites(2);
    expect(randomSprites.length).toBe(2);
  });

  it('should create a sprite element', async () => {
    const spriteElement = await spriteManager.createSpriteElement('sprite1.png');
    expect(spriteElement.tagName).toBe('IMG');
    expect(spriteElement.className).toBe('game-sprite');
    expect(spriteElement.style.width).toBe('50px');
    expect(spriteElement.style.height).toBe('50px');
  });

  it('should clear all sprites', async () => {
    const spriteElement = await spriteManager.createSpriteElement('sprite1.png');
    spriteElement.parentNode = mockContainer;
    spriteManager.activeSprites.push(spriteElement);

    spriteManager.clearSprites();

    expect(mockContainer.removeChild).toHaveBeenCalledWith(spriteElement);
    expect(spriteManager.getSpriteCount()).toBe(0);
  });
});