import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteManager } from '../js/components/SpriteManager.js';
import { ViewManager } from '../js/utils/ViewManager.js';
import type { SpriteData, TemplateData } from '../src/types/index.js';
import type { BoundingBox } from '../js/config/BoundingBoxConfig.js';

// Mock dependencies
vi.mock('../js/utils/AssetConfigLoader.js', () => ({
  AssetConfigLoader: vi.fn().mockImplementation(() => ({
    getSprites: vi.fn(() => Promise.resolve(['sprite1.png', 'sprite2.png', 'sprite3.png'])),
    getSpriteInfo: vi.fn(() => Promise.resolve({ filename: 'sprite1.png', width: 50, height: 50 }))
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
  let spriteManager: SpriteManager;
  let mockContainer: any;

  beforeEach(() => {
    mockContainer = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600, left: 0, top: 0 }))
    };

    const mockBackgroundImage = {
      id: 'background-image-left',
      getBoundingClientRect: vi.fn(() => ({ 
        width: 400, 
        height: 300, 
        left: 100, 
        top: 50 
      })),
      parentElement: mockContainer
    };

    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'game-container') {
          return mockContainer;
        }
        if (id === 'background-image-left') {
          return mockBackgroundImage;
        }
        if (id === 'game-board-left') {
          return mockContainer;
        }
        return null;
      }),
      createElement: vi.fn(() => ({ 
        style: {}, 
        tagName: 'IMG',
        parentNode: { removeChild: vi.fn() } 
      })),
      body: {
        classList: {
          contains: vi.fn(() => false)
        }
      }
    };

    global.Image = class {
      constructor() {
        setTimeout(() => this.onload(), 100);
      }
    };

    spriteManager = new SpriteManager('game-container');
  });

  it('should load available sprites', async () => {
    const sprites: string[] = await spriteManager.loadAvailableSprites();
    expect(sprites.length).toBe(3);
    expect(spriteManager.getLoadedSpritesCount()).toBe(3);
  });

  it('should get random sprites', async () => {
    await spriteManager.loadAvailableSprites();
    const randomSprites: string[] = spriteManager.getRandomSprites(2);
    expect(randomSprites.length).toBe(2);
  });

  it('should create a sprite element', async () => {
    const spriteElement: HTMLImageElement = await spriteManager.createSpriteElement('sprite1.png');
    expect(spriteElement.tagName).toBe('IMG');
    expect(spriteElement.className).toBe('game-sprite');
    expect(spriteElement.style.width).toBe('50px');
    expect(spriteElement.style.height).toBe('50px');
  });

  it('should clear all sprites', async () => {
    const spriteElement: HTMLImageElement = await spriteManager.createSpriteElement('sprite1.png');
    (spriteElement as any).parentNode = mockContainer;
    (spriteManager as any).activeSprites.push(spriteElement);

    spriteManager.clearSprites();

    expect(mockContainer.removeChild).toHaveBeenCalledWith(spriteElement);
    expect(spriteManager.getSpriteCount()).toBe(0);
  });

  it('should check if image exists', async () => {
    // Mock successful image load
    (global as any).Image = vi.fn(() => ({
      onload: null,
      onerror: null,
      set src(value: string) {
        setTimeout(() => this.onload(), 0);
      }
    }));

    const exists: boolean = await (spriteManager as any).imageExists('./sprites/existing.png');
    expect(exists).toBe(true);

    // Mock failed image load
    (global as any).Image = vi.fn(() => ({
      onload: null,
      onerror: null,
      set src(value: string) {
        setTimeout(() => this.onerror(), 0);
      }
    }));

    const notExists: boolean = await (spriteManager as any).imageExists('./sprites/missing.png');
    expect(notExists).toBe(false);
  });

  it('should get loaded sprites count', () => {
    (spriteManager as any).loadedSprites = ['sprite1.png', 'sprite2.png', 'sprite3.png'];
    expect(spriteManager.getLoadedSpritesCount()).toBe(3);
  });

  it('should get sprite count', () => {
    (spriteManager as any).activeSprites = [{ id: 1 }, { id: 2 }];
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
    } as any;

    spriteManager.createSpriteElement = vi.fn().mockResolvedValue(mockSprite);
    (spriteManager as any).container.appendChild = vi.fn();

    const result: HTMLImageElement = await spriteManager.createSpriteAtBackgroundPosition('sprite1.png', 10, 20);

    expect(spriteManager.createSpriteElement).toHaveBeenCalledWith('sprite1.png', [], null);
    expect((spriteManager as any).container.appendChild).toHaveBeenCalledWith(mockSprite);
    expect((spriteManager as any).activeSprites).toContain(mockSprite);
    expect(result).toBe(mockSprite);
  });

  it('should display all sprites with bounding boxes', async () => {
    const boundingBoxes: BoundingBox[] = [
      { id: 1, x: 10, y: 10, width: 50, height: 50 },
      { id: 2, x: 100, y: 100, width: 50, height: 50 }
    ];

    (spriteManager as any).loadedSprites = ['sprite1.png', 'sprite2.png'];
    spriteManager.createSpriteElement = vi.fn().mockResolvedValue({});

    const count: number = await spriteManager.displayAllSprites(boundingBoxes, 2);

    expect(count).toBe(2);
    expect(spriteManager.createSpriteElement).toHaveBeenCalledTimes(2);
  });

  it('should handle empty sprite list gracefully', async () => {
    // Mock loadAvailableSprites to return empty array to simulate no sprites available
    spriteManager.loadAvailableSprites = vi.fn().mockResolvedValue([]);
    (spriteManager as any).loadedSprites = [];
    const boundingBoxes: BoundingBox[] = [{ id: 1, x: 10, y: 10, width: 50, height: 50 }];

    const count: number = await spriteManager.displayAllSprites(boundingBoxes, 5);

    expect(count).toBe(0);
  });

  it('should get background image', () => {
    const mockBgImg = { id: 'background-image-left' } as any;
    (ViewManager.getBackgroundImage as any).mockReturnValue(mockBgImg);

    const bgImg: HTMLImageElement | null = ViewManager.getBackgroundImage();
    expect(bgImg).toBe(mockBgImg);
  });

  it('should create sprite at template position', async () => {
    const mockSprite = {
      style: { position: '', left: '', top: '', width: '', height: '' },
      getBoundingClientRect: vi.fn(() => ({ 
        width: 50, 
        height: 50 
      })),
      naturalWidth: 50,
      naturalHeight: 50,
      addEventListener: vi.fn(),
      src: './sprites/sprite1.png'
    } as any;

    const templateCoords: SpriteData = {
      id: 'sprite1',
      src: 'sprite1.png',
      x: 100,
      y: 200,
      width: 69,
      height: 64,
      renderCoordinates: { x: 100, y: 200 },
      renderDimensions: { width: 69, height: 64 }
    };

    const mockTemplate: TemplateData = {
      id: 'test',
      name: 'Test Template',
      background: 'test.png',
      sprites: [],
      backgroundDimensions: {
        width: 400,
        height: 600
      }
    };

    spriteManager.createSpriteElement = vi.fn().mockResolvedValue(mockSprite);
    (spriteManager as any).container.appendChild = vi.fn();

    const result: HTMLImageElement = await spriteManager.createSpriteAtTemplatePosition('sprite1.png', templateCoords, mockTemplate);

    expect(spriteManager.createSpriteElement).toHaveBeenCalledWith('sprite1.png', [], null);
    expect((spriteManager as any).container.appendChild).toHaveBeenCalledWith(mockSprite);
    expect((spriteManager as any).activeSprites).toContain(mockSprite);
    expect(result).toBe(mockSprite);
  });
});