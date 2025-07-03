import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from '../js/Game.js';

// Mock the imported modules
vi.mock('../js/components/ScoreDisplay.js', () => ({
  ScoreDisplay: vi.fn().mockImplementation(() => ({
    getScore: vi.fn(() => 0),
    reset: vi.fn(),
  }))
}));

vi.mock('../js/components/SpriteManager.js', () => ({
  SpriteManager: vi.fn().mockImplementation(() => ({
    loadAvailableSprites: vi.fn(),
    displayAllSprites: vi.fn(),
    clearSprites: vi.fn(),
    getLoadedSpritesCount: vi.fn(() => 5)
  }))
}));

vi.mock('../js/components/EditMode.js', () => ({
  EditMode: vi.fn().mockImplementation(() => ({
    isActive: false,
    getBoundingBoxes: vi.fn(() => []),
    setOtherMode: vi.fn(),
  }))
}));

vi.mock('../js/components/PlacementMode.js', () => ({
  PlacementMode: vi.fn().mockImplementation(() => ({
    isActive: false,
    setOtherMode: vi.fn(),
  }))
}));

vi.mock('../js/utils/BackgroundLoader.js', () => ({
  BackgroundLoader: vi.fn().mockImplementation(() => ({
    loadAvailableBackgrounds: vi.fn(),
    getRandomBackground: vi.fn(() => 'background.png'),
    loadBackgroundImage: vi.fn(() => Promise.resolve({ src: 'background.png' })),
  }))
}));

vi.mock('../js/utils/TemplateManager.js', () => ({
  TemplateManager: vi.fn().mockImplementation(() => ({
    loadAvailableTemplates: vi.fn(),
    getTemplateById: vi.fn(),
  }))
}));

describe('Game', () => {
  let game;
  let mockStartButton;
  let mockResetButton;

  beforeEach(() => {
    mockStartButton = {
      addEventListener: vi.fn(),
      disabled: false
    };

    mockResetButton = {
      addEventListener: vi.fn(),
      disabled: false
    };

    global.document = {
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'start-game':
            return mockStartButton;
          case 'reset-game':
            return mockResetButton;
          case 'background-image':
            return { style: {}, src: '' };
          default:
            return { addEventListener: vi.fn(), style: {} };
        }
      }),
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    };

    global.CustomEvent = vi.fn();
    global.console = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    game = new Game();
  });

  it('should initialize with game inactive', () => {
    expect(game.isGameActive).toBe(false);
  });

  it('should set up event listeners', () => {
    expect(mockStartButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockResetButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(global.document.addEventListener).toHaveBeenCalledWith('editModeToggled', expect.any(Function));
  });

  it('should start game correctly', async () => {
    await game.startGame();
    
    expect(game.isGameActive).toBe(true);
    expect(game.backgroundLoader.loadBackgroundImage).toHaveBeenCalled();
  });

  it('should reset game correctly', () => {
    game.isGameActive = true;
    game.resetGame();
    
    expect(game.isGameActive).toBe(false);
    expect(game.spriteManager.clearSprites).toHaveBeenCalled();
  });

  it('should return correct game state', () => {
    const state = game.getGameState();
    
    expect(state).toHaveProperty('isActive');
    expect(state).toHaveProperty('score');
    expect(state).toHaveProperty('editMode');
  });

  it('should dispatch custom events', () => {
    game.dispatchEvent('testEvent', { data: 'test' });
    
    expect(global.CustomEvent).toHaveBeenCalledWith('testEvent', { detail: { data: 'test' } });
    expect(global.document.dispatchEvent).toHaveBeenCalled();
  });

  it('should handle edit mode toggle events', async () => {
    const mockEvent = { isActive: true };
    
    // Simulate edit mode becoming active
    await game.handleEditModeToggle(mockEvent);
    expect(game.spriteManager.clearSprites).toHaveBeenCalled();

    // Simulate edit mode becoming inactive
    mockEvent.isActive = false;
    game.isGameActive = true;
    await game.handleEditModeToggle(mockEvent);
    expect(game.spriteManager.displayAllSprites).toHaveBeenCalled();
  });

  it('should handle placement mode toggle events', async () => {
    const mockEvent = { isActive: true };
    game.isGameActive = true;
    game.spriteManager.getSpriteCount = vi.fn(() => 0);
    
    // Simulate placement mode becoming active
    await game.handlePlacementModeToggle(mockEvent);
    expect(game.spriteManager.displayAllSprites).toHaveBeenCalled();
  });

  it('should load background and sprites on start', async () => {
    game.templateManager.loadAvailableTemplates = vi.fn();
    game.templateManager.getTemplateById = vi.fn(() => null);
    
    await game.startGame();
    
    expect(game.templateManager.loadAvailableTemplates).toHaveBeenCalled();
    expect(game.backgroundLoader.getRandomBackground).toHaveBeenCalled();
  });

  it('should load template when available', async () => {
    const mockTemplate = {
      name: 'Test Template',
      background: 'test-bg.png',
      sprites: [
        { src: 'sprite1.png', x: 10, y: 20 }
      ]
    };
    
    game.templateManager.loadAvailableTemplates = vi.fn();
    game.templateManager.getTemplateById = vi.fn(() => mockTemplate);
    game.loadTemplate = vi.fn();
    
    await game.startGame();
    
    expect(game.loadTemplate).toHaveBeenCalledWith(mockTemplate);
  });

  it('should handle sprite generation requests', async () => {
    const mockEvent = { 
      detail: { 
        useAllSprites: false 
      } 
    };
    game.isGameActive = true;
    
    await game.handleSpriteGenerationRequest(mockEvent);
    
    expect(game.spriteManager.displayAllSprites).toHaveBeenCalled();
  });

  it('should handle background change requests', async () => {
    const mockEvent = { 
      background: 'new-background.png' 
    }; 
    game.isGameActive = true;
    
    await game.handleBackgroundChangeRequest(mockEvent);
    
    expect(game.backgroundLoader.loadBackgroundImage).toHaveBeenCalledWith('new-background.png');
  });
});