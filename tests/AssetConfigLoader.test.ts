import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetConfigLoader } from '../js/utils/AssetConfigLoader.js';
import type { AssetConfig, AssetInfo, SpriteInfo } from '../src/types/index.js';

describe('AssetConfigLoader', () => {
  let configLoader: AssetConfigLoader;

  beforeEach(() => {
    configLoader = new AssetConfigLoader();
  });

  it('should load and parse the config file', async () => {
    const mockConfig: AssetConfig = { backgrounds: ['bg1.png'], sprites: ['sprite1.png'] };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockConfig),
      } as Response)
    );

    const config = await configLoader.loadConfig();
    expect(config).toEqual(mockConfig);
  });

  it('should get backgrounds', async () => {
    const mockConfig: AssetConfig = { backgrounds: ['bg1.png', 'bg2.png'], sprites: [] };
    (configLoader as any).config = mockConfig;

    const backgrounds = await configLoader.getBackgrounds();
    expect(backgrounds).toEqual(mockConfig.backgrounds);
  });

  it('should get sprites', async () => {
    const mockConfig: AssetConfig = { backgrounds: [], sprites: ['sprite1.png', 'sprite2.png'] };
    (configLoader as any).config = mockConfig;

    const sprites = await configLoader.getSprites();
    expect(sprites).toEqual(mockConfig.sprites);
  });

  it('should get sprite info', async () => {
    const mockSpriteInfo: SpriteInfo = { filename: 'sprite1.png', width: 50, height: 50 };
    const mockConfig: AssetConfig = {
      backgrounds: [],
      sprites: [mockSpriteInfo],
    };
    (configLoader as any).config = mockConfig;

    const spriteInfo = await configLoader.getSpriteInfo('sprite1.png');
    expect(spriteInfo).toEqual(mockSpriteInfo);
  });

  it('should get background info', async () => {
    const mockBackgroundInfo: AssetInfo = { filename: 'bg1.png', width: 800, height: 600 };
    const mockConfig: AssetConfig = {
      backgrounds: [mockBackgroundInfo],
      sprites: [],
    };
    (configLoader as any).config = mockConfig;

    const backgroundInfo = await configLoader.getBackgroundInfo('bg1.png');
    expect(backgroundInfo).toEqual(mockBackgroundInfo);
  });
});