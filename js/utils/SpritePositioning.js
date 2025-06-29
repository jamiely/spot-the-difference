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
        // Check if we're in side-by-side mode (game mode)
        const gameBoardsContainer = document.querySelector('.game-boards');
        const legacyBoard = document.getElementById('legacy-game-board');
        
        const isSideBySideVisible = gameBoardsContainer && gameBoardsContainer.style.display !== 'none';
        const isLegacyVisible = legacyBoard && legacyBoard.style.display !== 'none';
        const isPlacementMode = document.body.classList.contains('placement-mode');
        
        if (isPlacementMode || isLegacyVisible) {
            // Placement mode - use legacy single board
            const backgroundImg = document.getElementById('background-image');
            const container = backgroundImg ? backgroundImg.parentElement : document.getElementById('game-container');
            return {
                backgroundImg,
                container,
                mode: 'placement'
            };
        } else if (isSideBySideVisible) {
            // Game mode - use left side as reference (both sides should be identical)
            const backgroundImg = document.getElementById('background-image-left');
            const container = backgroundImg ? backgroundImg.parentElement : document.getElementById('game-board-left');
            return {
                backgroundImg,
                container,
                mode: 'game'
            };
        } else {
            // Fallback to game container
            const container = document.getElementById('game-container');
            const backgroundImg = document.getElementById('background-image') || document.getElementById('background-image-left');
            return {
                backgroundImg,
                container,
                mode: 'fallback'
            };
        }
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
     * @returns {Object} Collision detection functions
     */
    static createCollisionDetector(existingPositions = [], spriteWidth = 80, spriteHeight = 80, buffer = 5) {
        return {
            /**
             * Check if a position collides with existing sprites
             * @param {number} x - X coordinate
             * @param {number} y - Y coordinate
             * @returns {boolean} True if collision detected
             */
            hasCollision(x, y) {
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
             * Find a non-colliding position within an area
             * @param {number} areaX - Area X coordinate
             * @param {number} areaY - Area Y coordinate
             * @param {number} areaWidth - Area width
             * @param {number} areaHeight - Area height
             * @param {number} maxAttempts - Maximum attempts to find position
             * @returns {Object} { x, y, attempts }
             */
            findNonCollidingPosition(areaX, areaY, areaWidth, areaHeight, maxAttempts = 50) {
                const availableWidth = Math.max(1, areaWidth - spriteWidth);
                const availableHeight = Math.max(1, areaHeight - spriteHeight);
                
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    const x = areaX + Math.floor(Math.random() * availableWidth);
                    const y = areaY + Math.floor(Math.random() * availableHeight);
                    
                    if (!this.hasCollision(x, y)) {
                        return { x, y, attempts: attempt + 1 };
                    }
                }
                
                // If no non-colliding position found, use last attempt
                const x = areaX + Math.floor(Math.random() * availableWidth);
                const y = areaY + Math.floor(Math.random() * availableHeight);
                console.warn('Could not find non-colliding position after', maxAttempts, 'attempts');
                return { x, y, attempts: maxAttempts };
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