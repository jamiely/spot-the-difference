import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';
import type { LevelData, TemplateData, BackgroundData } from '../src/types/index.js';
import type { TemplateManager } from '../js/utils/TemplateManager.js';
import type { BackgroundLoader } from '../js/utils/BackgroundLoader.js';
import type { LevelManager, LevelCompletionStats } from '../js/components/LevelManager.js';

// Mock interfaces
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

interface MockElement {
    textContent: string;
    style: { display: string };
}

describe('Page Title Update', () => {
    let game: SpotTheDifferenceGame;
    let mockTemplateManager: MockTemplateManager;
    let mockBackgroundLoader: MockBackgroundLoader;
    let mockLevelManager: MockLevelManager;
    let originalTitle: string;

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
            <h2 id="level-title" style="display: none;"></h2>
        `;

        // Mock the managers
        mockTemplateManager = {
            loadAvailableTemplates: vi.fn().mockResolvedValue([
                { id: 'template1', name: 'Test Template', background: 'test_background.jpg', sprites: [] }
            ] as TemplateData[])
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
                totalLevels: 10,
                templatesCompleted: 0,
                totalTemplates: 2,
                randomBackgroundsCompleted: 0,
                totalRandomBackgrounds: 2
            } as LevelCompletionStats)
        };

        // Create game instance
        game = new SpotTheDifferenceGame();
        
        // Replace managers with mocks
        (game as any).templateManager = mockTemplateManager;
        (game as any).backgroundLoader = mockBackgroundLoader;
        (game as any).levelManager = mockLevelManager;
    });

    describe('updatePageTitle', () => {
        it('should update page title for template level', () => {
            // Setup template level data
            const templateData: TemplateData = { 
                id: 'template1', 
                name: 'Test Template', 
                background: 'forest_scene.jpg', 
                sprites: [] 
            };
            const levelData: LevelData = {
                type: 'template',
                data: templateData,
                levelInfo: {
                    description: 'Level 1 of 10',
                    current: 1,
                    total: 10,
                    phase: 'template'
                }
            };
            (game as any).currentLevelData = levelData;
            (game as any).currentTemplate = { background: 'forest_scene.jpg' };

            (game as any).updatePageTitle();

            expect(document.title).toBe('Level 1 of 10 - Forest Scene - Spot the Difference');
            
            // Check visible header
            const levelTitle = document.getElementById('level-title') as MockElement;
            expect(levelTitle.textContent).toBe('Level 1 of 10 - Forest Scene');
            expect(levelTitle.style.display).toBe('block');
        });

        it('should update page title for random level with string data', () => {
            // Setup random level data with string format
            const levelData: LevelData = {
                type: 'random',
                data: 'ocean_view.jpg' as any, // Type assertion for backward compatibility
                levelInfo: {
                    description: 'Level 5 of 10',
                    current: 5,
                    total: 10,
                    phase: 'random'
                }
            };
            (game as any).currentLevelData = levelData;

            (game as any).updatePageTitle();

            expect(document.title).toBe('Level 5 of 10 - Ocean View - Spot the Difference');
            
            // Check visible header
            const levelTitle = document.getElementById('level-title') as MockElement;
            expect(levelTitle.textContent).toBe('Level 5 of 10 - Ocean View');
            expect(levelTitle.style.display).toBe('block');
        });

        it('should update page title for random level with object data', () => {
            // Setup random level data with object format
            const backgroundData: BackgroundData = { filename: 'mountain_peak.jpg' };
            const levelData: LevelData = {
                type: 'random',
                data: backgroundData,
                levelInfo: {
                    description: 'Level 8 of 10',
                    current: 8,
                    total: 10,
                    phase: 'random'
                }
            };
            (game as any).currentLevelData = levelData;

            (game as any).updatePageTitle();

            expect(document.title).toBe('Level 8 of 10 - Mountain Peak - Spot the Difference');
        });

        it('should handle background names with underscores and hyphens', () => {
            const templateData: TemplateData = { 
                id: 'template1', 
                name: 'Test Template', 
                background: 'city_night-scene.jpg', 
                sprites: [] 
            };
            const levelData: LevelData = {
                type: 'template',
                data: templateData,
                levelInfo: {
                    description: 'Level 3 of 10',
                    current: 3,
                    total: 10,
                    phase: 'template'
                }
            };
            (game as any).currentLevelData = levelData;
            (game as any).currentTemplate = { background: 'city_night-scene.jpg' };

            (game as any).updatePageTitle();

            expect(document.title).toBe('Level 3 of 10 - City Night Scene - Spot the Difference');
        });

        it('should handle background names without file extension', () => {
            const templateData: TemplateData = { 
                id: 'template1', 
                name: 'Test Template', 
                background: 'beach_sunset', 
                sprites: [] 
            };
            const levelData: LevelData = {
                type: 'template',
                data: templateData,
                levelInfo: {
                    description: 'Level 2 of 10',
                    current: 2,
                    total: 10,
                    phase: 'template'
                }
            };
            (game as any).currentLevelData = levelData;
            (game as any).currentTemplate = { background: 'beach_sunset' };

            (game as any).updatePageTitle();

            expect(document.title).toBe('Level 2 of 10 - Beach Sunset - Spot the Difference');
        });

        it('should not update title when currentLevelData is null', () => {
            (game as any).currentLevelData = null;
            document.title = 'Previous Title';

            (game as any).updatePageTitle();

            expect(document.title).toBe('Previous Title');
        });

        it('should handle unknown background gracefully', () => {
            const templateData: TemplateData = { 
                id: 'template1', 
                name: 'Test Template', 
                background: 'unknown.jpg', 
                sprites: [] 
            };
            const levelData: LevelData = {
                type: 'template',
                data: templateData,
                levelInfo: {
                    description: 'Level 1 of 10',
                    current: 1,
                    total: 10,
                    phase: 'template'
                }
            };
            (game as any).currentLevelData = levelData;
            (game as any).currentTemplate = null; // No template loaded

            (game as any).updatePageTitle();

            expect(document.title).toBe('Level 1 of 10 - Unknown - Spot the Difference');
        });
    });

    describe('resetGame title behavior', () => {
        it('should reset page title to default when game is reset', () => {
            // Set a custom title and header first
            document.title = 'Level 5 of 10 - Forest Scene - Spot the Difference';
            const levelTitle = document.getElementById('level-title') as MockElement;
            levelTitle.textContent = 'Level 5 of 10 - Forest Scene';
            levelTitle.style.display = 'block';
            
            (game as any).resetGame();

            expect(document.title).toBe('Spot the Difference');
            expect(levelTitle.textContent).toBe('');
            expect(levelTitle.style.display).toBe('none');
        });

        it('should reset title even if game was in middle of level', () => {
            // Setup game as if in middle of level
            const templateData: TemplateData = { 
                id: 'template1', 
                name: 'Test Template', 
                background: 'forest_scene.jpg', 
                sprites: [] 
            };
            const levelData: LevelData = {
                type: 'template',
                data: templateData,
                levelInfo: {
                    description: 'Level 3 of 10',
                    current: 3,
                    total: 10,
                    phase: 'template'
                }
            };
            (game as any).currentLevelData = levelData;
            (game as any).currentTemplate = { background: 'forest_scene.jpg' };
            document.title = 'Level 3 of 10 - Forest Scene - Spot the Difference';
            
            // Setup visible header
            const levelTitle = document.getElementById('level-title') as MockElement;
            levelTitle.textContent = 'Level 3 of 10 - Forest Scene';
            levelTitle.style.display = 'block';
            
            (game as any).resetGame();

            expect(document.title).toBe('Spot the Difference');
            expect(levelTitle.textContent).toBe('');
            expect(levelTitle.style.display).toBe('none');
            expect((game as any).currentLevelData).toBe(null);
            expect((game as any).currentTemplate).toBe(null);
        });
    });
});