import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';

describe('Page Title Update', () => {
    let game;
    let mockTemplateManager;
    let mockBackgroundLoader;
    let mockLevelManager;
    let originalTitle;

    beforeEach(() => {
        // Store original title
        originalTitle = document.title;
        
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
        game.templateManager = mockTemplateManager;
        game.backgroundLoader = mockBackgroundLoader;
        game.levelManager = mockLevelManager;
    });

    describe('updatePageTitle', () => {
        it('should update page title for template level', () => {
            // Setup template level data
            game.currentLevelData = {
                type: 'template',
                data: { id: 'template1', name: 'Test Template', background: 'forest_scene.jpg' },
                levelInfo: {
                    description: 'Level 1 of 10',
                    phase: 'template',
                    currentLevel: 1,
                    totalLevels: 10
                }
            };
            game.currentTemplate = { background: 'forest_scene.jpg' };

            game.updatePageTitle();

            expect(document.title).toBe('Level 1 of 10 - Forest Scene - Spot the Difference');
        });

        it('should update page title for random level with string data', () => {
            // Setup random level data with string format
            game.currentLevelData = {
                type: 'random',
                data: 'ocean_view.jpg',
                levelInfo: {
                    description: 'Level 5 of 10',
                    phase: 'random',
                    currentLevel: 5,
                    totalLevels: 10
                }
            };

            game.updatePageTitle();

            expect(document.title).toBe('Level 5 of 10 - Ocean View - Spot the Difference');
        });

        it('should update page title for random level with object data', () => {
            // Setup random level data with object format
            game.currentLevelData = {
                type: 'random',
                data: { filename: 'mountain_peak.jpg' },
                levelInfo: {
                    description: 'Level 8 of 10',
                    phase: 'random',
                    currentLevel: 8,
                    totalLevels: 10
                }
            };

            game.updatePageTitle();

            expect(document.title).toBe('Level 8 of 10 - Mountain Peak - Spot the Difference');
        });

        it('should handle background names with underscores and hyphens', () => {
            game.currentLevelData = {
                type: 'template',
                data: { id: 'template1', name: 'Test Template', background: 'city_night-scene.jpg' },
                levelInfo: {
                    description: 'Level 3 of 10',
                    phase: 'template',
                    currentLevel: 3,
                    totalLevels: 10
                }
            };
            game.currentTemplate = { background: 'city_night-scene.jpg' };

            game.updatePageTitle();

            expect(document.title).toBe('Level 3 of 10 - City Night Scene - Spot the Difference');
        });

        it('should handle background names without file extension', () => {
            game.currentLevelData = {
                type: 'template',
                data: { id: 'template1', name: 'Test Template', background: 'beach_sunset' },
                levelInfo: {
                    description: 'Level 2 of 10',
                    phase: 'template',
                    currentLevel: 2,
                    totalLevels: 10
                }
            };
            game.currentTemplate = { background: 'beach_sunset' };

            game.updatePageTitle();

            expect(document.title).toBe('Level 2 of 10 - Beach Sunset - Spot the Difference');
        });

        it('should not update title when currentLevelData is null', () => {
            game.currentLevelData = null;
            document.title = 'Previous Title';

            game.updatePageTitle();

            expect(document.title).toBe('Previous Title');
        });

        it('should handle unknown background gracefully', () => {
            game.currentLevelData = {
                type: 'template',
                data: { id: 'template1', name: 'Test Template', background: 'unknown.jpg' },
                levelInfo: {
                    description: 'Level 1 of 10',
                    phase: 'template',
                    currentLevel: 1,
                    totalLevels: 10
                }
            };
            game.currentTemplate = null; // No template loaded

            game.updatePageTitle();

            expect(document.title).toBe('Level 1 of 10 - Unknown - Spot the Difference');
        });
    });

    describe('resetGame title behavior', () => {
        it('should reset page title to default when game is reset', () => {
            // Set a custom title first
            document.title = 'Level 5 of 10 - Forest Scene - Spot the Difference';
            
            game.resetGame();

            expect(document.title).toBe('Spot the Difference');
        });

        it('should reset title even if game was in middle of level', () => {
            // Setup game as if in middle of level
            game.currentLevelData = {
                type: 'template',
                data: { id: 'template1', name: 'Test Template', background: 'forest_scene.jpg' },
                levelInfo: {
                    description: 'Level 3 of 10',
                    phase: 'template',
                    currentLevel: 3,
                    totalLevels: 10
                }
            };
            game.currentTemplate = { background: 'forest_scene.jpg' };
            document.title = 'Level 3 of 10 - Forest Scene - Spot the Difference';
            
            game.resetGame();

            expect(document.title).toBe('Spot the Difference');
            expect(game.currentLevelData).toBe(null);
            expect(game.currentTemplate).toBe(null);
        });
    });
});