import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundLoader } from '../js/utils/BackgroundLoader.js';
import { AssetConfigLoader } from '../js/utils/AssetConfigLoader.js';
import type { BackgroundInfo } from '../src/types/index.js';

// Mock dependencies
vi.mock('../js/utils/AssetConfigLoader.js', () => ({
  AssetConfigLoader: vi.fn().mockImplementation(() => ({
    getBackgrounds: vi.fn(() => Promise.resolve(['bg1.png', 'bg2.png', 'bg3.png']))
  }))
}));

describe('BackgroundLoader', () => {
  let backgroundLoader: BackgroundLoader;

  beforeEach(() => {
    (global as any).Image = class {
      constructor() {
        setTimeout(() => (this as any).onload(), 100);
      }
    };

    backgroundLoader = new BackgroundLoader();
  });

  it('should load available backgrounds', async () => {
    const backgrounds: BackgroundInfo[] = await backgroundLoader.loadAvailableBackgrounds();
    expect(backgrounds.length).toBe(3);
  });

  it('should get a random background', async () => {
    await backgroundLoader.loadAvailableBackgrounds();
    const randomBg: string = backgroundLoader.getRandomBackground();
    expect(randomBg).toContain('./backgrounds/');
  });

  it('should load a background image', async () => {
    const img: HTMLImageElement = await backgroundLoader.loadBackgroundImage('bg1.png');
    expect(img).toBeInstanceOf((global as any).Image);
  });
});