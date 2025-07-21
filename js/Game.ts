import { ScoreDisplay } from './components/ScoreDisplay.js';
import { SpriteManager } from './components/SpriteManager.js';
import { EditMode } from './components/EditMode.js';
import { PlacementMode } from './components/PlacementMode.js';
import { BackgroundLoader } from './utils/BackgroundLoader.js';
import { TemplateManager } from './utils/TemplateManager.js';
import { SpritePositioning } from './utils/SpritePositioning.js';
import { getBoundingBoxesForBackground, getSpriteCountForBackground, BoundingBox } from './config/BoundingBoxConfig.js';

// Game event interfaces
interface EditModeToggledEvent extends CustomEvent {
    detail: {
        isActive: boolean;
    };
}

interface PlacementModeToggledEvent extends CustomEvent {
    detail: {
        isActive: boolean;
    };
}

interface SpriteGenerationRequestEvent extends CustomEvent {
    detail: {
        useAllSprites?: boolean;
    };
}

interface SpriteCreationRequestEvent extends CustomEvent {
    detail: {
        spriteSrc: string;
        x: number;
        y: number;
    };
}

interface BackgroundChangeRequestEvent extends CustomEvent {
    detail: {
        background: string;
    };
}

interface GameModeRestoreEvent extends CustomEvent {
    detail: any;
}

// Template interface
interface Template {
    name: string;
    background: string;
    sprites: Array<{
        src: string;
        x: number;
        y: number;
        renderCoordinates?: {
            x: number;
            y: number;
        };
    }>;
    backgroundDimensions?: {
        width: number;
        height: number;
    };
}

// Game state interface
interface GameState {
    isActive: boolean;
    score: number;
    editMode: boolean;
    placementMode: boolean;
    currentTemplate: Template | null;
}

export class Game {
    protected scoreDisplay: ScoreDisplay;
    protected spriteManager: SpriteManager;
    protected editMode: EditMode;
    protected placementMode: PlacementMode;
    protected backgroundLoader: BackgroundLoader;
    protected templateManager: TemplateManager;
    protected isGameActive: boolean = false;
    protected currentBackgroundFilename: string | null = null;
    protected currentTemplate: Template | null = null;
    
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
        
