import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';
import { LevelManager } from '../js/components/LevelManager.js';

// Mock the dependencies
vi.mock('../js/Game.js', () => ({
  Game: class MockGame {
    constructor() {
      this.isGameActive = false;
      this.updateButtonStates = vi.fn();
      this.dispatchEvent = vi.fn();
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

// Mock dependencies
const mockTemplateManager = {
  loadAvailableTemplates: vi.fn(() => Promise.resolve([
    { name: 'template1', background: 'classroom.png', sprites: [] },
    { name: 'template2', background: 'office.png', sprites: [] }
  ])),
  getTemplateById: vi.fn(),
};

const mockBackgroundLoader = {
  loadBackgroundImage: vi.fn((src) => Promise.resolve({ src })),
  loadAvailableBackgrounds: vi.fn(() => Promise.resolve([
    { filename: 'park.png' },
    { filename: 'library.png' },
    { filename: 'classroom.png' }, // This should be filtered out as it's used in templates
    { filename: 'office.png' }     // This should be filtered out as it's used in templates
  ])),
};

const mockScoreDisplay = {
  incrementScore: vi.fn(),
};

describe('Level Progression System', () => {
  let game;
  let mockConfirm;
  let mockAlert;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global functions
    mockConfirm = vi.fn();
    mockAlert = vi.fn();
    global.confirm = mockConfirm;
    global.alert = mockAlert;
    
    // Mock DOM elements
    global.document = {
      getElementById: vi.fn(() => ({ 
        style: { display: '' },
        addEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })),
        appendChild: vi.fn(),
        src: '',
        complete: true
      })),
      querySelector: vi.fn(() => ({ style: { display: '' } })),
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      createElement: vi.fn(() => ({ 
        style: {}, 
        remove: vi.fn(),
        className: '',
        textContent: '',
        dataset: {}
      })),
    };
    
    global.window = {
      location: {
        search: '',
        hostname: 'localhost',
        port: '3000'
      }
    };
    
    global.console = { 
      log: vi.fn(), 
      warn: vi.fn(), 
      error: vi.fn() 
    };
    
    game = new SpotTheDifferenceGame();
    
    // Force test mode OFF for level progression tests
    game.isTestMode = false;
    
    // Initialize the game's level manager with our mocks
    game.levelManager = new LevelManager(mockTemplateManager, mockBackgroundLoader);
  });

  describe('endGame method behavior', () => {
    it('should call levelManager.completeLevel when template is completed', async () => {
      // Setup: game is active with a template level
      game.isGameActive = true;
      game.isTestMode = false;
      game.currentLevelData = {
        type: 'template',
        data: { name: 'template1' },
        levelInfo: { description: 'Template 1 of 2' }
      };
      game.differences = [{ id: 'diff1' }];
      
      // Mock the level manager methods
      game.levelManager.completeLevel = vi.fn();
      game.levelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'random',
        data: { filename: 'park.png' },
        levelInfo: { description: 'Random Level 1 of 2' }
      }));
      
      // Mock loadNextLevel to track if it's called
      game.loadNextLevel = vi.fn();
      
      // Mock confirm to return true (user wants to continue)
      mockConfirm.mockReturnValue(true);
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the current level
      expect(game.levelManager.completeLevel).toHaveBeenCalledWith('template', 'template1');
      
      // Assert: should check for next level
      expect(game.levelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should show confirmation dialog
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Template 1 of 2 completed!')
      );
      
      // Assert: should call loadNextLevel when user confirms
      expect(game.loadNextLevel).toHaveBeenCalled();
    });

    it('should handle level progression from template to random background', async () => {
      // Setup: we're on the last template
      game.isGameActive = true;
      game.isTestMode = false;
      game.currentLevelData = {
        type: 'template',
        data: { name: 'template2' },
        levelInfo: { description: 'Template 2 of 2' }
      };
      game.differences = [{ id: 'diff1' }];
      
      // Mock level manager to return a random background for the next level
      game.levelManager.completeLevel = vi.fn();
      game.levelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'random',
        data: { filename: 'park.png' },
        levelInfo: { description: 'Random Level 1 of 2' }
      }));
      
      // Mock loadNextLevel to verify it's called
      game.loadNextLevel = vi.fn();
      
      // Mock confirm to return true
      mockConfirm.mockReturnValue(true);
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the template
      expect(game.levelManager.completeLevel).toHaveBeenCalledWith('template', 'template2');
      
      // Assert: should get the next level (which should be random)
      expect(game.levelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should show appropriate message
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Template 2 of 2 completed!')
      );
      
      // Assert: should load the next level
      expect(game.loadNextLevel).toHaveBeenCalled();
    });

    it('should handle game completion when no more levels', async () => {
      // Setup: we're on the last level
      game.isGameActive = true;
      game.isTestMode = false;
      game.currentLevelData = {
        type: 'random',
        data: { filename: 'library.png' },
        levelInfo: { description: 'Random Level 2 of 2' }
      };
      game.differences = [{ id: 'diff1' }];
      
      // Mock level manager to return null (no more levels)
      game.levelManager.completeLevel = vi.fn();
      game.levelManager.getNextLevel = vi.fn(() => Promise.resolve(null));
      
      // Mock handleGameComplete
      game.handleGameComplete = vi.fn();
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the current level
      expect(game.levelManager.completeLevel).toHaveBeenCalledWith('random', 'library.png');
      
      // Assert: should check for next level
      expect(game.levelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should call handleGameComplete
      expect(game.handleGameComplete).toHaveBeenCalled();
      
      // Assert: should not show level completion dialog
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('should handle user declining to continue', async () => {
      // Setup: game is active with a template level
      game.isGameActive = true;
      game.isTestMode = false;
      game.currentLevelData = {
        type: 'template',
        data: { name: 'template1' },
        levelInfo: { description: 'Template 1 of 2' }
      };
      game.differences = [{ id: 'diff1' }];
      
      // Mock the level manager methods
      game.levelManager.completeLevel = vi.fn();
      game.levelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'random',
        data: { filename: 'park.png' },
        levelInfo: { description: 'Random Level 1 of 2' }
      }));
      
      // Mock loadNextLevel to ensure it's NOT called
      game.loadNextLevel = vi.fn();
      
      // Mock confirm to return false (user doesn't want to continue)
      mockConfirm.mockReturnValue(false);
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should complete the current level
      expect(game.levelManager.completeLevel).toHaveBeenCalledWith('template', 'template1');
      
      // Assert: should check for next level
      expect(game.levelManager.getNextLevel).toHaveBeenCalled();
      
      // Assert: should show confirmation dialog
      expect(mockConfirm).toHaveBeenCalled();
      
      // Assert: should NOT call loadNextLevel when user declines
      expect(game.loadNextLevel).not.toHaveBeenCalled();
      
      // Assert: should set game inactive
      expect(game.isGameActive).toBe(false);
    });

    it('should work in test mode with simple behavior', async () => {
      // Setup: game is in test mode
      game.isGameActive = true;
      game.isTestMode = true;
      game.differences = [{ id: 'diff1' }];
      
      // Mock methods that shouldn't be called in test mode
      game.levelManager.completeLevel = vi.fn();
      game.levelManager.getNextLevel = vi.fn();
      game.loadNextLevel = vi.fn();
      
      // Act: call endGame
      await game.endGame();
      
      // Assert: should use simple test mode behavior
      expect(game.isGameActive).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Congratulations! You found all 1 differences!');
      
      // Assert: should NOT call level progression methods
      expect(game.levelManager.completeLevel).not.toHaveBeenCalled();
      expect(game.levelManager.getNextLevel).not.toHaveBeenCalled();
      expect(game.loadNextLevel).not.toHaveBeenCalled();
    });
  });

  describe('Level Manager Integration', () => {
    it('should correctly identify template vs random levels', async () => {
      // Wait for level manager to initialize
      await game.levelManager.waitForInitialization();
      
      // First level should be a template
      const firstLevel = await game.levelManager.getNextLevel();
      expect(firstLevel.type).toBe('template');
      expect(['template1', 'template2']).toContain(firstLevel.data.name);
      
      // Complete the first template
      game.levelManager.completeLevel('template', firstLevel.data.name);
      
      // Second level should be the other template
      const secondLevel = await game.levelManager.getNextLevel();
      expect(secondLevel.type).toBe('template');
      expect(['template1', 'template2']).toContain(secondLevel.data.name);
      expect(secondLevel.data.name).not.toBe(firstLevel.data.name);
      
      // Complete the second template
      game.levelManager.completeLevel('template', secondLevel.data.name);
      
      // Third level should be random background
      const thirdLevel = await game.levelManager.getNextLevel();
      expect(thirdLevel.type).toBe('random');
      expect(['park.png', 'library.png']).toContain(thirdLevel.data.filename);
      
      // Complete the first random level
      game.levelManager.completeLevel('random', thirdLevel.data.filename);
      
      // Fourth level should be the other random background
      const fourthLevel = await game.levelManager.getNextLevel();
      expect(fourthLevel.type).toBe('random');
      expect(['park.png', 'library.png']).toContain(fourthLevel.data.filename);
      expect(fourthLevel.data.filename).not.toBe(thirdLevel.data.filename);
      
      // Complete the second random level
      game.levelManager.completeLevel('random', fourthLevel.data.filename);
      
      // Fifth level should be null (game complete)
      const fifthLevel = await game.levelManager.getNextLevel();
      expect(fifthLevel).toBeNull();
    });
  });

  describe('loadNextLevel method', () => {
    it('should load template level correctly', async () => {
      // Setup: mock level manager to return a template
      game.levelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'template',
        data: { name: 'template1', background: 'classroom.png', sprites: [] },
        levelInfo: { description: 'Template 1 of 2' }
      }));
      
      // Mock the setupSideBySideGame method
      game.setupSideBySideGame = vi.fn();
      game.displayLevelInfo = vi.fn();
      
      // Act: call loadNextLevel
      await game.loadNextLevel();
      
      // Assert: should set current level data
      expect(game.currentLevelData.type).toBe('template');
      expect(game.currentLevelData.data.name).toBe('template1');
      
      // Assert: should call setupSideBySideGame for template
      expect(game.setupSideBySideGame).toHaveBeenCalledWith(game.currentLevelData.data);
      
      // Assert: should display level info
      expect(game.displayLevelInfo).toHaveBeenCalled();
    });

    it('should load random background level correctly', async () => {
      // Setup: mock level manager to return a random background
      game.levelManager.getNextLevel = vi.fn(() => Promise.resolve({
        type: 'random',
        data: { filename: 'park.png' },
        levelInfo: { description: 'Random Level 1 of 2' }
      }));
      
      // Mock the setupRandomBackgroundLevel method
      game.setupRandomBackgroundLevel = vi.fn();
      game.displayLevelInfo = vi.fn();
      
      // Act: call loadNextLevel
      await game.loadNextLevel();
      
      // Assert: should set current level data
      expect(game.currentLevelData.type).toBe('random');
      expect(game.currentLevelData.data.filename).toBe('park.png');
      
      // Assert: should call setupRandomBackgroundLevel for random
      expect(game.setupRandomBackgroundLevel).toHaveBeenCalledWith(game.currentLevelData.data);
      
      // Assert: should display level info
      expect(game.displayLevelInfo).toHaveBeenCalled();
    });

    it('should handle game completion when no more levels', async () => {
      // Setup: mock level manager to return null (no more levels)
      game.levelManager.getNextLevel = vi.fn(() => Promise.resolve(null));
      
      // Mock the handleGameComplete method
      game.handleGameComplete = vi.fn();
      
      // Act: call loadNextLevel
      await game.loadNextLevel();
      
      // Assert: should call handleGameComplete
      expect(game.handleGameComplete).toHaveBeenCalled();
      
      // Assert: should not set current level data
      expect(game.currentLevelData).toBeNull();
    });
  });
});