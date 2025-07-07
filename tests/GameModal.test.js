import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameModal } from '../js/components/GameModal.js';

describe('GameModal', () => {
    let modal;
    let originalDocument;

    beforeEach(() => {
        // Mock DOM environment
        global.document = {
            createElement: vi.fn((tagName) => {
                const element = {
                    tagName,
                    className: '',
                    innerHTML: '',
                    style: {},
                    dataset: {},
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    appendChild: vi.fn(),
                    removeChild: vi.fn(),
                    querySelector: vi.fn(),
                    querySelectorAll: vi.fn(),
                    parentNode: null,
                    textContent: ''
                };
                
                // Mock specific query selectors
                if (tagName === 'div') {
                    element.querySelector = vi.fn((selector) => {
                        if (selector === '.game-modal-title' || 
                            selector === '.game-modal-message' ||
                            selector === '[data-action="confirm"]' ||
                            selector === '[data-action="cancel"]') {
                            return {
                                textContent: '',
                                style: { display: 'inline-block' },
                                addEventListener: vi.fn(),
                                focus: vi.fn()
                            };
                        }
                        return null;
                    });
                }
                
                return element;
            }),
            body: {
                appendChild: vi.fn(),
                removeChild: vi.fn()
            },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        modal = new GameModal();
    });

    afterEach(() => {
        if (modal) {
            modal.destroy();
        }
    });

    describe('constructor', () => {
        it('should create modal element and append to body', () => {
            expect(global.document.createElement).toHaveBeenCalledWith('div');
            expect(global.document.body.appendChild).toHaveBeenCalled();
        });

        it('should set up modal structure with correct classes', () => {
            expect(modal.modalElement.className).toBe('game-modal-overlay');
        });
    });

    describe('showAlert', () => {
        it('should show alert with correct title and message', async () => {
            const titleElement = { textContent: '' };
            const messageElement = { textContent: '' };
            const cancelButton = { style: { display: 'inline-block' } };
            const confirmButton = { textContent: '', focus: vi.fn() };

            modal.modalElement.querySelector = vi.fn((selector) => {
                if (selector === '.game-modal-title') return titleElement;
                if (selector === '.game-modal-message') return messageElement;
                if (selector === '[data-action="cancel"]') return cancelButton;
                if (selector === '[data-action="confirm"]') return confirmButton;
                return null;
            });

            // Mock the show method to resolve immediately
            modal.show = vi.fn().mockResolvedValue(true);

            const result = await modal.showAlert('Test Title', 'Test Message');

            expect(titleElement.textContent).toBe('Test Title');
            expect(messageElement.textContent).toBe('Test Message');
            expect(cancelButton.style.display).toBe('none');
            expect(confirmButton.textContent).toBe('OK');
            expect(result).toBe(true);
        });
    });

    describe('showConfirm', () => {
        it('should show confirm dialog with both buttons', async () => {
            const titleElement = { textContent: '' };
            const messageElement = { textContent: '' };
            const cancelButton = { style: { display: 'none' } };
            const confirmButton = { textContent: '', focus: vi.fn() };

            modal.modalElement.querySelector = vi.fn((selector) => {
                if (selector === '.game-modal-title') return titleElement;
                if (selector === '.game-modal-message') return messageElement;
                if (selector === '[data-action="cancel"]') return cancelButton;
                if (selector === '[data-action="confirm"]') return confirmButton;
                return null;
            });

            // Mock the show method to resolve immediately
            modal.show = vi.fn().mockResolvedValue(true);

            const result = await modal.showConfirm('Confirm Title', 'Confirm Message');

            expect(titleElement.textContent).toBe('Confirm Title');
            expect(messageElement.textContent).toBe('Confirm Message');
            expect(cancelButton.style.display).toBe('inline-block');
            expect(confirmButton.textContent).toBe('OK');
            expect(result).toBe(true);
        });
    });

    describe('close', () => {
        it('should hide modal and resolve with correct result', () => {
            const resolveFunction = vi.fn();
            modal.resolveFunction = resolveFunction;
            modal.modalElement.style = {};

            modal.close(true);

            expect(modal.modalElement.style.display).toBe('none');
            expect(resolveFunction).toHaveBeenCalledWith(true);
            expect(modal.resolveFunction).toBeNull();
        });

        it('should remove escape key listener', () => {
            modal.escapeHandler = vi.fn();
            modal.close(false);

            expect(global.document.removeEventListener).toHaveBeenCalledWith('keydown', modal.escapeHandler);
        });
    });

    describe('destroy', () => {
        it('should remove modal from DOM', () => {
            modal.modalElement.parentNode = { removeChild: vi.fn() };

            modal.destroy();

            expect(modal.modalElement.parentNode.removeChild).toHaveBeenCalledWith(modal.modalElement);
        });

        it('should handle case when modal has no parent', () => {
            modal.modalElement.parentNode = null;

            expect(() => modal.destroy()).not.toThrow();
        });
    });
});