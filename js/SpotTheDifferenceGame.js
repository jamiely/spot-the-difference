import { Game } from './Game.js';
import { SpriteManager } from './components/SpriteManager.js';

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
        
        this.setupSpotTheDifferenceEventListeners();
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
                spriteElement.dataset.centerX = spriteData.x + (spriteData.width || 155) / 2;
                spriteElement.dataset.centerY = spriteData.y + (spriteData.height || 155) / 2;
            } catch (error) {
                console.warn(`Could not create right sprite ${spriteData.src}:`, error);
            }
        }
    }
    
    positionSpriteOnSide(sprite, spriteData, side) {
        const backgroundImg = document.getElementById(`background-image-${side}`);
        if (backgroundImg) {
            const bgRect = backgroundImg.getBoundingClientRect();
            const containerRect = backgroundImg.parentElement.getBoundingClientRect();
            const relativeX = bgRect.left - containerRect.left;
            const relativeY = bgRect.top - containerRect.top;
            
            const containerX = relativeX + spriteData.x;
            const containerY = relativeY + spriteData.y;
            
            sprite.style.left = containerX + 'px';
            sprite.style.top = containerY + 'px';
        }
    }
    
    generateDifferences() {
        this.differences = [];
        this.foundDifferences = [];
        
        const rightSprites = this.rightSpriteManager.activeSprites;
        const numDifferences = Math.min(5, Math.floor(rightSprites.length * 0.2)); // Remove up to 20% of sprites, max 5
        
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
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    handleBoardClick(event, side) {
        if (!this.isGameActive) return;
        
        const board = event.currentTarget;
        const rect = board.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        console.log(`Click on ${side} side at: ${clickX}, ${clickY}`);
        
        // Check if click is near any difference
        const threshold = 30; // 30px threshold as specified
        
        for (const difference of this.differences) {
            if (this.foundDifferences.includes(difference.id)) continue;
            
            // Calculate distance from click to difference center
            const distance = Math.sqrt(
                Math.pow(clickX - difference.centerX, 2) + 
                Math.pow(clickY - difference.centerY, 2)
            );
            
            if (distance <= threshold) {
                this.markDifferenceFound(difference, side, clickX, clickY);
                return;
            }
        }
        
        console.log('No difference found at click location');
    }
    
    markDifferenceFound(difference, side, clickX, clickY) {
        this.foundDifferences.push(difference.id);
        
        // Create green checkmark marker at the center of the difference
        this.createDifferenceMarker(difference.centerX, difference.centerY, side, '✓', '#28a745');
        
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
        const marker = document.createElement('div');
        marker.className = 'difference-marker found';
        marker.style.position = 'absolute';
        marker.style.left = `${x - 15}px`; // Center the 30px marker
        marker.style.top = `${y - 15}px`;
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
}