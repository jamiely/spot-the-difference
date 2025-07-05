export class DebugMenu {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '?') {
                e.preventDefault();
                this.toggleDebugMenu();
            } else if (e.key === 'Escape' && this.isVisible) {
                e.preventDefault();
                this.hideDebugMenu();
            }
        });
    }
    
    toggleDebugMenu() {
        if (this.isVisible) {
            this.hideDebugMenu();
        } else {
            this.showDebugMenu();
        }
    }
    
    showDebugMenu() {
        this.isVisible = true;
        this.createDebugMenuElement();
    }
    
    hideDebugMenu() {
        this.isVisible = false;
        const debugMenu = document.getElementById('debug-menu');
        if (debugMenu) {
            debugMenu.remove();
        }
    }
    
    createDebugMenuElement() {
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
                        <p>Debug menu placeholder</p>
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
    }
    
    setupDebugMenuListeners() {
        document.getElementById('debug-close').addEventListener('click', () => {
            this.hideDebugMenu();
        });
        
        // Click outside to close
        document.querySelector('.debug-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('debug-overlay')) {
                this.hideDebugMenu();
            }
        });
    }
}