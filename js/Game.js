import { ScoreDisplay } from './components/ScoreDisplay.js';
import { SpriteManager } from './components/SpriteManager.js';
import { BackgroundLoader } from './utils/BackgroundLoader.js';

export class Game {
    constructor() {
        this.scoreDisplay = new ScoreDisplay('score-count');
        this.spriteManager = new SpriteManager('game-container');
        this.backgroundLoader = new BackgroundLoader();
        this.isGameActive = false;
        
        this.setupEventListeners();
        this.initializeAssets();
    }
    
    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('reset-game').addEventListener('click', () => {
            this.resetGame();
        });
        
    }
    
    async initializeAssets() {
        try {
            await this.backgroundLoader.loadAvailableBackgrounds();
            await this.spriteManager.loadAvailableSprites();
        } catch (error) {
            console.warn('Could not load all assets:', error);
        }
    }

    async startGame() {
        this.isGameActive = true;
        this.updateButtonStates();
        
        await this.loadBackgroundAndSprites();
        
        this.dispatchEvent('gameStarted');
    }

    async loadBackgroundAndSprites() {
        const backgroundSrc = this.backgroundLoader.getRandomBackground();
        console.log('Attempting to load background:', backgroundSrc);
        
        if (backgroundSrc) {
            try {
                const backgroundImg = await this.backgroundLoader.loadBackgroundImage(backgroundSrc);
                console.log('Background loaded successfully:', backgroundImg.src);
                this.setBackgroundImage(backgroundImg);
            } catch (error) {
                console.warn('Could not load background:', error);
            }
        } else {
            console.log('No background available, available backgrounds:', this.backgroundLoader.loadedBackgrounds);
        }
        
        const spritesDisplayed = this.spriteManager.displayAllSprites();
        console.log('Sprites displayed:', spritesDisplayed, 'Available sprites:', this.spriteManager.getLoadedSpritesCount());
    }

    setBackgroundImage(img) {
        const backgroundImg = document.getElementById('background-image');
        backgroundImg.src = img.src;
        backgroundImg.style.display = 'block';
        backgroundImg.style.width = '50%';
        backgroundImg.style.height = 'auto';
        backgroundImg.style.borderRadius = '8px';
    }
    
    resetGame() {
        this.isGameActive = false;
        this.updateButtonStates();
        
        this.spriteManager.clearSprites();
        this.clearBackground();
        this.dispatchEvent('gameReset');
    }

    clearBackground() {
        const backgroundImg = document.getElementById('background-image');
        backgroundImg.style.display = 'none';
        backgroundImg.src = '';
    }
    
    
    updateButtonStates() {
        const startButton = document.getElementById('start-game');
        const resetButton = document.getElementById('reset-game');
        
        startButton.disabled = this.isGameActive;
        resetButton.disabled = !this.isGameActive;
    }
    
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    getGameState() {
        return {
            isActive: this.isGameActive,
            score: this.scoreDisplay.getScore()
        };
    }
}