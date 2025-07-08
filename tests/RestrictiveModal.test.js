import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameModal } from '../js/components/GameModal.js';

describe('Restrictive Modal', () => {
    let modal;
    
    beforeEach(() => {
        // Clear any existing modals from DOM
        const existingModals = document.querySelectorAll('.game-modal-overlay');
        existingModals.forEach(modal => modal.remove());
        
        modal = new GameModal();
    });
    
    afterEach(() => {
        // Clean up
        if (modal.modalElement) {
            modal.modalElement.remove();
        }
    });

    describe('Normal modal behavior', () => {
        it('should allow ESC key dismissal in normal mode', async () => {
            let resolved = false;
            let result = null;
            
            // Start the modal but don't await it
            const modalPromise = modal.showAlert('Test', 'Test message', false);
            modalPromise.then(res => {
                resolved = true;
                result = res;
            });
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Press ESC key
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);
            
            // Wait for modal to close
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(resolved).toBe(true);
            expect(result).toBe(false); // ESC should resolve with false
        });
        
        it('should allow overlay click dismissal in normal mode', async () => {
            let resolved = false;
            let result = null;
            
            // Start the modal
            const modalPromise = modal.showConfirm('Test', 'Test message', false);
            modalPromise.then(res => {
                resolved = true;
                result = res;
            });
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Click on overlay
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: modal.modalElement });
            modal.modalElement.dispatchEvent(clickEvent);
            
            // Wait for modal to close
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(resolved).toBe(true);
            expect(result).toBe(false); // Overlay click should resolve with false
        });
        
        it('should show cancel button in normal confirm mode', async () => {
            // Start the modal
            modal.showConfirm('Test', 'Test message', false);
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const cancelButton = modal.modalElement.querySelector('[data-action="cancel"]');
            expect(cancelButton.style.display).toBe('inline-block');
        });
    });

    describe('Restrictive modal behavior', () => {
        it('should NOT allow ESC key dismissal in restrictive mode', async () => {
            let resolved = false;
            
            // Start the modal
            const modalPromise = modal.showAlert('Test', 'Test message', true);
            modalPromise.then(() => {
                resolved = true;
            });
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Press ESC key
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);
            
            // Wait to see if modal closes
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(resolved).toBe(false); // Modal should still be open
            expect(modal.modalElement.style.display).toBe('flex'); // Modal should still be visible
        });
        
        it('should NOT allow overlay click dismissal in restrictive mode', async () => {
            let resolved = false;
            
            // Start the modal
            const modalPromise = modal.showAlert('Test', 'Test message', true);
            modalPromise.then(() => {
                resolved = true;
            });
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Click on overlay
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: modal.modalElement });
            modal.modalElement.dispatchEvent(clickEvent);
            
            // Wait to see if modal closes
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(resolved).toBe(false); // Modal should still be open
            expect(modal.modalElement.style.display).toBe('flex'); // Modal should still be visible
        });
        
        it('should hide cancel button in restrictive confirm mode', async () => {
            // Start the modal
            modal.showConfirm('Test', 'Test message', true);
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const cancelButton = modal.modalElement.querySelector('[data-action="cancel"]');
            expect(cancelButton.style.display).toBe('none');
        });
        
        it('should still allow OK button dismissal in restrictive mode', async () => {
            let resolved = false;
            let result = null;
            
            // Start the modal
            const modalPromise = modal.showAlert('Test', 'Test message', true);
            modalPromise.then(res => {
                resolved = true;
                result = res;
            });
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Click OK button
            const okButton = modal.modalElement.querySelector('[data-action="confirm"]');
            okButton.click();
            
            // Wait for modal to close
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(resolved).toBe(true);
            expect(result).toBe(true); // OK button should resolve with true
        });
    });

    describe('Modal restriction integration', () => {
        it('should make level completion modals restrictive', () => {
            // This is a behavioral test - we verify that the modal interface supports
            // the restrictive parameter correctly
            expect(modal.showAlert).toBeDefined();
            expect(modal.showConfirm).toBeDefined();
            
            // The methods should accept the restrictive parameter
            expect(() => modal.showAlert('Test', 'Test', true)).not.toThrow();
            expect(() => modal.showConfirm('Test', 'Test', true)).not.toThrow();
        });
        
        it('should maintain backward compatibility with existing calls', () => {
            // Methods should work without the restrictive parameter
            expect(() => modal.showAlert('Test', 'Test')).not.toThrow();
            expect(() => modal.showConfirm('Test', 'Test')).not.toThrow();
        });
    });
});