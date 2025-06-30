import { ScoreDisplay } from './components/ScoreDisplay.js';
import { SpriteManager } from './components/SpriteManager.js';
import { EditMode } from './components/EditMode.js';
import { PlacementMode } from './components/PlacementMode.js';
import { BackgroundLoader } from './utils/BackgroundLoader.js';
import { TemplateManager } from './utils/TemplateManager.js';
import { SpritePositioning } from './utils/SpritePositioning.js';
import { getBoundingBoxesForBackground, getSpriteCountForBackground } from './config/BoundingBoxConfig.js';

export class Game {
    constructor() {
        this.scoreDisplay = new ScoreDisplay('score-count');
        this.spriteManager = new SpriteManager('game-board-left');
        this.editMode = new EditMode();
        this.placementMode = new PlacementMode();
        
        // Set up mutual exclusivity between modes
        this.editMode.setOtherMode(this.placementMode);
        this.placementMode.setOtherMode(this.editMode);
        this.backgroundLoader = new BackgroundLoader();
        this.templateManager = new TemplateManager();
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
        
        document.addEventListener('requestSpriteCreation', (e) => {
            this.handleSpriteCreationRequest(e.detail);
        });
        
        document.addEventListener('requestBackgroundChange', (e) => {
            this.handleBackgroundChangeRequest(e.detail);
        });
        
        document.addEventListener('requestGameModeRestore', (e) => {
            this.handleGameModeRestore(e.detail);
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
        // Try to load template1 by default first
        try {
            await this.templateManager.loadAvailableTemplates();
            const template1 = this.templateManager.getTemplateById('template1');
            
            if (template1) {
                console.log('Loading default template1:', template1.name);
                await this.loadTemplate(template1);
                return;
            }
        } catch (error) {
            console.warn('Could not load template1, falling back to random generation:', error);
        }
        
        // Fallback to random background and sprites if template1 is not available
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
        backgroundImg.style.width = '100%';
        backgroundImg.style.maxWidth = '400px';
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
    
    async handleSpriteCreationRequest(detail) {
        console.log('Individual sprite creation requested', detail);
        if (this.isGameActive) {
            const { spriteSrc, x, y } = detail;
            
            try {
                // Use centralized sprite creation system
                const spriteElement = await this.spriteManager.createSpriteAtBackgroundPosition(spriteSrc, x, y);
                
                // If placement mode is active, enable dragging for the new sprite
                if (this.placementMode.isActive) {
                    this.placementMode.refreshSpriteEventListeners();
                }
                
                console.log(`Created sprite ${spriteSrc} at background position (${x}, ${y})`);
            } catch (error) {
                console.error(`Failed to create sprite ${spriteSrc}:`, error);
            }
        }
    }
    
    async handleBackgroundChangeRequest(detail) {
        console.log('Background change requested', detail);
        if (this.isGameActive) {
            const { background } = detail;
            
            try {
                // Load the new background image
                const backgroundImg = await this.backgroundLoader.loadBackgroundImage(background);
                console.log('New background loaded successfully:', backgroundImg.src);
                this.setBackgroundImage(backgroundImg);
                
                // Update current background filename
                this.currentBackgroundFilename = background;
                
                // Load predefined bounding boxes for this background if edit mode doesn't have custom ones
                this.loadBackgroundBoundingBoxes();
                
                console.log(`Background changed to: ${background}`);
            } catch (error) {
                console.error(`Failed to change background to ${background}:`, error);
            }
        }
    }
    
    async loadTemplate(template) {
        console.log('Loading template:', template.name, 'with', template.sprites.length, 'sprites');
        
        // Store template reference
        this.currentTemplate = template;
        
        try {
            // Load the background image - construct full path
            const backgroundPath = template.background.startsWith('./') ? template.background : `./backgrounds/${template.background}`;
            const backgroundImg = await this.backgroundLoader.loadBackgroundImage(backgroundPath);
            console.log('Template background loaded successfully:', backgroundImg.src);
            
            this.setBackgroundImage(backgroundImg);
            
            // Update current background filename
            this.currentBackgroundFilename = template.background;
            
            // Load predefined bounding boxes for this background if edit mode doesn't have custom ones
            this.loadBackgroundBoundingBoxes();
            
            // Wait for background image to be properly loaded and positioned
            await new Promise((resolve, reject) => {
                const domImg = document.getElementById('background-image');
                if (domImg.complete && domImg.naturalWidth > 0) {
                    resolve();
                } else {
                    domImg.onload = () => resolve();
                    domImg.onerror = (error) => {
                        console.error('Background image failed to load:', error);
                        reject(new Error('Background image failed to load'));
                    };
                    // Add timeout to prevent hanging
                    setTimeout(() => {
                        console.warn('Background image load timeout, proceeding anyway');
                        resolve();
                    }, 3000);
                }
            });
            
            // Clear existing sprites
            this.spriteManager.clearSprites();
            
            // Wait a moment for background to be properly positioned
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Create sprites from template positions using centralized system
            let successCount = 0;
            for (const spriteData of template.sprites) {
                try {
                    // Use centralized sprite creation system
                    await this.spriteManager.createSpriteAtBackgroundPosition(
                        spriteData.src, 
                        spriteData.x, 
                        spriteData.y
                    );
                    successCount++;
                    
                } catch (error) {
                    console.warn(`Could not create sprite ${spriteData.src} from template:`, error);
                }
            }
            
            console.log(`Template loaded successfully: ${successCount}/${template.sprites.length} sprites positioned`);
            
        } catch (error) {
            console.error(`Failed to load template ${template.name}:`, error);
            throw error;
        }
    }
    
    async handleGameModeRestore(detail) {
        console.log('Base Game handling mode restore request', detail);
        // Base game class doesn't need special handling for mode restore
        // This is mainly handled by SpotTheDifferenceGame
    }
    
    getGameState() {
        return {
            isActive: this.isGameActive,
            score: this.scoreDisplay.getScore(),
            editMode: this.editMode.isActive,
            placementMode: this.placementMode.isActive,
            currentTemplate: this.currentTemplate
        };
    }
}