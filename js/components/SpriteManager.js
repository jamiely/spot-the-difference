import { AssetConfigLoader } from '../utils/AssetConfigLoader.js';
import { SPRITE_CONFIG } from '../config/SpriteConfig.js';

export class SpriteManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.spritesPath = './sprites/';
        this.loadedSprites = [];
        this.activeSprites = [];
        this.spritePositions = []; // Track positions for collision detection
        this.configLoader = new AssetConfigLoader();
    }

    async loadAvailableSprites() {
        try {
            const knownSprites = await this.configLoader.getSprites();
            
            console.log('Checking sprites with path:', this.spritesPath);
            const sprites = [];
            
            for (const spriteData of knownSprites) {
                // Handle both old format (string) and new format (object)
                const filename = typeof spriteData === 'string' ? spriteData : spriteData.filename;
                const fullPath = this.spritesPath + filename;
                
                console.log('Checking sprite:', fullPath);
                if (await this.imageExists(fullPath)) {
                    sprites.push(filename);
                    console.log('✓ Found:', filename);
                } else {
                    console.log('✗ Not found:', filename);
                }
            }
            
            console.log('Total sprites loaded:', sprites.length);
            this.loadedSprites = sprites;
            return sprites;
        } catch (error) {
            console.warn('Could not load sprites:', error);
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

    getRandomSprites(count = 10) {
        if (this.loadedSprites.length === 0) {
            return [];
        }
        
        const shuffled = [...this.loadedSprites].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, this.loadedSprites.length));
    }

    async createSpriteElement(spriteSrc, boundingBoxes = [], specificBoxIndex = null) {
        const sprite = document.createElement('img');
        sprite.src = this.spritesPath + spriteSrc;
        sprite.className = 'game-sprite';
        sprite.alt = 'Game sprite';
        
        // Get sprite dimensions and apply proper sizing
        const spriteInfo = await this.configLoader.getSpriteInfo(spriteSrc);
        console.log(`Sprite ${spriteSrc}: dimensions ${spriteInfo?.width}x${spriteInfo?.height}`);
        const cssSize = SPRITE_CONFIG.getCSSSize(
            spriteInfo?.width, 
            spriteInfo?.height
        );
        console.log(`Sprite ${spriteSrc}: CSS size ${cssSize.width} x ${cssSize.height}`);
        
        // Apply dimensions as inline styles
        sprite.style.width = cssSize.width;
        sprite.style.height = cssSize.height;
        
        // Position sprites relative to the background image
        const backgroundImg = document.getElementById('background-image');
        if (backgroundImg && backgroundImg.style.display !== 'none') {
            // Wait for background image to load and get its actual dimensions
            if (backgroundImg.complete) {
                this.positionSpriteOnBackground(sprite, backgroundImg, boundingBoxes, specificBoxIndex);
            } else {
                backgroundImg.onload = () => {
                    this.positionSpriteOnBackground(sprite, backgroundImg, boundingBoxes, specificBoxIndex);
                };
            }
        } else {
            // Fallback positioning within container
            const containerRect = this.container.getBoundingClientRect();
            const maxX = containerRect.width - 50;
            const maxY = containerRect.height - 50;
            
            sprite.style.left = Math.random() * Math.max(0, maxX) + 'px';
            sprite.style.top = Math.random() * Math.max(0, maxY) + 'px';
        }
        
        return sprite;
    }

    positionSpriteOnBackground(sprite, backgroundImg, boundingBoxes = [], specificBoxIndex = null) {
        // Get the actual rendered dimensions and position of the background image
        const bgRect = backgroundImg.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        // Calculate relative position within the container
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        
        // Get actual sprite dimensions from the element styles
        const spriteWidth = parseInt(sprite.style.width) || SPRITE_CONFIG.TARGET_SIZE_PX;
        const spriteHeight = parseInt(sprite.style.height) || SPRITE_CONFIG.TARGET_SIZE_PX;
        const maxAttempts = 50; // Maximum attempts to find non-colliding position
        
        let position = null;
        
        if (boundingBoxes.length > 0) {
            // Use specific bounding box or pick one randomly
            const selectedBox = specificBoxIndex !== null ? 
                boundingBoxes[specificBoxIndex] : 
                boundingBoxes[Math.floor(Math.random() * boundingBoxes.length)];
            
            // Try to find a non-colliding position within the bounding box
            position = this.findNonCollidingPosition(
                relativeLeft + selectedBox.x,
                relativeTop + selectedBox.y,
                selectedBox.width,
                selectedBox.height,
                spriteWidth,
                spriteHeight,
                maxAttempts
            );
            
            console.log(`Positioned sprite in box ${specificBoxIndex || 'random'} at: ${position.x}, ${position.y} (attempts: ${position.attempts})`);
        } else {
            // Try to find a non-colliding position on the full background
            position = this.findNonCollidingPosition(
                relativeLeft,
                relativeTop,
                bgRect.width,
                bgRect.height,
                spriteWidth,
                spriteHeight,
                maxAttempts
            );
            
            console.log(`Positioned sprite on full background at: ${position.x}, ${position.y} (attempts: ${position.attempts})`);
        }
        
        // Apply the position to the sprite
        sprite.style.left = position.x + 'px';
        sprite.style.top = position.y + 'px';
        
        // Store the position for future collision detection
        this.spritePositions.push({
            x: position.x,
            y: position.y,
            width: spriteWidth,
            height: spriteHeight
        });
    }
    
    findNonCollidingPosition(areaX, areaY, areaWidth, areaHeight, spriteWidth, spriteHeight, maxAttempts) {
        const availableWidth = Math.max(1, areaWidth - spriteWidth);
        const availableHeight = Math.max(1, areaHeight - spriteHeight);
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = areaX + Math.floor(Math.random() * availableWidth);
            const y = areaY + Math.floor(Math.random() * availableHeight);
            
            // Check if this position collides with any existing sprites
            if (!this.hasCollision(x, y, spriteWidth, spriteHeight)) {
                return { x, y, attempts: attempt + 1 };
            }
        }
        
        // If we couldn't find a non-colliding position, use the last attempt
        const x = areaX + Math.floor(Math.random() * availableWidth);
        const y = areaY + Math.floor(Math.random() * availableHeight);
        
        console.warn('Could not find non-colliding position after', maxAttempts, 'attempts');
        return { x, y, attempts: maxAttempts };
    }
    
    hasCollision(x, y, width, height) {
        const buffer = 5; // Small buffer to prevent sprites from being too close
        
        for (const existingSprite of this.spritePositions) {
            // Check if rectangles overlap (with buffer)
            if (x < existingSprite.x + existingSprite.width + buffer &&
                x + width + buffer > existingSprite.x &&
                y < existingSprite.y + existingSprite.height + buffer &&
                y + height + buffer > existingSprite.y) {
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }

    async displayRandomSprites(count = 10) {
        this.clearSprites();
        
        const randomSprites = this.getRandomSprites(count);
        
        for (const spriteSrc of randomSprites) {
            const spriteElement = await this.createSpriteElement(spriteSrc);
            this.container.appendChild(spriteElement);
            this.activeSprites.push(spriteElement);
        }
        
        return this.activeSprites.length;
    }

    async displayAllSprites(boundingBoxes = [], spriteCount = 50) {
        this.clearSprites();
        
        // Randomly select the specified number of sprites from all available sprites
        const randomSprites = this.getRandomSprites(spriteCount);
        
        // Add a small delay to ensure background image is properly rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (boundingBoxes.length > 0) {
            // Calculate capacity-based distribution
            const distribution = this.calculateSpriteDistribution(boundingBoxes, randomSprites.length);
            let spriteIndex = 0;
            
            for (const [boxIndex, count] of distribution.entries()) {
                for (let i = 0; i < count; i++) {
                    if (spriteIndex >= randomSprites.length) break;
                    
                    const currentSpriteSrc = randomSprites[spriteIndex];
                    
                    const spriteElement = await this.createSpriteElement(
                        currentSpriteSrc, 
                        boundingBoxes, 
                        boxIndex
                    );
                    this.container.appendChild(spriteElement);
                    this.activeSprites.push(spriteElement);
                    
                    spriteIndex++;
                    
                    // Small delay between each sprite (optional)
                    if (spriteIndex < randomSprites.length) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }
            }
        } else {
            // No bounding boxes, use full background with random selection
            for (const spriteSrc of randomSprites) {
                const spriteElement = await this.createSpriteElement(spriteSrc, boundingBoxes);
                this.container.appendChild(spriteElement);
                this.activeSprites.push(spriteElement);
                
                // Small delay between each sprite (optional)
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        return randomSprites.length;
    }
    
    calculateSpriteDistribution(boundingBoxes, totalSprites) {
        // Calculate area-based capacity for each bounding box
        const spriteSize = 80;
        const buffer = 5;
        const effectiveSpriteSize = spriteSize + buffer;
        
        const capacities = boundingBoxes.map(box => {
            const spritesPerRow = Math.max(1, Math.floor(box.width / effectiveSpriteSize));
            const spritesPerCol = Math.max(1, Math.floor(box.height / effectiveSpriteSize));
            return spritesPerRow * spritesPerCol;
        });
        
        const totalCapacity = capacities.reduce((sum, cap) => sum + cap, 0);
        
        // Distribute sprites proportionally to capacity
        const distribution = capacities.map(capacity => {
            const proportion = capacity / totalCapacity;
            return Math.floor(totalSprites * proportion);
        });
        
        // Distribute remaining sprites to boxes with largest capacity
        let remainingSprites = totalSprites - distribution.reduce((sum, count) => sum + count, 0);
        const boxesByCapacity = capacities
            .map((capacity, index) => ({ index, capacity }))
            .sort((a, b) => b.capacity - a.capacity);
        
        for (let i = 0; i < remainingSprites; i++) {
            const boxIndex = boxesByCapacity[i % boxesByCapacity.length].index;
            distribution[boxIndex]++;
        }
        
        console.log('Sprite distribution by bounding box:', distribution.map((count, index) => ({
            box: index,
            sprites: count,
            capacity: capacities[index],
            area: boundingBoxes[index].width * boundingBoxes[index].height
        })));
        
        return distribution;
    }

    clearSprites() {
        this.activeSprites.forEach(sprite => {
            if (sprite.parentNode) {
                sprite.parentNode.removeChild(sprite);
            }
        });
        this.activeSprites = [];
        this.spritePositions = []; // Clear position tracking
    }
    
    isPlacementModeActive() {
        return document.body.classList.contains('placement-mode');
    }

    getSpriteCount() {
        return this.activeSprites.length;
    }

    getLoadedSpritesCount() {
        return this.loadedSprites.length;
    }
}