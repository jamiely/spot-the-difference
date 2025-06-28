import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from '../js/Game.js';

// Mock the imported modules
vi.mock('../js/components/GameBoard.js', () => ({
  GameBoard: vi.fn().mockImplementation(() => ({
    setDifferences: vi.fn(),
    reset: vi.fn(),
    getProgress: vi.fn(() => ({ found: 0, total: 3, isComplete: false }))
  }))
}));

vi.mock('../js/components/ScoreDisplay.js', () => ({
  ScoreDisplay: vi.fn().mockImplementation(() => ({
    getScore: vi.fn(() => 0)
  }))
}));

vi.mock('../js/utils/ImageGenerator.js', () => ({
  ImageGenerator: {
    generateTestImages: vi.fn(() => [
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 100, y: 100, width: 30, height: 30 }
    ])
  }
}));

describe('Game', () => {
  let game;
  let mockStartButton;
  let mockResetButton;
  let mockCanvas;

  beforeEach(() => {
    mockStartButton = {
      addEventListener: vi.fn(),
      disabled: false
    };

    mockResetButton = {
      addEventListener: vi.fn(),
      disabled: false
    };

    mockCanvas = {
      width: 400,
      height: 300
    };

    global.document = {
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'start-game':
            return mockStartButton;
          case 'reset-game':
            return mockResetButton;
          case 'left-canvas':
          case 'right-canvas':
            return mockCanvas;
          default:
            return null;
        }
      }),
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    };

    global.CustomEvent = vi.fn();
    global.alert = vi.fn();
    global.setTimeout = vi.fn((fn) => fn());
    global.console = { log: vi.fn() };

    game = new Game();
  });

  it('should initialize with game inactive', () => {
    expect(game.isGameActive).toBe(false);
  });

  it('should set up event listeners', () => {
    expect(mockStartButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockResetButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(global.document.addEventListener).toHaveBeenCalledWith('differenceFound', expect.any(Function));
  });

  it('should start game correctly', () => {
    game.startGame();
    
    expect(game.isGameActive).toBe(true);
    expect(game.gameBoard.setDifferences).toHaveBeenCalled();
  });

  it('should reset game correctly', () => {
    game.isGameActive = true;
    game.resetGame();
    
    expect(game.isGameActive).toBe(false);
    expect(game.gameBoard.reset).toHaveBeenCalled();
  });

  it('should handle difference found event', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    const detail = {
      totalFound: 2,
      totalDifferences: 3
    };
    
    game.handleDifferenceFound(detail);
    
    expect(consoleSpy).toHaveBeenCalledWith('Difference found! Progress: 2/3');
  });

  it('should handle game completion', () => {
    game.isGameActive = true;
    game.handleGameComplete();
    
    expect(game.isGameActive).toBe(false);
    expect(global.setTimeout).toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalled();
  });

  it('should update button states correctly when game is active', () => {
    game.isGameActive = true;
    game.updateButtonStates();
    
    expect(mockStartButton.disabled).toBe(true);
  });

  it('should update button states correctly when game is inactive', () => {
    game.isGameActive = false;
    game.updateButtonStates();
    
    expect(mockStartButton.disabled).toBe(false);
  });

  it('should return correct game state', () => {
    const state = game.getGameState();
    
    expect(state).toHaveProperty('isActive');
    expect(state).toHaveProperty('progress');
    expect(state).toHaveProperty('score');
  });

  it('should dispatch custom events', () => {
    game.dispatchEvent('testEvent', { data: 'test' });
    
    expect(global.CustomEvent).toHaveBeenCalledWith('testEvent', { detail: { data: 'test' } });
    expect(global.document.dispatchEvent).toHaveBeenCalled();
  });
});