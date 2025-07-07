import { ScalingUtils } from './ScalingUtils.js';

/**
 * Centralized sprite positioning utility class
 * Handles all sprite placement calculations consistently across different game modes
 */
export class SpritePositioning {
    
    /**
     * Get the active background image and container for the current mode
     * @returns {Object} { backgroundImg, container, mode }
     */
    static getActiveBackgroundContext() {
        // Unified approach: both game mode and placement mode use the same left-side structure
        const backgroundImg = document.getElementById('background-image-left');
        const container = backgroundImg ? backgroundImg.parentElement : document.getElementById('game-board-left');
        
        if (!backgroundImg || !container) {
            // Fallback to game container if left side isn't available
            const fallbackBg = document.getElementById('background-image');
            const fallbackContainer = document.getElementById('game-container');
            return {
                backgroundImg: fallbackBg,
                container: fallbackContainer,
                mode: 'fallback'
            };
        }
        
        const isPlacementMode = document.body.classList.contains('placement-mode');
        return {
            backgroundImg,
            container,
            mode: isPlacementMode ? 'placement' : 'game'
        };
    }
    
    /**
     * Calculate container-relative coordinates from background-relative coordinates
     * @param {number} backgroundX - X coordinate relative to background image
     * @param {number} backgroundY - Y coordinate relative to background image
     * @param {HTMLElement} backgroundImg - Background image element
     * @param {HTMLElement} container - Container element
     * @returns {Object} { containerX, containerY }
     */
    static backgroundToContainerCoords(backgroundX, backgroundY, backgroundImg, container) {
        if (!backgroundImg || !container) {
            console.warn('Missing background image or container for coordinate calculation');
            return { containerX: backgroundX, containerY: backgroundY };
        }
        
        const bgRect = backgroundImg.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate background's position relative to container
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        
        // Convert background-relative to container-relative coordinates
        const containerX = relativeLeft + backgroundX;
        const containerY = relativeTop + backgroundY;
        
        return { containerX, containerY };
    }
    
    /**
     * Calculate background-relative coordinates from container-relative coordinates
     * @param {number} containerX - X coordinate relative to container
     * @param {number} containerY - Y coordinate relative to container
     * @param {HTMLElement} backgroundImg - Background image element
     * @param {HTMLElement} container - Container element
     * @returns {Object} { backgroundX, backgroundY }
     */
    static containerToBackgroundCoords(containerX, containerY, backgroundImg, container) {
        if (!backgroundImg || !container) {
            console.warn('Missing background image or container for coordinate calculation');
            return { backgroundX: containerX, backgroundY: containerY };
        }
        
        const bgRect = backgroundImg.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate background's position relative to container
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        
        // Convert container-relative to background-relative coordinates
        const backgroundX = containerX - relativeLeft;
        const backgroundY = containerY - relativeTop;
        
        return { backgroundX, backgroundY };
    }
    
    /**
     * Position a sprite at specific background-relative coordinates
     * @param {HTMLElement} spriteElement - Sprite element to position
     * @param {number} backgroundX - X coordinate relative to background image
     * @param {number} backgroundY - Y coordinate relative to background image
     * @param {HTMLElement} backgroundImg - Background image element (optional, will auto-detect)
     * @param {HTMLElement} container - Container element (optional, will auto-detect)
     */
    static positionSpriteAtBackgroundCoords(spriteElement, backgroundX, backgroundY, backgroundImg = null, container = null) {
        // Auto-detect context if not provided
        const context = backgroundImg && container ? 
            { backgroundImg, container } : 
            this.getActiveBackgroundContext();
        
        if (!context.backgroundImg || !context.container) {
            console.warn('Cannot position sprite - missing background or container');
            return;
        }
        
        const { containerX, containerY } = this.backgroundToContainerCoords(
            backgroundX, 
            backgroundY, 
            context.backgroundImg, 
            context.container
        );
        
        // Apply position to sprite
        spriteElement.style.position = 'absolute';
        spriteElement.style.left = containerX + 'px';
        spriteElement.style.top = containerY + 'px';
        
        console.log(`Positioned sprite at background(${backgroundX}, ${backgroundY}) -> container(${containerX}, ${containerY}) [mode: ${context.mode}]`);
    }
    
