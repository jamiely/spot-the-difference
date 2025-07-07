import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';

describe('Sprite Cleanup Between Levels', () => {
    let game;
    let mockGameBoard;
    let mockLeftBoard;
    let mockRightBoard;

    beforeEach(() => {
        // Mock DOM elements
        const createMockElement = (id, className = '') => ({
            id,
            className,
            style: { display: 'block' },
            appendChild: vi.fn(),
            removeChild: vi.fn(),
            remove: vi.fn(),
            querySelectorAll: vi.fn(() => []),
            querySelector: vi.fn(),
            addEventListener: vi.fn(),
            getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })),
            dataset: {},
            parentElement: null,
            parentNode: null
        });

        mockLeftBoard = createMockElement('game-board-left');
        mockRightBoard = createMockElement('game-board-right');
        mockGameBoard = createMockElement('game-container');

        // Mock document
        global.document = {
            getElementById: vi.fn((id) => {
                if (id === 'game-board-left') return mockLeftBoard;
                if (id === 'game-board-right') return mockRightBoard;
                if (id === 'game-container') return mockGameBoard;
                if (id === 'background-image-left') return createMockElement(id);
                if (id === 'background-image-right') return createMockElement(id);
                if (id === 'start-game') return createMockElement(id);
                if (id === 'reset-game') return createMockElement(id);
                if (id === 'score-count') return createMockElement(id);
                return createMockElement(id);
            }),
            querySelectorAll: vi.fn(() => []),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            body: {
                appendChild: vi.fn(),
                classList: { contains: vi.fn(() => false) }
            },
            createElement: vi.fn(() => {
                const element = createMockElement('div');
                element.querySelector = vi.fn((selector) => {
                    // Mock modal selectors
                    if (selector.includes('game-modal-title') || 
                        selector.includes('game-modal-message') ||
                        selector.includes('data-action')) {
                        return {
                            textContent: '',
                            style: { display: 'inline-block' },
                            addEventListener: vi.fn(),
                            focus: vi.fn()
                        };
                    }
                    return null;
                });
                return element;
            })
        };

        // Mock console methods
        global.console = {
            log: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        };

        game = new SpotTheDifferenceGame();
    });

    afterEach(() => {
        if (game && game.modal) {
            game.modal.destroy();
        }
    });

    describe('clearAllPreviousLevelData', () => {
        it('should clear sprites from both sprite managers', () => {
            const leftClearSpy = vi.spyOn(game.leftSpriteManager, 'clearSprites');
            const rightClearSpy = vi.spyOn(game.rightSpriteManager, 'clearSprites');

            game.clearAllPreviousLevelData();

            expect(leftClearSpy).toHaveBeenCalledOnce();
            expect(rightClearSpy).toHaveBeenCalledOnce();
        });

        it('should reset differences and foundDifferences arrays', () => {
            // Set up some mock data
            game.differences = [{ id: 'diff1' }, { id: 'diff2' }];
            game.foundDifferences = ['diff1'];

            game.clearAllPreviousLevelData();

            expect(game.differences).toEqual([]);
            expect(game.foundDifferences).toEqual([]);
        });

        it('should clear difference markers from DOM', () => {
            const clearMarkersSpy = vi.spyOn(game, 'clearDifferenceMarkers');

            game.clearAllPreviousLevelData();

            expect(clearMarkersSpy).toHaveBeenCalledOnce();
        });

        it('should call orphaned sprite and marker cleanup', () => {
            const clearOrphanedSpritesSpy = vi.spyOn(game, 'clearOrphanedSprites');
            const clearOrphanedMarkersSpy = vi.spyOn(game, 'clearOrphanedMarkers');

            game.clearAllPreviousLevelData();

            expect(clearOrphanedSpritesSpy).toHaveBeenCalledOnce();
            expect(clearOrphanedMarkersSpy).toHaveBeenCalledOnce();
        });
    });

    describe('clearOrphanedSprites', () => {
        it('should remove all game-sprite elements from both boards', () => {
            const leftSprite1 = { remove: vi.fn() };
            const leftSprite2 = { remove: vi.fn() };
            const rightSprite1 = { remove: vi.fn() };

            mockLeftBoard.querySelectorAll = vi.fn((selector) => {
                if (selector === '.game-sprite') return [leftSprite1, leftSprite2];
                return [];
            });

            mockRightBoard.querySelectorAll = vi.fn((selector) => {
                if (selector === '.game-sprite') return [rightSprite1];
                return [];
            });

            game.clearOrphanedSprites();

            expect(leftSprite1.remove).toHaveBeenCalledOnce();
            expect(leftSprite2.remove).toHaveBeenCalledOnce();
            expect(rightSprite1.remove).toHaveBeenCalledOnce();
        });

        it('should handle case when boards do not exist', () => {
            global.document.getElementById = vi.fn(() => null);

            expect(() => game.clearOrphanedSprites()).not.toThrow();
        });
    });

    describe('clearOrphanedMarkers', () => {
        it('should remove all difference-marker elements from document', () => {
            const marker1 = { remove: vi.fn() };
            const marker2 = { remove: vi.fn() };

            global.document.querySelectorAll = vi.fn((selector) => {
                if (selector === '.difference-marker') return [marker1, marker2];
                return [];
            });

            game.clearOrphanedMarkers();

            expect(marker1.remove).toHaveBeenCalledOnce();
            expect(marker2.remove).toHaveBeenCalledOnce();
        });
    });

    describe('loadNextLevel integration', () => {
        it('should call clearAllPreviousLevelData at the start of loadNextLevel', async () => {
            const clearSpy = vi.spyOn(game, 'clearAllPreviousLevelData');
            
            // Mock the level manager to return null (game complete)
            game.levelManager = {
                getNextLevel: vi.fn().mockResolvedValue(null)
            };
            
            game.handleGameComplete = vi.fn(); // Mock this to avoid modal issues

            await game.loadNextLevel();

            expect(clearSpy).toHaveBeenCalledOnce();
        });

        it('should clear data even in test mode', async () => {
            const clearSpy = vi.spyOn(game, 'clearAllPreviousLevelData');
            
            // Enable test mode
            game.isTestMode = true;
            game.loadTemplateForSpotTheDifference = vi.fn().mockResolvedValue();

            await game.loadNextLevel();

            expect(clearSpy).toHaveBeenCalledOnce();
        });
    });

    describe('sprite manager cleanup verification', () => {
        it('should ensure sprite managers properly clear their internal state', () => {
            // Add some mock sprites to the managers
            const mockSprite1 = { remove: vi.fn(), parentNode: { removeChild: vi.fn() } };
            const mockSprite2 = { remove: vi.fn(), parentNode: { removeChild: vi.fn() } };

            game.leftSpriteManager.activeSprites = [mockSprite1];
            game.rightSpriteManager.activeSprites = [mockSprite2];
            game.leftSpriteManager.spritePositions = [{ x: 10, y: 10 }];
            game.rightSpriteManager.spritePositions = [{ x: 20, y: 20 }];

            game.clearAllPreviousLevelData();

            // Verify sprite managers are cleared
            expect(game.leftSpriteManager.activeSprites).toEqual([]);
            expect(game.rightSpriteManager.activeSprites).toEqual([]);
            expect(game.leftSpriteManager.spritePositions).toEqual([]);
            expect(game.rightSpriteManager.spritePositions).toEqual([]);
        });
    });

    describe('difference state cleanup', () => {
        it('should clear all game state when transitioning levels', () => {
            // Set up some mock game state
            game.differences = [
                { id: 'diff1', centerX: 100, centerY: 100 },
                { id: 'diff2', centerX: 200, centerY: 200 }
            ];
            game.foundDifferences = ['diff1'];
            game.currentTemplate = { name: 'template1' };

            game.clearAllPreviousLevelData();

            expect(game.differences).toEqual([]);
            expect(game.foundDifferences).toEqual([]);
            // currentTemplate should be preserved as it's not part of the cleanup
            expect(game.currentTemplate).toBeTruthy();
        });
    });
});