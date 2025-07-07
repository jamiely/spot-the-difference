/**
 * Modal component for game dialogs
 * Replaces alert() and confirm() with styled modal dialogs
 */
export class GameModal {
    constructor() {
        this.modalElement = null;
        this.createModal();
    }

    createModal() {
        // Create modal HTML structure
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'game-modal-overlay';
        this.modalElement.innerHTML = `
            <div class="game-modal">
                <div class="game-modal-header">
                    <h3 class="game-modal-title"></h3>
                </div>
                <div class="game-modal-body">
                    <p class="game-modal-message"></p>
                </div>
                <div class="game-modal-footer">
                    <button class="game-modal-btn game-modal-btn-primary" data-action="confirm">OK</button>
                    <button class="game-modal-btn game-modal-btn-secondary" data-action="cancel">Cancel</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close(false); // Click on overlay closes modal with false
            }
        });

        this.modalElement.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            this.close(true);
        });

        this.modalElement.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            this.close(false);
        });

        // Add to document but keep hidden
        document.body.appendChild(this.modalElement);
    }

    /**
     * Show alert-style modal (only OK button)
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @returns {Promise<boolean>} Always resolves to true for alerts
     */
    async showAlert(title, message) {
        this.modalElement.querySelector('.game-modal-title').textContent = title;
        this.modalElement.querySelector('.game-modal-message').textContent = message;
        
        // Hide cancel button for alerts
        this.modalElement.querySelector('[data-action="cancel"]').style.display = 'none';
        this.modalElement.querySelector('[data-action="confirm"]').textContent = 'OK';
        
        return this.show();
    }

    /**
     * Show confirm-style modal (OK and Cancel buttons)
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
     */
    async showConfirm(title, message) {
        this.modalElement.querySelector('.game-modal-title').textContent = title;
        this.modalElement.querySelector('.game-modal-message').textContent = message;
        
        // Show both buttons for confirms
        this.modalElement.querySelector('[data-action="cancel"]').style.display = 'inline-block';
        this.modalElement.querySelector('[data-action="confirm"]').textContent = 'OK';
        
        return this.show();
    }

    /**
     * Show the modal and return a promise that resolves with user choice
     * @returns {Promise<boolean>}
     */
    show() {
        return new Promise((resolve) => {
            this.resolveFunction = resolve;
            this.modalElement.style.display = 'flex';
            
            // Focus the primary button
            setTimeout(() => {
                this.modalElement.querySelector('[data-action="confirm"]').focus();
            }, 100);

            // Handle ESC key
            this.escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close(false);
                }
            };
            document.addEventListener('keydown', this.escapeHandler);
        });
    }

    /**
     * Close the modal with the given result
     * @param {boolean} result - The result to resolve the promise with
     */
    close(result) {
        this.modalElement.style.display = 'none';
        document.removeEventListener('keydown', this.escapeHandler);
        
        if (this.resolveFunction) {
            this.resolveFunction(result);
            this.resolveFunction = null;
        }
    }

    /**
     * Destroy the modal component
     */
    destroy() {
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
    }
}