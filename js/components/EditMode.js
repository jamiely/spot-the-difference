import { ViewManager } from '../utils/ViewManager.js';

export class EditMode {
    constructor() {
        this.isActive = false;
        this.boundingBoxes = [];
        this.currentBox = null;
        this.isDrawing = false;
        this.startPoint = { x: 0, y: 0 };
        this.otherMode = null; // Reference to placement mode for mutual exclusivity
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'E' || e.key === 'e') {
                this.toggleEditMode();
            }
        });
    }
    
    toggleEditMode() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            // Exit other mode if active (mutual exclusivity)
            if (this.otherMode && this.otherMode.isActive) {
                console.log('Exiting placement mode for edit mode - preventing game restoration');
                this.otherMode.isActive = false;
                // Call internal exit without triggering game restoration
                this.otherMode.hidePlacementInterface();
                this.otherMode.disableSpriteDragging();
                this.otherMode.clearSpriteSelection();
                this.otherMode.stopKeyRepeat();
                document.body.classList.remove('placement-mode');
                this.otherMode.clearDragState();
            }
            this.enterEditMode();
        } else {
            this.exitEditMode();
        }
        
        this.dispatchEvent('editModeToggled', { isActive: this.isActive });
    }
    
    enterEditMode() {
        console.log('Entering edit mode');
        ViewManager.switchToSingleView();
        this.removeAllSprites();
        this.addBackgroundListeners();
        this.showEditInterface();
        this.createVisualBoxes(); // Show existing bounding boxes
        document.body.classList.add('edit-mode');
    }
    
    exitEditMode() {
        console.log('Exiting edit mode');
        ViewManager.switchToSideBySideView();
        this.removeBackgroundListeners();
        this.hideEditInterface();
        this.clearVisualBoxes(); // Hide bounding box visuals
        document.body.classList.remove('edit-mode');
        this.clearCurrentBox();
    }
    
    addBackgroundListeners() {
        const backgroundImg = ViewManager.getBackgroundImage();
        if (backgroundImg) {
            backgroundImg.addEventListener('mousedown', this.handleMouseDown.bind(this));
            backgroundImg.style.cursor = 'crosshair';
            console.log('Added edit mode listeners to background image');
        } else {
            console.warn('Background image not found for edit mode');
        }
        
        // Add global listeners for mouse move and up to handle dragging across elements
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    removeBackgroundListeners() {
        const backgroundImg = ViewManager.getBackgroundImage();
        if (backgroundImg) {
            backgroundImg.removeEventListener('mousedown', this.handleMouseDown.bind(this));
            backgroundImg.style.cursor = 'default';
        }
        
        // Remove global listeners
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleMouseDown(e) {
        if (!this.isActive) return;
        
        e.preventDefault();
        this.isDrawing = true;
        
        // Disable pointer events on existing boxes while drawing
        this.disableExistingBoxEvents();
        
        const backgroundImg = e.target;
        const imgRect = backgroundImg.getBoundingClientRect();
        
        // Store coordinates relative to the background image
        this.startPoint = {
            x: e.clientX - imgRect.left,
            y: e.clientY - imgRect.top
        };
        
        // For visual display, we still need container-relative coordinates
        const containerRect = backgroundImg.parentElement.getBoundingClientRect();
        const relativeX = imgRect.left - containerRect.left;
        const relativeY = imgRect.top - containerRect.top;
        
        this.createCurrentBox(
            relativeX + this.startPoint.x, 
            relativeY + this.startPoint.y, 
            0, 0
        );
    }
    
    handleMouseMove(e) {
        if (!this.isActive || !this.isDrawing) return;
        
        e.preventDefault();
        const backgroundImg = ViewManager.getBackgroundImage();
        if (!backgroundImg) {
            console.warn('Background image not found during mouse move');
            return;
        }
        
        const imgRect = backgroundImg.getBoundingClientRect();
        
        // Current point relative to background image
        const currentPoint = {
            x: e.clientX - imgRect.left,
            y: e.clientY - imgRect.top
        };
        
        // Calculate dimensions relative to background image
        const width = Math.abs(currentPoint.x - this.startPoint.x);
        const height = Math.abs(currentPoint.y - this.startPoint.y);
        const left = Math.min(this.startPoint.x, currentPoint.x);
        const top = Math.min(this.startPoint.y, currentPoint.y);
        
        // For visual display, convert to container-relative coordinates
        const containerRect = backgroundImg.parentElement.getBoundingClientRect();
        const relativeX = imgRect.left - containerRect.left;
        const relativeY = imgRect.top - containerRect.top;
        
        this.updateCurrentBox(
            relativeX + left, 
            relativeY + top, 
            width, 
            height
        );
    }
    
    handleMouseUp(e) {
        if (!this.isActive || !this.isDrawing) return;
        
        e.preventDefault();
        this.isDrawing = false;
        
        // Re-enable pointer events on existing boxes after drawing
        this.enableExistingBoxEvents();
        
        if (this.currentBox && this.currentBox.width > 10 && this.currentBox.height > 10) {
            this.finalizeBoundingBox();
        } else {
            this.clearCurrentBox();
        }
    }
    
    createCurrentBox(x, y, width, height) {
        this.clearCurrentBox();
        
        const box = document.createElement('div');
        box.className = 'bounding-box current-box';
        box.style.left = x + 'px';
        box.style.top = y + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';
        
        const backgroundImg = ViewManager.getBackgroundImage();
        const container = ViewManager.getContainer();
        container.appendChild(box);
        
        this.currentBox = { element: box, displayX: x, displayY: y, width, height };
    }
    
    updateCurrentBox(x, y, width, height) {
        if (this.currentBox) {
            this.currentBox.element.style.left = x + 'px';
            this.currentBox.element.style.top = y + 'px';
            this.currentBox.element.style.width = width + 'px';
            this.currentBox.element.style.height = height + 'px';
            
            this.currentBox.displayX = x;
            this.currentBox.displayY = y;
            this.currentBox.width = width;
            this.currentBox.height = height;
        }
    }
    
    finalizeBoundingBox() {
        if (this.currentBox) {
            // Convert display coordinates back to background-image-relative coordinates
            const backgroundImg = ViewManager.getBackgroundImage();
            const container = ViewManager.getContainer();
            const imgRect = backgroundImg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const relativeX = imgRect.left - containerRect.left;
            const relativeY = imgRect.top - containerRect.top;
            
            const boundingBox = {
                id: Date.now(),
                x: this.currentBox.displayX - relativeX,
                y: this.currentBox.displayY - relativeY,
                width: this.currentBox.width,
                height: this.currentBox.height
            };
            
            this.boundingBoxes.push(boundingBox);
            this.currentBox.element.classList.remove('current-box');
            this.currentBox.element.classList.add('finalized-box');
            this.currentBox.element.addEventListener('dblclick', () => {
                this.removeBoundingBox(boundingBox.id);
            });
            
            this.currentBox = null;
            this.updateJsonExport();
            
            console.log('=== BOUNDING BOX FINALIZED ===');
            console.log('Added bounding box:', boundingBox);
            console.log('Total boxes now:', this.boundingBoxes.length);
        }
    }
    
    clearCurrentBox() {
        if (this.currentBox) {
            this.currentBox.element.remove();
            this.currentBox = null;
        }
    }
    
    removeBoundingBox(id) {
        this.boundingBoxes = this.boundingBoxes.filter(box => box.id !== id);
        
        const elements = document.querySelectorAll('.bounding-box');
        elements.forEach(el => {
            if (el.dataset.id === String(id)) {
                el.remove();
            }
        });
        
        this.updateJsonExport();
    }
    
    showEditInterface() {
        let editPanel = document.getElementById('edit-panel');
        if (!editPanel) {
            editPanel = document.createElement('div');
            editPanel.id = 'edit-panel';
            editPanel.innerHTML = `
                <h3>Edit Mode (Press E to exit)</h3>
                <p>Drag on the background to create bounding boxes. Double-click boxes to remove them.</p>
                <div id="background-info" style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem; display: none;"></div>
                <label for="bounding-boxes-json">Bounding Boxes JSON:</label>
                <textarea id="bounding-boxes-json" rows="10"></textarea>
                <div class="edit-buttons">
                    <button id="copy-json">Copy JSON</button>
                    <button id="load-json">Load JSON</button>
                    <button id="clear-boxes">Clear All Boxes</button>
                </div>
            `;
            document.getElementById('game-container').appendChild(editPanel);
            
            document.getElementById('copy-json').addEventListener('click', () => {
                this.copyJsonToClipboard();
            });
            
            document.getElementById('load-json').addEventListener('click', () => {
                this.loadJsonFromTextarea();
            });
            
            document.getElementById('clear-boxes').addEventListener('click', () => {
                this.clearAllBoxes();
            });
        }
        editPanel.style.display = 'block';
        this.updateJsonExport();
        this.updateBackgroundInfo();
    }
    
    hideEditInterface() {
        const editPanel = document.getElementById('edit-panel');
        if (editPanel) {
            editPanel.style.display = 'none';
        }
    }
    
    clearAllBoxes() {
        this.boundingBoxes = [];
        document.querySelectorAll('.bounding-box').forEach(el => el.remove());
        this.updateJsonExport();
    }
    
    clearVisualBoxes() {
        // Only remove visual elements, keep the bounding boxes data
        document.querySelectorAll('.bounding-box').forEach(el => el.remove());
    }
    
    disableExistingBoxEvents() {
        document.querySelectorAll('.bounding-box.finalized-box').forEach(el => {
            el.style.pointerEvents = 'none';
        });
    }
    
    enableExistingBoxEvents() {
        document.querySelectorAll('.bounding-box.finalized-box').forEach(el => {
            el.style.pointerEvents = 'auto';
        });
    }
    
    updateJsonExport() {
        const textarea = document.getElementById('bounding-boxes-json');
        if (textarea) {
            textarea.value = JSON.stringify(this.boundingBoxes, null, 2);
            console.log('=== JSON EXPORT UPDATED ===');
            console.log('Bounding boxes count:', this.boundingBoxes.length);
            console.log('JSON preview:', this.boundingBoxes.slice(0, 2)); // Show first 2 boxes
        } else {
            console.warn('Bounding boxes JSON textarea not found');
        }
    }

    updateBackgroundInfo() {
        const backgroundInfo = document.getElementById('background-info');
        const backgroundImg = ViewManager.getBackgroundImage();
        
        if (backgroundInfo && backgroundImg && backgroundImg.src) {
            const filename = backgroundImg.src.split('/').pop();
            const boxCount = this.boundingBoxes.length;
            
            if (boxCount > 0) {
                backgroundInfo.textContent = `Background: ${filename} (${boxCount} bounding boxes loaded)`;
                backgroundInfo.style.display = 'block';
            } else {
                backgroundInfo.style.display = 'none';
            }
        }
    }
    
    getBoundingBoxes() {
        return this.boundingBoxes;
    }
    
    setBoundingBoxes(boxes) {
        this.clearAllBoxes();
        this.boundingBoxes = boxes || [];
        
        // If not in edit mode, don't create visual boxes
        if (this.isActive) {
            this.createVisualBoxes();
        }
        
        this.updateJsonExport();
    }
    
    async copyJsonToClipboard() {
        const textarea = document.getElementById('bounding-boxes-json');
        if (textarea && textarea.value) {
            try {
                await navigator.clipboard.writeText(textarea.value);
                this.showCopyFeedback('JSON copied to clipboard!');
            } catch (err) {
                // Fallback for browsers that don't support clipboard API
                textarea.select();
                document.execCommand('copy');
                this.showCopyFeedback('JSON copied to clipboard!');
            }
        } else {
            this.showCopyFeedback('No bounding boxes to copy');
        }
    }
    
    loadJsonFromTextarea() {
        const textarea = document.getElementById('bounding-boxes-json');
        if (!textarea || !textarea.value.trim()) {
            this.showLoadFeedback('No JSON to load', 'error');
            return;
        }
        
        try {
            const jsonData = JSON.parse(textarea.value);
            
            if (!Array.isArray(jsonData)) {
                throw new Error('JSON must be an array');
            }
            
            // Validate each bounding box has required properties
            for (let i = 0; i < jsonData.length; i++) {
                const box = jsonData[i];
                if (typeof box.x !== 'number' || typeof box.y !== 'number' || 
                    typeof box.width !== 'number' || typeof box.height !== 'number') {
                    throw new Error(`Bounding box ${i} missing required properties (x, y, width, height)`);
                }
            }
            
            // Clear existing boxes and load new ones
            this.clearAllBoxes();
            this.boundingBoxes = jsonData.map(box => ({
                ...box,
                id: box.id || Date.now() + Math.random() // Ensure each box has an ID
            }));
            
            // Create visual representations of the loaded boxes
            this.createVisualBoxes();
            this.updateJsonExport();
            
            this.showLoadFeedback(`Loaded ${jsonData.length} bounding boxes`, 'success');
            
        } catch (error) {
            console.error('Failed to load JSON:', error);
            this.showLoadFeedback(`Invalid JSON: ${error.message}`, 'error');
        }
    }
    
    createVisualBoxes() {
        // Create visual elements for all loaded bounding boxes
        const backgroundImg = ViewManager.getBackgroundImage();
        const container = ViewManager.getContainer();
        if (!backgroundImg || !container) {
            console.warn('Background image or container not found for visual boxes');
            return;
        }
        
        const imgRect = backgroundImg.getBoundingClientRect();
        const containerRect = backgroundImg.parentElement.getBoundingClientRect();
        const relativeX = imgRect.left - containerRect.left;
        const relativeY = imgRect.top - containerRect.top;
        
        this.boundingBoxes.forEach(boundingBox => {
            const box = document.createElement('div');
            box.className = 'bounding-box finalized-box';
            box.dataset.id = boundingBox.id;
            
            // Convert from background-relative to container-relative coordinates for display
            box.style.left = (relativeX + boundingBox.x) + 'px';
            box.style.top = (relativeY + boundingBox.y) + 'px';
            box.style.width = boundingBox.width + 'px';
            box.style.height = boundingBox.height + 'px';
            
            box.addEventListener('dblclick', () => {
                this.removeBoundingBox(boundingBox.id);
            });
            
            container.appendChild(box);
        });
    }
    
    showCopyFeedback(message) {
        const button = document.getElementById('copy-json');
        const originalText = button.textContent;
        
        button.textContent = message;
        button.style.background = '#38a169';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }
    
    showLoadFeedback(message, type = 'success') {
        const button = document.getElementById('load-json');
        const originalText = button.textContent;
        const color = type === 'success' ? '#38a169' : '#e53e3e';
        
        button.textContent = message;
        button.style.background = color;
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 3000);
    }
    
    setOtherMode(otherMode) {
        this.otherMode = otherMode;
    }
    
    removeAllSprites() {
        // Remove all sprites from the container to provide a clean background for bounding box editing
        const container = ViewManager.getContainer();
        if (container) {
            const sprites = container.querySelectorAll('.game-sprite');
            console.log(`Removing ${sprites.length} sprites for edit mode`);
            sprites.forEach(sprite => sprite.remove());
        } else {
            console.warn('Container not found when trying to remove sprites');
        }
    }
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
}