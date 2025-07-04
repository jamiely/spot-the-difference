import { Game } from './Game.js';
import { SpriteManager } from './components/SpriteManager.js';
import { SPRITE_CONFIG } from './config/SpriteConfig.js';
import { ScalingUtils } from './utils/ScalingUtils.js';

export class SpotTheDifferenceGame extends Game {
    constructor() {
        super();
        
        // Override container setup for side-by-side display
        this.leftSpriteManager = new SpriteManager('game-board-left');
        this.rightSpriteManager = new SpriteManager('game-board-right');
        
        // Game state for spot the difference
        this.differences = [];
        this.foundDifferences = [];
        this.currentTemplate = null;
        this.isSpotTheeDifferenceMode = true;
        
        // Seeded random number generation
        this.seed = this.getSeedFromURL();
        this.rng = this.createSeededRNG(this.seed);
        
        console.log(`Using seed: ${this.seed}`);
        
        this.setupSpotTheDifferenceEventListeners();
        this.setupModeTransitionListeners();
    }
    
    getSeedFromURL() {
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
    
    createSeededRNG(seed) {
        // Linear Congruential Generator for reproducible randomness
        let currentSeed = seed;
        const rng = {
            next: () => {
                currentSeed = (currentSeed * 1664525 + 1013904223) % (2 ** 32);
                return currentSeed / (2 ** 32);
            }
        };
        // Helper method to get random integer in range
        rng.nextInt = (min, max) => {
            return Math.floor(rng.next() * (max - min + 1)) + min;
        };
        return rng;
    }
    
    setupSpotTheDifferenceEventListeners() {
        // Click detection for finding differences
        document.getElementById('game-board-left').addEventListener('click', (e) => {
            this.handleBoardClick(e, 'left');
        });
        
        document.getElementById('game-board-right').addEventListener('click', (e) => {
            this.handleBoardClick(e, 'right');
        });
        
        // Reveal all differences with '!' key
        document.addEventListener('keydown', (e) => {
            if (e.key === '!' && this.isGameActive) {
                this.revealAllDifferences();
            }
        });
    }
    
    async startGame() {
        this.isGameActive = true;
        this.updateButtonStates();
        
        // Show the side-by-side boards and hide legacy board
        document.querySelector('.game-boards').style.display = 'flex';
        document.getElementById('legacy-game-board').style.display = 'none';
        
        await this.loadTemplateForSpotTheDifference();
        
        this.dispatchEvent('gameStarted');
    }
    
    async loadTemplateForSpotTheDifference() {
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
    
    async setupSideBySideGame(template) {
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
    
    setBackgroundImage(img, side) {
        const backgroundImg = document.getElementById(`background-image-${side}`);
        backgroundImg.src = img.src;
        backgroundImg.style.display = 'block';
        backgroundImg.style.width = '100%';
        backgroundImg.style.maxWidth = '400px';
        backgroundImg.style.height = 'auto';
        backgroundImg.style.borderRadius = '8px';
    }
    
    async waitForImageLoad(imageId) {
        return new Promise((resolve) => {
            const img = document.getElementById(imageId);
            if (img.complete) {
                resolve();
            } else {
                img.onload = resolve;
            }
        });
    }
    
    async createSpritesForBothSides(template) {
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
                spriteElement.dataset.centerX = x + spriteSize / 2;
                spriteElement.dataset.centerY = y + spriteSize / 2;
            } catch (error) {
                console.warn(`Could not create right sprite ${spriteData.src}:`, error);
            }
        }
    }
    
    positionSpriteOnSide(sprite, spriteData, side) {
        const backgroundImg = document.getElementById(`background-image-${side}`);
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
            
            const container = backgroundImg.parentElement;
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
    
    generateDifferences() {
        this.differences = [];
        this.foundDifferences = [];
        
        const rightSprites = this.rightSpriteManager.activeSprites;
        const maxDifferences = Math.min(7, Math.floor(rightSprites.length * 0.2));
        const minDifferences = Math.min(3, maxDifferences);
        const numDifferences = this.rng.nextInt(minDifferences, maxDifferences);
        
        // Randomly select sprites to remove as differences
        const spritesToRemove = this.shuffleArray([...rightSprites]).slice(0, numDifferences);
        
        spritesToRemove.forEach(sprite => {
            const centerX = parseFloat(sprite.dataset.centerX);
            const centerY = parseFloat(sprite.dataset.centerY);
            const spriteId = sprite.dataset.spriteId;
            
            // Store difference information
            this.differences.push({
                id: spriteId,
                centerX: centerX,
                centerY: centerY,
                side: 'right', // The sprite is missing from the right side
                sprite: sprite
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
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    handleBoardClick(event, side) {
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
        const backgroundImg = document.getElementById(`background-image-${side}`);
        
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
    
    markDifferenceFound(difference, side, clickX, clickY) {
        this.foundDifferences.push(difference.id);
        
        // Create green checkmark markers on both sides at the difference center
        this.createDifferenceMarker(difference.centerX, difference.centerY, 'left', '✓', '#28a745');
        this.createDifferenceMarker(difference.centerX, difference.centerY, 'right', '✓', '#28a745');
        
        // Update score
        this.scoreDisplay.incrementScore();
        
        console.log(`Difference found: ${difference.id} (${this.foundDifferences.length}/${this.differences.length})`);
        
        // Check if all differences are found
        if (this.foundDifferences.length === this.differences.length) {
            this.endGame();
        }
    }
    
    createDifferenceMarker(x, y, side, symbol, color) {
        const board = document.getElementById(`game-board-${side}`);
        const backgroundImg = document.getElementById(`background-image-${side}`);
        
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
    
    revealAllDifferences() {
        console.log('Revealing all differences');
        
        this.differences.forEach(difference => {
            if (!this.foundDifferences.includes(difference.id)) {
                // Create gray circle marker for unfound differences
                this.createDifferenceMarker(difference.centerX, difference.centerY, 'left', '◌', '#6c757d');
                this.createDifferenceMarker(difference.centerX, difference.centerY, 'right', '◌', '#6c757d');
            }
        });
    }
    
    endGame() {
        console.log('Game completed! All differences found.');
        this.isGameActive = false;
        this.updateButtonStates();
        
        // Show completion message
        alert(`Congratulations! You found all ${this.differences.length} differences!`);
    }
    
    resetGame() {
        this.isGameActive = false;
        this.updateButtonStates();
        
        // Clear all sprites and markers
        this.leftSpriteManager.clearSprites();
        this.rightSpriteManager.clearSprites();
        this.clearDifferenceMarkers();
        
        // Hide background images
        document.getElementById('background-image-left').style.display = 'none';
        document.getElementById('background-image-right').style.display = 'none';
        
        // Reset game state
        this.differences = [];
        this.foundDifferences = [];
        this.currentTemplate = null;
        
        this.dispatchEvent('gameReset');
    }
    
    clearDifferenceMarkers() {
        document.querySelectorAll('.difference-marker').forEach(marker => marker.remove());
    }
    
    setupModeTransitionListeners() {
        // Listen for placement mode transitions
        document.addEventListener('requestGameModeRestore', (e) => {
            this.handleGameModeRestore(e.detail);
        });
    }
    
    async handleGameModeRestore(detail) {
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
}