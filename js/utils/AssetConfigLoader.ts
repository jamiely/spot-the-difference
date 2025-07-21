import type { 
  AssetConfig, 
  AssetConfigLoaderInterface, 
  AssetInfo, 
  SpriteInfo 
} from '../../src/types/index.js';

export class AssetConfigLoader implements AssetConfigLoaderInterface {
  private config: AssetConfig | null = null;
  private readonly configPath: string = './config/assets.json';

  async loadConfig(): Promise<AssetConfig> {
    if (this.config) {
      return this.config; // Return cached config
    }

    try {
      const response = await fetch(this.configPath);
      this.config = await response.json();
      return this.config!;
    } catch (error) {
      console.warn('Could not load asset configuration:', error);
      return { backgrounds: [], sprites: [] };
    }
  }

  async getBackgrounds(): Promise<(string | AssetInfo)[]> {
    const config = await this.loadConfig();
    // Handle both old format (array of strings) and new format (array of objects)
    if (Array.isArray(config.backgrounds) && config.backgrounds.length > 0) {
      if (typeof config.backgrounds[0] === 'string') {
        // Old format - just filenames
        return config.backgrounds as string[];
      } else {
        // New format - objects with filename and dimensions
        return config.backgrounds as AssetInfo[];
      }
    }
    return [];
  }

  async getSprites(): Promise<(string | SpriteInfo)[]> {
    const config = await this.loadConfig();
    // Handle both old format (array of strings) and new format (array of objects)
    if (Array.isArray(config.sprites) && config.sprites.length > 0) {
      if (typeof config.sprites[0] === 'string') {
        // Old format - just filenames
        return config.sprites as string[];
      } else {
        // New format - objects with filename and dimensions
        return config.sprites as SpriteInfo[];
      }
    }
    return [];
  }

  async getSpriteInfo(filename: string): Promise<SpriteInfo | null> {
    const sprites = await this.getSprites();
    if (sprites.length > 0 && typeof sprites[0] === 'object') {
      // New format - find sprite by filename
      return (sprites as SpriteInfo[]).find(sprite => sprite.filename === filename) || null;
    }
    return null;
  }

  async getBackgroundInfo(filename: string): Promise<AssetInfo | null> {
    const backgrounds = await this.getBackgrounds();
    if (backgrounds.length > 0 && typeof backgrounds[0] === 'object') {
      // New format - find background by filename
      return (backgrounds as AssetInfo[]).find(bg => bg.filename === filename) || null;
    }
    return null;
  }
}