import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameBoard } from '../js/components/GameBoard.js';

describe('GameBoard', () => {
  let gameBoard;
  let mockCanvas;
  let mockContext;

  beforeEach(() => {
    mockContext = {
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn()
    };

    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      addEventListener: vi.fn(),
      width: 400,
      height: 300
    };

    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'left-canvas' || id === 'right-canvas') {
          return mockCanvas;
        }
        return null;
      }),
      dispatchEvent: vi.fn()
    };

    global.CustomEvent = vi.fn();

    gameBoard = new GameBoard('left-canvas', 'right-canvas');
  });

  it('should initialize with empty differences and found differences', () => {
    expect(gameBoard.differences).toEqual([]);
    expect(gameBoard.foundDifferences.size).toBe(0);
  });

  it('should set up event listeners on canvas elements', () => {
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should set differences correctly', () => {
    const testDifferences = [
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 100, y: 100, width: 30, height: 30 }
    ];

    gameBoard.setDifferences(testDifferences);
    expect(gameBoard.differences).toEqual(testDifferences);
  });

  it('should detect when a point is in a difference area', () => {
    const difference = { x: 10, y: 10, width: 50, height: 50 };
    
    expect(gameBoard.isPointInDifference(30, 30, difference)).toBe(true);
    expect(gameBoard.isPointInDifference(5, 5, difference)).toBe(false);
    expect(gameBoard.isPointInDifference(70, 70, difference)).toBe(false);
  });

  it('should mark difference as found when clicked', () => {
    const testDifferences = [
      { x: 10, y: 10, width: 50, height: 50 }
    ];
    
    gameBoard.setDifferences(testDifferences);
    
    const result = gameBoard.checkForDifference(30, 30, 'left');
    
    expect(result).toBe(true);
    expect(gameBoard.foundDifferences.has(0)).toBe(true);
  });

  it('should not mark already found differences', () => {
    const testDifferences = [
      { x: 10, y: 10, width: 50, height: 50 }
    ];
    
    gameBoard.setDifferences(testDifferences);
    gameBoard.foundDifferences.add(0);
    
    const result = gameBoard.checkForDifference(30, 30, 'left');
    
    expect(result).toBe(false);
  });

  it('should reset game state correctly', () => {
    gameBoard.foundDifferences.add(0);
    gameBoard.foundDifferences.add(1);
    
    gameBoard.reset();
    
    expect(gameBoard.foundDifferences.size).toBe(0);
    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 400, 300);
  });

  it('should return correct progress information', () => {
    const testDifferences = [
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 100, y: 100, width: 30, height: 30 }
    ];
    
    gameBoard.setDifferences(testDifferences);
    gameBoard.foundDifferences.add(0);
    
    const progress = gameBoard.getProgress();
    
    expect(progress.found).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.isComplete).toBe(false);
  });

  it('should indicate completion when all differences are found', () => {
    const testDifferences = [
      { x: 10, y: 10, width: 50, height: 50 }
    ];
    
    gameBoard.setDifferences(testDifferences);
    gameBoard.foundDifferences.add(0);
    
    const progress = gameBoard.getProgress();
    
    expect(progress.isComplete).toBe(true);
  });
});