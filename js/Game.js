import { ScoreDisplay } from './components/ScoreDisplay.js';
import { SpriteManager } from './components/SpriteManager.js';
import { EditMode } from './components/EditMode.js';
import { PlacementMode } from './components/PlacementMode.js';
import { BackgroundLoader } from './utils/BackgroundLoader.js';
import { getBoundingBoxesForBackground, getSpriteCountForBackground } from './config/BoundingBoxConfig.js';

export class Game {
    constructor() {
        this.scoreDisplay = new ScoreDisplay('score-count');
        this.spriteManager = new SpriteManager('game-container');
        this.editMode = new EditMode();
        this.placementMode = new PlacementMode();
        this.backgroundLoader = new BackgroundLoader();
        this.isGameActive = false;
        this.currentBackgroundFilename = null;
        
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
        
        document.addEventListener('editModeToggled', (e) => {
            this.handleEditModeToggle(e.detail);
        });
        
        document.addEventListener('placementModeToggled', (e) => {
            this.handlePlacementModeToggle(e.detail);
        });
        
        document.addEventListener('requestSpriteGeneration', (e) => {
            this.handleSpriteGenerationRequest(e.detail);
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
                
                // Extract filename from path for bounding box lookup
                this.currentBackgroundFilename = backgroundSrc.split('/').pop();
                
                // Load predefined bounding boxes for this background if edit mode doesn't have custom ones
                this.loadBackgroundBoundingBoxes();
            } catch (error) {
                console.warn('Could not load background:', error);
            }
        } else {
            console.log('No background available, available backgrounds:', this.backgroundLoader.loadedBackgrounds);
        }
        
        const boundingBoxes = this.editMode.getBoundingBoxes();
        const spriteCount = this.currentBackgroundFilename ? 
            getSpriteCountForBackground(this.currentBackgroundFilename) : 50;
        const spritesDisplayed = await this.spriteManager.displayAllSprites(boundingBoxes, spriteCount);
        console.log('Sprites displayed:', spritesDisplayed, 'Target count:', spriteCount, 'Available sprites:', this.spriteManager.getLoadedSpritesCount());
    }

    loadBackgroundBoundingBoxes() {
        // Only load predefined bounding boxes if edit mode doesn't have custom ones
        if (this.editMode.getBoundingBoxes().length === 0 && this.currentBackgroundFilename) {
            const predefinedBoxes = getBoundingBoxesForBackground(this.currentBackgroundFilename);
            if (predefinedBoxes.length > 0) {
                console.log(`Loading ${predefinedBoxes.length} predefined bounding boxes for ${this.currentBackgroundFilename}`);
                this.editMode.setBoundingBoxes(predefinedBoxes);
            }
        }
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
    
    async handleEditModeToggle(detail) {
        console.log('Edit mode toggled:', detail.isActive);
        if (detail.isActive) {
            // Exit placement mode if active
            if (this.placementMode.isActive) {
                this.placementMode.togglePlacementMode();
            }
            this.spriteManager.clearSprites();
        } else {
            if (this.isGameActive) {
                const boundingBoxes = this.editMode.getBoundingBoxes();
                const spriteCount = this.currentBackgroundFilename ? 
                    getSpriteCountForBackground(this.currentBackgroundFilename) : 50;
                await this.spriteManager.displayAllSprites(boundingBoxes, spriteCount);
            }
        }
    }
    
    async handlePlacementModeToggle(detail) {
        console.log('Placement mode toggled:', detail.isActive);
        if (detail.isActive) {
            // Exit edit mode if active
            if (this.editMode.isActive) {
                this.editMode.toggleEditMode();
            }
            // Ensure sprites are visible for placement, but only if not already present
            if (this.isGameActive && this.spriteManager.getSpriteCount() === 0) {
                const boundingBoxes = this.editMode.getBoundingBoxes();
                const spriteCount = this.currentBackgroundFilename ? 
                    getSpriteCountForBackground(this.currentBackgroundFilename) : 50;
                await this.spriteManager.displayAllSprites(boundingBoxes, spriteCount);
            }
        }
        // Don't regenerate sprites when exiting placement mode to preserve positions
    }
    
    async handleSpriteGenerationRequest(detail) {
        console.log('Sprite generation requested', detail);
        if (this.isGameActive) {
            const boundingBoxes = this.editMode.getBoundingBoxes();
            
            if (detail.useAllSprites) {
                // Use all available sprites regardless of configured limit
                const allSpritesCount = this.spriteManager.getLoadedSpritesCount();
                console.log(`Placing all ${allSpritesCount} available sprites`);
                await this.spriteManager.displayAllSprites(boundingBoxes, allSpritesCount);
            } else {
                // Use configured sprite count
                const spriteCount = this.currentBackgroundFilename ? 
                    getSpriteCountForBackground(this.currentBackgroundFilename) : 50;
                await this.spriteManager.displayAllSprites(boundingBoxes, spriteCount);
            }
        }
    }
    
    getGameState() {
        return {
            isActive: this.isGameActive,
            score: this.scoreDisplay.getScore(),
            editMode: this.editMode.isActive,
            placementMode: this.placementMode.isActive
        };
    }
}