import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';
import type { LevelData, GameDifference, LevelCompletionStats } from '../src/types/index.js';
import type { GameModal } from '../js/components/GameModal.js';
import type { LevelManager } from '../js/components/LevelManager.js';

// Mock interfaces for type safety
interface MockLevelManager {
    completeLevel: ReturnType<typeof vi.fn>;
    getCompletionStats: ReturnType<typeof vi.fn>;
    getNextLevel: ReturnType<typeof vi.fn>;
}

interface MockModal {
    showAlert: ReturnType<typeof vi.fn>;
    showConfirm: ReturnType<typeof vi.fn>;
}

describe('Level Completion Stats Display', () => {
    let game: SpotTheDifferenceGame;
    let mockModal: MockModal;
    
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
        
        // Create game instance
        game = new SpotTheDifferenceGame();
        
        // Mock the modal to capture what messages are shown
        mockModal = {
            showAlert: vi.fn().mockResolvedValue(undefined),
            showConfirm: vi.fn().mockResolvedValue(true)
        };
        (game as any).modal = mockModal;
        
        // Mock other dependencies to avoid complex setup
        const mockLevelManager: MockLevelManager = {
            completeLevel: vi.fn(),
            getCompletionStats: vi.fn().mockReturnValue({
                totalCompleted: 5,
                totalLevels: 10,
                templatesCompleted: 3,
                totalTemplates: 5,
                randomBackgroundsCompleted: 2,
                totalRandomBackgrounds: 5
            } as LevelCompletionStats),
            getNextLevel: vi.fn()
        };
        (game as any).levelManager = mockLevelManager;
        
        (game as any).updateButtonStates = vi.fn();
        (game as any).loadNextLevel = vi.fn();
        (game as any).restartEntireGame = vi.fn();
    });

    describe('Level completion modal', () => {
        it('should display running total in level completion modal when more levels remain', async () => {
            // Disable test mode for this test to allow full modal behavior
            (game as any).isTestMode = false;
            
            // Set up level with differences and running total
            const differences: GameDifference[] = [
                { id: 'diff1', centerX: 100, centerY: 100, side: 'left' },
                { id: 'diff2', centerX: 200, centerY: 200, side: 'right' }
            ];
            (game as any).differences = differences;
            (game as any).foundDifferences = ['diff1', 'diff2'];
            (game as any).totalDifferencesFound = 7; // From previous levels
            
            const levelData: LevelData = {
                type: 'template',
                data: { id: 'template1', name: 'Test Template', background: 'test.png', sprites: [] },
                levelInfo: { description: 'Test Level 3', current: 3, total: 10 }
            };
            (game as any).currentLevelData = levelData;
            
            // Mock that there are more levels
            const mockLevelManager = (game as any).levelManager as MockLevelManager;
            mockLevelManager.getNextLevel.mockResolvedValue({
                type: 'random',
                data: { filename: 'next-level.png' },
                levelInfo: { description: 'Random Level 1', current: 1, total: 5 }
            } as LevelData);
            
            // Call endGame
            await game.endGame();
            
            // Verify the modal was called with running total and restrictive mode
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Level Complete!',
                expect.stringContaining('Total differences found: 7'),
                true
            );
            
            // Verify the complete message structure
            const calledMessage = mockModal.showConfirm.mock.calls[0][1] as string;
            expect(calledMessage).toMatch(/🎉 Test Level 3 completed!/);
            expect(calledMessage).toMatch(/You found all 2 differences!/);
            expect(calledMessage).toMatch(/Total differences found: 7/);
            expect(calledMessage).toMatch(/Ready for the next level\?/);
        });

        it('should display running total in test mode alert', async () => {
            // Enable test mode
            (game as any).isTestMode = true;
            
            // Set up level state
            const differences: GameDifference[] = [
                { id: 'diff1', centerX: 100, centerY: 100, side: 'left' },
                { id: 'diff2', centerX: 200, centerY: 200, side: 'right' },
                { id: 'diff3', centerX: 300, centerY: 300, side: 'left' }
            ];
            (game as any).differences = differences;
            (game as any).foundDifferences = ['diff1', 'diff2', 'diff3'];
            (game as any).totalDifferencesFound = 10;
            
            // Call endGame
            await game.endGame();
            
            // Verify the alert was called with running total and restrictive mode
            expect(mockModal.showAlert).toHaveBeenCalledWith(
                'Level Complete',
                expect.stringContaining('Total differences found: 10'),
                true
            );
            
            // Verify the complete message structure
            const calledMessage = mockModal.showAlert.mock.calls[0][1] as string;
            expect(calledMessage).toMatch(/Congratulations! You found all 3 differences!/);
            expect(calledMessage).toMatch(/Total differences found: 10/);
        });
    });

    describe('Game completion modal', () => {
        it('should display running total in final game completion stats', async () => {
            // Disable test mode for this test to allow full modal behavior
            (game as any).isTestMode = false;
            
            // Set up end-of-game state
            const differences: GameDifference[] = [
                { id: 'final-diff', centerX: 100, centerY: 100, side: 'left' }
            ];
            (game as any).differences = differences;
            (game as any).foundDifferences = ['final-diff'];
            (game as any).totalDifferencesFound = 25; // Total across entire game
            
            const levelData: LevelData = {
                type: 'random',
                data: { filename: 'final-level.png' },
                levelInfo: { description: 'Final Level', current: 10, total: 10 }
            };
            (game as any).currentLevelData = levelData;
            
            // Mock that no more levels remain
            const mockLevelManager = (game as any).levelManager as MockLevelManager;
            mockLevelManager.getNextLevel.mockResolvedValue(null);
            
            // Call endGame
            await game.endGame();
            
            // Verify the modal was called with running total in final stats
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Game Complete!',
                expect.stringContaining('Total differences found: 25')
            );
            
            // Verify the complete message structure
            const calledMessage = mockModal.showConfirm.mock.calls[0][1] as string;
            expect(calledMessage).toMatch(/🎉 Congratulations! You've completed the entire game!/);
            expect(calledMessage).toMatch(/📊 Final Statistics:/);
            expect(calledMessage).toMatch(/• Levels completed: 5\/10/);
            expect(calledMessage).toMatch(/• Total differences found: 25/);
            expect(calledMessage).toMatch(/Would you like to play again\?/);
            
            // Verify that template/random level distinction is NOT shown
            expect(calledMessage).not.toMatch(/Templates completed/);
            expect(calledMessage).not.toMatch(/Random levels completed/);
        });

        it('should display running total in test mode game completion', async () => {
            // Enable test mode
            (game as any).isTestMode = true;
            
            // Set up game completion state
            (game as any).totalDifferencesFound = 15;
            
            // Mock no more levels
            const mockLevelManager = (game as any).levelManager as MockLevelManager;
            mockLevelManager.getNextLevel.mockResolvedValue(null);
            
            // Call handleGameComplete directly (since endGame would exit early in test mode)
            await (game as any).handleGameComplete();
            
            // Verify the alert was called
            expect(mockModal.showAlert).toHaveBeenCalledWith(
                'Game Complete',
                'Game completed! All levels finished!'
            );
        });
    });

    describe('Running total progression', () => {
        it('should show increasing total across multiple level completions', async () => {
            // Disable test mode for this test to allow full modal behavior
            (game as any).isTestMode = false;
            
            // Level 1 completion
            const differences1: GameDifference[] = [
                { id: 'diff1', centerX: 100, centerY: 100, side: 'left' },
                { id: 'diff2', centerX: 200, centerY: 200, side: 'right' }
            ];
            (game as any).differences = differences1;
            (game as any).foundDifferences = ['diff1', 'diff2'];
            (game as any).totalDifferencesFound = 2;
            
            const levelData1: LevelData = {
                type: 'template',
                data: { id: 'template1', name: 'Level 1', background: 'test.png', sprites: [] },
                levelInfo: { description: 'Level 1', current: 1, total: 10 }
            };
            (game as any).currentLevelData = levelData1;
            
            const mockLevelManager = (game as any).levelManager as MockLevelManager;
            mockLevelManager.getNextLevel.mockResolvedValue({ type: 'template' } as LevelData);
            
            await game.endGame();
            
            // Verify first level shows total of 2
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Level Complete!',
                expect.stringContaining('Total differences found: 2'),
                true
            );
            
            // Reset mock for next call
            mockModal.showConfirm.mockClear();
            
            // Level 2 completion (simulate progression)
            const differences2: GameDifference[] = [
                { id: 'diff3', centerX: 100, centerY: 100, side: 'left' },
                { id: 'diff4', centerX: 200, centerY: 200, side: 'right' },
                { id: 'diff5', centerX: 300, centerY: 300, side: 'left' }
            ];
            (game as any).differences = differences2;
            (game as any).foundDifferences = ['diff3', 'diff4', 'diff5'];
            (game as any).totalDifferencesFound = 5; // 2 from level 1 + 3 from level 2
            
            const levelData2: LevelData = {
                type: 'random',
                data: { filename: 'level2.png' },
                levelInfo: { description: 'Level 2', current: 2, total: 10 }
            };
            (game as any).currentLevelData = levelData2;
            
            await game.endGame();
            
            // Verify second level shows total of 5
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Level Complete!',
                expect.stringContaining('Total differences found: 5'),
                true
            );
        });
    });
});