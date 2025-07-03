import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteManager } from '../js/components/SpriteManager.js';
import { ViewManager } from '../js/utils/ViewManager.js';

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

vi.mock('../js/utils/ViewManager.js', () => ({
  ViewManager: {
    getBackgroundImage: vi.fn(),
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

  it('should check if image exists', async () => {
    // Mock successful image load
    global.Image = vi.fn(() => ({
      onload: null,
      onerror: null,
      set src(value) {
        setTimeout(() => this.onload(), 0);
      }
    }));

    const exists = await spriteManager.imageExists('./sprites/existing.png');
    expect(exists).toBe(true);

    // Mock failed image load
    global.Image = vi.fn(() => ({
      onload: null,
      onerror: null,
      set src(value) {
        setTimeout(() => this.onerror(), 0);
      }
    }));

    const notExists = await spriteManager.imageExists('./sprites/missing.png');
    expect(notExists).toBe(false);
  });

  it('should get loaded sprites count', () => {
    spriteManager.loadedSprites = ['sprite1.png', 'sprite2.png', 'sprite3.png'];
    expect(spriteManager.getLoadedSpritesCount()).toBe(3);
  });

  it('should get sprite count', () => {
    spriteManager.activeSprites = [{ id: 1 }, { id: 2 }];
    expect(spriteManager.getSpriteCount()).toBe(2);
  });

  it('should create sprite at background position', async () => {
    const mockSprite = {
      style: { position: '', left: '', top: '' },
      getBoundingClientRect: vi.fn(() => ({ 
        width: 50, 
        height: 50 
      })),
      naturalWidth: 50,
      naturalHeight: 50,
      addEventListener: vi.fn(),
      src: './sprites/sprite1.png'
    };

    spriteManager.createSpriteElement = vi.fn().mockResolvedValue(mockSprite);
    spriteManager.container.appendChild = vi.fn();

    const result = await spriteManager.createSpriteAtBackgroundPosition('sprite1.png', 10, 20);

    expect(spriteManager.createSpriteElement).toHaveBeenCalledWith('sprite1.png', [], null);
    expect(spriteManager.container.appendChild).toHaveBeenCalledWith(mockSprite);
    expect(spriteManager.activeSprites).toContain(mockSprite);
    expect(result).toBe(mockSprite);
  });

  it('should display all sprites with bounding boxes', async () => {
    const boundingBoxes = [
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 100, y: 100, width: 50, height: 50 }
    ];

    spriteManager.loadedSprites = ['sprite1.png', 'sprite2.png'];
    spriteManager.createSpriteElement = vi.fn().mockResolvedValue({});

    const count = await spriteManager.displayAllSprites(boundingBoxes, 2);

    expect(count).toBe(2);
    expect(spriteManager.createSpriteElement).toHaveBeenCalledTimes(2);
  });

  it('should handle empty sprite list gracefully', async () => {
    spriteManager.loadedSprites = [];
    const boundingBoxes = [{ x: 10, y: 10, width: 50, height: 50 }];

    const count = await spriteManager.displayAllSprites(boundingBoxes, 5);

    expect(count).toBe(0);
  });

  it('should get background image', () => {
    const mockBgImg = { id: 'background-image-left' };
    ViewManager.getBackgroundImage.mockReturnValue(mockBgImg);

    const bgImg = ViewManager.getBackgroundImage();
    expect(bgImg).toBe(mockBgImg);
  });
});