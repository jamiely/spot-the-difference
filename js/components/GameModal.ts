/**
 * Modal component for game dialogs
 * Replaces alert() and confirm() with styled modal dialogs
 */
export class GameModal {
    private modalElement: HTMLElement;
    private resolveFunction: ((result: boolean) => void) | null = null;
    private escapeHandler: ((e: KeyboardEvent) => void) | null = null;
    private isRestrictive: boolean = false;

    constructor() {
        this.modalElement = null!;
        this.createModal();
    }

    private createModal(): void {
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
        this.modalElement.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.modalElement && !this.isRestrictive) {
                this.close(false); // Click on overlay closes modal with false (only if not restrictive)
            }
        });

        const confirmButton = this.modalElement.querySelector('[data-action="confirm"]') as HTMLButtonElement;
        confirmButton.addEventListener('click', () => {
            this.close(true);
        });

        const cancelButton = this.modalElement.querySelector('[data-action="cancel"]') as HTMLButtonElement;
        cancelButton.addEventListener('click', () => {
            this.close(false);
        });

        // Add to document but keep hidden
        document.body.appendChild(this.modalElement);
    }

    /**
     * Show alert-style modal (only OK button)
     */
    async showAlert(title: string, message: string, restrictive: boolean = false): Promise<boolean> {
        const titleElement = this.modalElement.querySelector('.game-modal-title') as HTMLElement;
        const messageElement = this.modalElement.querySelector('.game-modal-message') as HTMLElement;
        const cancelButton = this.modalElement.querySelector('[data-action="cancel"]') as HTMLButtonElement;
        const confirmButton = this.modalElement.querySelector('[data-action="confirm"]') as HTMLButtonElement;

        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // Hide cancel button for alerts
        cancelButton.style.display = 'none';
        confirmButton.textContent = 'OK';
        
        return this.show(restrictive);
    }

    /**
     * Show confirm-style modal (OK and Cancel buttons)
     */
    async showConfirm(title: string, message: string, restrictive: boolean = false): Promise<boolean> {
        const titleElement = this.modalElement.querySelector('.game-modal-title') as HTMLElement;
        const messageElement = this.modalElement.querySelector('.game-modal-message') as HTMLElement;
        const cancelButton = this.modalElement.querySelector('[data-action="cancel"]') as HTMLButtonElement;
        const confirmButton = this.modalElement.querySelector('[data-action="confirm"]') as HTMLButtonElement;

        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // Show/hide cancel button based on restrictive mode
        if (restrictive) {
            cancelButton.style.display = 'none';
        } else {
            cancelButton.style.display = 'inline-block';
        }
        confirmButton.textContent = 'OK';
        
        return this.show(restrictive);
    }

    /**
     * Show the modal and return a promise that resolves with user choice
     */
    private show(restrictive: boolean = false): Promise<boolean> {
        return new Promise((resolve) => {
            this.resolveFunction = resolve;
            this.isRestrictive = restrictive;
            this.modalElement.style.display = 'flex';
            
            // Focus the primary button
            setTimeout(() => {
                const confirmButton = this.modalElement.querySelector('[data-action="confirm"]') as HTMLButtonElement;
                confirmButton.focus();
            }, 100);

            // Handle ESC key (only if not restrictive)
            this.escapeHandler = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && !this.isRestrictive) {
                    this.close(false);
                }
            };
            document.addEventListener('keydown', this.escapeHandler);
        });
    }

    /**
     * Close the modal with the given result
     */
    private close(result: boolean): void {
        this.modalElement.style.display = 'none';
        
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
        
        if (this.resolveFunction) {
            this.resolveFunction(result);
            this.resolveFunction = null;
        }
    }

    /**
     * Destroy the modal component
     */
    destroy(): void {
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
    }
}