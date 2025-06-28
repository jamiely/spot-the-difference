import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetConfigLoader } from '../js/utils/AssetConfigLoader.js';

describe('AssetConfigLoader', () => {
  let configLoader;

  beforeEach(() => {
    configLoader = new AssetConfigLoader();
  });

  it('should load and parse the config file', async () => {
    const mockConfig = { backgrounds: ['bg1.png'], sprites: ['sprite1.png'] };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockConfig),
      })
    );

    const config = await configLoader.loadConfig();
    expect(config).toEqual(mockConfig);
  });

  it('should get backgrounds', async () => {
    const mockConfig = { backgrounds: ['bg1.png', 'bg2.png'], sprites: [] };
    configLoader.config = mockConfig;

    const backgrounds = await configLoader.getBackgrounds();
    expect(backgrounds).toEqual(mockConfig.backgrounds);
  });

  it('should get sprites', async () => {
    const mockConfig = { backgrounds: [], sprites: ['sprite1.png', 'sprite2.png'] };
    configLoader.config = mockConfig;

    const sprites = await configLoader.getSprites();
    expect(sprites).toEqual(mockConfig.sprites);
  });

  it('should get sprite info', async () => {
    const mockConfig = {
      backgrounds: [],
      sprites: [{ filename: 'sprite1.png', width: 50, height: 50 }],
    };
    configLoader.config = mockConfig;

    const spriteInfo = await configLoader.getSpriteInfo('sprite1.png');
    expect(spriteInfo).toEqual(mockConfig.sprites[0]);
  });

  it('should get background info', async () => {
    const mockConfig = {
      backgrounds: [{ filename: 'bg1.png', width: 800, height: 600 }],
      sprites: [],
    };
    configLoader.config = mockConfig;

    const backgroundInfo = await configLoader.getBackgroundInfo('bg1.png');
    expect(backgroundInfo).toEqual(mockConfig.backgrounds[0]);
  });
});