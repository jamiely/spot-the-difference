import { Game } from './Game.js';
import { SpriteManager } from './components/SpriteManager.js';
import { SPRITE_CONFIG } from './config/SpriteConfig.js';
import { ScalingUtils } from './utils/ScalingUtils.js';
import { getSpriteCountForBackground } from './config/BoundingBoxConfig.js';
import { LevelManager } from './components/LevelManager.js';
import { GameModal } from './components/GameModal.js';
import type { 
    TemplateData, 
    BackgroundData, 
    LevelData, 
    GameDifference, 
    SpriteData, 
    BoundingBox, 
    ClickCoordinates,
    BoardClickEvent,
    LevelCompletionStats
} from '../src/types/index.js';
import type { LevelInfoExtended } from './components/LevelManager.js';

// ===== INTERFACES =====

interface SeededRNG {
    next(): number;
    nextInt(min: number, max: number): number;
}

interface DifferenceMarkerOptions {
    x: number;
    y: number;
    side: 'left' | 'right';
    symbol: string;
    color: string;
}

interface GameModeRestoreEvent extends CustomEvent {
    detail: any;
}

interface BackgroundChangeRequestEvent extends CustomEvent {
    detail: {
        background: string;
    };
}

interface DifferenceFoundEvent extends CustomEvent {
    detail: {
        totalFound: number;
        differenceId?: string;
    };
}

interface SpriteSpriteCopyData {
    spriteSrc: string;
    relativeX: number;
    relativeY: number;
    width: number;
    height: number;
    spriteId: string;
}

interface SpotTheDifferenceGameState {
    isGameActive: boolean;
    isTestMode: boolean;
    currentTemplate: TemplateData | null;
    currentLevelData: LevelData | null;
    differences: GameDifference[];
    foundDifferences: string[];
    totalDifferencesFound: number;
    seed: number;
    leftSpriteManager: SpriteManager;
    rightSpriteManager: SpriteManager;
    levelManager: LevelManager;
    modal: GameModal;
    rng: SeededRNG;
    currentBackgroundFilename: string | null;
}

// ===== MAIN CLASS =====

export class SpotTheDifferenceGame extends Game {
    // Game managers and components
    protected leftSpriteManager: SpriteManager;
    protected rightSpriteManager: SpriteManager;
    protected levelManager: LevelManager;
    protected modal: GameModal;
    
    // Game state for spot the difference
    protected differences: GameDifference[] = [];
    protected foundDifferences: string[] = [];
    protected currentTemplate: TemplateData | null = null;
    protected isSpotTheeDifferenceMode: boolean = true;
    
    // Running total of differences found across all levels in current game
    protected totalDifferencesFound: number = 0;
    
    // Level progression system
    protected currentLevelData: LevelData | null = null;
    
    // Test mode to avoid prompts during testing
    protected isTestMode: boolean;
    
    // Seeded random number generation
    protected seed: number;
    protected rng: SeededRNG;
    
    constructor() {
        super();
        
        // Override container setup for side-by-side display
        this.leftSpriteManager = new SpriteManager('game-board-left');
        this.rightSpriteManager = new SpriteManager('game-board-right');
        
        // Level progression system
        this.levelManager = new LevelManager(this.templateManager, this.backgroundLoader);
        
        // Modal for user interactions (replaces alert/confirm)
        this.modal = new GameModal();
        
        // Test mode detection
        this.isTestMode = this.detectTestMode();
        
        // Seeded random number generation
        this.seed = this.getSeedFromURL();
        this.rng = this.createSeededRNG(this.seed);
        
        console.log(`Using seed: ${this.seed}`);
        
        this.setupSpotTheDifferenceEventListeners();
        this.setupModeTransitionListeners();
    }
    
    // ===== INITIALIZATION METHODS =====
    
    private detectTestMode(): boolean {
        // Enable test mode for unit tests (vitest/jest)
        if (typeof global !== 'undefined' && 
            typeof window === 'undefined' && 
            typeof (global as any).alert === 'function') {
            return true;
        }
        
        // For browser environments
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Explicit test mode parameter always takes precedence
            if (urlParams.has('test')) {
                console.log('Test mode enabled via ?test parameter');
                return true;
            }
            
            // Auto-detect automation tools for test mode
            const isPlaywright = navigator.userAgent.includes('Playwright');
            const isHeadlessChrome = navigator.userAgent.includes('HeadlessChrome');
            const hasPlaywrightObject = typeof window.__playwright !== 'undefined';
            const hasWebdriver = 'webdriver' in navigator;
            
            // Enable test mode for specific automation scenarios
            if (isPlaywright || isHeadlessChrome || hasPlaywrightObject || hasWebdriver) {
                console.log('Test mode enabled for automated testing environment:', {
                    isPlaywright,
                    isHeadlessChrome,
                    hasPlaywrightObject,
                    hasWebdriver
                });
                return true;
            }
        }
        
