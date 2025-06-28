import { AssetConfigLoader } from './AssetConfigLoader.js';

export class BackgroundLoader {
    constructor() {
        this.backgroundsPath = './backgrounds/';
        this.loadedBackgrounds = [];
        this.configLoader = new AssetConfigLoader();
    }

    async loadAvailableBackgrounds() {
        try {
            const knownBackgrounds = await this.configLoader.getBackgrounds();
            const backgrounds = [];
            
            for (const filename of knownBackgrounds) {
                if (await this.imageExists(this.backgroundsPath + filename)) {
                    backgrounds.push(filename);
                }
            }
            
            this.loadedBackgrounds = backgrounds;
            return backgrounds;
        } catch (error) {
            console.warn('Could not load backgrounds:', error);
            return [];
        }
    }

    async imageExists(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    }

    getRandomBackground() {
        if (this.loadedBackgrounds.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * this.loadedBackgrounds.length);
        return this.backgroundsPath + this.loadedBackgrounds[randomIndex];
    }

    async loadBackgroundImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
}