interface GameInterface {
    backgroundLoader: {
        loadedBackgrounds: string[];
        loadAvailableBackgrounds(): Promise<void>;
    };
}

interface BackgroundChangeEvent extends CustomEvent {
    detail: {
        background: string;
    };
}

export class DebugMenu {
    private game: GameInterface;
    private isVisible: boolean = false;
    
    constructor(game: GameInterface) {
        this.game = game;
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === '?') {
                e.preventDefault();
                this.toggleDebugMenu();
            } else if (e.key === 'Escape' && this.isVisible) {
                e.preventDefault();
                this.hideDebugMenu();
            }
        });
    }
    
    private toggleDebugMenu(): void {
        if (this.isVisible) {
            this.hideDebugMenu();
        } else {
            this.showDebugMenu();
        }
    }
    
    private showDebugMenu(): void {
        this.isVisible = true;
        this.createDebugMenuElement();
    }
    
    private hideDebugMenu(): void {
        this.isVisible = false;
        const debugMenu = document.getElementById('debug-menu');
        if (debugMenu) {
            debugMenu.remove();
        }
    }
    
    private createDebugMenuElement(): void {
        // Remove existing debug menu if any
        this.hideDebugMenu();
        
        const debugMenu = document.createElement('div');
        debugMenu.id = 'debug-menu';
        debugMenu.innerHTML = `
            <div class="debug-overlay">
                <div class="debug-panel">
                    <div class="debug-header">
                        <h3>Debug Menu</h3>
                        <button id="debug-close" class="debug-close-btn">×</button>
                    </div>
                    <div class="debug-content">
                        <div class="debug-section">
                            <label for="background-select">Background:</label>
                            <div class="background-controls">
                                <select id="background-select">
                                    <option value="">Loading...</option>
                                </select>
                                <button id="load-background">Load</button>
                            </div>
                        </div>
                    </div>
                    <div class="debug-footer">
                        <small>Press "?" to toggle • ESC to close</small>
                    </div>
                </div>
            </div>
        `;
        
        // Add CSS styles
        debugMenu.innerHTML += `
            <style>
                .debug-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-family: Arial, sans-serif;
                }
                
                .debug-panel {
                    background: white;
                    color: #333;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    width: 400px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                
                .debug-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid #eee;
                    background: #f8f9fa;
                }
                
                .debug-header h3 {
                    margin: 0;
                    color: #333;
                    font-size: 16px;
                }
                
                .debug-close-btn {
                    background: none;
                    border: none;
                    color: #666;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .debug-close-btn:hover {
                    background: #eee;
                }
                
                .debug-content {
                    padding: 1rem;
                }
                
                .debug-section {
                    margin-bottom: 1rem;
                }
                
                .debug-section label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: bold;
                    color: #555;
                }
                
                .background-controls {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                
                .background-controls select {
                    flex: 1;
                    padding: 0.5rem;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                }
                
                .background-controls button {
                    padding: 0.5rem 1rem;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .background-controls button:hover {
                    background: #0056b3;
                }
                
                .background-controls button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                
                .debug-footer {
                    padding: 0.5rem 1rem;
                    border-top: 1px solid #eee;
                    background: #f8f9fa;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
            </style>
        `;
        
        document.body.appendChild(debugMenu);
        this.isVisible = true;
        
        // Set up event listeners for debug menu
        this.setupDebugMenuListeners();
        
        // Load available backgrounds
        this.loadAvailableBackgrounds();
    }
    
    private setupDebugMenuListeners(): void {
        const closeButton = document.getElementById('debug-close') as HTMLButtonElement;
        closeButton.addEventListener('click', () => {
            this.hideDebugMenu();
        });
        
        const loadButton = document.getElementById('load-background') as HTMLButtonElement;
        loadButton.addEventListener('click', () => {
            this.loadSelectedBackground();
        });
        
        // Click outside to close
        const overlay = document.querySelector('.debug-overlay') as HTMLElement;
        overlay.addEventListener('click', (e: MouseEvent) => {
            if (e.target === overlay) {
                this.hideDebugMenu();
            }
        });
    }
    
    private async loadAvailableBackgrounds(): Promise<void> {
        try {
            // Get available backgrounds from the game's background loader
            if (this.game.backgroundLoader && this.game.backgroundLoader.loadedBackgrounds) {
                this.populateBackgroundDropdown(this.game.backgroundLoader.loadedBackgrounds);
            } else {
                // Try to load backgrounds if not already loaded
                await this.game.backgroundLoader.loadAvailableBackgrounds();
                this.populateBackgroundDropdown(this.game.backgroundLoader.loadedBackgrounds);
            }
        } catch (error) {
            console.error('Failed to load available backgrounds:', error);
            this.populateBackgroundDropdown([]);
        }
    }
    
    private populateBackgroundDropdown(backgrounds: string[]): void {
        const select = document.getElementById('background-select') as HTMLSelectElement;
        const loadButton = document.getElementById('load-background') as HTMLButtonElement;
        
        // Clear existing options
        select.innerHTML = '';
        
        if (backgrounds.length === 0) {
            select.innerHTML = '<option value="">No backgrounds available</option>';
            loadButton.disabled = true;
            return;
        }
        
        // Add default option
        select.innerHTML = '<option value="">Select a background...</option>';
        
        // Add background options
        backgrounds.forEach(background => {
            const option = document.createElement('option');
            option.value = background;
            option.textContent = background.split('/').pop()?.replace(/\.[^/.]+$/, "") || background; // Remove extension
            select.appendChild(option);
        });
        
        loadButton.disabled = false;
    }
    
    private async loadSelectedBackground(): Promise<void> {
        const select = document.getElementById('background-select') as HTMLSelectElement;
        const selectedBackground = select.value;
        
        if (!selectedBackground) {
            alert('Please select a background first.');
            return;
        }
        
        try {
            console.log('Loading background:', selectedBackground);
            
            // Dispatch background change request event
            const event = new CustomEvent('requestBackgroundChange', {
                detail: { background: selectedBackground }
            }) as BackgroundChangeEvent;
            document.dispatchEvent(event);
            
            // Hide debug menu after loading
            this.hideDebugMenu();
            
        } catch (error) {
            console.error('Failed to load background:', error);
            alert('Failed to load background: ' + (error as Error).message);
        }
    }
}