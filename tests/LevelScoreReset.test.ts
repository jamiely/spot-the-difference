import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';
import type { LevelData, TemplateData } from '../src/types/index.js';
import type { LevelManager } from '../js/components/LevelManager.js';

// Mock level manager interface
interface MockLevelManager {
    getNextLevel: ReturnType<typeof vi.fn>;
}

// Mock event dispatch function
type MockEventDispatch = ReturnType<typeof vi.fn>;

describe('Level Score Reset', () => {
    let game: SpotTheDifferenceGame;
    let mockEventDispatch: MockEventDispatch;

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
            (game as any).foundDifferences = ['diff1', 'diff2', 'diff3'];
            (game as any).differences = ['diff1', 'diff2', 'diff3', 'diff4'];
            
            // Clear the mock calls from initialization
            mockEventDispatch.mockClear();
            
            // Call clearAllPreviousLevelData which should reset the score
            (game as any).clearAllPreviousLevelData();
            
            // Verify that foundDifferences was reset
            expect((game as any).foundDifferences).toEqual([]);
            expect((game as any).differences).toEqual([]);
            
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
            (game as any).foundDifferences = ['diff1', 'diff2'];
            
            // Mock level manager to return a test level
            const templateData: TemplateData = { 
                id: 'template1', 
                name: 'Test Template', 
                background: 'test.png', 
                sprites: [] 
            };
            const levelData: LevelData = {
                type: 'template',
                data: templateData,
                levelInfo: { description: 'Test Level', current: 1, total: 10 }
            };
            
            const mockLevelManager: MockLevelManager = {
                getNextLevel: vi.fn().mockResolvedValue(levelData)
            };
            (game as any).levelManager = mockLevelManager;
            
            // Mock the template setup method to avoid complex setup
            (game as any).setupSideBySideGame = vi.fn().mockResolvedValue(undefined);
            (game as any).displayLevelInfo = vi.fn();
            
            // Clear the mock calls from initialization
            mockEventDispatch.mockClear();
            
            // Call loadNextLevel
            await (game as any).loadNextLevel();
            
            // Verify that foundDifferences was reset
            expect((game as any).foundDifferences).toEqual([]);
            
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
            (game as any).differences = ['diff1', 'diff2', 'diff3'];
            (game as any).foundDifferences = ['diff1', 'diff2'];
            
            // Clear mock calls
            mockEventDispatch.mockClear();
            
            // Find another difference
            (game as any).foundDifferences.push('diff3');
            document.dispatchEvent(new CustomEvent('differenceFound', {
                detail: { totalFound: (game as any).foundDifferences.length }
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
            (game as any).clearAllPreviousLevelData();
            
            // Verify score is reset to 0
            expect((game as any).foundDifferences).toEqual([]);
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
            document.addEventListener('differenceFound', (e: Event) => {
                const customEvent = e as CustomEvent;
                mockScoreUpdate(customEvent.detail.totalFound);
            });
            
            // Clear all previous level data
            (game as any).clearAllPreviousLevelData();
            
            // Verify score update was called with 0
            expect(mockScoreUpdate).toHaveBeenCalledWith(0);
        });
    });
});