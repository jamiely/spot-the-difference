import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from '../js/Game.js';

// Type definitions for mock objects
interface MockElement {
    addEventListener: ReturnType<typeof vi.fn>;
    disabled: boolean;
    style: { [key: string]: string };
    src?: string;
}

interface MockScoreDisplay {
    getScore: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
}

interface MockSpriteManager {
    loadAvailableSprites: ReturnType<typeof vi.fn>;
    displayAllSprites: ReturnType<typeof vi.fn>;
    clearSprites: ReturnType<typeof vi.fn>;
    getLoadedSpritesCount: ReturnType<typeof vi.fn>;
    getSpriteCount?: ReturnType<typeof vi.fn>;
}

interface MockEditMode {
    isActive: boolean;
    getBoundingBoxes: ReturnType<typeof vi.fn>;
    setOtherMode: ReturnType<typeof vi.fn>;
}

interface MockPlacementMode {
    isActive: boolean;
    setOtherMode: ReturnType<typeof vi.fn>;
}

interface MockBackgroundLoader {
    loadAvailableBackgrounds: ReturnType<typeof vi.fn>;
    getRandomBackground: ReturnType<typeof vi.fn>;
    loadBackgroundImage: ReturnType<typeof vi.fn>;
}

interface MockTemplateManager {
    loadAvailableTemplates: ReturnType<typeof vi.fn>;
    getTemplateById: ReturnType<typeof vi.fn>;
}

interface MockEvent {
    isActive: boolean;
    detail?: {
        useAllSprites?: boolean;
    };
    background?: string;
}

interface MockTemplate {
    name: string;
    background: string;
    sprites: Array<{
        src: string;
        x: number;
        y: number;
    }>;
}

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
  let game: Game;
  let mockStartButton: MockElement;
  let mockResetButton: MockElement;

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
      getElementById: vi.fn((id: string) => {
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
    } as any;

    global.CustomEvent = vi.fn() as any;
    global.console = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;

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
    expect((game as any).backgroundLoader.loadBackgroundImage).toHaveBeenCalled();
  });

  it('should reset game correctly', () => {
    game.isGameActive = true;
    game.resetGame();
    
    expect(game.isGameActive).toBe(false);
    expect((game as any).spriteManager.clearSprites).toHaveBeenCalled();
  });

  it('should return correct game state', () => {
    const state = game.getGameState();
    
    expect(state).toHaveProperty('isActive');
    expect(state).toHaveProperty('score');
    expect(state).toHaveProperty('editMode');
  });

  it('should dispatch custom events', () => {
    (game as any).dispatchEvent('testEvent', { data: 'test' });
    
    expect(global.CustomEvent).toHaveBeenCalledWith('testEvent', { detail: { data: 'test' } });
    expect(global.document.dispatchEvent).toHaveBeenCalled();
  });

  it('should handle edit mode toggle events', async () => {
    const mockEvent: MockEvent = { isActive: true };
    
    // Simulate edit mode becoming active
    await (game as any).handleEditModeToggle(mockEvent);
    expect((game as any).spriteManager.clearSprites).toHaveBeenCalled();

    // Simulate edit mode becoming inactive
    mockEvent.isActive = false;
    game.isGameActive = true;
    await (game as any).handleEditModeToggle(mockEvent);
    expect((game as any).spriteManager.displayAllSprites).toHaveBeenCalled();
  });

  it('should handle placement mode toggle events', async () => {
    const mockEvent: MockEvent = { isActive: true };
    game.isGameActive = true;
    (game as any).spriteManager.getSpriteCount = vi.fn(() => 0);
    
    // Simulate placement mode becoming active
    await (game as any).handlePlacementModeToggle(mockEvent);
    expect((game as any).spriteManager.displayAllSprites).toHaveBeenCalled();
  });

  it('should load background and sprites on start', async () => {
    (game as any).templateManager.loadAvailableTemplates = vi.fn();
    (game as any).templateManager.getTemplateById = vi.fn(() => null);
    
    await game.startGame();
    
    expect((game as any).templateManager.loadAvailableTemplates).toHaveBeenCalled();
    expect((game as any).backgroundLoader.getRandomBackground).toHaveBeenCalled();
  });

  it('should load template when available', async () => {
    const mockTemplate: MockTemplate = {
      name: 'Test Template',
      background: 'test-bg.png',
      sprites: [
        { src: 'sprite1.png', x: 10, y: 20 }
      ]
    };
    
    (game as any).templateManager.loadAvailableTemplates = vi.fn();
    (game as any).templateManager.getTemplateById = vi.fn(() => mockTemplate);
    (game as any).loadTemplate = vi.fn();
    
    await game.startGame();
    
    expect((game as any).loadTemplate).toHaveBeenCalledWith(mockTemplate);
  });

  it('should handle sprite generation requests', async () => {
    const mockEvent: MockEvent = { 
      isActive: false,
      detail: { 
        useAllSprites: false 
      } 
    };
    game.isGameActive = true;
    
    await (game as any).handleSpriteGenerationRequest(mockEvent);
    
    expect((game as any).spriteManager.displayAllSprites).toHaveBeenCalled();
  });

  it('should handle background change requests', async () => {
    const mockEvent: MockEvent = { 
      isActive: false,
      background: 'new-background.png' 
    }; 
    game.isGameActive = true;
    
    await (game as any).handleBackgroundChangeRequest(mockEvent);
    
    expect((game as any).backgroundLoader.loadBackgroundImage).toHaveBeenCalledWith('./backgrounds/new-background.png');
  });

  it('should handle background change requests with full path', async () => {
    const mockEvent: MockEvent = { 
      isActive: false,
      background: './backgrounds/full-path-background.png' 
    }; 
    game.isGameActive = true;
    
    await (game as any).handleBackgroundChangeRequest(mockEvent);
    
    expect((game as any).backgroundLoader.loadBackgroundImage).toHaveBeenCalledWith('./backgrounds/full-path-background.png');
  });
});