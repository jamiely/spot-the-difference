import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';

// Type definitions for mock objects
interface MockTemplateManager {
    loadAvailableTemplates: ReturnType<typeof vi.fn>;
}

interface MockBackgroundLoader {
    loadAvailableBackgrounds: ReturnType<typeof vi.fn>;
}

interface MockLevelManager {
    resetGame: ReturnType<typeof vi.fn>;
    getNextLevel: ReturnType<typeof vi.fn>;
    getLevelInfo: ReturnType<typeof vi.fn>;
    getCompletionStats: ReturnType<typeof vi.fn>;
}

interface MockDifference {
    id: string;
    centerX: number;
    centerY: number;
}

describe('Debug Auto-Complete Feature', () => {
    let game: SpotTheDifferenceGame;
    let mockTemplateManager: MockTemplateManager;
    let mockBackgroundLoader: MockBackgroundLoader;
    let mockLevelManager: MockLevelManager;

    beforeEach(() => {
        // Setup DOM elements that Game constructor expects
        document.body.innerHTML = `
            <div id="game-board-left"></div>
            <div id="game-board-right"></div>
            <button id="start-game">Start Game</button>
            <button id="reset-game">Reset Game</button>
            <span id="score-count">0</span>
            <img id="background-image-left" style="display: none;">
            <img id="background-image-right" style="display: none;">
        `;

        // Mock the managers
        mockTemplateManager = {
            loadAvailableTemplates: vi.fn().mockResolvedValue([
                { id: 'template1', name: 'Test Template', background: 'test_background.jpg' }
            ])
        };

        mockBackgroundLoader = {
            loadAvailableBackgrounds: vi.fn().mockResolvedValue([
                { filename: 'random_background.jpg' }
            ])
        };

        mockLevelManager = {
            resetGame: vi.fn(),
            getNextLevel: vi.fn(),
            getLevelInfo: vi.fn().mockReturnValue({
                description: 'Level 1 of 10',
                phase: 'template',
                currentLevel: 1,
                totalLevels: 10,
                isLastLevel: false
            }),
            getCompletionStats: vi.fn().mockReturnValue({
                totalCompleted: 0,
                totalLevels: 10
            })
        };

        // Create game instance
        game = new SpotTheDifferenceGame();
        
        // Replace managers with mocks
        (game as any).templateManager = mockTemplateManager;
        (game as any).backgroundLoader = mockBackgroundLoader;
        (game as any).levelManager = mockLevelManager;
    });

    describe('$ key auto-complete', () => {
        it('should auto-complete level when $ key is pressed during active game', () => {
            // Setup game state
            (game as any).isGameActive = true;
            (game as any).foundDifferences = [];
            (game as any).totalDifferencesFound = 0;
            (game as any).differences = [
                { id: 'diff1', centerX: 100, centerY: 200 },
                { id: 'diff2', centerX: 150, centerY: 250 },
                { id: 'diff3', centerX: 200, centerY: 300 }
            ] as MockDifference[];

            // Mock markDifferenceFound to track calls
            const markDifferenceFoundSpy = vi.spyOn(game, 'markDifferenceFound').mockImplementation(() => {
                // Simulate the actual behavior of markDifferenceFound
                (game as any).foundDifferences.push('diff' + ((game as any).foundDifferences.length + 1));
                (game as any).totalDifferencesFound++;
            });

            // Simulate $ key press
            const keyEvent = new KeyboardEvent('keydown', { key: '$' });
            document.dispatchEvent(keyEvent);

            // Verify that markDifferenceFound was called for all differences
            expect(markDifferenceFoundSpy).toHaveBeenCalledTimes(3);
            expect(markDifferenceFoundSpy).toHaveBeenCalledWith(
                (game as any).differences[0], 'left', 100, 200
            );
            expect(markDifferenceFoundSpy).toHaveBeenCalledWith(
                (game as any).differences[1], 'left', 150, 250
            );
            expect(markDifferenceFoundSpy).toHaveBeenCalledWith(
                (game as any).differences[2], 'left', 200, 300
            );
        });

        it('should not auto-complete when game is not active', () => {
            // Setup game state
            (game as any).isGameActive = false;
            (game as any).foundDifferences = [];
            (game as any).differences = [
                { id: 'diff1', centerX: 100, centerY: 200 },
                { id: 'diff2', centerX: 150, centerY: 250 }
            ] as MockDifference[];

            // Mock markDifferenceFound to track calls
            const markDifferenceFoundSpy = vi.spyOn(game, 'markDifferenceFound').mockImplementation(() => {});

            // Simulate $ key press
            const keyEvent = new KeyboardEvent('keydown', { key: '$' });
            document.dispatchEvent(keyEvent);

            // Verify that markDifferenceFound was not called
            expect(markDifferenceFoundSpy).not.toHaveBeenCalled();
        });

        it('should only mark unfound differences', () => {
            // Setup game state with some differences already found
            (game as any).isGameActive = true;
            (game as any).foundDifferences = ['diff1', 'diff3']; // diff2 is not found yet
            (game as any).totalDifferencesFound = 2;
            (game as any).differences = [
                { id: 'diff1', centerX: 100, centerY: 200 },
                { id: 'diff2', centerX: 150, centerY: 250 },
                { id: 'diff3', centerX: 200, centerY: 300 }
            ] as MockDifference[];

            // Mock markDifferenceFound to track calls
            const markDifferenceFoundSpy = vi.spyOn(game, 'markDifferenceFound').mockImplementation(() => {
                (game as any).foundDifferences.push('diff2');
                (game as any).totalDifferencesFound++;
            });

            // Simulate $ key press
            const keyEvent = new KeyboardEvent('keydown', { key: '$' });
            document.dispatchEvent(keyEvent);

            // Verify that markDifferenceFound was called only for unfound difference
            expect(markDifferenceFoundSpy).toHaveBeenCalledTimes(1);
            expect(markDifferenceFoundSpy).toHaveBeenCalledWith(
                (game as any).differences[1], 'left', 150, 250
            );
        });

        it('should handle case when all differences are already found', () => {
            // Setup game state with all differences found
            (game as any).isGameActive = true;
            (game as any).foundDifferences = ['diff1', 'diff2', 'diff3'];
            (game as any).totalDifferencesFound = 3;
            (game as any).differences = [
                { id: 'diff1', centerX: 100, centerY: 200 },
                { id: 'diff2', centerX: 150, centerY: 250 },
                { id: 'diff3', centerX: 200, centerY: 300 }
            ] as MockDifference[];

            // Mock markDifferenceFound to track calls
            const markDifferenceFoundSpy = vi.spyOn(game, 'markDifferenceFound').mockImplementation(() => {});

            // Simulate $ key press
            const keyEvent = new KeyboardEvent('keydown', { key: '$' });
            document.dispatchEvent(keyEvent);

            // Verify that markDifferenceFound was not called
            expect(markDifferenceFoundSpy).not.toHaveBeenCalled();
        });

        it('should handle case when no differences exist', () => {
            // Setup game state with no differences
            (game as any).isGameActive = true;
            (game as any).foundDifferences = [];
            (game as any).totalDifferencesFound = 0;
            (game as any).differences = [];

            // Mock markDifferenceFound to track calls
            const markDifferenceFoundSpy = vi.spyOn(game, 'markDifferenceFound').mockImplementation(() => {});

            // Simulate $ key press
            const keyEvent = new KeyboardEvent('keydown', { key: '$' });
            document.dispatchEvent(keyEvent);

            // Verify that markDifferenceFound was not called
            expect(markDifferenceFoundSpy).not.toHaveBeenCalled();
        });
    });

    describe('autoCompleteLevel method', () => {
        it('should exist and be callable', () => {
            expect(typeof (game as any).autoCompleteLevel).toBe('function');
        });

        it('should log debug message when called', () => {
            // Mock console.log
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            (game as any).autoCompleteLevel();

            expect(consoleSpy).toHaveBeenCalledWith('Debug: Auto-completing level with $ key');
            
            consoleSpy.mockRestore();
        });

        it('should work with integration test', () => {
            // Setup a more realistic scenario
            (game as any).isGameActive = true;
            (game as any).foundDifferences = [];
            (game as any).totalDifferencesFound = 0;
            (game as any).differences = [
                { id: 'diff1', centerX: 100, centerY: 200 },
                { id: 'diff2', centerX: 150, centerY: 250 }
            ] as MockDifference[];

            // Mock the createDifferenceMarker method to avoid DOM manipulation
            const createMarkerSpy = vi.spyOn(game, 'createDifferenceMarker').mockImplementation(() => {});

            // Mock the CustomEvent dispatch
            const dispatchSpy = vi.spyOn(document, 'dispatchEvent').mockImplementation(() => true);

            // Call autoCompleteLevel directly
            (game as any).autoCompleteLevel();

            // Verify that differences were marked as found
            expect((game as any).foundDifferences).toEqual(['diff1', 'diff2']);
            expect((game as any).totalDifferencesFound).toBe(2);

            // Verify that markers were created
            expect(createMarkerSpy).toHaveBeenCalledTimes(4); // 2 differences * 2 sides

            // Verify that score update events were dispatched
            expect(dispatchSpy).toHaveBeenCalledTimes(2);

            createMarkerSpy.mockRestore();
            dispatchSpy.mockRestore();
        });
    });
});