import { AssetConfigLoader } from '../utils/AssetConfigLoader.js';
import { SPRITE_CONFIG } from '../config/SpriteConfig.js';
import { SpritePositioning } from '../utils/SpritePositioning.js';

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
        // Get actual sprite dimensions from the element styles
        const spriteWidth = parseInt(sprite.style.width) || SPRITE_CONFIG.TARGET_SIZE_PX;
        const spriteHeight = parseInt(sprite.style.height) || SPRITE_CONFIG.TARGET_SIZE_PX;
        
        // Get background area for coverage calculations
        const backgroundArea = {
            x: relativeLeft,
            y: relativeTop,
            width: bgRect.width,
            height: bgRect.height
        };
        
        // Create collision detector with current sprite positions, 70% max obscuration, and 60% area coverage limit
        const collisionDetector = SpritePositioning.createCollisionDetector(
            this.spritePositions, 
            spriteWidth, 
            spriteHeight,
            5, // buffer
            70, // max obscuration percentage
            backgroundArea, // background area for coverage calculations
            60 // max area coverage percentage
        );
        
        // Get background context
        const context = SpritePositioning.getActiveBackgroundContext();
        if (!context.backgroundImg || !context.container) {
            console.warn('Cannot position sprite - missing background or container context');
            return;
        }
        
        // Calculate positioning area
        const bgRect = context.backgroundImg.getBoundingClientRect();
        const containerRect = context.container.getBoundingClientRect();
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        
        let position = null;
        
        if (boundingBoxes.length > 0) {
            // Use specific bounding box or pick one randomly
            const selectedBox = specificBoxIndex !== null ? 
                boundingBoxes[specificBoxIndex] : 
                boundingBoxes[Math.floor(Math.random() * boundingBoxes.length)];
            
            // Find non-colliding position within bounding box using centralized system
            // Ensure sprite centers stay within background bounds
            position = collisionDetector.findNonCollidingPosition(
                relativeLeft + selectedBox.x,
                relativeTop + selectedBox.y,
                selectedBox.width,
                selectedBox.height,
                50, // maxAttempts
                true // ensureCenterInBounds
            );
            
            console.log(`Positioned sprite in box ${specificBoxIndex || 'random'} at: ${position.x}, ${position.y} (attempts: ${position.attempts}, centerInBounds: ${position.centerInBounds})`);
        } else {
            // Find non-colliding position on full background using centralized system
            // Ensure sprite centers stay within background bounds
            position = collisionDetector.findNonCollidingPosition(
                relativeLeft,
                relativeTop,
                bgRect.width,
                bgRect.height,
                50, // maxAttempts
                true // ensureCenterInBounds
            );
            
            console.log(`Positioned sprite on full background at: ${position.x}, ${position.y} (attempts: ${position.attempts}, centerInBounds: ${position.centerInBounds})`);
        }
        
        // Apply position using centralized system
        sprite.style.position = 'absolute';
        sprite.style.left = position.x + 'px';
        sprite.style.top = position.y + 'px';
        
        // Warn if sprite center ended up outside bounds
        if (position.centerInBounds === false) {
            console.warn('⚠️ Sprite center placed outside background bounds due to crowding:', {
                spritePos: { x: position.x, y: position.y },
                spriteCenter: { 
                    x: position.x + spriteWidth / 2, 
                    y: position.y + spriteHeight / 2 
                },
                backgroundBounds: { 
                    x: relativeLeft, 
                    y: relativeTop, 
                    width: bgRect.width, 
                    height: bgRect.height 
                }
            });
        }
        
        // Store position for collision detection
        collisionDetector.addPosition(position.x, position.y, spriteWidth, spriteHeight);
    }
    
    /**
     * Create a sprite at specific background-relative coordinates
     * @param {string} spriteSrc - Sprite source filename
     * @param {number} backgroundX - X coordinate relative to background
     * @param {number} backgroundY - Y coordinate relative to background
     * @returns {HTMLElement} Created sprite element
     */
    async createSpriteAtBackgroundPosition(spriteSrc, backgroundX, backgroundY) {
        // Create sprite element with sizing
        const sprite = await this.createSpriteElement(spriteSrc, [], null);
        
        // Position using centralized system
        SpritePositioning.positionSpriteAtBackgroundCoords(sprite, backgroundX, backgroundY);
        
        // Track sprite
        this.container.appendChild(sprite);
        this.activeSprites.push(sprite);
        
        // Store position for collision detection
        const spriteWidth = parseInt(sprite.style.width) || SPRITE_CONFIG.TARGET_SIZE_PX;
        const spriteHeight = parseInt(sprite.style.height) || SPRITE_CONFIG.TARGET_SIZE_PX;
        const containerX = parseInt(sprite.style.left) || 0;
        const containerY = parseInt(sprite.style.top) || 0;
        
        this.spritePositions.push({
            x: containerX,
            y: containerY,
            width: spriteWidth,
            height: spriteHeight
        });
        
        return sprite;
    }

    /**
     * Create a sprite at template coordinates with scaling support
     * @param {string} spriteSrc - Sprite source filename
     * @param {Object} templateCoords - Template coordinates {x, y, width, height}
     * @param {Object} template - Template object with backgroundDimensions
     * @returns {HTMLElement} Created sprite element
     */
    async createSpriteAtTemplatePosition(spriteSrc, templateCoords, template) {
        // Create sprite element with sizing
        const sprite = await this.createSpriteElement(spriteSrc, [], null);
        
        // Position using scaled positioning system
        SpritePositioning.positionSpriteWithScaling(sprite, templateCoords, template);
        
        // Track sprite
        this.container.appendChild(sprite);
        this.activeSprites.push(sprite);
        
        // Store position for collision detection
        const spriteWidth = parseInt(sprite.style.width) || SPRITE_CONFIG.TARGET_SIZE_PX;
        const spriteHeight = parseInt(sprite.style.height) || SPRITE_CONFIG.TARGET_SIZE_PX;
        const containerX = parseInt(sprite.style.left) || 0;
        const containerY = parseInt(sprite.style.top) || 0;
        
        this.spritePositions.push({
            x: containerX,
            y: containerY,
            width: spriteWidth,
            height: spriteHeight
        });
        
        return sprite;
    }
    
    /**
     * Get sprite position in background-relative coordinates
     * @param {HTMLElement} sprite - Sprite element
     * @returns {Object} { backgroundX, backgroundY, containerX, containerY }
     */
    getSpriteBackgroundPosition(sprite) {
        return SpritePositioning.getSpritePosition(sprite);
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
        
        // Ensure sprites are loaded before trying to generate random ones
        if (this.loadedSprites.length === 0) {
            await this.loadAvailableSprites();
        }
        
        // Randomly select the specified number of sprites from all available sprites
        const randomSprites = this.getRandomSprites(spriteCount);
        
        // Add a small delay to ensure background image is properly rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get background area for coverage calculations
        const context = SpritePositioning.getActiveBackgroundContext();
        if (!context.backgroundImg || !context.container) {
            console.warn('Cannot calculate area coverage - missing background context');
            return 0;
        }
        
        const bgRect = context.backgroundImg.getBoundingClientRect();
        const containerRect = context.container.getBoundingClientRect();
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        
        const backgroundArea = {
            x: relativeLeft,
            y: relativeTop,
            width: bgRect.width,
            height: bgRect.height
        };
        
        // Create collision detector for area coverage tracking
        const collisionDetector = SpritePositioning.createCollisionDetector(
            [], // start with empty positions
            SPRITE_CONFIG.TARGET_SIZE_PX,
            SPRITE_CONFIG.TARGET_SIZE_PX,
            5, // buffer
            70, // max obscuration percentage
            backgroundArea, // background area for coverage calculations
            60 // max area coverage percentage
        );
        
        console.log(`Starting sprite placement with ${randomSprites.length} sprites, target count: ${spriteCount}`);
        console.log(`Background area: ${backgroundArea.width}x${backgroundArea.height} = ${backgroundArea.width * backgroundArea.height}px`);
        
        let placedSprites = 0;
        
        if (boundingBoxes.length > 0) {
            // Calculate capacity-based distribution
            const distribution = this.calculateSpriteDistribution(boundingBoxes, randomSprites.length);
            let spriteIndex = 0;
            
            for (const [boxIndex, count] of distribution.entries()) {
                for (let i = 0; i < count; i++) {
                    if (spriteIndex >= randomSprites.length) break;
                    
                    // Check area coverage before placing sprite
                    const areaCoverage = collisionDetector.checkAreaCoverageLimit();
                    if (areaCoverage.wouldExceed) {
                        console.log(`🛑 Stopping sprite placement: area coverage limit reached`);
                        console.log(`Current coverage: ${areaCoverage.currentCoverage.toFixed(1)}%, would be: ${areaCoverage.newCoverage.toFixed(1)}%, max: ${areaCoverage.maxAllowed}%`);
                        break;
                    }
                    
                    const currentSpriteSrc = randomSprites[spriteIndex];
                    
                    try {
                        const spriteElement = await this.createSpriteElement(
                            currentSpriteSrc, 
                            boundingBoxes, 
                            boxIndex
                        );
                        if (spriteElement) {
                            this.container.appendChild(spriteElement);
                            this.activeSprites.push(spriteElement);
                            placedSprites++;
                            
                            // Add sprite to collision detector for area tracking
                            const spriteWidth = parseInt(spriteElement.style.width) || SPRITE_CONFIG.TARGET_SIZE_PX;
                            const spriteHeight = parseInt(spriteElement.style.height) || SPRITE_CONFIG.TARGET_SIZE_PX;
                            const spriteX = parseInt(spriteElement.style.left) || 0;
                            const spriteY = parseInt(spriteElement.style.top) || 0;
                            
                            collisionDetector.addPosition(spriteX, spriteY, spriteWidth, spriteHeight);
                        } else {
                            console.warn(`Failed to create sprite element for ${currentSpriteSrc}`);
                        }
                    } catch (error) {
                        console.error(`Error creating sprite ${currentSpriteSrc}:`, error);
                    }
                    
                    spriteIndex++;
                    
                    // Small delay between each sprite (optional)
                    if (spriteIndex < randomSprites.length) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }
                
                // Check if we need to stop due to area coverage
                const areaCoverage = collisionDetector.checkAreaCoverageLimit();
                if (areaCoverage.wouldExceed) {
                    break;
                }
            }
        } else {
            // No bounding boxes, use full background with random selection
            for (const spriteSrc of randomSprites) {
                // Check area coverage before placing sprite
                const areaCoverage = collisionDetector.checkAreaCoverageLimit();
                if (areaCoverage.wouldExceed) {
                    console.log(`🛑 Stopping sprite placement: area coverage limit reached`);
                    console.log(`Current coverage: ${areaCoverage.currentCoverage.toFixed(1)}%, would be: ${areaCoverage.newCoverage.toFixed(1)}%, max: ${areaCoverage.maxAllowed}%`);
                    break;
                }
                
                try {
                    const spriteElement = await this.createSpriteElement(spriteSrc, boundingBoxes);
                    if (spriteElement) {
                        this.container.appendChild(spriteElement);
                        this.activeSprites.push(spriteElement);
                        placedSprites++;
                        
                        // Add sprite to collision detector for area tracking
                        const spriteWidth = parseInt(spriteElement.style.width) || SPRITE_CONFIG.TARGET_SIZE_PX;
                        const spriteHeight = parseInt(spriteElement.style.height) || SPRITE_CONFIG.TARGET_SIZE_PX;
                        const spriteX = parseInt(spriteElement.style.left) || 0;
                        const spriteY = parseInt(spriteElement.style.top) || 0;
                        
                        collisionDetector.addPosition(spriteX, spriteY, spriteWidth, spriteHeight);
                    } else {
                        console.warn(`Failed to create sprite element for ${spriteSrc}`);
                    }
                } catch (error) {
                    console.error(`Error creating sprite ${spriteSrc}:`, error);
                }
                
                // Small delay between each sprite (optional)
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // Log final area coverage statistics
        const finalCoverage = collisionDetector.calculateAreaCoverage();
        console.log(`✅ Sprite placement completed: ${placedSprites} sprites placed`);
        console.log(`📊 Final area coverage: ${finalCoverage.coveragePercent.toFixed(1)}% (${finalCoverage.totalArea}px / ${finalCoverage.backgroundArea}px)`);
        console.log(`🎯 Coverage limit: ${finalCoverage.maxAllowed}%`);
        
        return this.activeSprites.length;
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