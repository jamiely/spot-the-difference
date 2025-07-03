import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateAssetsConfig, writeAssetsConfig } from '../scripts/generate-assets.js';

// Mock the fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn()
  }
}));

// Mock image-size
vi.mock('image-size', () => ({
  default: vi.fn(() => ({ width: 100, height: 100, type: 'png' }))
}));

describe('generate-assets script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
  });

  describe('generateAssetsConfig', () => {
    it('should generate config with backgrounds and sprites', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync
        .mockReturnValueOnce(['bg1.png', 'bg2.jpg'])
        .mockReturnValueOnce(['sprite1.png', 'sprite2.gif']);
      
      fs.readFileSync.mockReturnValue(Buffer.from('mock image data'));
      fs.statSync.mockReturnValue({ size: 1024 });

      const config = generateAssetsConfig();

      expect(config).toHaveProperty('meta');
      expect(config).toHaveProperty('backgrounds');
      expect(config).toHaveProperty('sprites');
      expect(config.meta.backgroundCount).toBe(2);
      expect(config.meta.spriteCount).toBe(2);
      expect(config.backgrounds).toHaveLength(2);
      expect(config.sprites).toHaveLength(2);
    });

    it('should handle missing directories gracefully', () => {
      fs.existsSync.mockReturnValue(false);

      const config = generateAssetsConfig();

      expect(config.meta.backgroundCount).toBe(0);
      expect(config.meta.spriteCount).toBe(0);
      expect(config.backgrounds).toHaveLength(0);
      expect(config.sprites).toHaveLength(0);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    });

    it('should filter files by supported extensions', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync
        .mockReturnValueOnce(['image.png', 'document.txt', 'photo.jpg', 'video.mp4'])
        .mockReturnValueOnce(['sprite.gif', 'data.json', 'icon.webp']);
      
      fs.readFileSync.mockReturnValue(Buffer.from('mock image data'));
      fs.statSync.mockReturnValue({ size: 1024 });

      const config = generateAssetsConfig();

      expect(config.backgrounds).toHaveLength(2); // Only .png and .jpg
      expect(config.sprites).toHaveLength(2); // Only .gif and .webp
    });

    it('should handle file read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync
        .mockReturnValueOnce(['bg1.png'])
        .mockReturnValueOnce(['sprite1.png']);
      
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const config = generateAssetsConfig();

      expect(config.backgrounds[0]).toEqual({
        filename: 'bg1.png',
        width: null,
        height: null,
        type: null,
        size: null
      });
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0]).toBe('Could not read image info for bg1.png:');
      expect(console.warn.mock.calls[0][1]).toBe('File read error');
    });
  });

  describe('writeAssetsConfig', () => {
    const mockConfig = {
      meta: { generated: '2023-01-01T00:00:00.000Z', backgroundCount: 1, spriteCount: 1 },
      backgrounds: [{ filename: 'bg1.png', width: 800, height: 600 }],
      sprites: [{ filename: 'sprite1.png', width: 50, height: 50 }]
    };

    it('should write config file successfully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      const result = writeAssetsConfig(mockConfig);

      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('assets.json'),
        JSON.stringify(mockConfig, null, 2)
      );
      expect(console.log).toHaveBeenCalledWith('✓ Generated assets.json successfully');
    });

    it('should create config directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      fs.writeFileSync.mockImplementation(() => {});
      fs.mkdirSync.mockImplementation(() => {});

      const result = writeAssetsConfig(mockConfig);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('config'),
        { recursive: true }
      );
      expect(result).toBe(true);
    });

    it('should handle write errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      const result = writeAssetsConfig(mockConfig);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error writing assets.json:',
        'Write error'
      );
    });

    it('should display sprite samples when count is manageable', () => {
      const configWithManySprites = {
        ...mockConfig,
        sprites: Array.from({ length: 8 }, (_, i) => ({
          filename: `sprite${i + 1}.png`,
          width: 50,
          height: 50
        }))
      };
      configWithManySprites.meta.spriteCount = 8;

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      writeAssetsConfig(configWithManySprites);

      expect(console.log).toHaveBeenCalledWith('  Sample sprites:');
      expect(console.log).toHaveBeenCalledWith('    ... and 3 more');
    });

    it('should not display sprites section when count exceeds limit', () => {
      const configWithTooManySprites = {
        ...mockConfig,
        sprites: Array.from({ length: 15 }, (_, i) => ({
          filename: `sprite${i + 1}.png`,
          width: 50,
          height: 50
        }))
      };
      configWithTooManySprites.meta.spriteCount = 15;

      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {});

      writeAssetsConfig(configWithTooManySprites);

      expect(console.log).not.toHaveBeenCalledWith('  Sample sprites:');
    });
  });
});
