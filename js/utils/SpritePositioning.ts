import { ScalingUtils } from './ScalingUtils.js';
import type { TemplateData, SpriteData, Position, Dimensions, Rectangle } from '../../src/types/index.js';

export interface BackgroundContext {
    backgroundImg: HTMLElement | null;
    container: HTMLElement | null;
    mode: 'placement' | 'game' | 'fallback';
}

export interface CoordinatePosition {
    containerX: number;
    containerY: number;
}

export interface SpritePosition extends Position {
    backgroundX: number;
    backgroundY: number;
    containerX: number;
    containerY: number;
}

export interface CollisionViolation {
    type: 'existing_sprite_obscured' | 'new_sprite_obscured';
    obscurationPercentage: number;
    existingSprite?: Rectangle;
    message: string;
}

export interface ObscurationCheck {
    hasViolation: boolean;
    violations: CollisionViolation[];
}

export interface AreaCoverage {
    totalArea: number;
    backgroundArea: number;
    coveragePercent: number;
    maxAllowed: number;
}

export interface AreaCoverageCheck extends AreaCoverage {
    wouldExceed: boolean;
    currentCoverage: number;
    newCoverage: number;
    newSpriteArea: number;
}

export interface PositionResult {
    x: number;
    y: number;
    attempts: number;
    violations: CollisionViolation[];
    centerInBounds: boolean;
}

export interface CollisionDetector {
    calculateIntersectionArea(rect1: Rectangle, rect2: Rectangle): number;
    calculateAreaCoverage(): AreaCoverage;
    checkAreaCoverageLimit(newSpriteWidth?: number, newSpriteHeight?: number): AreaCoverageCheck;
    checkObscurationViolation(x: number, y: number): ObscurationCheck;
    hasCollision(x: number, y: number): boolean;
    hasBasicCollision(x: number, y: number): boolean;
    isSpriteCenterWithinBounds(x: number, y: number, boundsX: number, boundsY: number, boundsWidth: number, boundsHeight: number): boolean;
    findNonCollidingPosition(areaX: number, areaY: number, areaWidth: number, areaHeight: number, maxAttempts?: number, ensureCenterInBounds?: boolean): PositionResult;
    addPosition(x: number, y: number, width?: number, height?: number): void;
}

export interface DebugInfo {
    mode: string;
    valid: boolean;
    error?: string;
    backgroundImage?: {
        id: string;
        src: string;
        rect: DOMRect;
    };
    container?: {
        id: string;
        rect: DOMRect;
    };
    offset?: Position;
}

/**
 * Centralized sprite positioning utility class
 * Handles all sprite placement calculations consistently across different game modes
 */
export class SpritePositioning {
    
