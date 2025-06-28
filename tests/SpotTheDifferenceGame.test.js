import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';
import { Game } from '../js/Game.js';
import { SpriteManager } from '../js/components/SpriteManager.js';
import { TemplateManager } from '../js/utils/TemplateManager.js';
import { BackgroundLoader } from '../js/utils/BackgroundLoader.js';
import { ScoreDisplay } from '../js/components/ScoreDisplay.js';

// Mock all dependencies
const mockTemplateManager = {
  loadAvailableTemplates: vi.fn(() => Promise.resolve()),
  getTemplateById: vi.fn(() => ({
    id: 'template1',
    name: 'Test Template',
    background: 'test_bg.png',
    sprites: [
      { id: 's1', src: 's1.png', x: 10, y: 10, width: 50, height: 50 },
      { id: 's2', src: 's2.png', x: 70, y: 70, width: 50, height: 50 },
      { id: 's3', src: 's3', x: 130, y: 130, width: 50, height: 50 },
    ],
  })),
};

const mockBackgroundLoader = {
  loadBackgroundImage: vi.fn((src) => Promise.resolve({ src: src })),
};

const mockScoreDisplay = {
  incrementScore: vi.fn(),
};

vi.mock('../js/Game.js', () => {
  class MockGame {
    constructor() {
      this.isGameActive = false;
      this.updateButtonStates = vi.fn();
      this.dispatchEvent = vi.fn();
      this.templateManager = mockTemplateManager;
      this.backgroundLoader = mockBackgroundLoader;
      this.scoreDisplay = mockScoreDisplay;
    }
  }
  return { Game: MockGame };
});

vi.mock('../js/components/SpriteManager.js', () => ({
  SpriteManager: vi.fn().mockImplementation(() => {
    const instance = {
      clearSprites: vi.fn(function() {
        this.activeSprites = []; // Reset activeSprites on clear
      }),
      createSpriteElement: vi.fn((src) => {
        const sprite = {
          src: `http://localhost/sprites/${src}`,
          style: { left: '0px', top: '0px' },
          dataset: {},
          remove: vi.fn(function() {
            const index = instance.activeSprites.indexOf(this);
            if (index > -1) {
              instance.activeSprites.splice(index, 1);
            }
          }),
          parentElement: { appendChild: vi.fn() },
        };
        return Promise.resolve(sprite);
      }),
      container: { appendChild: vi.fn() },
      activeSprites: [],
    };
    return instance;
  }),
}));

