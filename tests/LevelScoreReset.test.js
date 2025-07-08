import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';

describe('Level Score Reset', () => {
    let game;
    let mockEventDispatch;

    beforeEach(() => {
        // Mock DOM elements required by the game
        document.body.innerHTML = `
            <button id="start-game">Start Game</button>
            <button id="reset-game">Reset</button>
            <div id="game-container"></div>
            <div class="game-boards">
                <div id="game-board-left" class="game-board">
                    <img id="background-image-left" alt="Game background left" style="display: none;">
                </div>
                <div id="game-board-right" class="game-board">
                    <img id="background-image-right" alt="Game background right" style="display: none;">
                </div>
            </div>
            <div id="legacy-game-board"></div>
            <span id="score-count">0</span>
        `;

        // Mock document.dispatchEvent to track events
        mockEventDispatch = vi.spyOn(document, 'dispatchEvent');
        
        // Create game instance
        game = new SpotTheDifferenceGame();
    });

    describe('Score reset on level start', () => {
        it('should reset score to 0 when starting a new level', () => {
            // Set up initial state with some found differences
            game.foundDifferences = ['diff1', 'diff2', 'diff3'];
            game.differences = ['diff1', 'diff2', 'diff3', 'diff4'];
            
            // Clear the mock calls from initialization
            mockEventDispatch.mockClear();
            
            // Call clearAllPreviousLevelData which should reset the score
            game.clearAllPreviousLevelData();
            
            // Verify that foundDifferences was reset
            expect(game.foundDifferences).toEqual([]);
            expect(game.differences).toEqual([]);
            
            // Verify that a differenceFound event was dispatched with totalFound: 0
            expect(mockEventDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'differenceFound',
                    detail: { totalFound: 0 }
                })
            );
        });

        it('should reset score when loadNextLevel is called', async () => {
            // Set up initial state with some found differences
            game.foundDifferences = ['diff1', 'diff2'];
            
            // Mock level manager to return a test level
            game.levelManager = {
                getNextLevel: vi.fn().mockResolvedValue({
                    type: 'template',
                    data: { name: 'Test Template', background: 'test.png' },
                    levelInfo: { description: 'Test Level' }
                })
            };
            
            // Mock the template setup method to avoid complex setup
            game.setupSideBySideGame = vi.fn().mockResolvedValue();
            game.displayLevelInfo = vi.fn();
            
            // Clear the mock calls from initialization
            mockEventDispatch.mockClear();
            
            // Call loadNextLevel
            await game.loadNextLevel();
            
            // Verify that foundDifferences was reset
            expect(game.foundDifferences).toEqual([]);
            
            // Verify that a differenceFound event was dispatched with totalFound: 0
            expect(mockEventDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'differenceFound',
                    detail: { totalFound: 0 }
                })
            );
        });

        it('should maintain score consistency during level progression', () => {
            // Simulate finding differences in a level
            game.differences = ['diff1', 'diff2', 'diff3'];
            game.foundDifferences = ['diff1', 'diff2'];
            
            // Clear mock calls
            mockEventDispatch.mockClear();
            
            // Find another difference
            game.foundDifferences.push('diff3');
            document.dispatchEvent(new CustomEvent('differenceFound', {
                detail: { totalFound: game.foundDifferences.length }
            }));
            
            // Verify score is 3
            expect(mockEventDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { totalFound: 3 }
                })
            );
            
            // Clear mock calls
            mockEventDispatch.mockClear();
            
            // Start new level
            game.clearAllPreviousLevelData();
            
            // Verify score is reset to 0
            expect(game.foundDifferences).toEqual([]);
            expect(mockEventDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { totalFound: 0 }
                })
            );
        });
    });

    describe('Score display integration', () => {
        it('should work with ScoreDisplay component', () => {
            // Score element is already in DOM from beforeEach
            
            // Mock ScoreDisplay behavior
            const mockScoreUpdate = vi.fn();
            
            // Listen for differenceFound events
            document.addEventListener('differenceFound', (e) => {
                mockScoreUpdate(e.detail.totalFound);
            });
            
            // Clear all previous level data
            game.clearAllPreviousLevelData();
            
            // Verify score update was called with 0
            expect(mockScoreUpdate).toHaveBeenCalledWith(0);
        });
    });
});