    /**
     * Get the active background image and container for the current mode
     * @returns BackgroundContext { backgroundImg, container, mode }
     */
    static getActiveBackgroundContext(): BackgroundContext {
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
     */
    static backgroundToContainerCoords(
        backgroundX: number, 
        backgroundY: number, 
        backgroundImg: HTMLElement, 
        container: HTMLElement
    ): CoordinatePosition {
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
     */
    static containerToBackgroundCoords(
        containerX: number, 
        containerY: number, 
        backgroundImg: HTMLElement, 
        container: HTMLElement
    ): { backgroundX: number; backgroundY: number } {
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
     */
    static positionSpriteAtBackgroundCoords(
        spriteElement: HTMLElement, 
        backgroundX: number, 
        backgroundY: number, 
        backgroundImg: HTMLElement | null = null, 
        container: HTMLElement | null = null
    ): void {
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
     */
    static positionSpriteWithScaling(
        spriteElement: HTMLElement, 
        templateCoords: SpriteData, 
        template: TemplateData, 
        backgroundImg: HTMLElement | null = null, 
        container: HTMLElement | null = null
    ): void {
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
            const x = templateCoords.renderCoordinates ? templateCoords.renderCoordinates.x : templateCoords.x || 0;
            const y = templateCoords.renderCoordinates ? templateCoords.renderCoordinates.y : templateCoords.y || 0;
            this.positionSpriteAtBackgroundCoords(spriteElement, x, y, context.backgroundImg, context.container);
            return;
        }
        
        // Prepare coordinates for scaling (handle both old and new format)
        const coordsToScale = {
            x: templateCoords.renderCoordinates ? templateCoords.renderCoordinates.x : templateCoords.x || 0,
            y: templateCoords.renderCoordinates ? templateCoords.renderCoordinates.y : templateCoords.y || 0,
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
     */
    static getSpritePosition(
        spriteElement: HTMLElement, 
        backgroundImg: HTMLElement | null = null, 
        container: HTMLElement | null = null
    ): SpritePosition {
        // Auto-detect context if not provided
        const context = backgroundImg && container ? 
            { backgroundImg, container } : 
            this.getActiveBackgroundContext();
        
        if (!context.backgroundImg || !context.container) {
            console.warn('Cannot get sprite position - missing background or container');
            return { backgroundX: 0, backgroundY: 0, containerX: 0, containerY: 0, x: 0, y: 0 };
        }
        
        // Get container-relative position
        let containerX: number, containerY: number;
        
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
        
        return { backgroundX, backgroundY, containerX, containerY, x: backgroundX, y: backgroundY };
    }
    
    /**
     * Create a collision detection system for sprite positioning
     */
    static createCollisionDetector(
        existingPositions: Rectangle[] = [], 
        spriteWidth: number = 80, 
        spriteHeight: number = 80, 
        buffer: number = 5, 
        maxObscurationPercent: number = 70, 
        backgroundArea: Rectangle | null = null, 
        maxAreaCoveragePercent: number = 60
    ): CollisionDetector {
        return {
            /**
             * Calculate the intersection area between two rectangles
             */
            calculateIntersectionArea(rect1: Rectangle, rect2: Rectangle): number {
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
             * Calculate total area coverage of all sprites
             */
            calculateAreaCoverage(): AreaCoverage {
                if (!backgroundArea) {
                    return { totalArea: 0, backgroundArea: 0, coveragePercent: 0, maxAllowed: maxAreaCoveragePercent };
                }
                
                const totalSpriteArea = existingPositions.reduce((total, pos) => {
                    return total + (pos.width * pos.height);
                }, 0);
                
                const bgArea = backgroundArea.width * backgroundArea.height;
                const coveragePercent = bgArea > 0 ? (totalSpriteArea / bgArea) * 100 : 0;
                
                return {
                    totalArea: totalSpriteArea,
                    backgroundArea: bgArea,
                    coveragePercent: coveragePercent,
                    maxAllowed: maxAreaCoveragePercent
                };
            },
            
            /**
             * Check if adding a new sprite would exceed area coverage limits
             */
            checkAreaCoverageLimit(newSpriteWidth: number = spriteWidth, newSpriteHeight: number = spriteHeight): AreaCoverageCheck {
                if (!backgroundArea) {
                    return { 
                        wouldExceed: false, 
                        currentCoverage: 0, 
                        newCoverage: 0, 
                        maxAllowed: maxAreaCoveragePercent,
                        totalArea: 0,
                        backgroundArea: 0,
                        coveragePercent: 0,
                        newSpriteArea: 0
                    };
                }
                
                const current = this.calculateAreaCoverage();
                const newSpriteArea = newSpriteWidth * newSpriteHeight;
                const newTotalArea = current.totalArea + newSpriteArea;
                const newCoveragePercent = current.backgroundArea > 0 ? (newTotalArea / current.backgroundArea) * 100 : 0;
                
                return {
                    wouldExceed: newCoveragePercent > maxAreaCoveragePercent,
                    currentCoverage: current.coveragePercent,
                    newCoverage: newCoveragePercent,
                    maxAllowed: maxAreaCoveragePercent,
                    newSpriteArea: newSpriteArea,
                    totalArea: current.totalArea,
                    backgroundArea: current.backgroundArea,
                    coveragePercent: current.coveragePercent
                };
            },
            
            /**
             * Check if placing a sprite at the given position would violate obscuration rules
             */
            checkObscurationViolation(x: number, y: number): ObscurationCheck {
                const newSprite: Rectangle = { x, y, width: spriteWidth, height: spriteHeight };
                const violations: CollisionViolation[] = [];
                
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
             */
            hasCollision(x: number, y: number): boolean {
                // Use the new obscuration check instead of simple buffer collision
                const obscurationCheck = this.checkObscurationViolation(x, y);
                return obscurationCheck.hasViolation;
            },
            
            /**
             * Check if a position has basic overlap with existing sprites (for buffer-based collision)
             */
            hasBasicCollision(x: number, y: number): boolean {
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
             */
            isSpriteCenterWithinBounds(
                x: number, 
                y: number, 
                boundsX: number, 
                boundsY: number, 
                boundsWidth: number, 
                boundsHeight: number
            ): boolean {
                const spriteCenterX = x + spriteWidth / 2;
                const spriteCenterY = y + spriteHeight / 2;
                
                return spriteCenterX >= boundsX && 
                       spriteCenterX <= boundsX + boundsWidth &&
                       spriteCenterY >= boundsY && 
                       spriteCenterY <= boundsY + boundsHeight;
            },
            
            /**
             * Find a non-colliding position within an area with center bounds checking
             */
            findNonCollidingPosition(
                areaX: number, 
                areaY: number, 
                areaWidth: number, 
                areaHeight: number, 
                maxAttempts: number = 50, 
                ensureCenterInBounds: boolean = true
            ): PositionResult {
                // Calculate positioning constraints based on center bounds requirement
                let availableWidth: number, availableHeight: number, minX: number, minY: number;
                
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
                
                let lastViolations: CollisionViolation[] = [];
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
                
                // If no non-colliding position found, return a special failure marker
                console.warn(`Could not find non-obscured position after ${maxAttempts} attempts. Last violations:`, lastViolations);
                return { x: -1, y: -1, attempts: maxAttempts, violations: lastViolations, centerInBounds: false };
            },
            
            /**
             * Add a position to the collision detection system
             */
            addPosition(x: number, y: number, width: number = spriteWidth, height: number = spriteHeight): void {
                existingPositions.push({ x, y, width, height });
            }
        };
    }
    
    /**
     * Get debug information about the current positioning context
     */
    static getDebugInfo(): DebugInfo {
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
                src: (context.backgroundImg as HTMLImageElement).src.split('/').pop() || '',
                rect: bgRect
            },
            container: {
                id: context.container.id,
                rect: containerRect
            },
            offset: {
                x: relativeLeft,
                y: relativeTop
            }
        };
    }
}