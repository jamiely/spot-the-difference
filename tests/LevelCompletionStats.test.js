import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';

describe('Level Completion Stats Display', () => {
    let game;
    let mockModal;
    
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
            showAlert: vi.fn().mockResolvedValue(),
            showConfirm: vi.fn().mockResolvedValue(true)
        };
        game.modal = mockModal;
        
        // Mock other dependencies to avoid complex setup
        game.levelManager = {
            completeLevel: vi.fn(),
            getCompletionStats: vi.fn().mockReturnValue({
                totalCompleted: 5,
                totalLevels: 10,
                templatesCompleted: 3,
                totalTemplates: 5,
                randomBackgroundsCompleted: 2,
                totalRandomBackgrounds: 5
            }),
            getNextLevel: vi.fn()
        };
        
        game.updateButtonStates = vi.fn();
        game.loadNextLevel = vi.fn();
        game.restartEntireGame = vi.fn();
    });

    describe('Level completion modal', () => {
        it('should display running total in level completion modal when more levels remain', async () => {
            // Set up level with differences and running total
            game.differences = [{ id: 'diff1' }, { id: 'diff2' }];
            game.foundDifferences = ['diff1', 'diff2'];
            game.totalDifferencesFound = 7; // From previous levels
            
            game.currentLevelData = {
                type: 'template',
                data: { name: 'Test Template' },
                levelInfo: { description: 'Test Level 3' }
            };
            
            // Mock that there are more levels
            game.levelManager.getNextLevel.mockResolvedValue({
                type: 'random',
                data: { filename: 'next-level.png' }
            });
            
            // Call endGame
            await game.endGame();
            
            // Verify the modal was called with running total
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Level Complete!',
                expect.stringContaining('Total differences found: 7')
            );
            
            // Verify the complete message structure
            const calledMessage = mockModal.showConfirm.mock.calls[0][1];
            expect(calledMessage).toMatch(/🎉 Test Level 3 completed!/);
            expect(calledMessage).toMatch(/You found all 2 differences!/);
            expect(calledMessage).toMatch(/Total differences found: 7/);
            expect(calledMessage).toMatch(/Ready for the next level\?/);
        });

        it('should display running total in test mode alert', async () => {
            // Enable test mode
            game.isTestMode = true;
            
            // Set up level state
            game.differences = [{ id: 'diff1' }, { id: 'diff2' }, { id: 'diff3' }];
            game.foundDifferences = ['diff1', 'diff2', 'diff3'];
            game.totalDifferencesFound = 10;
            
            // Call endGame
            await game.endGame();
            
            // Verify the alert was called with running total
            expect(mockModal.showAlert).toHaveBeenCalledWith(
                'Level Complete',
                expect.stringContaining('Total differences found: 10')
            );
            
            // Verify the complete message structure
            const calledMessage = mockModal.showAlert.mock.calls[0][1];
            expect(calledMessage).toMatch(/Congratulations! You found all 3 differences!/);
            expect(calledMessage).toMatch(/Total differences found: 10/);
        });
    });

    describe('Game completion modal', () => {
        it('should display running total in final game completion stats', async () => {
            // Set up end-of-game state
            game.differences = [{ id: 'final-diff' }];
            game.foundDifferences = ['final-diff'];
            game.totalDifferencesFound = 25; // Total across entire game
            
            game.currentLevelData = {
                type: 'random',
                data: { filename: 'final-level.png' },
                levelInfo: { description: 'Final Level' }
            };
            
            // Mock that no more levels remain
            game.levelManager.getNextLevel.mockResolvedValue(null);
            
            // Call endGame
            await game.endGame();
            
            // Verify the modal was called with running total in final stats
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Game Complete!',
                expect.stringContaining('Total differences found: 25')
            );
            
            // Verify the complete message structure
            const calledMessage = mockModal.showConfirm.mock.calls[0][1];
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
            game.isTestMode = true;
            
            // Set up game completion state
            game.totalDifferencesFound = 15;
            
            // Mock no more levels
            game.levelManager.getNextLevel.mockResolvedValue(null);
            
            // Call handleGameComplete directly (since endGame would exit early in test mode)
            await game.handleGameComplete();
            
            // Verify the alert was called
            expect(mockModal.showAlert).toHaveBeenCalledWith(
                'Game Complete',
                'Game completed! All levels finished!'
            );
        });
    });

    describe('Running total progression', () => {
        it('should show increasing total across multiple level completions', async () => {
            // Level 1 completion
            game.differences = [{ id: 'diff1' }, { id: 'diff2' }];
            game.foundDifferences = ['diff1', 'diff2'];
            game.totalDifferencesFound = 2;
            game.currentLevelData = {
                type: 'template',
                data: { name: 'Level 1' },
                levelInfo: { description: 'Level 1' }
            };
            game.levelManager.getNextLevel.mockResolvedValue({ type: 'template' });
            
            await game.endGame();
            
            // Verify first level shows total of 2
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Level Complete!',
                expect.stringContaining('Total differences found: 2')
            );
            
            // Reset mock for next call
            mockModal.showConfirm.mockClear();
            
            // Level 2 completion (simulate progression)
            game.differences = [{ id: 'diff3' }, { id: 'diff4' }, { id: 'diff5' }];
            game.foundDifferences = ['diff3', 'diff4', 'diff5'];
            game.totalDifferencesFound = 5; // 2 from level 1 + 3 from level 2
            game.currentLevelData = {
                type: 'random',
                data: { filename: 'level2.png' },
                levelInfo: { description: 'Level 2' }
            };
            
            await game.endGame();
            
            // Verify second level shows total of 5
            expect(mockModal.showConfirm).toHaveBeenCalledWith(
                'Level Complete!',
                expect.stringContaining('Total differences found: 5')
            );
        });
    });
});