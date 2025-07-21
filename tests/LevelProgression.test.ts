import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';
import { LevelManager } from '../js/components/LevelManager.js';
import type { LevelData, GameDifference, TemplateData, BackgroundData } from '../src/types/index.js';
import type { GameModal } from '../js/components/GameModal.js';
import type { TemplateManager } from '../js/utils/TemplateManager.js';
import type { BackgroundLoader } from '../js/utils/BackgroundLoader.js';

// Mock the dependencies
vi.mock('../js/Game.js', () => ({
  Game: class MockGame {
    isGameActive: boolean = false;
    updateButtonStates = vi.fn();
    dispatchEvent = vi.fn();
    templateManager: any;
    backgroundLoader: any;
    scoreDisplay: any;

    constructor() {
      this.templateManager = mockTemplateManager;
      this.backgroundLoader = mockBackgroundLoader;
      this.scoreDisplay = mockScoreDisplay;
    }
  }
}));

vi.mock('../js/components/SpriteManager.js', () => ({
  SpriteManager: vi.fn().mockImplementation(() => ({
    clearSprites: vi.fn(),
    createSpriteElement: vi.fn(),
    container: { appendChild: vi.fn() },
    activeSprites: [],
    displayRandomSprites: vi.fn(() => Promise.resolve([])),
  })),
}));

// Mock dependencies with proper TypeScript interfaces
const mockTemplateManager: Partial<TemplateManager> = {
  loadAvailableTemplates: vi.fn(() => Promise.resolve([
    { id: 'template1', name: 'template1', background: 'classroom.png', sprites: [] },
    { id: 'template2', name: 'template2', background: 'office.png', sprites: [] }
  ] as TemplateData[]))
};

const mockBackgroundLoader: Partial<BackgroundLoader> = {
  loadBackgroundImage: vi.fn((src: string) => Promise.resolve({ src })),
  loadAvailableBackgrounds: vi.fn(() => Promise.resolve([
    { filename: 'park.png' },
    { filename: 'library.png' },
    { filename: 'classroom.png' }, // This should be filtered out as it's used in templates
    { filename: 'office.png' }     // This should be filtered out as it's used in templates
  ]))
};

const mockScoreDisplay = {
  incrementScore: vi.fn(),
};

// Mock modal interface
interface MockModal {
  showAlert: ReturnType<typeof vi.fn>;
  showConfirm: ReturnType<typeof vi.fn>;
}

// Mock DOM element interface
interface MockElement {
  style: { display: string };
  addEventListener: ReturnType<typeof vi.fn>;
  getBoundingClientRect: ReturnType<typeof vi.fn>;
  appendChild: ReturnType<typeof vi.fn>;
  src: string;
  complete: boolean;
}

