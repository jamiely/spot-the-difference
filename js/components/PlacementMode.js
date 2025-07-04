import { SPRITE_CONFIG } from '../config/SpriteConfig.js';
import { TemplateManager } from '../utils/TemplateManager.js';
import { SpritePositioning } from '../utils/SpritePositioning.js';
import { ViewManager } from '../utils/ViewManager.js';

export class PlacementMode {
    constructor() {
        this.isActive = false;
        this.spritePositions = [];
        this.draggedSprite = null;
        this.dragOffset = { x: 0, y: 0 };
        this.selectedSprite = null; // Track the currently selected sprite
        this.keyRepeatTimer = null; // For holding arrow keys
        this.keyRepeatDelay = 150; // Milliseconds between repeats
        this.templateManager = new TemplateManager(); // Template management
        this.currentTemplate = null; // Currently loaded template
        this.otherMode = null; // Reference to edit mode for mutual exclusivity
        
        // Bind event handlers once to preserve references
        this.boundHandleSpriteMouseDown = this.handleSpriteMouseDown.bind(this);
        this.boundHandleSpriteClick = this.handleSpriteClick.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'P' || e.key === 'p') {
                this.togglePlacementMode();
            } else if (this.isActive && this.selectedSprite) {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    this.deleteSelectedSprite();
                } else {
                    this.handleArrowKeys(e);
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.isActive && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                this.stopKeyRepeat();
            }
        });
    }
    
    async togglePlacementMode() {
        // Don't toggle if edit mode is active - they are mutually exclusive
        if (!this.isActive && this.otherMode && this.otherMode.isActive) {
            console.log('Cannot enter placement mode - edit mode is active');
            return;
        }
        
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            await this.enterPlacementMode();
        } else {
            this.exitPlacementMode();
        }
        
        this.dispatchEvent('placementModeToggled', { isActive: this.isActive });
    }
    
    async enterPlacementMode() {
        console.log('Entering placement mode');
        ViewManager.switchToSingleView();
        
        // Clear all sprites from all containers (including side-by-side game sprites)
        this.clearAllSprites();
        
        // Copy any existing template/background from game mode to placement mode
        this.copyGameStateToPlacementMode();
        
        // If we have a current template, recreate sprites from it
        if (this.currentTemplate) {
            try {
                console.log('Recreating sprites from template in placement mode:', this.currentTemplate.name);
                await this.createSpritesFromTemplate(this.currentTemplate);
            } catch (error) {
                console.warn('Failed to recreate sprites from template:', error);
            }
        }
        
        this.enableSpriteDragging(); // This will now find sprites
        this.showPlacementInterface();
        
        // Update sprite positions now that the interface (including JSON textarea) exists
        this.updateSpritePositions();
        
        document.body.classList.add('placement-mode');
    }
    
    exitPlacementMode() {
        console.log('Exiting placement mode');
        
        // Store current placement state for potential restoration
        this.storePlacementState();
        
        ViewManager.switchToSideBySideView();
        this.disableSpriteDragging();
        this.hidePlacementInterface();
        this.clearSpriteSelection(); // Clear any selected sprite
        this.stopKeyRepeat(); // Clear any active key repeat
        document.body.classList.remove('placement-mode');
        this.clearDragState();
        
        // Trigger game mode to regenerate sprites for side-by-side view
        this.restoreGameMode();
    }
    
    enableSpriteDragging() {
        const sprites = document.querySelectorAll('.game-sprite');
        sprites.forEach(sprite => {
            sprite.style.cursor = 'move';
            sprite.style.pointerEvents = 'auto';
            sprite.style.position = 'absolute'; // Ensure absolute positioning
            sprite.style.transition = 'none'; // Disable any transitions
            sprite.addEventListener('mousedown', this.boundHandleSpriteMouseDown);
            sprite.addEventListener('click', this.boundHandleSpriteClick);
        });
        
        // Add global listeners for drag operations
        document.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mouseup', this.boundHandleMouseUp);
    }
    
    disableSpriteDragging() {
        const sprites = document.querySelectorAll('.game-sprite');
        sprites.forEach(sprite => {
            sprite.style.cursor = 'default';
            sprite.style.pointerEvents = 'none';
            sprite.style.transition = 'transform 0.3s ease'; // Restore transitions
            sprite.removeEventListener('mousedown', this.boundHandleSpriteMouseDown);
            sprite.removeEventListener('click', this.boundHandleSpriteClick);
        });
        
        // Remove global listeners
        document.removeEventListener('mousemove', this.boundHandleMouseMove);
        document.removeEventListener('mouseup', this.boundHandleMouseUp);
    }
    
    refreshSpriteEventListeners() {
        if (!this.isActive) return;
        
        // Re-apply sprite dragging to all current sprites
        const sprites = document.querySelectorAll('.game-sprite');
        sprites.forEach(sprite => {
            // Remove old listeners first (in case they exist)
            sprite.removeEventListener('mousedown', this.boundHandleSpriteMouseDown);
            sprite.removeEventListener('click', this.boundHandleSpriteClick);
            
            // Apply placement mode styling and listeners
            sprite.style.cursor = 'move';
            sprite.style.pointerEvents = 'auto';
            sprite.style.position = 'absolute';
            sprite.style.transition = 'none';
            
            // Add fresh event listeners
            sprite.addEventListener('mousedown', this.boundHandleSpriteMouseDown);
            sprite.addEventListener('click', this.boundHandleSpriteClick);
        });
        
        console.log(`Refreshed event listeners for ${sprites.length} sprites`);
    }
    
    handleSpriteMouseDown(e) {
        if (!this.isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Select this sprite
        this.selectSprite(e.target);
        
        this.draggedSprite = e.target;
        const spriteRect = this.draggedSprite.getBoundingClientRect();
        
        // Calculate offset from mouse to sprite top-left corner
        this.dragOffset = {
            x: e.clientX - spriteRect.left,
            y: e.clientY - spriteRect.top
        };
        
        // Style for dragging
        this.draggedSprite.style.zIndex = '1000';
        this.draggedSprite.style.opacity = '0.8';
        
        // Disable pointer events on placement panel during drag to allow trash interaction
        const placementPanel = document.getElementById('placement-panel');
        if (placementPanel) {
            placementPanel.style.pointerEvents = 'none';
        }
        
        console.log('=== DRAG START ===');
        console.log('Started dragging sprite:', this.draggedSprite.src);
        console.log('Mouse position:', e.clientX, e.clientY);
        console.log('Sprite rect:', spriteRect);
        console.log('Drag offset:', this.dragOffset);
        console.log('draggedSprite set to:', this.draggedSprite);
    }
    
    handleMouseMove(e) {
        if (!this.isActive || !this.draggedSprite) {
            if (!this.isActive) console.log('Mouse move ignored: placement mode not active');
            if (!this.draggedSprite) console.log('Mouse move ignored: no draggedSprite');
            return;
        }
        
        e.preventDefault();
        
        // Use the same left container as game mode for consistent positioning
        const container = document.getElementById('game-board-left');
        const containerRect = container.getBoundingClientRect();
        
        // Calculate new position relative to container
        const newX = e.clientX - containerRect.left - this.dragOffset.x;
        const newY = e.clientY - containerRect.top - this.dragOffset.y;
        
        // Update sprite position with explicit positioning
        this.draggedSprite.style.position = 'absolute';
        this.draggedSprite.style.left = newX + 'px';
        this.draggedSprite.style.top = newY + 'px';
        
        // Update selection indicator position if this sprite is selected
        this.updateSelectionIndicatorPosition(this.draggedSprite, newX, newY);
        
        // Update position display if this is the selected sprite
        if (this.selectedSprite === this.draggedSprite) {
            this.updatePositionDisplay(this.draggedSprite);
        }
        
        // Check if hovering over trash bin and add visual feedback
        const trashBin = document.getElementById('trash-bin');
        if (trashBin) {
            const trashRect = trashBin.getBoundingClientRect();
            const isOverTrash = e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
                               e.clientY >= trashRect.top && e.clientY <= trashRect.bottom;
            
            if (isOverTrash) {
                trashBin.classList.add('trash-hover');
                console.log('=== OVER TRASH ===');
                console.log('Mouse over trash bin at:', e.clientX, e.clientY);
                console.log('Trash rect:', trashRect);
                console.log('draggedSprite still exists:', !!this.draggedSprite);
            } else {
                trashBin.classList.remove('trash-hover');
            }
        } else {
            console.log('WARNING: trash bin not found during drag');
        }
        
        // Reduced logging for mouse move to avoid spam - only log every 10th move
        if (this.moveCounter === undefined) this.moveCounter = 0;
        this.moveCounter++;
        if (this.moveCounter % 10 === 0) {
            console.log(`Moving sprite to: ${newX}, ${newY}, draggedSprite still valid:`, !!this.draggedSprite);
        }
    }
    
    handleMouseUp(e) {
        console.log('=== MOUSE UP ===');
        console.log('Mouse up at:', e.clientX, e.clientY);
        console.log('Placement mode active:', this.isActive);
        console.log('draggedSprite exists:', !!this.draggedSprite);
        
        if (!this.isActive || !this.draggedSprite) {
            console.log('Mouse up ignored - conditions not met');
            return;
        }
        
        e.preventDefault();
        
        // Check if dropped on trash bin
        const trashBin = document.getElementById('trash-bin');
        const trashRect = trashBin ? trashBin.getBoundingClientRect() : null;
        
        console.log('Trash bin found:', !!trashBin);
        console.log('Trash rect:', trashRect);
        
        const isOverTrash = trashRect && 
            e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
            e.clientY >= trashRect.top && e.clientY <= trashRect.bottom;
            
        console.log('Is over trash:', isOverTrash);
        
        if (isOverTrash) {
            console.log('=== CALLING TRASH DROP ===');
            console.log('About to call handleTrashDrop with draggedSprite:', this.draggedSprite.src);
            
            // Handle trash drop - create a proper event for the trash bin
            const trashEvent = new Event('drop');
            Object.defineProperty(trashEvent, 'currentTarget', {
                value: trashBin,
                writable: false
            });
            this.handleTrashDrop(trashEvent);
            return;
        }
        
        console.log('=== NORMAL DROP ===');
        // Normal drop - position the sprite
        const container = document.getElementById('game-board-left');
        const containerRect = container.getBoundingClientRect();
        const finalX = e.clientX - containerRect.left - this.dragOffset.x;
        const finalY = e.clientY - containerRect.top - this.dragOffset.y;
        
        // Ensure final position is set explicitly
        this.draggedSprite.style.position = 'absolute';
        this.draggedSprite.style.left = finalX + 'px';
        this.draggedSprite.style.top = finalY + 'px';
        
        // Update selection indicator final position
        this.updateSelectionIndicatorPosition(this.draggedSprite, finalX, finalY);
        
        // Reset sprite appearance - no need for high z-index since it's last in DOM
        this.draggedSprite.style.zIndex = '10'; // Normal z-index
        this.draggedSprite.style.opacity = '1';
        
        // Update sprite positions array
        this.updateSpritePositions();
        
        // Update position display if this is the selected sprite
        if (this.selectedSprite === this.draggedSprite) {
            this.updatePositionDisplay(this.draggedSprite);
        }
        
        console.log(`Final sprite position: ${finalX}, ${finalY}`);
        
        // Clean up trash hover state (reuse trashBin from above)
        if (trashBin) {
            trashBin.classList.remove('trash-hover');
        }
        
        this.clearDragState();
    }
    
    clearDragState() {
        console.log('=== CLEARING DRAG STATE ===');
        console.log('Current draggedSprite before clear:', this.draggedSprite ? this.draggedSprite.src : 'null');
        
        // Re-enable pointer events on placement panel after drag
        const placementPanel = document.getElementById('placement-panel');
        if (placementPanel) {
            placementPanel.style.pointerEvents = 'auto';
        }
        
        this.draggedSprite = null;
        this.dragOffset = { x: 0, y: 0 };
        
        console.log('Drag state cleared - draggedSprite now null');
    }
    
    resetAllSpriteZIndex() {
        const sprites = document.querySelectorAll('.game-sprite');
        sprites.forEach(sprite => {
            sprite.style.zIndex = '10'; // Normal sprite z-index
        });
    }
    
    moveSpriteToDOMEnd(sprite) {
        // Get the container
        const container = sprite.parentElement;
        
        // Remove the sprite from its current position
        sprite.remove();
        
        // Append it to the end (making it render last/on top)
        container.appendChild(sprite);
        
        console.log('Moved sprite to DOM end for top rendering:', sprite.src);
    }
    
    selectSprite(sprite) {
        // Clear previous selection
        this.clearSpriteSelection();
        
        // Set new selection
        this.selectedSprite = sprite;
        
        // Move to DOM end for top rendering
        this.moveSpriteToDOMEnd(sprite);
        
        // Add visual selection indicator
        this.addSelectionIndicator(sprite);
        
        // Update position display
        this.updatePositionDisplay(sprite);
    }
    
    clearSpriteSelection() {
        if (this.selectedSprite) {
            this.removeSelectionIndicator(this.selectedSprite);
            this.selectedSprite = null;
        }
        // Clear position display
        this.updatePositionDisplay(null);
    }
    
    updatePositionDisplay(sprite) {
        const spriteNameEl = document.getElementById('sprite-name');
        const absolutePosEl = document.getElementById('absolute-position');
        const containerPosEl = document.getElementById('container-position');
        const backgroundPosEl = document.getElementById('background-position');
        const renderCoordinatesEl = document.getElementById('render-coordinates');
        const renderDimensionsEl = document.getElementById('render-dimensions');
        
        if (!spriteNameEl || !absolutePosEl || !containerPosEl || !backgroundPosEl || !renderCoordinatesEl || !renderDimensionsEl) {
            return; // Elements not found
        }
        
        if (!sprite) {
            spriteNameEl.textContent = 'No sprite selected';
            absolutePosEl.textContent = 'Absolute: -';
            containerPosEl.textContent = 'Container: -';
            backgroundPosEl.textContent = 'Background: -';
            renderCoordinatesEl.textContent = 'RenderCoordinates: -';
            renderDimensionsEl.textContent = 'RenderDimensions: -';
            return;
        }
        
        // Get sprite name
        const spriteName = sprite.src.split('/').pop();
        spriteNameEl.textContent = spriteName;
        
        // Get absolute position (relative to viewport)
        const absoluteRect = sprite.getBoundingClientRect();
        absolutePosEl.textContent = `Absolute: (${Math.round(absoluteRect.left)}, ${Math.round(absoluteRect.top)})`;
        
        // Use centralized positioning system to get accurate positions
        const position = SpritePositioning.getSpritePosition(sprite);
        containerPosEl.textContent = `Container: (${Math.round(position.containerX)}, ${Math.round(position.containerY)})`;
        backgroundPosEl.textContent = `Background: (${Math.round(position.backgroundX)}, ${Math.round(position.backgroundY)})`;
        
        // Get template data for the sprite if available
        if (this.currentTemplate && this.currentTemplate.sprites) {
            const templateSprite = this.currentTemplate.sprites.find(s => s.src === spriteName);
            if (templateSprite) {
                // Display renderCoordinates
                if (templateSprite.renderCoordinates) {
                    renderCoordinatesEl.textContent = `RenderCoordinates: (${templateSprite.renderCoordinates.x}, ${templateSprite.renderCoordinates.y})`;
                } else {
                    // Fallback to old format
                    renderCoordinatesEl.textContent = `RenderCoordinates: (${templateSprite.x || 'N/A'}, ${templateSprite.y || 'N/A'})`;
                }
                
                // Display renderDimensions
                if (templateSprite.renderDimensions) {
                    renderDimensionsEl.textContent = `RenderDimensions: ${templateSprite.renderDimensions.width} × ${templateSprite.renderDimensions.height}`;
                } else {
                    // Fallback to old format
                    renderDimensionsEl.textContent = `RenderDimensions: ${templateSprite.width || 'N/A'} × ${templateSprite.height || 'N/A'}`;
                }
            } else {
                renderCoordinatesEl.textContent = 'RenderCoordinates: Not in template';
                renderDimensionsEl.textContent = 'RenderDimensions: Not in template';
            }
        } else {
            renderCoordinatesEl.textContent = 'RenderCoordinates: No template loaded';
            renderDimensionsEl.textContent = 'RenderDimensions: No template loaded';
        }
    }
    
    addSelectionIndicator(sprite) {
        // Add selection class for CSS styling
        sprite.classList.add('selected-sprite');
        
        // Create selection border overlay
        const indicator = document.createElement('div');
        indicator.className = 'sprite-selection-indicator';
        indicator.style.position = 'absolute';
        indicator.style.left = sprite.style.left;
        indicator.style.top = sprite.style.top;
        // Get sprite dimensions from the sprite element itself
        const spriteRect = sprite.getBoundingClientRect();
        indicator.style.width = spriteRect.width + 'px';
        indicator.style.height = spriteRect.height + 'px';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '999'; // Just below dragging z-index
        
        // Add indicator to same container as sprite
        sprite.parentElement.appendChild(indicator);
        
        // Store reference for cleanup
        sprite.dataset.indicatorId = 'selection-indicator-' + Date.now();
        indicator.id = sprite.dataset.indicatorId;
    }
    
    removeSelectionIndicator(sprite) {
        // Remove selection class
        sprite.classList.remove('selected-sprite');
        
        // Remove indicator element
        if (sprite.dataset.indicatorId) {
            const indicator = document.getElementById(sprite.dataset.indicatorId);
            if (indicator) {
                indicator.remove();
            }
            delete sprite.dataset.indicatorId;
        }
    }
    
    updateSelectionIndicatorPosition(sprite, x, y) {
        if (sprite.dataset.indicatorId) {
            const indicator = document.getElementById(sprite.dataset.indicatorId);
            if (indicator) {
                indicator.style.left = x + 'px';
                indicator.style.top = y + 'px';
            }
        }
    }
    
    handleArrowKeys(e) {
        if (!this.selectedSprite) return;
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (e.shiftKey) {
                // SHIFT + Up Arrow: Move sprite to end of list (top layer)
                this.moveSpriteToEnd();
            } else {
                // Normal Up Arrow: Move sprite up one position
                this.moveSpriteUp();
                this.startKeyRepeat(() => this.moveSpriteUp());
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (e.shiftKey) {
                // SHIFT + Down Arrow: Move sprite to beginning of list (bottom layer)
                this.moveSpriteToBeginning();
            } else {
                // Normal Down Arrow: Move sprite down one position
                this.moveSpriteDown();
                this.startKeyRepeat(() => this.moveSpriteDown());
            }
        }
    }
    
    startKeyRepeat(action) {
        this.stopKeyRepeat(); // Clear any existing timer
        this.keyRepeatTimer = setTimeout(() => {
            action();
            // Set up continuous repeat
            this.keyRepeatTimer = setInterval(action, this.keyRepeatDelay);
        }, 300); // Initial delay before repeating
    }
    
    stopKeyRepeat() {
        if (this.keyRepeatTimer) {
            clearTimeout(this.keyRepeatTimer);
            clearInterval(this.keyRepeatTimer);
            this.keyRepeatTimer = null;
        }
    }
    
    moveSpriteUp() {
        if (!this.selectedSprite) return;
        
        const container = this.selectedSprite.parentElement;
        const sprites = Array.from(container.querySelectorAll('.game-sprite'));
        const currentIndex = sprites.indexOf(this.selectedSprite);
        
        // If not already at the end, move one step closer to the end
        if (currentIndex < sprites.length - 1) {
            const nextSprite = sprites[currentIndex + 1];
            
            // Insert selected sprite after the next sprite
            container.insertBefore(this.selectedSprite, nextSprite.nextSibling);
            
            console.log(`Moved sprite up in order (${currentIndex} -> ${currentIndex + 1})`);
            this.showLayerFeedback('↑ Moved up');
        } else {
            console.log('Sprite already at top layer');
        }
    }
    
    moveSpriteDown() {
        if (!this.selectedSprite) return;
        
        const container = this.selectedSprite.parentElement;
        const sprites = Array.from(container.querySelectorAll('.game-sprite'));
        const currentIndex = sprites.indexOf(this.selectedSprite);
        
        // If not already at the beginning, move one step closer to the beginning
        if (currentIndex > 0) {
            const prevSprite = sprites[currentIndex - 1];
            
            // Insert selected sprite before the previous sprite
            container.insertBefore(this.selectedSprite, prevSprite);
            
            console.log(`Moved sprite down in order (${currentIndex} -> ${currentIndex - 1})`);
            this.showLayerFeedback('↓ Moved down');
        } else {
            console.log('Sprite already at bottom layer');
        }
    }
    
    moveSpriteToEnd() {
        if (!this.selectedSprite) return;
        
        const container = this.selectedSprite.parentElement;
        const sprites = Array.from(container.querySelectorAll('.game-sprite'));
        const currentIndex = sprites.indexOf(this.selectedSprite);
        
        // Only move if not already at the end
        if (currentIndex < sprites.length - 1) {
            // Remove sprite from current position and append to end
            container.appendChild(this.selectedSprite);
            
            console.log(`Moved sprite to end (${currentIndex} -> ${sprites.length - 1})`);
            this.showLayerFeedback('⤴ Moved to top');
        } else {
            console.log('Sprite already at top layer');
        }
    }
    
    moveSpriteToBeginning() {
        if (!this.selectedSprite) return;
        
        const container = this.selectedSprite.parentElement;
        const sprites = Array.from(container.querySelectorAll('.game-sprite'));
        const currentIndex = sprites.indexOf(this.selectedSprite);
        
        // Only move if not already at the beginning
        if (currentIndex > 0) {
            // Find the first sprite and insert before it
            const firstSprite = sprites[0];
            container.insertBefore(this.selectedSprite, firstSprite);
            
            console.log(`Moved sprite to beginning (${currentIndex} -> 0)`);
            this.showLayerFeedback('⤵ Moved to bottom');
        } else {
            console.log('Sprite already at bottom layer');
        }
    }
    
    deleteSelectedSprite() {
        if (!this.selectedSprite) return;
        
        console.log('Deleting selected sprite:', this.selectedSprite.src);
        
        // Show deletion feedback
        this.showLayerFeedback('🗑️ Deleted');
        
        // Remove the sprite after a brief delay to show the feedback
        setTimeout(() => {
            if (this.selectedSprite && this.selectedSprite.parentElement) {
                // Remove selection indicator before deleting sprite
                this.removeSelectionIndicator(this.selectedSprite);
                
                // Remove the sprite
                this.selectedSprite.remove();
                this.selectedSprite = null;
                
                // Update sprite positions
                this.updateSpritePositions();
            }
        }, 300);
    }
    
    showLayerFeedback(message) {
        if (!this.selectedSprite) return;
        
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'layer-feedback';
        feedback.textContent = message;
        feedback.style.position = 'absolute';
        feedback.style.left = this.selectedSprite.style.left;
        feedback.style.top = (parseInt(this.selectedSprite.style.top) - 30) + 'px';
        feedback.style.background = '#4a90e2';
        feedback.style.color = 'white';
        feedback.style.padding = '0.25rem 0.5rem';
        feedback.style.borderRadius = '4px';
        feedback.style.fontSize = '0.8rem';
        feedback.style.fontWeight = 'bold';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '1001';
        feedback.style.opacity = '0';
        feedback.style.transition = 'opacity 0.2s ease';
        
        this.selectedSprite.parentElement.appendChild(feedback);
        
        // Animate in
        setTimeout(() => {
            feedback.style.opacity = '1';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
                if (feedback.parentElement) {
                    feedback.remove();
                }
            }, 200);
        }, 800);
    }
    
    handleSpriteClick(e) {
        if (!this.isActive) return;
        
        // Only handle if not currently dragging
        if (!this.draggedSprite) {
            e.preventDefault();
            e.stopPropagation();
            
            // Select clicked sprite
            this.selectSprite(e.target);
            
            console.log('Selected sprite:', e.target.src);
        }
    }
    
    updateSpritePositions() {
        const sprites = document.querySelectorAll('.game-sprite');
        
        // Use centralized positioning system to get debug info
        const debugInfo = SpritePositioning.getDebugInfo();
        if (!debugInfo.valid) {
            console.warn('Cannot update sprite positions:', debugInfo.error);
            return;
        }
        
        if (sprites.length > 0) {
            console.log(`Saving: Background image: ${debugInfo.backgroundImage.rect.width}x${debugInfo.backgroundImage.rect.height} at (${debugInfo.backgroundImage.rect.left}, ${debugInfo.backgroundImage.rect.top})`);
            console.log(`Saving: Container: ${debugInfo.container.rect.width}x${debugInfo.container.rect.height} at (${debugInfo.container.rect.left}, ${debugInfo.container.rect.top})`);
            console.log(`Saving: Calculated relative offset: (${debugInfo.offset.x}, ${debugInfo.offset.y})`);
        }
        
        this.spritePositions = Array.from(sprites).map((sprite, index) => {
            // Use centralized positioning system to get sprite position
            const position = SpritePositioning.getSpritePosition(sprite);
            
            console.log(`updateSpritePositions ${position.backgroundX}, ${position.backgroundY}`);
            
            if (index === 0) { // Debug first sprite only
                console.log(`[${new Date().toISOString()}] Saving ${sprite.src.split('/').pop()}: Container(${position.containerX}, ${position.containerY}) -> JSON(${position.backgroundX}, ${position.backgroundY}), RelativeOffset(${debugInfo.offset.x}, ${debugInfo.offset.y})`);
            }
            
            // Get actual CSS dimensions from the sprite element
            const spriteRect = sprite.getBoundingClientRect();
            const actualWidth = Math.round(spriteRect.width);
            const actualHeight = Math.round(spriteRect.height);
            
            return {
                id: `sprite_${index}`,
                src: sprite.src.split('/').pop(), // Get filename only
                renderCoordinates: {
                    x: Math.round(position.backgroundX),
                    y: Math.round(position.backgroundY)
                },
                renderDimensions: {
                    width: actualWidth,
                    height: actualHeight
                }
            };
        });
        
        this.updateJsonExport();
        console.log('Updated sprite positions:', this.spritePositions.length, 'sprites');
    }
    
    showPlacementInterface() {
        let placementPanel = document.getElementById('placement-panel');
        if (!placementPanel) {
            placementPanel = document.createElement('div');
            placementPanel.id = 'placement-panel';
            placementPanel.innerHTML = `
                <h3>Placement Mode (Press P to exit)</h3>
                <p>Drag sprites to reposition them. Drop sprites on the trash bin to discard them.</p>
                <div id="placement-info" style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;"></div>
                <div id="position-display" style="font-size: 0.8rem; color: #333; margin-bottom: 1rem; padding: 0.5rem; background: #f0f0f0; border-radius: 4px;">
                    <strong>Selected Sprite Position:</strong><br>
                    <span id="sprite-name">No sprite selected</span><br>
                    <span id="absolute-position">Absolute: -</span><br>
                    <span id="container-position">Container: -</span><br>
                    <span id="background-position">Background: -</span><br>
                    <span id="render-coordinates">RenderCoordinates: -</span><br>
                    <span id="render-dimensions">RenderDimensions: -</span>
                </div>
                <div class="template-section" style="margin-bottom: 1rem; padding: 0.5rem; background: #e8f4fd; border-radius: 4px;">
                    <strong>Templates:</strong><br>
                    <div style="margin: 0.5rem 0;">
                        <select id="template-select" style="width: 100%; margin-bottom: 0.5rem;">
                            <option value="">Select a template...</option>
                        </select>
                    </div>
                    <div class="template-buttons" style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                        <button id="load-template" style="flex: 1; font-size: 0.8rem; padding: 0.25rem;">Load</button>
                        <button id="save-template" style="flex: 1; font-size: 0.8rem; padding: 0.25rem;">Save As...</button>
                    </div>
                </div>
                <div class="placement-actions">
                    <button id="place-all-sprites">Place All Sprites</button>
                    <button id="reset-outside-sprites">Move Sprites Outside</button>
                </div>
                <label for="sprite-positions-json">Sprite Positions JSON:</label>
                <textarea id="sprite-positions-json" rows="8"></textarea>
                <div class="placement-buttons">
                    <button id="copy-positions">Copy JSON</button>
                    <button id="load-positions">Load JSON</button>
                    <button id="clear-positions">Clear All</button>
                    <button id="test-drag-trash">Test Drag to Trash</button>
                </div>
            `;
            document.getElementById('game-container').appendChild(placementPanel);
            
            document.getElementById('copy-positions').addEventListener('click', () => {
                this.copyJsonToClipboard();
            });
            
            document.getElementById('load-positions').addEventListener('click', () => {
                this.loadJsonFromTextarea();
            });
            
            document.getElementById('clear-positions').addEventListener('click', () => {
                this.clearAllPositions();
            });
            
            document.getElementById('test-drag-trash').addEventListener('click', () => {
                this.testDragToTrash();
            });
            
            document.getElementById('place-all-sprites').addEventListener('click', () => {
                this.placeAllSprites();
            });
            
            document.getElementById('reset-outside-sprites').addEventListener('click', () => {
                this.resetOutsideSprites();
            });
            
            // Template event handlers
            document.getElementById('load-template').addEventListener('click', () => {
                this.loadSelectedTemplate();
            });
            
            document.getElementById('save-template').addEventListener('click', () => {
                this.saveCurrentTemplate();
            });
            
            // Load available templates
            this.loadAvailableTemplates();
        }
        
        // Create trash bin
        this.createTrashBin();
        
        placementPanel.style.display = 'block';
        this.updatePlacementInfo();
    }
    
    hidePlacementInterface() {
        const placementPanel = document.getElementById('placement-panel');
        if (placementPanel) {
            placementPanel.style.display = 'none';
        }
        
        // Remove trash bin
        this.removeTrashBin();
    }
    
    updateJsonExport() {
        const textarea = document.getElementById('sprite-positions-json');
        if (textarea) {
            textarea.value = JSON.stringify(this.spritePositions, null, 2);
            if (this.spritePositions.length > 0) {
                console.log(`[${new Date().toISOString()}] Updated JSON - First sprite: ${this.spritePositions[0].src} at (${this.spritePositions[0].x}, ${this.spritePositions[0].y})`);
            }
        }
    }
    
    updatePlacementInfo() {
        const placementInfo = document.getElementById('placement-info');
        const backgroundImg = document.getElementById('background-image');
        
        if (placementInfo && backgroundImg && backgroundImg.src) {
            const filename = backgroundImg.src.split('/').pop();
            const spriteCount = this.spritePositions.length;
            
            placementInfo.textContent = `Background: ${filename} (${spriteCount} sprites positioned)`;
            placementInfo.style.display = 'block';
        }
    }
    
    async copyJsonToClipboard() {
        const textarea = document.getElementById('sprite-positions-json');
        if (textarea && textarea.value) {
            try {
                await navigator.clipboard.writeText(textarea.value);
                this.showFeedback('copy-positions', 'JSON copied to clipboard!', 'success');
            } catch (err) {
                // Fallback for browsers that don't support clipboard API
                textarea.select();
                document.execCommand('copy');
                this.showFeedback('copy-positions', 'JSON copied to clipboard!', 'success');
            }
        } else {
            this.showFeedback('copy-positions', 'No positions to copy', 'error');
        }
    }
    
    async loadJsonFromTextarea() {
        const textarea = document.getElementById('sprite-positions-json');
        if (!textarea || !textarea.value.trim()) {
            this.showFeedback('load-positions', 'No JSON to load', 'error');
            return;
        }
        
        try {
            const jsonData = JSON.parse(textarea.value);
            
            if (!Array.isArray(jsonData)) {
                throw new Error('JSON must be an array');
            }
            
            // Validate each position has required properties
            for (let i = 0; i < jsonData.length; i++) {
                const pos = jsonData[i];
                if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || !pos.src) {
                    throw new Error(`Position ${i} missing required properties (x, y, src)`);
                }
            }
            
            const result = await this.applySpritePositions(jsonData);
            let message = `Loaded ${jsonData.length} positions`;
            if (result.created > 0) message += `, created ${result.created}`;
            if (result.removed > 0) message += `, removed ${result.removed}`;
            this.showFeedback('load-positions', message, 'success');
            
        } catch (error) {
            console.error('Failed to load JSON:', error);
            this.showFeedback('load-positions', `Invalid JSON: ${error.message}`, 'error');
        }
    }
    
    async applySpritePositions(positions) {
        const sprites = document.querySelectorAll('.game-sprite');
        // Use unified background element for consistent positioning
        const backgroundImg = document.getElementById('background-image-left');
        
        if (!backgroundImg) {
            console.warn('Background image not found for position application');
            return;
        }
        
        const imgRect = backgroundImg.getBoundingClientRect();
        const containerRect = backgroundImg.parentElement.getBoundingClientRect();
        const relativeX = imgRect.left - containerRect.left;
        const relativeY = imgRect.top - containerRect.top;
        
        console.log(`Loading: Background image: ${imgRect.width}x${imgRect.height} at (${imgRect.left}, ${imgRect.top})`);
        console.log(`Loading: Container: ${containerRect.width}x${containerRect.height} at (${containerRect.left}, ${containerRect.top})`);
        console.log(`Loading: Calculated relative offset: (${relativeX}, ${relativeY})`);
        
        // Track which sprites from JSON we found and which are missing
        const foundSprites = new Set();
        const missingSprites = [];
        const spritesToRemove = [];
        
        // First pass: apply positions to matching sprites and track found ones
        positions.forEach(position => {
            // Find sprite by src filename
            const matchingSprite = Array.from(sprites).find(sprite => 
                sprite.src.endsWith(position.src)
            );
            
            if (matchingSprite) {
                foundSprites.add(position.src);
                
                // Get current sprite position (container-relative)
                const currentLeft = parseInt(matchingSprite.style.left) || 0;
                const currentTop = parseInt(matchingSprite.style.top) || 0;

                console.log(`JAL: left=${currentLeft} top=${currentTop}`);
                
                // Convert current position to background-relative for comparison
                const currentBackgroundX = currentLeft - relativeX;
                const currentBackgroundY = currentTop - relativeY;
                
                // Calculate where the sprite should be in container coordinates
                const targetContainerX = relativeX + position.x;
                const targetContainerY = relativeY + position.y;

                console.log(`JAL: relative=${relativeX},${relativeY} position=${position.x},${position.y} targetX=${targetContainerX} targetY=${targetContainerY}`)
                
                console.log(`Loading ${position.src}: Current container(${currentLeft}, ${currentTop}) = background(${currentBackgroundX}, ${currentBackgroundY}), JSON(${position.x}, ${position.y}), Target container(${targetContainerX}, ${targetContainerY}), RelativeOffset(${relativeX}, ${relativeY})`);
                
                // Compare container positions directly (more reliable than background coordinates)
                const tolerance = 2;
                if (Math.abs(targetContainerX - currentLeft) > tolerance || Math.abs(targetContainerY - currentTop) > tolerance) {
                    // Use the already calculated target container coordinates
                    matchingSprite.style.left = targetContainerX + 'px';
                    matchingSprite.style.top = targetContainerY + 'px';
                    console.log(`Moved ${position.src} from container(${currentLeft}, ${currentTop}) to container(${targetContainerX}, ${targetContainerY}) [background: (${currentBackgroundX}, ${currentBackgroundY}) -> (${position.x}, ${position.y})]`);
                } else {
                    console.log(`Skipped moving ${position.src} - already at target position: container(${currentLeft}, ${currentTop}) matches target(${targetContainerX}, ${targetContainerY})`);
                }
            } else {
                // Sprite not found - we need to create it
                missingSprites.push(position);
            }
        });
        
        // Second pass: identify sprites to remove (not mentioned in JSON)
        Array.from(sprites).forEach(sprite => {
            const filename = sprite.src.split('/').pop();
            console.log(`Checking sprite for removal: ${filename}, foundSprites has: [${Array.from(foundSprites).join(', ')}]`);
            if (!foundSprites.has(filename)) {
                spritesToRemove.push(sprite);
                console.log(`Marking ${filename} for removal - not found in JSON`);
            } else {
                console.log(`Keeping ${filename} - found in JSON`);
            }
        });
        
        // Remove sprites not mentioned in the JSON
        spritesToRemove.forEach(sprite => {
            console.log(`Removing sprite not in JSON: ${sprite.src.split('/').pop()}`);
            
            // Remove selection indicator if this sprite is selected
            if (sprite === this.selectedSprite) {
                this.removeSelectionIndicator(sprite);
                this.selectedSprite = null;
            }
            
            sprite.remove();
        });
        
        // Create missing sprites
        if (missingSprites.length > 0) {
            console.log(`Creating ${missingSprites.length} missing sprites from JSON`);
            
            for (const position of missingSprites) {
                try {
                    // Request sprite creation through event system
                    const x = position.renderCoordinates ? position.renderCoordinates.x : position.x;
                    const y = position.renderCoordinates ? position.renderCoordinates.y : position.y;
                    const createSpriteEvent = new CustomEvent('requestSpriteCreation', {
                        detail: { 
                            spriteSrc: position.src,
                            x: x,
                            y: y
                        }
                    });
                    document.dispatchEvent(createSpriteEvent);
                } catch (error) {
                    console.warn(`Could not create sprite ${position.src}:`, error);
                }
            }
        }
        
        // Don't call updateSpritePositions() here as it would overwrite the loaded JSON
        // The positions are already correctly applied to the sprites
        
        // Update position display if there's a selected sprite
        if (this.selectedSprite) {
            this.updatePositionDisplay(this.selectedSprite);
        }
        
        // Return counts for feedback
        return {
            created: missingSprites.length,
            removed: spritesToRemove.length
        };
    }
    
    clearAllPositions() {
        // Clear all sprites from DOM
        const sprites = document.querySelectorAll('.game-sprite');
        sprites.forEach(sprite => sprite.remove());
        
        // Clear the JSON positions array
        this.spritePositions = [];
        this.updateJsonExport();
        this.showFeedback('clear-positions', 'Positions cleared', 'success');
    }
    
    createTrashBin() {
        // Remove existing trash bin if any
        this.removeTrashBin();
        
        const trashBin = document.createElement('div');
        trashBin.id = 'trash-bin';
        trashBin.innerHTML = `
            <div class="trash-icon">🗑️</div>
            <div class="trash-label">Drop to Delete</div>
        `;
        
        // Position trash bin in bottom right corner
        document.getElementById('game-container').appendChild(trashBin);
        
        // Add drop event listeners
        trashBin.addEventListener('dragover', this.handleTrashDragOver.bind(this));
        trashBin.addEventListener('drop', this.handleTrashDrop.bind(this));
    }
    
    removeTrashBin() {
        const trashBin = document.getElementById('trash-bin');
        if (trashBin) {
            trashBin.remove();
        }
    }
    
    handleTrashDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('trash-hover');
    }
    
    handleTrashDrop(e) {
        console.log('=== HANDLE TRASH DROP CALLED ===');
        console.log('Event target:', e.currentTarget);
        console.log('Event type:', e.type);
        console.log('draggedSprite at start of handleTrashDrop:', this.draggedSprite);
        console.log('typeof draggedSprite:', typeof this.draggedSprite);
        console.log('draggedSprite === null:', this.draggedSprite === null);
        console.log('draggedSprite === undefined:', this.draggedSprite === undefined);
        console.log('Boolean(draggedSprite):', Boolean(this.draggedSprite));
        console.log('!!draggedSprite:', !!this.draggedSprite);
        
        e.preventDefault();
        e.currentTarget.classList.remove('trash-hover');
        
        if (this.draggedSprite) {
            console.log('=== INSIDE IF STATEMENT ===');
            console.log('SUCCESS: Deleting sprite:', this.draggedSprite.src);
            console.log('Sprite element:', this.draggedSprite);
            console.log('Sprite parent before removal:', this.draggedSprite.parentElement);
            
            // Store reference before removal
            const spriteToDelete = this.draggedSprite;
            const spriteSrc = spriteToDelete.src;
            
            // Remove selection indicator if this sprite is selected
            if (spriteToDelete === this.selectedSprite) {
                console.log('Removing selection indicator for deleted sprite');
                this.removeSelectionIndicator(spriteToDelete);
                this.selectedSprite = null;
            }
            
            // Remove sprite from DOM
            console.log('Removing sprite from DOM...');
            spriteToDelete.remove();
            console.log('Sprite removed from DOM');
            
            // Clear drag state
            this.clearDragState();
            
            // Update positions after removal
            console.log('Updating sprite positions after deletion...');
            this.updateSpritePositions();
            
            this.showTrashFeedback('Sprite deleted');
            console.log('TRASH DROP COMPLETED SUCCESSFULLY for:', spriteSrc);
        } else {
            console.log('ERROR: No draggedSprite to delete');
            console.log('Current drag state:');
            console.log('  this.draggedSprite:', this.draggedSprite);
            console.log('  this.isActive:', this.isActive);
            console.log('  this.selectedSprite:', this.selectedSprite);
        }
    }
    
    showTrashFeedback(message) {
        const trashBin = document.getElementById('trash-bin');
        if (!trashBin) return;
        
        const feedback = document.createElement('div');
        feedback.className = 'trash-feedback';
        feedback.textContent = message;
        trashBin.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 2000);
    }
    
    waitForSpritesAndRefresh() {
        let checkCount = 0;
        const maxChecks = 50; // Maximum checks (5 seconds)
        let expectedSprites = null;
        
        const checkSprites = () => {
            const currentSprites = document.querySelectorAll('.game-sprite');
            checkCount++;
            
            // Get expected sprite count from sprite manager if available
            if (expectedSprites === null) {
                // Try to get expected count from game state or make reasonable assumption
                expectedSprites = 46; // All available sprites
            }
            
            console.log(`Checking sprites: ${currentSprites.length}/${expectedSprites} (check ${checkCount}/${maxChecks})`);
            
            if (currentSprites.length >= expectedSprites || checkCount >= maxChecks) {
                console.log(`Sprites ready! Refreshing event listeners for ${currentSprites.length} sprites`);
                this.refreshSpriteEventListeners();
                this.updateSpritePositions(); // Update JSON after sprites are placed
                return;
            }
            
            // Check again in 100ms
            setTimeout(checkSprites, 100);
        };
        
        // Start checking after initial delay
        setTimeout(checkSprites, 300);
    }
    
    async placeAllSprites() {
        // Clear current selection since sprites will be regenerated
        this.clearSpriteSelection();
        
        // Check if a template is selected
        const select = document.getElementById('template-select');
        if (select && select.value) {
            // Use template positioning instead of random generation
            try {
                const template = this.templateManager.getTemplateById(select.value);
                if (template) {
                    console.log('Placing sprites using template positions:', template.name);
                    this.showFeedback('place-all-sprites', 'Placing sprites from template...', 'success');
                    
                    // Load template background if needed
                    await this.loadTemplateBackground(template.background);
                    
                    // Create sprites using template positions
                    await this.createSpritesFromTemplate(template);
                    
                    // Re-enable sprite dragging
                    this.enableSpriteDragging();
                    this.showFeedback('place-all-sprites', `Placed ${template.sprites.length} sprites from template`, 'success');
                    return;
                }
            } catch (error) {
                console.error('Failed to place sprites from template:', error);
                this.showFeedback('place-all-sprites', 'Template loading failed, using random placement', 'warning');
            }
        }
        
        // Fallback to random sprite placement
        this.dispatchEvent('requestSpriteGeneration', { useAllSprites: true });
        this.showFeedback('place-all-sprites', 'Placing all sprites...', 'success');
        
        // Re-enable sprite dragging after sprites are regenerated
        // Use longer delay and poll for completion
        this.waitForSpritesAndRefresh();
    }
    
    async createSpritesFromTemplate(template) {
        // Clear existing sprites first
        this.clearAllSprites();
        
        // Get the unified background image and container for positioning
        const backgroundImg = document.getElementById('background-image-left');
        if (!backgroundImg) {
            throw new Error('Unified background image not found');
        }
        
        // Create sprites for each template sprite
        for (const spriteData of template.sprites) {
            try {
                // Request sprite creation from Game.js using the same method as SpotTheDifferenceGame
                const x = spriteData.renderCoordinates ? spriteData.renderCoordinates.x : spriteData.x;
                const y = spriteData.renderCoordinates ? spriteData.renderCoordinates.y : spriteData.y;
                this.dispatchEvent('requestSpriteCreation', {
                    spriteSrc: spriteData.src,
                    x: x,
                    y: y
                });
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 10));
                
            } catch (error) {
                console.warn(`Could not create sprite ${spriteData.src} from template:`, error);
            }
        }
        
        // Wait a moment for sprites to be created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`Created ${template.sprites.length} sprites from template`);
    }
    
    resetOutsideSprites() {
        const backgroundImg = document.getElementById('background-image-left');
        if (!backgroundImg) {
            this.showFeedback('reset-outside-sprites', 'No background image found', 'error');
            return;
        }
        
        // Get background image boundaries and container boundaries
        const bgRect = backgroundImg.getBoundingClientRect();
        const containerRect = backgroundImg.parentElement.getBoundingClientRect();
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        const relativeRight = relativeLeft + bgRect.width;
        const relativeBottom = relativeTop + bgRect.height;
        
        const sprites = document.querySelectorAll('.game-sprite');
        let movedCount = 0;
        
        sprites.forEach((sprite, index) => {
            const spriteRect = sprite.getBoundingClientRect();
            const spriteLeft = spriteRect.left - containerRect.left;
            const spriteTop = spriteRect.top - containerRect.top;
            const spriteRight = spriteLeft + spriteRect.width;
            const spriteBottom = spriteTop + spriteRect.height;
            
            // Check if sprite is inside background boundaries
            const isInside = spriteLeft >= relativeLeft && 
                            spriteTop >= relativeTop && 
                            spriteRight <= relativeRight && 
                            spriteBottom <= relativeBottom;
            
            if (isInside) {
                movedCount++;
                
                // Scatter sprites evenly around all sides of the background image
                const margin = 20; // Distance from image edge
                const side = movedCount % 4; // Rotate through 4 sides
                const positionOnSide = Math.floor(movedCount / 4); // Position along that side
                
                let outsideX, outsideY;
                
                switch (side) {
                    case 0: // Top side
                        outsideX = relativeLeft + (positionOnSide * 120) % bgRect.width;
                        outsideY = relativeTop - spriteRect.height - margin;
                        break;
                    case 1: // Right side
                        outsideX = relativeRight + margin;
                        outsideY = relativeTop + (positionOnSide * 100) % bgRect.height;
                        break;
                    case 2: // Bottom side
                        outsideX = relativeLeft + (positionOnSide * 120) % bgRect.width;
                        outsideY = relativeBottom + margin;
                        break;
                    case 3: // Left side
                        outsideX = relativeLeft - spriteRect.width - margin;
                        outsideY = relativeTop + (positionOnSide * 100) % bgRect.height;
                        break;
                }
                
                // Apply new position outside the image
                sprite.style.left = outsideX + 'px';
                sprite.style.top = outsideY + 'px';
                
                // Update selection indicator if this sprite is selected
                if (sprite === this.selectedSprite) {
                    this.updateSelectionIndicatorPosition(sprite, outsideX, outsideY);
                }
            }
        });
        
        if (movedCount > 0) {
            this.showFeedback('reset-outside-sprites', `Moved ${movedCount} sprites outside`, 'success');
            // Update sprite positions array
            this.updateSpritePositions();
        } else {
            this.showFeedback('reset-outside-sprites', 'No sprites were inside', 'success');
        }
    }
    
    showFeedback(buttonId, message, type = 'success') {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const originalText = button.textContent;
        const color = type === 'success' ? '#38a169' : '#e53e3e';
        
        button.textContent = message;
        button.style.background = color;
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }
    
    getSpritePositions() {
        return this.spritePositions;
    }
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Template Management Methods
    async loadAvailableTemplates() {
        try {
            await this.templateManager.loadAvailableTemplates();
            this.updateTemplateDropdown();
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }
    
    updateTemplateDropdown() {
        const select = document.getElementById('template-select');
        if (!select) return;
        
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add templates to dropdown
        const templates = this.templateManager.getLoadedTemplates();
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} (${template.sprites.length} sprites)`;
            select.appendChild(option);
        });
    }
    
    async loadSelectedTemplate() {
        const select = document.getElementById('template-select');
        if (!select || !select.value) {
            this.showFeedback('load-template', 'Please select a template', 'error');
            return;
        }
        
        try {
            const template = this.templateManager.getTemplateById(select.value);
            if (!template) {
                this.showFeedback('load-template', 'Template not found', 'error');
                return;
            }
            
            // Check if background exists
            const backgroundExists = await this.templateManager.checkBackgroundExists(template.background);
            if (!backgroundExists) {
                this.showFeedback('load-template', `Background ${template.background} not found`, 'error');
                return;
            }
            
            // Load the background first
            await this.loadTemplateBackground(template.background);
            
            // Apply sprite positions
            const result = await this.applySpritePositions(template.sprites);
            
            // Update current template reference
            this.currentTemplate = template;
            
            let message = `Loaded template: ${template.name}`;
            if (result.created > 0) message += `, created ${result.created}`;
            if (result.removed > 0) message += `, removed ${result.removed}`;
            
            // Refresh sprite event listeners after template loading
            this.refreshSpriteEventListeners();
            
            this.showFeedback('load-template', message, 'success');
            
        } catch (error) {
            console.error('Failed to load template:', error);
            this.showFeedback('load-template', `Error: ${error.message}`, 'error');
        }
    }
    
    async loadTemplateBackground(backgroundFilename) {
        // Dispatch event to request background change
        const backgroundChangeEvent = new CustomEvent('requestBackgroundChange', {
            detail: { background: backgroundFilename }
        });
        document.dispatchEvent(backgroundChangeEvent);
        
        // Wait a moment for the background to load
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    async saveCurrentTemplate() {
        const templateName = prompt('Enter template name:');
        if (!templateName || !templateName.trim()) {
            return;
        }
        
        try {
            // Use unified background element
            const backgroundImg = document.getElementById('background-image-left');
            if (!backgroundImg || !backgroundImg.src) {
                this.showFeedback('save-template', 'No background image loaded', 'error');
                return;
            }
            
            const backgroundFilename = backgroundImg.src.split('/').pop();
            
            // Create template from current state
            const template = this.templateManager.createTemplateFromCurrentState(
                templateName.trim(),
                backgroundFilename,
                this.spritePositions
            );
            
            // Generate JSON for manual saving
            const templateJson = this.templateManager.exportTemplateAsJson(template);
            
            // Show JSON in a modal or copy to clipboard
            this.showTemplateJson(templateName.trim(), templateJson);
            
        } catch (error) {
            console.error('Failed to save template:', error);
            this.showFeedback('save-template', `Error: ${error.message}`, 'error');
        }
    }
    
    showTemplateJson(templateName, templateJson) {
        // Create a modal to show the JSON
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 2000; display: flex; 
            align-items: center; justify-content: center;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white; padding: 1rem; border-radius: 8px; 
            max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;
        `;
        
        content.innerHTML = `
            <h3>Template JSON: ${templateName}</h3>
            <p>Save this JSON as <code>${templateName.toLowerCase().replace(/\s+/g, '_')}.json</code> in the templates folder:</p>
            <textarea readonly style="width: 100%; height: 300px; font-family: monospace; font-size: 0.8rem;">${templateJson}</textarea>
            <div style="margin-top: 1rem; text-align: right;">
                <button id="copy-template-json" style="margin-right: 0.5rem;">Copy JSON</button>
                <button id="close-template-modal">Close</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Event handlers
        document.getElementById('copy-template-json').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(templateJson);
                document.getElementById('copy-template-json').textContent = 'Copied!';
                setTimeout(() => {
                    if (document.getElementById('copy-template-json')) {
                        document.getElementById('copy-template-json').textContent = 'Copy JSON';
                    }
                }, 2000);
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
            }
        });
        
        document.getElementById('close-template-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    
    setOtherMode(otherMode) {
        this.otherMode = otherMode;
    }
    
    copyContentToLegacyBoard() {
        const leftBoard = document.getElementById('game-board-left');
        const legacyBoard = document.getElementById('legacy-game-board');
        const leftBackground = document.getElementById('background-image-left');
        const legacyBackground = document.getElementById('background-image');
        
        if (leftBackground && legacyBackground) {
            // Copy background image
            legacyBackground.src = leftBackground.src;
            legacyBackground.style.display = leftBackground.style.display;
            legacyBackground.style.width = leftBackground.style.width;
            legacyBackground.style.maxWidth = leftBackground.style.maxWidth;
            legacyBackground.style.height = leftBackground.style.height;
            legacyBackground.style.borderRadius = leftBackground.style.borderRadius;
        }
        
        // Clear existing sprites in legacy board
        if (legacyBoard) {
            const existingSprites = legacyBoard.querySelectorAll('.game-sprite');
            existingSprites.forEach(sprite => sprite.remove());
        }
        
        // Don't copy sprites automatically - only show them when "Place All Sprites" is clicked
        // This prevents the massive number of duplicate sprites from being shown in placement mode
    }
    
    clearLegacyBoard() {
        const legacyBoard = document.getElementById('legacy-game-board');
        if (legacyBoard) {
            // Remove all sprites from legacy board
            const existingSprites = legacyBoard.querySelectorAll('.game-sprite');
            existingSprites.forEach(sprite => sprite.remove());
            
            // Clear any difference markers
            const markers = legacyBoard.querySelectorAll('.difference-marker');
            markers.forEach(marker => marker.remove());
        }
    }
    
    clearAllSprites() {
        // Remove all sprites from the entire game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const allSprites = gameContainer.querySelectorAll('.game-sprite');
            allSprites.forEach(sprite => sprite.remove());
            
            // Clear any difference markers
            const allMarkers = gameContainer.querySelectorAll('.difference-marker');
            allMarkers.forEach(marker => marker.remove());
        }
        
        // Clear sprite positions in placement mode
        this.spritePositions = [];
        this.updatePositionDisplay(null);
    }
    
    copyBackgroundToLegacyBoard() {
        const leftBackground = document.getElementById('background-image-left');
        const legacyBackground = document.getElementById('background-image');
        
        if (leftBackground && legacyBackground) {
            // Copy background image properties only
            legacyBackground.src = leftBackground.src;
            legacyBackground.style.display = leftBackground.style.display;
            legacyBackground.style.width = leftBackground.style.width;
            legacyBackground.style.maxWidth = leftBackground.style.maxWidth;
            legacyBackground.style.height = leftBackground.style.height;
            legacyBackground.style.borderRadius = leftBackground.style.borderRadius;
        }
    }
    
    copyGameStateToPlacementMode() {
        // No need to copy backgrounds anymore since we use the same left-side structure
        
        // If there's an active template in the global game object, reference it
        if (window.game && window.game.currentTemplate) {
            this.currentTemplate = window.game.currentTemplate;
            console.log('Copied template reference to placement mode:', this.currentTemplate.name);
        }
    }
    
    storePlacementState() {
        // Update sprite positions before exiting
        this.updateSpritePositions();
        
        // Store the current sprite state for potential restoration
        const currentPositions = this.getSpritePositions();
        if (currentPositions.length > 0) {
            console.log(`Storing placement state: ${currentPositions.length} sprite positions`);
            // Could be stored in localStorage or passed to game instance
            sessionStorage.setItem('placementModeSprites', JSON.stringify(currentPositions));
        }
    }
    
    restoreGameMode() {
        // Trigger event to let the game know we're returning to game mode
        // The game can then decide how to handle sprite regeneration
        this.dispatchEvent('requestGameModeRestore', {
            fromPlacementMode: true,
            spritePositions: this.spritePositions
        });
    }
    
    // Test function for debugging drag-to-trash
    testDragToTrash() {
        console.log('=== TESTING DRAG TO TRASH ===');
        
        // Find first sprite and trash bin
        const sprite = document.querySelector('.game-sprite');
        const trashBin = document.getElementById('trash-bin');
        
        if (!sprite || !trashBin) {
            console.log('ERROR: Missing sprite or trash bin');
            console.log('sprite:', sprite);
            console.log('trashBin:', trashBin);
            return;
        }
        
        console.log('Found sprite:', sprite.src);
        console.log('Found trash bin:', trashBin);
        
        // Get positions
        const spriteRect = sprite.getBoundingClientRect();
        const trashRect = trashBin.getBoundingClientRect();
        
        console.log('Sprite rect:', spriteRect);
        console.log('Trash rect:', trashRect);
        
        // Simulate mousedown on sprite
        const startX = spriteRect.left + spriteRect.width / 2;
        const startY = spriteRect.top + spriteRect.height / 2;
        
        const endX = trashRect.left + trashRect.width / 2;
        const endY = trashRect.top + trashRect.height / 2;
        
        console.log('Start coordinates:', startX, startY);
        console.log('End coordinates:', endX, endY);
        
        // Create and dispatch mousedown event
        const mouseDownEvent = new MouseEvent('mousedown', {
            clientX: startX,
            clientY: startY,
            button: 0,
            bubbles: true,
            cancelable: true
        });
        
        console.log('Dispatching mousedown on sprite...');
        sprite.dispatchEvent(mouseDownEvent);
        
        // Wait a bit, then simulate mousemove over trash
        setTimeout(() => {
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: endX,
                clientY: endY,
                button: 0,
                bubbles: true,
                cancelable: true
            });
            
            console.log('Dispatching mousemove over trash...');
            document.dispatchEvent(mouseMoveEvent);
            
            // Wait a bit more, then simulate mouseup over trash
            setTimeout(() => {
                const mouseUpEvent = new MouseEvent('mouseup', {
                    clientX: endX,
                    clientY: endY,
                    button: 0,
                    bubbles: true,
                    cancelable: true
                });
                
                console.log('Dispatching mouseup over trash...');
                document.dispatchEvent(mouseUpEvent);
                
                // Check if sprite was deleted
                setTimeout(() => {
                    const remainingSprites = document.querySelectorAll('.game-sprite');
                    console.log('Sprites remaining after test:', remainingSprites.length);
                    
                    if (remainingSprites.length < 29) {
                        console.log('SUCCESS: Sprite was deleted!');
                    } else {
                        console.log('FAILURE: Sprite was not deleted');
                    }
                }, 100);
                
            }, 100);
        }, 100);
    }
}