        this.setupEventListeners();
        this.initializeAssets();
    }
    
    private setupEventListeners(): void {
        const startButton = document.getElementById('start-game') as HTMLButtonElement;
        startButton.addEventListener('click', () => {
            this.startGame();
        });
        
        const resetButton = document.getElementById('reset-game') as HTMLButtonElement;
        resetButton.addEventListener('click', () => {
            this.resetGame();
        });
        
        document.addEventListener('editModeToggled', (e: Event) => {
            const event = e as EditModeToggledEvent;
            this.handleEditModeToggle(event.detail);
        });
        
        document.addEventListener('placementModeToggled', (e: Event) => {
            const event = e as PlacementModeToggledEvent;
            this.handlePlacementModeToggle(event.detail);
        });
        
        document.addEventListener('requestSpriteGeneration', (e: Event) => {
            const event = e as SpriteGenerationRequestEvent;
            this.handleSpriteGenerationRequest(event.detail);
        });
        
        document.addEventListener('requestSpriteCreation', (e: Event) => {
            const event = e as SpriteCreationRequestEvent;
            this.handleSpriteCreationRequest(event.detail);
        });
        
        document.addEventListener('requestBackgroundChange', (e: Event) => {
            const event = e as BackgroundChangeRequestEvent;
            this.handleBackgroundChangeRequest(event.detail);
        });
        
        document.addEventListener('requestGameModeRestore', (e: Event) => {
            const event = e as GameModeRestoreEvent;
            this.handleGameModeRestore(event.detail);
        });
    }
    
    private async initializeAssets(): Promise<void> {
        try {
            await this.backgroundLoader.loadAvailableBackgrounds();
            await this.spriteManager.loadAvailableSprites();
        } catch (error) {
            console.warn('Could not load all assets:', error);
        }
    }

    async startGame(): Promise<void> {
        this.isGameActive = true;
        this.updateButtonStates();
        
        await this.loadBackgroundAndSprites();
        
        this.dispatchEvent('gameStarted');
    }

    private async loadBackgroundAndSprites(): Promise<void> {
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
                this.currentBackgroundFilename = backgroundSrc.split('/').pop() || null;
                
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

    private loadBackgroundBoundingBoxes(): void {
        // Only load predefined bounding boxes if edit mode doesn't have custom ones
        if (this.editMode.getBoundingBoxes().length === 0 && this.currentBackgroundFilename) {
            const predefinedBoxes = getBoundingBoxesForBackground(this.currentBackgroundFilename);
            if (predefinedBoxes.length > 0) {
                console.log(`Loading ${predefinedBoxes.length} predefined bounding boxes for ${this.currentBackgroundFilename}`);
                this.editMode.setBoundingBoxes(predefinedBoxes);
            }
        }
    }

    private setBackgroundImage(img: HTMLImageElement): void {
        const backgroundImg = document.getElementById('background-image') as HTMLImageElement;
        backgroundImg.src = img.src;
        backgroundImg.style.display = 'block';
        backgroundImg.style.width = '100%';
        backgroundImg.style.maxWidth = '400px';
        backgroundImg.style.height = 'auto';
        backgroundImg.style.borderRadius = '8px';
    }
    
    resetGame(): void {
        this.isGameActive = false;
        this.updateButtonStates();
        
        this.spriteManager.clearSprites();
        this.clearBackground();
        this.dispatchEvent('gameReset');
    }

    private clearBackground(): void {
        const backgroundImg = document.getElementById('background-image') as HTMLImageElement;
        backgroundImg.style.display = 'none';
        backgroundImg.src = '';
    }
    
    updateButtonStates(): void {
        const startButton = document.getElementById('start-game') as HTMLButtonElement;
        const resetButton = document.getElementById('reset-game') as HTMLButtonElement;
        
        startButton.disabled = this.isGameActive;
        resetButton.disabled = !this.isGameActive;
    }
    
    protected dispatchEvent(eventName: string, detail: any = {}): void {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    private async handleEditModeToggle(detail: { isActive: boolean }): Promise<void> {
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
    
    private async handlePlacementModeToggle(detail: { isActive: boolean }): Promise<void> {
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
    
    private async handleSpriteGenerationRequest(detail: { useAllSprites?: boolean }): Promise<void> {
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
    
    private async handleSpriteCreationRequest(detail: { spriteSrc: string; x: number; y: number }): Promise<void> {
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
    
    private async handleBackgroundChangeRequest(detail: { background: string }): Promise<void> {
        console.log('Background change requested', detail);
        if (this.isGameActive) {
            const { background } = detail;
            
            try {
                // Construct full path for background image
                const backgroundPath = background.startsWith('./') ? background : `./backgrounds/${background}`;
                
                // Load the new background image
                const backgroundImg = await this.backgroundLoader.loadBackgroundImage(backgroundPath);
                console.log('New background loaded successfully:', backgroundImg.src);
                this.setBackgroundImage(backgroundImg);
                
                // Update current background filename (store just the filename)
                this.currentBackgroundFilename = background.startsWith('./') ? background.split('/').pop() || null : background;
                
                // Load predefined bounding boxes for this background if edit mode doesn't have custom ones
                this.loadBackgroundBoundingBoxes();
                
                console.log(`Background changed to: ${background}`);
            } catch (error) {
                console.error(`Failed to change background to ${background}:`, error);
            }
        }
    }
    
    protected async loadTemplate(template: Template): Promise<void> {
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
            await new Promise<void>((resolve, reject) => {
                const domImg = document.getElementById('background-image') as HTMLImageElement;
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
            
            // Create sprites from template positions using scaled positioning system
            let successCount = 0;
            for (const spriteData of template.sprites) {
                try {
                    // Use scaled sprite creation system if template has background dimensions
                    if (template.backgroundDimensions) {
                        await this.spriteManager.createSpriteAtTemplatePosition(
                            spriteData.src, 
                            spriteData,
                            template
                        );
                    } else {
                        // Fallback to direct positioning for legacy templates
                        const x = spriteData.renderCoordinates ? spriteData.renderCoordinates.x : spriteData.x;
                        const y = spriteData.renderCoordinates ? spriteData.renderCoordinates.y : spriteData.y;
                        await this.spriteManager.createSpriteAtBackgroundPosition(
                            spriteData.src, 
                            x, 
                            y
                        );
                    }
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
    
    private async handleGameModeRestore(detail: any): Promise<void> {
        console.log('Base Game handling mode restore request', detail);
        // Base game class doesn't need special handling for mode restore
        // This is mainly handled by SpotTheDifferenceGame
    }
    
    getGameState(): GameState {
        return {
            isActive: this.isGameActive,
            score: this.scoreDisplay.getScore(),
            editMode: this.editMode.isActive,
            placementMode: this.placementMode.isActive,
            currentTemplate: this.currentTemplate
        };
    }
}