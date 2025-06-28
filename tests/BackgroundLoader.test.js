import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundLoader } from '../js/utils/BackgroundLoader.js';
import { AssetConfigLoader } from '../js/utils/AssetConfigLoader.js';

// Mock dependencies
vi.mock('../js/utils/AssetConfigLoader.js', () => ({
  AssetConfigLoader: vi.fn().mockImplementation(() => ({
    getBackgrounds: vi.fn(() => Promise.resolve(['bg1.png', 'bg2.png', 'bg3.png']))
  }))
}));

describe('BackgroundLoader', () => {
  let backgroundLoader;

  beforeEach(() => {
    global.Image = class {
      constructor() {
        setTimeout(() => this.onload(), 100);
      }
    };

    backgroundLoader = new BackgroundLoader();
  });

  it('should load available backgrounds', async () => {
    const backgrounds = await backgroundLoader.loadAvailableBackgrounds();
    expect(backgrounds.length).toBe(3);
  });

  it('should get a random background', async () => {
    await backgroundLoader.loadAvailableBackgrounds();
    const randomBg = backgroundLoader.getRandomBackground();
    expect(randomBg).toContain('./backgrounds/');
  });

  it('should load a background image', async () => {
    const img = await backgroundLoader.loadBackgroundImage('bg1.png');
    expect(img).toBeInstanceOf(global.Image);
  });
});