describe('SpotTheDifferenceGame', () => {
  let game;
  let mockLeftBoard;
  let mockRightBoard;
  let mockLeftBgImg;
  let mockRightBgImg;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockLeftBoard = {
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })),
      appendChild: vi.fn(),
    };
    mockRightBoard = {
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 400, top: 0, width: 400, height: 300 })),
      appendChild: vi.fn(),
    };
    mockLeftBgImg = {
      style: { display: '', width: '', maxWidth: '', height: '', borderRadius: '' },
      src: '',
      complete: true,
      onload: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })),
      parentElement: { getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })) },
    };
    mockRightBgImg = {
      style: { display: '', width: '', maxWidth: '', height: '', borderRadius: '' },
      src: '',
      complete: true,
      onload: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })),
      parentElement: { getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 400, height: 300 })) },
    };

    global.document = {
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'game-board-left': return mockLeftBoard;
          case 'game-board-right': return mockRightBoard;
          case 'background-image-left': return mockLeftBgImg;
          case 'background-image-right': return mockRightBgImg;
          case 'legacy-game-board': return { style: { display: '' } };
          default: return { style: {} };
        }
      }),
      querySelector: vi.fn(() => ({ style: { display: '' } })),
      addEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => []), // Default for .difference-marker
      createElement: vi.fn((tagName) => {
        const element = {
          tagName: tagName.toUpperCase(),
          className: '',
          style: {},
          dataset: {},
          textContent: '',
          remove: vi.fn(),
          appendChild: vi.fn(),
        };
        return element;
      }),
    };

    global.alert = vi.fn();
    global.console = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    game = new SpotTheDifferenceGame();
  });

  it('should initialize correctly and set up event listeners', () => {
    expect(game.isSpotTheeDifferenceMode).toBe(true);
    expect(mockLeftBoard.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockRightBoard.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should start game correctly', async () => {
    await game.startGame();
    expect(game.isGameActive).toBe(true);
    expect(document.querySelector).toHaveBeenCalledWith('.game-boards');
    expect(document.getElementById).toHaveBeenCalledWith('legacy-game-board');
    expect(mockTemplateManager.loadAvailableTemplates).toHaveBeenCalled();
    expect(game.dispatchEvent).toHaveBeenCalledWith('gameStarted');
  });

  it('should set background image for a side', () => {
    const mockImg = { src: 'path/to/image.png' };
    game.setBackgroundImage(mockImg, 'left');
    expect(mockLeftBgImg.src).toBe('path/to/image.png');
    expect(mockLeftBgImg.style.display).toBe('block');
  });

  it('should wait for image load', async () => {
    mockLeftBgImg.complete = false;
    const promise = game.waitForImageLoad('background-image-left');
    // Manually trigger onload and set onload to null as it would in a real browser
    mockLeftBgImg.onload(); 
    mockLeftBgImg.onload = null;
    await promise;
    expect(mockLeftBgImg.onload).toBeNull(); 
  });

  it('should not mark already found differences', () => {
    game.differences = [
      { id: 's1', centerX: 35, centerY: 35, side: 'right' },
    ];
    game.foundDifferences = ['s1'];
    game.isGameActive = true;
    const clickEvent = { 
      currentTarget: mockRightBoard, 
      clientX: 35, 
      clientY: 35 
    };
    game.handleBoardClick(clickEvent, 'right');
    expect(game.foundDifferences.length).toBe(1);
    expect(mockScoreDisplay.incrementScore).not.toHaveBeenCalled();
  });

  it('should reveal all differences', () => {
    game.differences = [
      { id: 's1', centerX: 35, centerY: 35, side: 'right' },
      { id: 's2', centerX: 95, centerY: 95, side: 'right' },
    ];
    game.foundDifferences = ['s1'];
    game.isGameActive = true;
    game.revealAllDifferences();
    expect(document.createElement).toHaveBeenCalledTimes(2); // For two markers
  });

  it('should end game when all differences are found', () => {
    game.differences = [
      { id: 's1', centerX: 35, centerY: 35, side: 'right' },
    ];
    game.isGameActive = true;
    game.markDifferenceFound(game.differences[0], 'right', 35, 35);
    expect(game.isGameActive).toBe(false);
    expect(global.alert).toHaveBeenCalled();
  });

  it('should reset game', () => {
    game.isGameActive = true;
    game.differences = [{ id: 's1' }];
    game.foundDifferences = ['s1'];
    game.resetGame();
    expect(game.isGameActive).toBe(false);
    expect(game.leftSpriteManager.clearSprites).toHaveBeenCalled();
    expect(game.rightSpriteManager.clearSprites).toHaveBeenCalled();
    expect(game.differences.length).toBe(0);
    expect(game.foundDifferences.length).toBe(0);
    expect(document.getElementById('background-image-left').style.display).toBe('none');
    expect(game.dispatchEvent).toHaveBeenCalledWith('gameReset');
  });

  it('should clear difference markers', () => {
    document.querySelectorAll.mockReturnValueOnce([
      { remove: vi.fn() },
      { remove: vi.fn() },
    ]);
    game.clearDifferenceMarkers();
    expect(document.querySelectorAll).toHaveBeenCalledWith('.difference-marker');
    expect(document.querySelectorAll().every(m => m.remove.toHaveBeenCalled())).toBe(true);
  });
});