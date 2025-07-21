import { AssetConfigLoader } from './AssetConfigLoader.js';
import type { AssetInfo, BackgroundInfo } from '../../src/types/index.js';

export class BackgroundLoader {
    private backgroundsPath: string;
    private loadedBackgrounds: string[];
    private configLoader: AssetConfigLoader;

    constructor() {
        this.backgroundsPath = './backgrounds/';
        this.loadedBackgrounds = [];
        this.configLoader = new AssetConfigLoader();
    }

    async loadAvailableBackgrounds(): Promise<BackgroundInfo[]> {
        try {
            const knownBackgrounds = await this.configLoader.getBackgrounds();
            const backgroundFilenames: string[] = [];
            const backgroundObjects: BackgroundInfo[] = [];
            
            for (const backgroundData of knownBackgrounds) {
                // Handle both old format (string) and new format (object)
                const filename = typeof backgroundData === 'string' ? backgroundData : backgroundData.filename;
                if (await this.imageExists(this.backgroundsPath + filename)) {
                    backgroundFilenames.push(filename);
                    backgroundObjects.push({ filename: filename });
                }
            }
            
            // Keep loadedBackgrounds as strings for compatibility with getRandomBackground()
            this.loadedBackgrounds = backgroundFilenames;
            // Return objects for LevelManager compatibility
            return backgroundObjects;
        } catch (error) {
            console.warn('Could not load backgrounds:', error);
            return [];
        }
    }

    async imageExists(src: string): Promise<boolean> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    }

    getRandomBackground(): string | null {
        if (this.loadedBackgrounds.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * this.loadedBackgrounds.length);
        return this.backgroundsPath + this.loadedBackgrounds[randomIndex];
    }

    async loadBackgroundImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
}