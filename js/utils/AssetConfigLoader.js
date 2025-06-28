export class AssetConfigLoader {
    constructor() {
        this.config = null;
        this.configPath = './config/assets.json';
    }

    async loadConfig() {
        if (this.config) {
            return this.config; // Return cached config
        }

        try {
            const response = await fetch(this.configPath);
            this.config = await response.json();
            return this.config;
        } catch (error) {
            console.warn('Could not load asset configuration:', error);
            return { backgrounds: [], sprites: [] };
        }
    }

    async getBackgrounds() {
        const config = await this.loadConfig();
        // Handle both old format (array of strings) and new format (array of objects)
        if (Array.isArray(config.backgrounds) && config.backgrounds.length > 0) {
            if (typeof config.backgrounds[0] === 'string') {
                // Old format - just filenames
                return config.backgrounds;
            } else {
                // New format - objects with filename and dimensions
                return config.backgrounds;
            }
        }
        return [];
    }

    async getSprites() {
        const config = await this.loadConfig();
        // Handle both old format (array of strings) and new format (array of objects)
        if (Array.isArray(config.sprites) && config.sprites.length > 0) {
            if (typeof config.sprites[0] === 'string') {
                // Old format - just filenames
                return config.sprites;
            } else {
                // New format - objects with filename and dimensions
                return config.sprites;
            }
        }
        return [];
    }

    async getSpriteInfo(filename) {
        const sprites = await this.getSprites();
        if (sprites.length > 0 && typeof sprites[0] === 'object') {
            // New format - find sprite by filename
            return sprites.find(sprite => sprite.filename === filename);
        }
        return null;
    }

    async getBackgroundInfo(filename) {
        const backgrounds = await this.getBackgrounds();
        if (backgrounds.length > 0 && typeof backgrounds[0] === 'object') {
            // New format - find background by filename
            return backgrounds.find(bg => bg.filename === filename);
        }
        return null;
    }
}