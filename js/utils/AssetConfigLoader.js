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
        return config.backgrounds || [];
    }

    async getSprites() {
        const config = await this.loadConfig();
        return config.sprites || [];
    }
}