    /**
     * Position a sprite using template coordinates with scaling support
     * @param {HTMLElement} spriteElement - Sprite element to position
     * @param {Object} templateCoords - Template coordinates {x, y, width, height}
     * @param {Object} template - Template object with backgroundDimensions
     * @param {HTMLElement} backgroundImg - Background image element (optional, will auto-detect)
     * @param {HTMLElement} container - Container element (optional, will auto-detect)
     */
    static positionSpriteWithScaling(spriteElement, templateCoords, template, backgroundImg = null, container = null) {
        // Auto-detect context if not provided
        const context = backgroundImg && container ? 
            { backgroundImg, container } : 
            this.getActiveBackgroundContext();
        
        if (!context.backgroundImg || !context.container) {
            console.warn('Cannot position sprite - missing background or container');
            return;
        }
        
        // Create scaling context
        const scalingContext = ScalingUtils.createScalingContext(template, context.backgroundImg);
        
        if (!scalingContext) {
            console.warn('Could not create scaling context, falling back to direct positioning');
            const x = templateCoords.renderCoordinates ? templateCoords.renderCoordinates.x : templateCoords.x;
            const y = templateCoords.renderCoordinates ? templateCoords.renderCoordinates.y : templateCoords.y;
            this.positionSpriteAtBackgroundCoords(spriteElement, x, y, context.backgroundImg, context.container);
            return;
        }
        
        // Prepare coordinates for scaling (handle both old and new format)
        const coordsToScale = {
            x: templateCoords.renderCoordinates ? templateCoords.renderCoordinates.x : templateCoords.x,
            y: templateCoords.renderCoordinates ? templateCoords.renderCoordinates.y : templateCoords.y,
            renderDimensions: templateCoords.renderDimensions
        };
        
        // Scale coordinates if needed
        let actualCoords = coordsToScale;
        if (ScalingUtils.isScalingNeeded(scalingContext)) {
            actualCoords = ScalingUtils.scaleCoordinates(coordsToScale, scalingContext.scalingFactor);
            console.log(`Scaling sprite from template(${coordsToScale.x}, ${coordsToScale.y}) to actual(${actualCoords.x}, ${actualCoords.y})`);
        }
        
        // Apply scaling to sprite size if provided
        if (actualCoords.width && actualCoords.height) {
            spriteElement.style.width = actualCoords.width + 'px';
            spriteElement.style.height = actualCoords.height + 'px';
        }
        
        // Position sprite using scaled coordinates
        this.positionSpriteAtBackgroundCoords(spriteElement, actualCoords.x, actualCoords.y, context.backgroundImg, context.container);
    }
    
    /**
     * Get the current position of a sprite in background-relative coordinates
     * @param {HTMLElement} spriteElement - Sprite element
     * @param {HTMLElement} backgroundImg - Background image element (optional, will auto-detect)
     * @param {HTMLElement} container - Container element (optional, will auto-detect)
     * @returns {Object} { backgroundX, backgroundY, containerX, containerY }
     */
    static getSpritePosition(spriteElement, backgroundImg = null, container = null) {
        // Auto-detect context if not provided
        const context = backgroundImg && container ? 
            { backgroundImg, container } : 
            this.getActiveBackgroundContext();
        
        if (!context.backgroundImg || !context.container) {
            console.warn('Cannot get sprite position - missing background or container');
            return { backgroundX: 0, backgroundY: 0, containerX: 0, containerY: 0 };
        }
        
        // Get container-relative position
        let containerX, containerY;
        
        if (spriteElement.style.left && spriteElement.style.top) {
            // Use CSS position values if available
            containerX = parseInt(spriteElement.style.left) || 0;
            containerY = parseInt(spriteElement.style.top) || 0;
        } else {
            // Fall back to getBoundingClientRect
            const spriteRect = spriteElement.getBoundingClientRect();
            const containerRect = context.container.getBoundingClientRect();
            containerX = spriteRect.left - containerRect.left;
            containerY = spriteRect.top - containerRect.top;
        }
        
        // Convert to background-relative coordinates
        const { backgroundX, backgroundY } = this.containerToBackgroundCoords(
            containerX, 
            containerY, 
            context.backgroundImg, 
            context.container
        );
        
        return { backgroundX, backgroundY, containerX, containerY };
    }
    