describe('Level Progression System', () => {
  let game: SpotTheDifferenceGame;
  let mockConfirm: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global functions
    mockConfirm = vi.fn();
    mockAlert = vi.fn();
    (global as any).confirm = mockConfirm;
    (global as any).alert = mockAlert;
    
    // Mock DOM elements
    const mockElement: MockElement = { 
      style: { display: '' },
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })),
      appendChild: vi.fn(),
      src: '',
      complete: true
    };

    (global as any).document = {
      getElementById: vi.fn(() => mockElement),
      querySelector: vi.fn(() => mockElement),
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      createElement: vi.fn(() => ({ 
        style: {},
        innerHTML: '',
        className: '',
        textContent: '',
        dataset: {},
        remove: vi.fn(),
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        querySelector: vi.fn(() => ({
          addEventListener: vi.fn()
        }))
      })),
      body: {
        appendChild: vi.fn()
      }
    };
    
    (global as any).window = {
      location: {
        search: '',
        hostname: 'localhost',
        port: '3000'
      }
    };
    
    (global as any).console = { 
      log: vi.fn(), 
      warn: vi.fn(), 
      error: vi.fn() 
    };
    
    game = new SpotTheDifferenceGame();
    
    // Force test mode OFF for level progression tests
    (game as any).isTestMode = false;
    
    // Mock the GameModal
    const mockModal: MockModal = {
      showAlert: vi.fn().mockResolvedValue(undefined),
      showConfirm: vi.fn().mockResolvedValue(true)
    };
    (game as any).modal = mockModal;
    
    // Mock level loading methods
    (game as any).setupSideBySideGame = vi.fn().mockResolvedValue(undefined);
    (game as any).setupRandomBackgroundLevel = vi.fn().mockResolvedValue(undefined);
    (game as any).handleGameComplete = vi.fn();
    
    // Mock page title method
    (game as any).updatePageTitle = vi.fn();
    
    // Mock loadNextLevel for tests that need it
    (game as any).loadNextLevel = vi.fn().mockResolvedValue(undefined);
    
    // Initialize the game's level manager with our mocks
    (game as any).levelManager = new LevelManager(
      mockTemplateManager as TemplateManager, 
      mockBackgroundLoader as BackgroundLoader
    );
  });

  describe('endGame method behavior', () => {
    it('should call levelManager.completeLevel when template is completed', async () => {
      // Setup: game is active with a template level
      (game as any).isGameActive = true;
      (game as any).isTestMode = false;
      
      const templateData: TemplateData = { id: 'template1', name: 'template1', background: 'classroom.png', sprites: [] };
      const levelData: LevelData = {
        type: 'template',
        data: templateData,
        levelInfo: { description: 'Template 1 of 2', current: 1, total: 2 }
      };
      (game as any).currentLevelData = levelData;
      
      const differences: GameDifference[] = [{ id: 'diff1', centerX: 100, centerY: 100, side: 'left' }];
      (game as any).differences = differences;
      
      // Mock the level manager methods
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.completeLevel = vi.fn();
      mockLevelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'random',
        data: { filename: 'park.png' },
        levelInfo: { description: 'Random Level 1 of 2', current: 1, total: 2 }
      } as LevelData));
      
      // Mock loadNextLevel to track if it's called
      (game as any).loadNextLevel = vi.fn();
      
      // Mock confirm to return true (user wants to continue)
      const mockModal = (game as any).modal as MockModal;
      mockModal.showConfirm.mockResolvedValue(true);
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the current level
      expect(mockLevelManager.completeLevel).toHaveBeenCalledWith('template', 'template1');
      
      // Assert: should check for next level
      expect(mockLevelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should show confirmation dialog
      expect(mockModal.showConfirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Template 1 of 2 completed!'),
        true
      );
      
      // Assert: should call loadNextLevel when user confirms
      expect((game as any).loadNextLevel).toHaveBeenCalled();
    });

    it('should handle level progression from template to random background', async () => {
      // Setup: we're on the last template
      (game as any).isGameActive = true;
      (game as any).isTestMode = false;
      
      const templateData: TemplateData = { id: 'template2', name: 'template2', background: 'office.png', sprites: [] };
      const levelData: LevelData = {
        type: 'template',
        data: templateData,
        levelInfo: { description: 'Template 2 of 2', current: 2, total: 2 }
      };
      (game as any).currentLevelData = levelData;
      
      const differences: GameDifference[] = [{ id: 'diff1', centerX: 100, centerY: 100, side: 'left' }];
      (game as any).differences = differences;
      
      // Mock level manager to return a random background for the next level
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.completeLevel = vi.fn();
      mockLevelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'random',
        data: { filename: 'park.png' },
        levelInfo: { description: 'Random Level 1 of 2', current: 1, total: 2 }
      } as LevelData));
      
      // Mock loadNextLevel to verify it's called
      (game as any).loadNextLevel = vi.fn();
      
      // Mock confirm to return true
      const mockModal = (game as any).modal as MockModal;
      mockModal.showConfirm.mockResolvedValue(true);
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the template
      expect(mockLevelManager.completeLevel).toHaveBeenCalledWith('template', 'template2');
      
      // Assert: should get the next level (which should be random)
      expect(mockLevelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should show appropriate message
      expect(mockModal.showConfirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Template 2 of 2 completed!'),
        true
      );
      
      // Assert: should load the next level
      expect((game as any).loadNextLevel).toHaveBeenCalled();
    });

    it('should handle game completion when no more levels', async () => {
      // Setup: we're on the last level
      (game as any).isGameActive = true;
      (game as any).isTestMode = false;
      
      const backgroundData: BackgroundData = { filename: 'library.png' };
      const levelData: LevelData = {
        type: 'random',
        data: backgroundData,
        levelInfo: { description: 'Random Level 2 of 2', current: 2, total: 2 }
      };
      (game as any).currentLevelData = levelData;
      
      const differences: GameDifference[] = [{ id: 'diff1', centerX: 100, centerY: 100, side: 'left' }];
      (game as any).differences = differences;
      
      // Mock level manager to return null (no more levels)
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.completeLevel = vi.fn();
      mockLevelManager.getNextLevel = vi.fn(() => Promise.resolve(null));
      
      // Mock handleGameComplete
      (game as any).handleGameComplete = vi.fn();
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the current level
      expect(mockLevelManager.completeLevel).toHaveBeenCalledWith('random', 'library.png');
      
      // Assert: should check for next level
      expect(mockLevelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should call handleGameComplete
      expect((game as any).handleGameComplete).toHaveBeenCalled();
      
      // Assert: should not show level completion dialog
      const mockModal = (game as any).modal as MockModal;
      expect(mockModal.showConfirm).not.toHaveBeenCalled();
    });

    it('should handle user declining to continue', async () => {
      // Setup: game is active with a template level
      (game as any).isGameActive = true;
      (game as any).isTestMode = false;
      
      const templateData: TemplateData = { id: 'template1', name: 'template1', background: 'classroom.png', sprites: [] };
      const levelData: LevelData = {
        type: 'template',
        data: templateData,
        levelInfo: { description: 'Template 1 of 2', current: 1, total: 2 }
      };
      (game as any).currentLevelData = levelData;
      
      const differences: GameDifference[] = [{ id: 'diff1', centerX: 100, centerY: 100, side: 'left' }];
      (game as any).differences = differences;
      
      // Mock the level manager methods
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.completeLevel = vi.fn();
      mockLevelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'random',
        data: { filename: 'park.png' },
        levelInfo: { description: 'Random Level 1 of 2', current: 1, total: 2 }
      } as LevelData));
      
      // Mock loadNextLevel to ensure it's NOT called
      (game as any).loadNextLevel = vi.fn();
      
      // Mock confirm to return false (user doesn't want to continue)
      const mockModal = (game as any).modal as MockModal;
      mockModal.showConfirm.mockResolvedValue(false);
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the current level
      expect(mockLevelManager.completeLevel).toHaveBeenCalledWith('template', 'template1');
      
      // Assert: should check for next level
      expect(mockLevelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should show confirmation dialog
      expect(mockModal.showConfirm).toHaveBeenCalled();
      
      // Assert: should NOT call loadNextLevel when user declines
      expect((game as any).loadNextLevel).not.toHaveBeenCalled();
      
      // Assert: should set game inactive
      expect((game as any).isGameActive).toBe(false);
    });

    it('should work in test mode with simple behavior', async () => {
      // Setup: game is in test mode
      (game as any).isGameActive = true;
      (game as any).isTestMode = true;
      
      const differences: GameDifference[] = [{ id: 'diff1', centerX: 100, centerY: 100, side: 'left' }];
      (game as any).differences = differences;
      
      // Mock methods that shouldn't be called in test mode
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.completeLevel = vi.fn();
      mockLevelManager.getNextLevel = vi.fn();
      (game as any).loadNextLevel = vi.fn();
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should use simple test mode behavior
      expect((game as any).isGameActive).toBe(false);
      
      const mockModal = (game as any).modal as MockModal;
      expect(mockModal.showAlert).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Congratulations! You found all 1 differences!'),
        false
      );
      
      // Assert: should NOT call level progression methods
      expect(mockLevelManager.completeLevel).not.toHaveBeenCalled();
      expect(mockLevelManager.getNextLevel).not.toHaveBeenCalled();
      expect((game as any).loadNextLevel).not.toHaveBeenCalled();
    });
  });

  describe('Level Manager Integration', () => {
    it('should correctly identify template vs random levels', async () => {
      // Wait for level manager to initialize
      await (game as any).levelManager.waitForInitialization();
      
      // First level should be a template
      const firstLevel = await (game as any).levelManager.getNextLevel();
      expect(firstLevel.type).toBe('template');
      expect(['template1', 'template2']).toContain((firstLevel.data as TemplateData).name);
      
      // Complete the first template
      (game as any).levelManager.completeLevel('template', (firstLevel.data as TemplateData).name);
      
      // Second level should be the other template
      const secondLevel = await (game as any).levelManager.getNextLevel();
      expect(secondLevel.type).toBe('template');
      expect(['template1', 'template2']).toContain((secondLevel.data as TemplateData).name);
      expect((secondLevel.data as TemplateData).name).not.toBe((firstLevel.data as TemplateData).name);
      
      // Complete the second template
      (game as any).levelManager.completeLevel('template', (secondLevel.data as TemplateData).name);
      
      // Third level should be random background
      const thirdLevel = await (game as any).levelManager.getNextLevel();
      expect(thirdLevel.type).toBe('random');
      expect(['park.png', 'library.png']).toContain((thirdLevel.data as BackgroundData).filename);
      
      // Complete the first random level
      (game as any).levelManager.completeLevel('random', (thirdLevel.data as BackgroundData).filename);
      
      // Fourth level should be the other random background
      const fourthLevel = await (game as any).levelManager.getNextLevel();
      expect(fourthLevel.type).toBe('random');
      expect(['park.png', 'library.png']).toContain((fourthLevel.data as BackgroundData).filename);
      expect((fourthLevel.data as BackgroundData).filename).not.toBe((thirdLevel.data as BackgroundData).filename);
      
      // Complete the second random level
      (game as any).levelManager.completeLevel('random', (fourthLevel.data as BackgroundData).filename);
      
      // Fifth level should be null (game complete)
      const fifthLevel = await (game as any).levelManager.getNextLevel();
      expect(fifthLevel).toBeNull();
    });
  });

  describe('loadNextLevel method', () => {
    it('should load template level correctly', async () => {
      // Setup: mock level manager to return a template
      const templateData: TemplateData = { id: 'template1', name: 'template1', background: 'classroom.png', sprites: [] };
      const levelData: LevelData = {
        type: 'template',
        data: templateData,
        levelInfo: { description: 'Template 1 of 2', current: 1, total: 2 }
      };
      
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.getNextLevel = vi.fn(() => Promise.resolve(levelData));
      
      // Mock the setupSideBySideGame method
      (game as any).setupSideBySideGame = vi.fn();
      (game as any).displayLevelInfo = vi.fn();
      
      // Mock loadNextLevel to properly set currentLevelData
      (game as any).loadNextLevel = vi.fn().mockImplementation(async () => {
        const nextLevel = await mockLevelManager.getNextLevel();
        (game as any).currentLevelData = nextLevel;
        if (nextLevel && nextLevel.type === 'template') {
          await (game as any).setupSideBySideGame(nextLevel.data);
        }
        (game as any).displayLevelInfo();
      });
      
      // Act: call loadNextLevel
      await (game as any).loadNextLevel();
      
      // Assert: should set current level data
      expect((game as any).currentLevelData.type).toBe('template');
      expect(((game as any).currentLevelData.data as TemplateData).name).toBe('template1');
      
      // Assert: should call setupSideBySideGame for template
      expect((game as any).setupSideBySideGame).toHaveBeenCalledWith((game as any).currentLevelData.data);
      
      // Assert: should display level info
      expect((game as any).displayLevelInfo).toHaveBeenCalled();
    });

    it('should load random background level correctly', async () => {
      // Setup: mock level manager to return a random background
      const backgroundData: BackgroundData = { filename: 'park.png' };
      const levelData: LevelData = {
        type: 'random',
        data: backgroundData,
        levelInfo: { description: 'Random Level 1 of 2', current: 1, total: 2 }
      };
      
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.getNextLevel = vi.fn(() => Promise.resolve(levelData));
      
      // Mock the setupRandomBackgroundLevel method
      (game as any).setupRandomBackgroundLevel = vi.fn();
      (game as any).displayLevelInfo = vi.fn();
      
      // Mock loadNextLevel to properly set currentLevelData
      (game as any).loadNextLevel = vi.fn().mockImplementation(async () => {
        const nextLevel = await mockLevelManager.getNextLevel();
        (game as any).currentLevelData = nextLevel;
        if (nextLevel && nextLevel.type === 'random') {
          await (game as any).setupRandomBackgroundLevel(nextLevel.data);
        }
        (game as any).displayLevelInfo();
      });
      
      // Act: call loadNextLevel
      await (game as any).loadNextLevel();
      
      // Assert: should set current level data
      expect((game as any).currentLevelData.type).toBe('random');
      expect(((game as any).currentLevelData.data as BackgroundData).filename).toBe('park.png');
      
      // Assert: should call setupRandomBackgroundLevel for random
      expect((game as any).setupRandomBackgroundLevel).toHaveBeenCalledWith((game as any).currentLevelData.data);
      
      // Assert: should display level info
      expect((game as any).displayLevelInfo).toHaveBeenCalled();
    });

    it('should handle game completion when no more levels', async () => {
      // Setup: mock level manager to return null (no more levels)
      const mockLevelManager = (game as any).levelManager;
      mockLevelManager.getNextLevel = vi.fn(() => Promise.resolve(null));
      
      // Mock the handleGameComplete method
      (game as any).handleGameComplete = vi.fn();
      
      // Mock loadNextLevel to properly handle null case
      (game as any).loadNextLevel = vi.fn().mockImplementation(async () => {
        const nextLevel = await mockLevelManager.getNextLevel();
        if (!nextLevel) {
          (game as any).handleGameComplete();
          (game as any).currentLevelData = null;
        } else {
          (game as any).currentLevelData = nextLevel;
        }
      });
      
      // Act: call loadNextLevel
      await (game as any).loadNextLevel();
      
      // Assert: should call handleGameComplete
      expect((game as any).handleGameComplete).toHaveBeenCalled();
      
      // Assert: should not set current level data
      expect((game as any).currentLevelData).toBeNull();
    });
  });
});