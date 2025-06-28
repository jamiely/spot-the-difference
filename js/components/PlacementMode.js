import { SPRITE_CONFIG } from '../config/SpriteConfig.js';

export class PlacementMode {
    constructor() {
        this.isActive = false;
        this.spritePositions = [];
        this.draggedSprite = null;
        this.dragOffset = { x: 0, y: 0 };
        this.selectedSprite = null; // Track the currently selected sprite
        this.keyRepeatTimer = null; // For holding arrow keys
        this.keyRepeatDelay = 150; // Milliseconds between repeats
        
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
                this.handleArrowKeys(e);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.isActive && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                this.stopKeyRepeat();
            }
        });
    }
    
    togglePlacementMode() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.enterPlacementMode();
        } else {
            this.exitPlacementMode();
        }
        
        this.dispatchEvent('placementModeToggled', { isActive: this.isActive });
    }
    
    enterPlacementMode() {
        console.log('Entering placement mode');
        this.enableSpriteDragging();
        this.showPlacementInterface();
        document.body.classList.add('placement-mode');
    }
    
    exitPlacementMode() {
        console.log('Exiting placement mode');
        this.disableSpriteDragging();
        this.hidePlacementInterface();
        this.clearSpriteSelection(); // Clear any selected sprite
        this.stopKeyRepeat(); // Clear any active key repeat
        document.body.classList.remove('placement-mode');
        this.clearDragState();
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
        
        console.log('Started dragging sprite:', this.draggedSprite.src);
    }
    
    handleMouseMove(e) {
        if (!this.isActive || !this.draggedSprite) return;
        
        e.preventDefault();
        
        const container = document.getElementById('game-container');
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
        
        // Check if hovering over trash bin and add visual feedback
        const trashBin = document.getElementById('trash-bin');
        if (trashBin) {
            const trashRect = trashBin.getBoundingClientRect();
            const isOverTrash = e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
                               e.clientY >= trashRect.top && e.clientY <= trashRect.bottom;
            
            if (isOverTrash) {
                trashBin.classList.add('trash-hover');
            } else {
                trashBin.classList.remove('trash-hover');
            }
        }
        
        console.log(`Moving sprite to: ${newX}, ${newY}`);
    }
    
    handleMouseUp(e) {
        if (!this.isActive || !this.draggedSprite) return;
        
        e.preventDefault();
        
        // Check if dropped on trash bin
        const trashBin = document.getElementById('trash-bin');
        const trashRect = trashBin ? trashBin.getBoundingClientRect() : null;
        
        if (trashRect && 
            e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
            e.clientY >= trashRect.top && e.clientY <= trashRect.bottom) {
            
            // Handle trash drop
            this.handleTrashDrop(e);
            return;
        }
        
        // Normal drop - position the sprite
        const container = document.getElementById('game-container');
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
        
        console.log(`Final sprite position: ${finalX}, ${finalY}`);
        
        // Clean up trash hover state (reuse trashBin from above)
        if (trashBin) {
            trashBin.classList.remove('trash-hover');
        }
        
        this.clearDragState();
    }
    
    clearDragState() {
        this.draggedSprite = null;
        this.dragOffset = { x: 0, y: 0 };
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
    }
    
    clearSpriteSelection() {
        if (this.selectedSprite) {
            this.removeSelectionIndicator(this.selectedSprite);
            this.selectedSprite = null;
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
        const backgroundImg = document.getElementById('background-image');
        
        if (!backgroundImg) {
            console.warn('Background image not found for position calculation');
            return;
        }
        
        const imgRect = backgroundImg.getBoundingClientRect();
        const containerRect = backgroundImg.parentElement.getBoundingClientRect();
        const relativeX = imgRect.left - containerRect.left;
        const relativeY = imgRect.top - containerRect.top;
        
        this.spritePositions = Array.from(sprites).map((sprite, index) => {
            const spriteRect = sprite.getBoundingClientRect();
            const containerX = spriteRect.left - containerRect.left;
            const containerY = spriteRect.top - containerRect.top;
            
            // Convert to background-relative coordinates
            const backgroundX = containerX - relativeX;
            const backgroundY = containerY - relativeY;
            
            // Calculate actual sprite size based on container
            const actualSpriteSize = SPRITE_CONFIG.getSizeInPixels(
                containerRect.width, 
                containerRect.height
            );
            
            return {
                id: `sprite_${index}`,
                src: sprite.src.split('/').pop(), // Get filename only
                x: Math.round(backgroundX),
                y: Math.round(backgroundY),
                width: actualSpriteSize,
                height: actualSpriteSize
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
                <div class="placement-actions">
                    <button id="place-all-sprites">Place All Sprites</button>
                </div>
                <label for="sprite-positions-json">Sprite Positions JSON:</label>
                <textarea id="sprite-positions-json" rows="8"></textarea>
                <div class="placement-buttons">
                    <button id="copy-positions">Copy JSON</button>
                    <button id="load-positions">Load JSON</button>
                    <button id="clear-positions">Clear All</button>
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
            
            document.getElementById('place-all-sprites').addEventListener('click', () => {
                this.placeAllSprites();
            });
        }
        
        // Create trash bin
        this.createTrashBin();
        
        placementPanel.style.display = 'block';
        this.updateSpritePositions(); // Initialize positions
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
    
    loadJsonFromTextarea() {
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
            
            this.applySpritePositions(jsonData);
            this.showFeedback('load-positions', `Loaded ${jsonData.length} positions`, 'success');
            
        } catch (error) {
            console.error('Failed to load JSON:', error);
            this.showFeedback('load-positions', `Invalid JSON: ${error.message}`, 'error');
        }
    }
    
    applySpritePositions(positions) {
        const sprites = document.querySelectorAll('.game-sprite');
        const backgroundImg = document.getElementById('background-image');
        
        if (!backgroundImg) {
            console.warn('Background image not found for position application');
            return;
        }
        
        const imgRect = backgroundImg.getBoundingClientRect();
        const containerRect = backgroundImg.parentElement.getBoundingClientRect();
        const relativeX = imgRect.left - containerRect.left;
        const relativeY = imgRect.top - containerRect.top;
        
        // Apply positions to matching sprites
        positions.forEach(position => {
            // Find sprite by src filename
            const matchingSprite = Array.from(sprites).find(sprite => 
                sprite.src.endsWith(position.src)
            );
            
            if (matchingSprite) {
                // Convert from background-relative to container-relative coordinates
                const containerX = relativeX + position.x;
                const containerY = relativeY + position.y;
                
                matchingSprite.style.left = containerX + 'px';
                matchingSprite.style.top = containerY + 'px';
            }
        });
        
        // Update our internal positions array
        this.updateSpritePositions();
    }
    
    clearAllPositions() {
        // This would require regenerating sprites or resetting to default positions
        // For now, just clear the JSON
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
        e.preventDefault();
        e.currentTarget.classList.remove('trash-hover');
        
        if (this.draggedSprite) {
            console.log('Deleting sprite:', this.draggedSprite.src);
            
            // Remove sprite from DOM
            this.draggedSprite.remove();
            
            // Update positions and clear drag state
            this.updateSpritePositions();
            this.clearDragState();
            
            this.showTrashFeedback('Sprite deleted');
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
                return;
            }
            
            // Check again in 100ms
            setTimeout(checkSprites, 100);
        };
        
        // Start checking after initial delay
        setTimeout(checkSprites, 300);
    }
    
    placeAllSprites() {
        // Clear current selection since sprites will be regenerated
        this.clearSpriteSelection();
        
        // Dispatch event to request fresh sprite placement with all sprites
        this.dispatchEvent('requestSpriteGeneration', { useAllSprites: true });
        this.showFeedback('place-all-sprites', 'Placing all sprites...', 'success');
        
        // Re-enable sprite dragging after sprites are regenerated
        // Use longer delay and poll for completion
        this.waitForSpritesAndRefresh();
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
}