        return false;
    }
    
    private getSeedFromURL(): number {
        const urlParams = new URLSearchParams(window.location.search);
        const seedParam = urlParams.get('seed');
        if (seedParam) {
            const parsedSeed = parseInt(seedParam, 10);
            if (!isNaN(parsedSeed)) {
                return parsedSeed;
            }
        }
        // Generate a random seed if none provided
        return Math.floor(Math.random() * 1000000);
    }
    
    private createSeededRNG(seed: number): SeededRNG {
        // Linear Congruential Generator for reproducible randomness
        let currentSeed = seed;
        const rng = {
            next: (): number => {
                currentSeed = (currentSeed * 1664525 + 1013904223) % (2 ** 32);
                return currentSeed / (2 ** 32);
            }
        };
        // Helper method to get random integer in range
        (rng as any).nextInt = (min: number, max: number): number => {
            return Math.floor(rng.next() * (max - min + 1)) + min;
        };
        return rng as SeededRNG;
    }
    
    private setupSpotTheDifferenceEventListeners(): void {
        // Click detection for finding differences
        const leftBoard = document.getElementById('game-board-left');
        const rightBoard = document.getElementById('game-board-right');
        
        if (leftBoard) {
            leftBoard.addEventListener('click', (e: MouseEvent) => {
                this.handleBoardClick(e as BoardClickEvent, 'left');
            });
        }
        
        if (rightBoard) {
            rightBoard.addEventListener('click', (e: MouseEvent) => {
                this.handleBoardClick(e as BoardClickEvent, 'right');
            });
        }
        
        // Reveal all differences with '!' key
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === '!' && this.isGameActive) {
                this.revealAllDifferences();
            }
            
            // Debug: Auto-complete level with '$' key
            if (e.key === '$' && this.isGameActive) {
                this.autoCompleteLevel();
            }
        });
    }
    
    private setupModeTransitionListeners(): void {
        // Listen for placement mode transitions
        document.addEventListener('requestGameModeRestore', (e: Event) => {
            const event = e as GameModeRestoreEvent;
            this.handleGameModeRestore(event.detail);
        });
    }
    
    // ===== GAME LIFECYCLE METHODS =====
    
    async startGame(): Promise<void> {
        this.isGameActive = true;
        this.updateButtonStates();
        
        // Reset the running total at the start of a new game
        this.totalDifferencesFound = 0;
        
        // Show the side-by-side boards and hide legacy board
        const gameBoards = document.querySelector('.game-boards') as HTMLElement;
        const legacyBoard = document.getElementById('legacy-game-board');
        
        if (gameBoards) {
            gameBoards.style.display = 'flex';
        }
        if (legacyBoard) {
            legacyBoard.style.display = 'none';
        }
        
        // Load the next level from the level manager
        await this.loadNextLevel();
        
        this.dispatchEvent('gameStarted');
    }
    
    async loadNextLevel(): Promise<void> {
        try {
            console.log('=== LOADING NEXT LEVEL ===');
            console.log(`Test mode: ${this.isTestMode}`);
            
            // Always clear sprites and markers from previous level first
            this.clearAllPreviousLevelData();
            
            if (this.isTestMode) {
                // In test mode, just load template1 like the old behavior
                console.log('Test mode - loading template1');
                await this.loadTemplateForSpotTheDifference();
                return;
            }
            
            // Get the next level from the level manager
            console.log('Getting next level from level manager...');
            this.currentLevelData = await this.levelManager.getNextLevel();
            console.log('Received level data:', this.currentLevelData);
            
            if (!this.currentLevelData) {
                // Game is complete!
                console.log('No more levels - game complete!');
                this.handleGameComplete();
                return;
            }
            
            console.log(`Loading level: ${this.currentLevelData.levelInfo.description}`);
            console.log(`Level type: ${this.currentLevelData.type}`);
            console.log(`Level data:`, this.currentLevelData.data);
            
            if (this.currentLevelData.type === 'template') {
                // Load template-based level
                console.log('Loading template-based level...');
                await this.setupSideBySideGame(this.currentLevelData.data as TemplateData);
            } else {
                // Load random background level
                console.log('Loading random background level...');
                await this.setupRandomBackgroundLevel(this.currentLevelData.data as BackgroundData);
            }
            
            // Display level info to the user
            this.displayLevelInfo();
            console.log('Level loading completed successfully');
            
        } catch (error) {
            console.error('Failed to load next level:', error);
            console.error('Error stack:', (error as Error).stack);
            // If loading fails, deactivate the game
            this.isGameActive = false;
            this.updateButtonStates();
        }
    }
    
    private async loadTemplateForSpotTheDifference(): Promise<void> {
        try {
            await this.templateManager.loadAvailableTemplates();
            const template1 = this.templateManager.getTemplateById('template1');
            
            if (template1) {
                console.log('Loading template for spot the difference:', template1.name);
                await this.setupSideBySideGame(template1);
            } else {
                console.warn('Template1 not found for spot the difference mode');
            }
        } catch (error) {
            console.error('Failed to load template for spot the difference:', error);
        }
    }
    
    resetGame(): void {
        this.isGameActive = false;
        this.updateButtonStates();
        
        // Clear all sprites and markers
        this.leftSpriteManager.clearSprites();
        this.rightSpriteManager.clearSprites();
        this.clearDifferenceMarkers();
        
        // Hide background images
        const leftBg = document.getElementById('background-image-left') as HTMLImageElement;
        const rightBg = document.getElementById('background-image-right') as HTMLImageElement;
        
        if (leftBg) leftBg.style.display = 'none';
        if (rightBg) rightBg.style.display = 'none';
        
        // Reset current level state (but preserve level progression)
        this.differences = [];
        this.foundDifferences = [];
        this.currentTemplate = null;
        this.currentLevelData = null;
        
        // Reset page title to default
        document.title = 'Spot the Difference';
        
        // Hide level title header
        const levelTitleElement = document.getElementById('level-title');
        if (levelTitleElement) {
            levelTitleElement.style.display = 'none';
            levelTitleElement.textContent = '';
        }
        
        console.log('Page title and header reset to default');
        
        this.dispatchEvent('gameReset');
    }
    
    // ===== RANDOM BACKGROUND LEVEL METHODS =====
    
    private async setupRandomBackgroundLevel(backgroundData: BackgroundData): Promise<void> {
        console.log(`Setting up random background level: ${backgroundData.filename}`);
        
        // Load the background image for both sides
        await this.loadBackgroundImageForBothSides(backgroundData.filename);
        
        // Generate random sprites for this background
        await this.generateRandomSpritesForBothSides(backgroundData);
        
        // Create differences by removing random sprites from the right side
        this.createRandomDifferences();
    }
    
    private async loadBackgroundImageForBothSides(backgroundFilename: string): Promise<void> {
        const leftImg = document.getElementById('background-image-left') as HTMLImageElement;
        const rightImg = document.getElementById('background-image-right') as HTMLImageElement;
        
        if (!leftImg || !rightImg) {
            throw new Error('Background image elements not found');
        }
        
        const backgroundPath = `backgrounds/${backgroundFilename}`;
        
        // Load left side background
        leftImg.src = backgroundPath;
        leftImg.style.display = 'block';
        await this.waitForImageLoad('background-image-left');
        
        // Load right side background (same image)
        rightImg.src = backgroundPath;
        rightImg.style.display = 'block';
        await this.waitForImageLoad('background-image-right');
        
        console.log(`Background loaded for both sides: ${backgroundFilename}`);
    }
    
    private async generateRandomSpritesForBothSides(backgroundData: BackgroundData): Promise<void> {
        // Get sprite count for this background
        const spriteCount = getSpriteCountForBackground(backgroundData.filename);
        console.log(`Generating ${spriteCount} random sprites for ${backgroundData.filename}`);
        
        // Get or create bounding boxes for sprite placement
        let boundingBoxes: BoundingBox[] = [];
        
        // Check if editMode exists and has bounding boxes
        if (this.editMode && this.editMode.getBoundingBoxes) {
            boundingBoxes = this.editMode.getBoundingBoxes();
        }
        
        // If no bounding boxes available, create default ones for the background area
        if (boundingBoxes.length === 0) {
            console.log('No bounding boxes found, creating default ones for background area');
            boundingBoxes = this.createDefaultBoundingBoxes();
            if (this.editMode && this.editMode.setBoundingBoxes) {
                this.editMode.setBoundingBoxes(boundingBoxes);
            }
        }
        
        console.log(`Generating ${spriteCount} sprites using ${boundingBoxes.length} bounding boxes`);
        
        // Generate random sprites for left side
        const leftSprites = await this.leftSpriteManager.displayAllSprites(boundingBoxes, spriteCount);
        
        // Generate identical sprites for right side by copying from left side
        await this.copySpritesFromLeftToRight();
        
        console.log(`Generated ${leftSprites} sprites for left side, ${this.rightSpriteManager.activeSprites.length} for right side`);
    }
    
    private createRandomDifferences(): void {
        // Get right side sprites that can be removed as differences
        const rightSprites = this.rightSpriteManager.activeSprites;
        
        if (rightSprites.length === 0) {
            console.warn('No sprites available to create differences');
            return;
        }
        
        // Calculate number of differences (20-40% of sprites, minimum 1, maximum 5)
        const minDifferences = 1;
        const maxDifferences = Math.min(5, rightSprites.length);
        const percentageDifferences = Math.floor(rightSprites.length * 0.3); // 30%
        const numDifferences = Math.max(minDifferences, Math.min(maxDifferences, percentageDifferences));
        
        console.log(`Creating ${numDifferences} differences out of ${rightSprites.length} sprites`);
        
        // Randomly select sprites to remove
        const shuffledSprites = [...rightSprites].sort(() => this.rng.next() - 0.5);
        const spritesToRemove = shuffledSprites.slice(0, numDifferences);
        
        this.differences = [];
        
        spritesToRemove.forEach((sprite, index) => {
            // Get sprite position
            const centerX = parseFloat(sprite.dataset.centerX || '0') || 
                           parseFloat(sprite.style.left) + parseFloat(sprite.style.width) / 2;
            const centerY = parseFloat(sprite.dataset.centerY || '0') || 
                           parseFloat(sprite.style.top) + parseFloat(sprite.style.height) / 2;
            
            // Create difference entry
            const difference: GameDifference = {
                id: `random-diff-${index}`,
                centerX: centerX,
                centerY: centerY,
                side: 'right'
            };
            
            this.differences.push(difference);
            
            // Remove the sprite from right side
            sprite.remove();
            
            // Remove from sprite manager's active list
            const spriteIndex = this.rightSpriteManager.activeSprites.indexOf(sprite);
            if (spriteIndex > -1) {
                this.rightSpriteManager.activeSprites.splice(spriteIndex, 1);
            }
        });
        
        console.log(`Created ${this.differences.length} differences by removing sprites from right side`);
    }
    
    // ===== TEMPLATE-BASED LEVEL METHODS =====
    
    private async setupSideBySideGame(template: TemplateData): Promise<void> {
        this.currentTemplate = template;
        
        // Load background images for both sides
        const backgroundPath = template.background.startsWith('./') ? template.background : `./backgrounds/${template.background}`;
        
        const leftBgImg = await this.backgroundLoader.loadBackgroundImage(backgroundPath);
        const rightBgImg = await this.backgroundLoader.loadBackgroundImage(backgroundPath);
        
        // Set background images
        this.setBackgroundImage(leftBgImg, 'left');
        this.setBackgroundImage(rightBgImg, 'right');
        
        // Wait for images to load
        await Promise.all([
            this.waitForImageLoad('background-image-left'),
            this.waitForImageLoad('background-image-right')
        ]);
        
        // Create sprites for both sides
        await this.createSpritesForBothSides(template);
        
        // Generate differences
        this.generateDifferences();
        
        console.log(`Spot the difference game ready: ${this.differences.length} differences to find`);
    }
    
    private setBackgroundImage(img: HTMLImageElement, side: 'left' | 'right'): void {
        const backgroundImg = document.getElementById(`background-image-${side}`) as HTMLImageElement;
        if (backgroundImg) {
            backgroundImg.src = img.src;
            backgroundImg.style.display = 'block';
            backgroundImg.style.width = '100%';
            backgroundImg.style.maxWidth = '400px';
            backgroundImg.style.height = 'auto';
            backgroundImg.style.borderRadius = '8px';
        }
    }
    
    private async waitForImageLoad(imageId: string): Promise<void> {
        return new Promise((resolve) => {
            const img = document.getElementById(imageId) as HTMLImageElement;
            if (img && img.complete) {
                resolve();
            } else if (img) {
                img.onload = () => resolve();
            } else {
                resolve(); // Image not found, resolve anyway
            }
        });
    }
    
    private async createSpritesForBothSides(template: TemplateData): Promise<void> {
        // Clear existing sprites
        this.leftSpriteManager.clearSprites();
        this.rightSpriteManager.clearSprites();
        
        // Create sprites for left side (complete template)
        for (const spriteData of template.sprites) {
            try {
                const spriteElement = await this.leftSpriteManager.createSpriteElement(spriteData.src);
                this.positionSpriteOnSide(spriteElement, spriteData, 'left');
                this.leftSpriteManager.container.appendChild(spriteElement);
                this.leftSpriteManager.activeSprites.push(spriteElement);
            } catch (error) {
                console.warn(`Could not create left sprite ${spriteData.src}:`, error);
            }
        }
        
        // Create sprites for right side (will have some removed as differences)
        for (const spriteData of template.sprites) {
            try {
                const spriteElement = await this.rightSpriteManager.createSpriteElement(spriteData.src);
                this.positionSpriteOnSide(spriteElement, spriteData, 'right');
                this.rightSpriteManager.container.appendChild(spriteElement);
                this.rightSpriteManager.activeSprites.push(spriteElement);
                
                // Store reference to original sprite data
                spriteElement.dataset.spriteId = spriteData.id;
                // Extract coordinates correctly from new template structure
                const x = spriteData.renderCoordinates ? spriteData.renderCoordinates.x : spriteData.x;
                const y = spriteData.renderCoordinates ? spriteData.renderCoordinates.y : spriteData.y;
                // Use actual sprite size for center calculation
                const spriteSize = SPRITE_CONFIG.TARGET_SIZE_PX;
                spriteElement.dataset.centerX = String(x + spriteSize / 2);
                spriteElement.dataset.centerY = String(y + spriteSize / 2);
            } catch (error) {
                console.warn(`Could not create right sprite ${spriteData.src}:`, error);
            }
        }
    }
    
    private positionSpriteOnSide(sprite: HTMLElement, spriteData: SpriteData, side: 'left' | 'right'): void {
        const backgroundImg = document.getElementById(`background-image-${side}`) as HTMLImageElement;
        if (backgroundImg) {
            // Extract coordinates correctly from new template structure
            const baseX = spriteData.renderCoordinates ? spriteData.renderCoordinates.x : spriteData.x;
            const baseY = spriteData.renderCoordinates ? spriteData.renderCoordinates.y : spriteData.y;
            
            // Create coordinate object for scaling
            let actualCoords = { x: baseX, y: baseY };
            
            // Apply scaling if template has background dimensions
            if (this.currentTemplate && this.currentTemplate.backgroundDimensions) {
                const scalingContext = ScalingUtils.createScalingContext(this.currentTemplate, backgroundImg);
                if (scalingContext && ScalingUtils.isScalingNeeded(scalingContext)) {
                    // Create a compatible object for the scaling function
                    const coordsForScaling = {
                        x: baseX,
                        y: baseY,
                        width: spriteData.renderDimensions ? spriteData.renderDimensions.width : spriteData.width,
                        height: spriteData.renderDimensions ? spriteData.renderDimensions.height : spriteData.height,
                        renderDimensions: spriteData.renderDimensions
                    };
                    
                    actualCoords = ScalingUtils.scaleCoordinates(coordsForScaling, scalingContext.scalingFactor);
                    console.log(`Scaling sprite ${spriteData.src} on ${side} side from template(${baseX}, ${baseY}) to actual(${actualCoords.x}, ${actualCoords.y})`);
                    
                    // Apply scaling to sprite size if provided
                    if (actualCoords.width && actualCoords.height) {
                        sprite.style.width = actualCoords.width + 'px';
                        sprite.style.height = actualCoords.height + 'px';
                    }
                }
            }
            
            const container = backgroundImg.parentElement as HTMLElement;
            const containerRect = container.getBoundingClientRect();
            const bgRect = backgroundImg.getBoundingClientRect();
            
            // Calculate the offset of the background image within its container
            const bgOffsetX = bgRect.left - containerRect.left;
            const bgOffsetY = bgRect.top - containerRect.top;
            
            // Position sprite relative to background image position within the container
            sprite.style.left = (bgOffsetX + actualCoords.x) + 'px';
            sprite.style.top = (bgOffsetY + actualCoords.y) + 'px';
        }
    }
    
    private generateDifferences(): void {
        this.differences = [];
        this.foundDifferences = [];
        
        const rightSprites = this.rightSpriteManager.activeSprites;
        const maxDifferences = Math.min(7, Math.floor(rightSprites.length * 0.2));
        const minDifferences = Math.min(3, maxDifferences);
        const numDifferences = this.rng.nextInt(minDifferences, maxDifferences);
        
        // Randomly select sprites to remove as differences
        const spritesToRemove = this.shuffleArray([...rightSprites]).slice(0, numDifferences);
        
        spritesToRemove.forEach(sprite => {
            const centerX = parseFloat(sprite.dataset.centerX || '0');
            const centerY = parseFloat(sprite.dataset.centerY || '0');
            const spriteId = sprite.dataset.spriteId || '';
            
            // Store difference information
            this.differences.push({
                id: spriteId,
                centerX: centerX,
                centerY: centerY,
                side: 'right' // The sprite is missing from the right side
            });
            
            // Remove the sprite from the right side
            sprite.remove();
            const index = this.rightSpriteManager.activeSprites.indexOf(sprite);
            if (index > -1) {
                this.rightSpriteManager.activeSprites.splice(index, 1);
            }
        });
        
        console.log(`Generated ${this.differences.length} differences:`, this.differences.map(d => d.id));
    }
    
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // ===== GAME INTERACTION METHODS =====
    
    private handleBoardClick(event: BoardClickEvent, side: 'left' | 'right'): void {
        if (!this.isGameActive) return;
        
        // Don't handle game clicks when edit mode or placement mode is active
        if (this.editMode && this.editMode.isActive) {
            console.log('Ignoring game click - edit mode is active');
            return;
        }
        if (this.placementMode && this.placementMode.isActive) {
            console.log('Ignoring game click - placement mode is active');
            return;
        }
        
        const board = event.currentTarget;
        const backgroundImg = document.getElementById(`background-image-${side}`) as HTMLImageElement;
        
        if (!backgroundImg) return;
        
        // Get click coordinates relative to the board
        const boardRect = board.getBoundingClientRect();
        const clickX = event.clientX - boardRect.left;
        const clickY = event.clientY - boardRect.top;
        
        // Get background image position relative to the board
        const bgRect = backgroundImg.getBoundingClientRect();
        const bgOffsetX = bgRect.left - boardRect.left;
        const bgOffsetY = bgRect.top - boardRect.top;
        
        // Convert click coordinates to background-relative coordinates
        const bgClickX = clickX - bgOffsetX;
        const bgClickY = clickY - bgOffsetY;
        
        console.log(`Click on ${side} side at board: ${clickX}, ${clickY}, background: ${bgClickX}, ${bgClickY}`);
        
        // Check if click is near any difference
        const threshold = 30; // 30px threshold as specified
        
        for (const difference of this.differences) {
            if (this.foundDifferences.includes(difference.id)) continue;
            
            // Calculate distance from click to difference center (both in background coordinates)
            const distance = Math.sqrt(
                Math.pow(bgClickX - difference.centerX, 2) + 
                Math.pow(bgClickY - difference.centerY, 2)
            );
            
            console.log(`Checking difference ${difference.id} at (${difference.centerX}, ${difference.centerY}), distance: ${distance.toFixed(1)}px`);
            
            if (distance <= threshold) {
                this.markDifferenceFound(difference, side, clickX, clickY);
                return;
            }
        }
        
        console.log('No difference found at click location');
    }
    
    private markDifferenceFound(difference: GameDifference, side: 'left' | 'right', clickX: number, clickY: number): void {
        this.foundDifferences.push(difference.id);
        
        // Increment the running total for the entire game
        this.totalDifferencesFound++;
        
        // Create green checkmark markers on both sides at the difference center
        this.createDifferenceMarker({
            x: difference.centerX,
            y: difference.centerY,
            side: 'left',
            symbol: '✓',
            color: '#28a745'
        });
        this.createDifferenceMarker({
            x: difference.centerX,
            y: difference.centerY,
            side: 'right',
            symbol: '✓',
            color: '#28a745'
        });
        
        // Update score - dispatch proper event with total found count
        const event: DifferenceFoundEvent = new CustomEvent('differenceFound', {
            detail: { totalFound: this.foundDifferences.length }
        });
        document.dispatchEvent(event);
        
        console.log(`Difference found: ${difference.id} (${this.foundDifferences.length}/${this.differences.length})`);
        console.log(`Total differences found in game: ${this.totalDifferencesFound}`);
        
        // Check if all differences are found
        console.log(`Difference check: ${this.foundDifferences.length}/${this.differences.length} differences found`);
        console.log(`Found differences: [${this.foundDifferences.join(', ')}]`);
        console.log(`All differences: [${this.differences.map(d => d.id).join(', ')}]`);
        
        if (this.foundDifferences.length === this.differences.length) {
            console.log('All differences found - calling endGame()');
            this.endGame();
        } else {
            console.log('Not all differences found yet - continuing game');
        }
    }
    
    private createDifferenceMarker(options: DifferenceMarkerOptions): void {
        const { x, y, side, symbol, color } = options;
        const board = document.getElementById(`game-board-${side}`) as HTMLElement;
        const backgroundImg = document.getElementById(`background-image-${side}`) as HTMLImageElement;
        
        if (!board || !backgroundImg) return;
        
        // Calculate the offset of the background image within its container
        const containerRect = board.getBoundingClientRect();
        const bgRect = backgroundImg.getBoundingClientRect();
        const bgOffsetX = bgRect.left - containerRect.left;
        const bgOffsetY = bgRect.top - containerRect.top;
        
        // Position marker relative to background image position within the container
        const markerX = bgOffsetX + x;
        const markerY = bgOffsetY + y;
        
        const marker = document.createElement('div');
        marker.className = 'difference-marker found';
        marker.style.position = 'absolute';
        marker.style.left = `${markerX - 15}px`; // Center the 30px marker
        marker.style.top = `${markerY - 15}px`;
        marker.style.width = '30px';
        marker.style.height = '30px';
        marker.style.borderRadius = '50%';
        marker.style.background = color;
        marker.style.color = 'white';
        marker.style.display = 'flex';
        marker.style.alignItems = 'center';
        marker.style.justifyContent = 'center';
        marker.style.fontSize = '18px';
        marker.style.fontWeight = 'bold';
        marker.style.zIndex = '100';
        marker.style.pointerEvents = 'none';
        marker.textContent = symbol;
        
        board.appendChild(marker);
    }
    
    private revealAllDifferences(): void {
        console.log('Revealing all differences');
        
        this.differences.forEach(difference => {
            if (!this.foundDifferences.includes(difference.id)) {
                // Create gray circle marker for unfound differences
                this.createDifferenceMarker({
                    x: difference.centerX,
                    y: difference.centerY,
                    side: 'left',
                    symbol: '◌',
                    color: '#6c757d'
                });
                this.createDifferenceMarker({
                    x: difference.centerX,
                    y: difference.centerY,
                    side: 'right',
                    symbol: '◌',
                    color: '#6c757d'
                });
            }
        });
    }
    
    private autoCompleteLevel(): void {
        console.log('Debug: Auto-completing level with $ key');
        
        // Find all unfound differences and mark them as found
        this.differences.forEach(difference => {
            if (!this.foundDifferences.includes(difference.id)) {
                this.markDifferenceFound(difference, 'left', difference.centerX, difference.centerY);
            }
        });
    }
    
    // ===== GAME COMPLETION METHODS =====
    
    private async endGame(): Promise<void> {
        console.log('Level completed! All differences found.');
        console.log(`Current level data:`, this.currentLevelData);
        console.log(`Test mode: ${this.isTestMode}`);
        
        if (this.isTestMode) {
            // In test mode, use the old simple behavior
            console.log('Running in test mode - skipping level progression');
            this.isGameActive = false;
            this.updateButtonStates();
            await this.modal.showAlert('Level Complete', `Congratulations! You found all ${this.differences.length} differences!\n\nTotal differences found: ${this.totalDifferencesFound}`, false);
            return;
        }
        
        // Mark current level as completed in level manager
        if (this.currentLevelData) {
            // Handle both object and string formats for level data
            let levelIdentifier: string;
            if (this.currentLevelData.type === 'template') {
                levelIdentifier = (this.currentLevelData.data as TemplateData).name;
            } else {
                // For random levels, data is BackgroundData with filename property
                levelIdentifier = (this.currentLevelData.data as BackgroundData).filename;
            }
            
            console.log(`Marking level as completed: ${this.currentLevelData.type} - ${levelIdentifier}`);
            this.levelManager.completeLevel(this.currentLevelData.type, levelIdentifier);
        } else {
            console.warn('No current level data available to mark as completed');
        }
        
        // Show current game statistics
        const stats = this.levelManager.getCompletionStats();
        console.log(`Game progress: ${stats.totalCompleted}/${stats.totalLevels} levels completed`);
        console.log(`Templates: ${stats.templatesCompleted}/${stats.totalTemplates}`);
        console.log(`Random backgrounds: ${stats.randomBackgroundsCompleted}/${stats.totalRandomBackgrounds}`);
        
        // Check for next level
        console.log('Checking for next level...');
        const nextLevelData = await this.levelManager.getNextLevel();
        console.log('Next level data:', nextLevelData);
        
        if (nextLevelData) {
            // There are more levels
            const levelInfo = this.currentLevelData ? this.currentLevelData.levelInfo.description : 'Level';
            const message = `🎉 ${levelInfo} completed!\nYou found all ${this.differences.length} differences!\n\nTotal differences found: ${this.totalDifferencesFound}\n\nReady for the next level?`;
            console.log('Showing level completion modal...');
            const playNext = await this.modal.showConfirm('Level Complete!', message, !this.isTestMode);
            console.log(`User chose to continue: ${playNext}`);
            
            if (playNext) {
                console.log('Loading next level...');
                this.loadNextLevel();
            } else {
                console.log('User chose not to continue - stopping game');
                this.isGameActive = false;
                this.updateButtonStates();
            }
        } else {
            // All levels completed - entire game is finished!
            console.log('All levels completed - game finished!');
            this.isGameActive = false;
            this.updateButtonStates();
            this.handleGameComplete();
        }
    }
    
    private async handleGameComplete(): Promise<void> {
        console.log('🎉 GAME COMPLETE! All levels finished!');
        this.isGameActive = false;
        this.updateButtonStates();
        
        if (this.isTestMode) {
            // In test mode, just show an alert and return
            await this.modal.showAlert('Game Complete', 'Game completed! All levels finished!');
            return;
        }
        
        const stats = this.levelManager.getCompletionStats();
        const message = `🎉 Congratulations! You've completed the entire game!\n\n` +
                       `📊 Final Statistics:\n` +
                       `• Levels completed: ${stats.totalCompleted}/${stats.totalLevels}\n` +
                       `• Total differences found: ${this.totalDifferencesFound}\n\n` +
                       `Would you like to play again?`;
        
        const playAgain = await this.modal.showConfirm('Game Complete!', message);
        
        if (playAgain) {
            this.restartEntireGame();
        }
    }
    
    private restartEntireGame(): void {
        console.log('Restarting entire game progression');
        
        // Reset level manager
        this.levelManager.resetGame();
        
        // Reset current game state
        this.resetGame();
        
        // Start fresh
        this.startGame();
    }
    
    // ===== LEVEL INFORMATION METHODS =====
    
    private displayLevelInfo(): void {
        if (!this.currentLevelData) return;
        
        const levelInfo = this.currentLevelData.levelInfo;
        console.log(`Level ${levelInfo.current}/${levelInfo.total} - ${levelInfo.description}`);
        
        // Update page title with level number and background name
        this.updatePageTitle();
    }
    
    private updatePageTitle(): void {
        if (!this.currentLevelData) return;
        
        const levelInfo = this.currentLevelData.levelInfo;
        let backgroundName = 'Unknown';
        
        // Extract background filename based on level type
        if (this.currentLevelData.type === 'template' && this.currentTemplate) {
            backgroundName = this.currentTemplate.background;
        } else if (this.currentLevelData.type === 'random') {
            // For random levels, data can be either BackgroundData object or string
            const data = this.currentLevelData.data;
            if (typeof data === 'string') {
                backgroundName = data;
            } else {
                backgroundName = (data as BackgroundData).filename;
            }
        }
        
        // Remove file extension and clean up the name for display
        const cleanName = backgroundName ? backgroundName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Unknown';
        const capitalizedName = cleanName.replace(/\b\w/g, l => l.toUpperCase());
        
        // Format: "Level X of Y - Background Name - Spot the Difference"
        const title = `${levelInfo.description} - ${capitalizedName} - Spot the Difference`;
        
        // Update document title
        document.title = title;
        
        // Update visible header on the page
        const levelTitleElement = document.getElementById('level-title');
        if (levelTitleElement) {
            const headerText = `${levelInfo.description} - ${capitalizedName}`;
            levelTitleElement.textContent = headerText;
            levelTitleElement.style.display = 'block';
            console.log(`Level header updated: ${headerText}`);
        }
        
        console.log(`Page title updated: ${title}`);
    }
    
    // ===== CLEANUP METHODS =====
    
    private clearDifferenceMarkers(): void {
        document.querySelectorAll('.difference-marker').forEach(marker => marker.remove());
    }
    
    /**
     * Comprehensively clear all data from previous level
     * Ensures no sprites, markers, or game state carries over between levels
     */
    private clearAllPreviousLevelData(): void {
        console.log('Clearing all previous level data before loading next level');
        
        // Clear sprites from both sides
        this.leftSpriteManager.clearSprites();
        this.rightSpriteManager.clearSprites();
        
        // Clear all difference markers
        this.clearDifferenceMarkers();
        
        // Reset game state arrays
        this.differences = [];
        this.foundDifferences = [];
        
        // Reset the score display to 0 for the new level
        const resetEvent: DifferenceFoundEvent = new CustomEvent('differenceFound', {
            detail: { totalFound: 0 }
        });
        document.dispatchEvent(resetEvent);
        
        // Clear any orphaned sprite elements that might exist in the DOM
        this.clearOrphanedSprites();
        
        // Clear any orphaned marker elements
        this.clearOrphanedMarkers();
        
        console.log('Previous level data cleared successfully');
    }
    
    /**
     * Remove any sprite elements that might be orphaned in the DOM
     */
    private clearOrphanedSprites(): void {
        const leftBoard = document.getElementById('game-board-left');
        const rightBoard = document.getElementById('game-board-right');
        
        // Remove all .game-sprite elements from both boards
        [leftBoard, rightBoard].forEach(board => {
            if (board) {
                const orphanedSprites = board.querySelectorAll('.game-sprite');
                orphanedSprites.forEach(sprite => {
                    console.log('Removing orphaned sprite:', sprite);
                    sprite.remove();
                });
            }
        });
    }
    
    /**
     * Remove any marker elements that might be orphaned in the DOM
     */
    private clearOrphanedMarkers(): void {
        // Remove all difference markers from the entire document
        const allMarkers = document.querySelectorAll('.difference-marker');
        allMarkers.forEach(marker => {
            console.log('Removing orphaned marker:', marker);
            marker.remove();
        });
    }
    
    // ===== MODE TRANSITION METHODS =====
    
    private async handleGameModeRestore(detail: any): Promise<void> {
        console.log('Restoring game mode from placement mode', detail);
        
        if (this.isGameActive && this.currentTemplate) {
            // Clear any existing sprites and markers
            this.leftSpriteManager.clearSprites();
            this.rightSpriteManager.clearSprites();
            this.clearDifferenceMarkers();
            
            // Recreate the side-by-side game with current template
            await this.createSpritesForBothSides(this.currentTemplate);
            
            // Regenerate differences (this ensures randomness is maintained)
            this.generateDifferences();
            
            console.log('Game mode restored with template:', this.currentTemplate.name);
        }
    }
    
    private async handleBackgroundChangeRequest(detail: { background: string }): Promise<void> {
        console.log('Background change requested for spot the difference game', detail);
        if (this.isGameActive) {
            const { background } = detail;
            
            try {
                // Construct full path for background image
                const backgroundPath = background.startsWith('./') ? background : `./backgrounds/${background}`;
                
                // Load the new background image
                const backgroundImg = await this.backgroundLoader.loadBackgroundImage(backgroundPath);
                console.log('New background loaded successfully:', backgroundImg.src);
                
                // Set background for both sides
                this.setBackgroundImage(backgroundImg, 'left');
                this.setBackgroundImage(backgroundImg, 'right');
                
                // Update current background filename (store just the filename)
                this.currentBackgroundFilename = background.startsWith('./') ? background.split('/').pop() || null : background;
                
                // Load predefined bounding boxes for this background if edit mode doesn't have custom ones
                this.loadBackgroundBoundingBoxes();
                
                // Clear existing sprites
                this.leftSpriteManager.clearSprites();
                this.rightSpriteManager.clearSprites();
                this.clearDifferenceMarkers();
                
                // Wait for background images to be properly loaded and positioned
                await this.waitForImageLoad('background-image-left');
                await this.waitForImageLoad('background-image-right');
                
                // Add a small delay to ensure backgrounds are fully rendered
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Generate random sprites for the new background
                await this.generateRandomSpritesForBackground();
                
                console.log(`Background changed to: ${background} with random sprites generated`);
            } catch (error) {
                console.error(`Failed to change background to ${background}:`, error);
            }
        }
    }
    
    private async generateRandomSpritesForBackground(): Promise<void> {
        try {
            // Get bounding boxes for sprite placement
            let boundingBoxes = this.editMode.getBoundingBoxes();
            
            // If no bounding boxes available, create default ones for the background area
            if (boundingBoxes.length === 0) {
                console.log('No bounding boxes found, creating default ones for background area');
                boundingBoxes = this.createDefaultBoundingBoxes();
                this.editMode.setBoundingBoxes(boundingBoxes);
            }
            
            // Determine sprite count based on background or use default
            let spriteCount = this.currentBackgroundFilename ? 
                getSpriteCountForBackground(this.currentBackgroundFilename) : 25;
            
            // If using a single default bounding box, use a more reasonable sprite count
            if (boundingBoxes.length === 1 && boundingBoxes[0].id && boundingBoxes[0].id > Date.now() - 1000) {
                spriteCount = Math.min(spriteCount, 15); // Limit to 15 sprites for single bounding box
                console.log(`Using reduced sprite count (${spriteCount}) for single default bounding box`);
            }
            
            console.log(`Generating ${spriteCount} random sprites for background: ${this.currentBackgroundFilename} using ${boundingBoxes.length} bounding boxes`);
            
            // Generate sprites for left side
            const leftSprites = await this.leftSpriteManager.displayAllSprites(boundingBoxes, spriteCount);
            console.log(`Generated ${leftSprites} sprites on left side`);
            
            // Create matching sprites on right side by copying from left side
            await this.copySpritesFromLeftToRight();
            
            // Generate differences for the spot-the-difference game
            this.generateDifferences();
            
            console.log(`Spot the difference game ready: ${this.differences.length} differences to find`);
            
        } catch (error) {
            console.error('Failed to generate random sprites for background:', error);
        }
    }
    
    private createDefaultBoundingBoxes(): BoundingBox[] {
        // Get the background image dimensions
        const leftBg = document.getElementById('background-image-left') as HTMLImageElement;
        
        if (!leftBg) {
            return [];
        }
        
        // Get the actual rendered size of the background image
        const bgRect = leftBg.getBoundingClientRect();
        const width = bgRect.width;
        const height = bgRect.height;
        
        // Create a single bounding box that covers the entire background
        const defaultBoxes: BoundingBox[] = [
            { 
                id: String(Date.now()), 
                x: 0, 
                y: 0, 
                width: width, 
                height: height 
            }
        ];
        
        console.log(`Created single bounding box covering entire background: ${width}x${height}`);
        return defaultBoxes;
    }
    
    private async copySpritesFromLeftToRight(): Promise<void> {
        try {
            const leftSprites = this.leftSpriteManager.activeSprites;
            console.log(`Copying ${leftSprites.length} sprites from left to right side`);
            
            for (let i = 0; i < leftSprites.length; i++) {
                const leftSprite = leftSprites[i];
                
                // Get sprite source and position from left sprite
                const spriteSrc = leftSprite.dataset.spriteSrc || leftSprite.getAttribute('src')?.split('/').pop() || '';
                const leftContainer = leftSprite.parentElement as HTMLElement;
                const leftBg = document.getElementById('background-image-left') as HTMLImageElement;
                const rightBg = document.getElementById('background-image-right') as HTMLImageElement;
                
                if (!leftContainer || !leftBg || !rightBg) continue;
                
                // Calculate sprite position relative to background
                const leftContainerRect = leftContainer.getBoundingClientRect();
                const leftBgRect = leftBg.getBoundingClientRect();
                const spriteRect = leftSprite.getBoundingClientRect();
                
                // Position relative to background
                const relativeX = spriteRect.left - leftBgRect.left;
                const relativeY = spriteRect.top - leftBgRect.top;
                
                // Create corresponding sprite on right side
                const rightSprite = await this.rightSpriteManager.createSpriteElement(spriteSrc);
                if (rightSprite) {
                    // Position the right sprite at the same relative position
                    const rightContainer = document.getElementById('game-board-right') as HTMLElement;
                    if (!rightContainer) continue;
                    
                    const rightContainerRect = rightContainer.getBoundingClientRect();
                    const rightBgRect = rightBg.getBoundingClientRect();
                    
                    const rightBgOffsetX = rightBgRect.left - rightContainerRect.left;
                    const rightBgOffsetY = rightBgRect.top - rightContainerRect.top;
                    
                    rightSprite.style.position = 'absolute';
                    rightSprite.style.left = (rightBgOffsetX + relativeX) + 'px';
                    rightSprite.style.top = (rightBgOffsetY + relativeY) + 'px';
                    rightSprite.style.width = leftSprite.style.width;
                    rightSprite.style.height = leftSprite.style.height;
                    
                    // Add dataset properties needed for difference detection
                    const spriteId = `sprite_${i + 1}`;
                    rightSprite.dataset.spriteId = spriteId;
                    
                    // Calculate center coordinates for difference detection (background-relative)
                    const spriteWidth = parseInt(rightSprite.style.width) || SPRITE_CONFIG.TARGET_SIZE_PX;
                    const spriteHeight = parseInt(rightSprite.style.height) || SPRITE_CONFIG.TARGET_SIZE_PX;
                    rightSprite.dataset.centerX = String(relativeX + spriteWidth / 2);
                    rightSprite.dataset.centerY = String(relativeY + spriteHeight / 2);
                    
                    rightContainer.appendChild(rightSprite);
                    this.rightSpriteManager.activeSprites.push(rightSprite);
                }
            }
            
            console.log(`Successfully copied ${this.rightSpriteManager.activeSprites.length} sprites to right side`);
            
        } catch (error) {
            console.error('Failed to copy sprites from left to right:', error);
        }
    }
    
    // ===== GETTER METHODS =====
    
    getGameState(): SpotTheDifferenceGameState {
        return {
            isGameActive: this.isGameActive,
            isTestMode: this.isTestMode,
            currentTemplate: this.currentTemplate,
            currentLevelData: this.currentLevelData,
            differences: this.differences,
            foundDifferences: this.foundDifferences,
            totalDifferencesFound: this.totalDifferencesFound,
            seed: this.seed,
            leftSpriteManager: this.leftSpriteManager,
            rightSpriteManager: this.rightSpriteManager,
            levelManager: this.levelManager,
            modal: this.modal,
            rng: this.rng,
            currentBackgroundFilename: this.currentBackgroundFilename
        };
    }

    // Method to get area coverage information for e2e testing
    getAreaCoverage(): { spriteCount: number; totalSpriteArea: number; backgroundArea: number; coveragePercent: number; maxAllowed: number } {
        return this.leftSpriteManager.getAreaCoverage();
    }
}