    /**
     * Create a collision detection system for sprite positioning
     * @param {Array} existingPositions - Array of existing sprite positions
     * @param {number} spriteWidth - Width of the sprite
     * @param {number} spriteHeight - Height of the sprite
     * @param {number} buffer - Buffer space around sprites
     * @param {number} maxObscurationPercent - Maximum allowed obscuration percentage (default 70%)
     * @returns {Object} Collision detection functions
     */
    static createCollisionDetector(existingPositions = [], spriteWidth = 80, spriteHeight = 80, buffer = 5, maxObscurationPercent = 70) {
        return {
            /**
             * Calculate the intersection area between two rectangles
             * @param {Object} rect1 - First rectangle {x, y, width, height}
             * @param {Object} rect2 - Second rectangle {x, y, width, height}
             * @returns {number} Intersection area
             */
            calculateIntersectionArea(rect1, rect2) {
                const left = Math.max(rect1.x, rect2.x);
                const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
                const top = Math.max(rect1.y, rect2.y);
                const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
                
                if (left >= right || top >= bottom) {
                    return 0; // No intersection
                }
                
                return (right - left) * (bottom - top);
            },
            
            /**
             * Check if placing a sprite at the given position would violate obscuration rules
             * @param {number} x - X coordinate
             * @param {number} y - Y coordinate
             * @returns {Object} { hasViolation: boolean, violations: Array<Object> }
             */
            checkObscurationViolation(x, y) {
                const newSprite = { x, y, width: spriteWidth, height: spriteHeight };
                const violations = [];
                
                // Calculate total obscuration of the new sprite by all existing sprites
                let totalNewSpriteObscurationArea = 0;
                const newSpriteArea = spriteWidth * spriteHeight;
                
                // Check each existing sprite for violations
                for (const existing of existingPositions) {
                    // Calculate how much this existing sprite would obscure the new sprite
                    const intersectionArea = this.calculateIntersectionArea(newSprite, existing);
                    totalNewSpriteObscurationArea += intersectionArea;
                    
                    // Check if the new sprite would obscure this existing sprite
                    const existingSpriteArea = existing.width * existing.height;
                    const existingObscurationPercentage = (intersectionArea / existingSpriteArea) * 100;
                    
                    if (existingObscurationPercentage > maxObscurationPercent) {
                        violations.push({
                            type: 'existing_sprite_obscured',
                            obscurationPercentage: existingObscurationPercentage,
                            existingSprite: existing,
                            message: `Existing sprite would be ${existingObscurationPercentage.toFixed(1)}% obscured (max ${maxObscurationPercent}%)`
                        });
                    }
                }
                
                // Check if the new sprite would be too obscured by the combination of all existing sprites
                const newSpriteObscurationPercentage = (totalNewSpriteObscurationArea / newSpriteArea) * 100;
                if (newSpriteObscurationPercentage > maxObscurationPercent) {
                    violations.push({
                        type: 'new_sprite_obscured',
                        obscurationPercentage: newSpriteObscurationPercentage,
                        message: `New sprite would be ${newSpriteObscurationPercentage.toFixed(1)}% obscured (max ${maxObscurationPercent}%)`
                    });
                }
                
                return {
                    hasViolation: violations.length > 0,
                    violations: violations
                };
            },
            
            /**
             * Check if a position collides with existing sprites (legacy method)
             * @param {number} x - X coordinate
             * @param {number} y - Y coordinate
             * @returns {boolean} True if collision detected
             */
            hasCollision(x, y) {
                // Use the new obscuration check instead of simple buffer collision
                const obscurationCheck = this.checkObscurationViolation(x, y);
                return obscurationCheck.hasViolation;
            },
            
            /**
             * Check if a position has basic overlap with existing sprites (for buffer-based collision)
             * @param {number} x - X coordinate
             * @param {number} y - Y coordinate
             * @returns {boolean} True if basic overlap detected
             */
            hasBasicCollision(x, y) {
                for (const existing of existingPositions) {
                    if (x < existing.x + existing.width + buffer &&
                        x + spriteWidth + buffer > existing.x &&
                        y < existing.y + existing.height + buffer &&
                        y + spriteHeight + buffer > existing.y) {
                        return true;
                    }
                }
                return false;
            },
            
            /**
             * Check if a sprite position keeps its center within the specified bounds
             * @param {number} x - Sprite X coordinate (top-left)
             * @param {number} y - Sprite Y coordinate (top-left)
             * @param {number} boundsX - Bounds X coordinate
             * @param {number} boundsY - Bounds Y coordinate
             * @param {number} boundsWidth - Bounds width
             * @param {number} boundsHeight - Bounds height
             * @returns {boolean} True if sprite center is within bounds
             */
            isSpriteCenterWithinBounds(x, y, boundsX, boundsY, boundsWidth, boundsHeight) {
                const spriteCenterX = x + spriteWidth / 2;
                const spriteCenterY = y + spriteHeight / 2;
                
                return spriteCenterX >= boundsX && 
                       spriteCenterX <= boundsX + boundsWidth &&
                       spriteCenterY >= boundsY && 
                       spriteCenterY <= boundsY + boundsHeight;
            },
            
            /**
             * Find a non-colliding position within an area with center bounds checking
             * @param {number} areaX - Area X coordinate
             * @param {number} areaY - Area Y coordinate
             * @param {number} areaWidth - Area width
             * @param {number} areaHeight - Area height
             * @param {number} maxAttempts - Maximum attempts to find position
             * @param {boolean} ensureCenterInBounds - Whether to ensure sprite center stays within area bounds
             * @returns {Object} { x, y, attempts, violations, centerInBounds }
             */
            findNonCollidingPosition(areaX, areaY, areaWidth, areaHeight, maxAttempts = 50, ensureCenterInBounds = true) {
                // Calculate positioning constraints based on center bounds requirement
                let availableWidth, availableHeight, minX, minY;
                
                if (ensureCenterInBounds) {
                    // Ensure sprite center stays within bounds
                    // Center must be at least spriteWidth/2 from left edge and spriteWidth/2 from right edge
                    const halfWidth = spriteWidth / 2;
                    const halfHeight = spriteHeight / 2;
                    
                    minX = areaX + halfWidth;
                    minY = areaY + halfHeight;
                    availableWidth = Math.max(1, areaWidth - spriteWidth);
                    availableHeight = Math.max(1, areaHeight - spriteHeight);
                } else {
                    // Just ensure sprite doesn't extend outside bounds (original behavior)
                    minX = areaX;
                    minY = areaY;
                    availableWidth = Math.max(1, areaWidth - spriteWidth);
                    availableHeight = Math.max(1, areaHeight - spriteHeight);
                }
                
                let lastViolations = [];
                let centerInBounds = true;
                
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    const x = minX + Math.floor(Math.random() * availableWidth);
                    const y = minY + Math.floor(Math.random() * availableHeight);
                    
                    // Check if center is within bounds (if required)
                    if (ensureCenterInBounds) {
                        centerInBounds = this.isSpriteCenterWithinBounds(x, y, areaX, areaY, areaWidth, areaHeight);
                        if (!centerInBounds) {
                            continue; // Try again
                        }
                    }
                    
                    const obscurationCheck = this.checkObscurationViolation(x, y);
                    if (!obscurationCheck.hasViolation) {
                        return { x, y, attempts: attempt + 1, violations: [], centerInBounds };
                    }
                    
                    lastViolations = obscurationCheck.violations;
                }
                
                // If no non-colliding position found, use last attempt
                const x = minX + Math.floor(Math.random() * availableWidth);
                const y = minY + Math.floor(Math.random() * availableHeight);
                
                if (ensureCenterInBounds) {
                    centerInBounds = this.isSpriteCenterWithinBounds(x, y, areaX, areaY, areaWidth, areaHeight);
                }
                
                console.warn(`Could not find non-obscured position after ${maxAttempts} attempts. Last violations:`, lastViolations);
                return { x, y, attempts: maxAttempts, violations: lastViolations, centerInBounds };
            },
            
            /**
             * Add a position to the collision detection system
             * @param {number} x - X coordinate
             * @param {number} y - Y coordinate
             * @param {number} width - Sprite width
             * @param {number} height - Sprite height
             */
            addPosition(x, y, width = spriteWidth, height = spriteHeight) {
                existingPositions.push({ x, y, width, height });
            }
        };
    }
    
    /**
     * Get debug information about the current positioning context
     * @returns {Object} Debug information
     */
    static getDebugInfo() {
        const context = this.getActiveBackgroundContext();
        
        if (!context.backgroundImg || !context.container) {
            return {
                mode: context.mode,
                valid: false,
                error: 'Missing background or container'
            };
        }
        
        const bgRect = context.backgroundImg.getBoundingClientRect();
        const containerRect = context.container.getBoundingClientRect();
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        
        return {
            mode: context.mode,
            valid: true,
            backgroundImage: {
                id: context.backgroundImg.id,
                src: context.backgroundImg.src.split('/').pop(),
                rect: {
                    left: bgRect.left,
                    top: bgRect.top,
                    width: bgRect.width,
                    height: bgRect.height
                }
            },
            container: {
                id: context.container.id,
                rect: {
                    left: containerRect.left,
                    top: containerRect.top,
                    width: containerRect.width,
                    height: containerRect.height
                }
            },
            offset: {
                x: relativeLeft,
                y: relativeTop
            }
        };
    }
}