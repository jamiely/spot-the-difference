import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameBoard } from '../js/components/GameBoard.js';

// Type definitions for mock objects
interface MockCanvas {
    getContext: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    width: number;
    height: number;
}

interface MockContext {
    drawImage: ReturnType<typeof vi.fn>;
    clearRect: ReturnType<typeof vi.fn>;
    strokeStyle: string;
    lineWidth: number;
    beginPath: ReturnType<typeof vi.fn>;
    arc: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
}

interface MockDifference {
    x: number;
    y: number;
    width: number;
    height: number;
}

describe('GameBoard', () => {
  let gameBoard: GameBoard;
  let mockCanvas: MockCanvas;
  let mockContext: MockContext;

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
      getElementById: vi.fn((id: string) => {
        if (id === 'left-canvas' || id === 'right-canvas') {
          return mockCanvas;
        }
        return null;
      }),
      dispatchEvent: vi.fn()
    } as any;

    global.CustomEvent = vi.fn() as any;

    gameBoard = new GameBoard('left-canvas', 'right-canvas');
  });

  it('should initialize with empty differences and found differences', () => {
    expect((gameBoard as any).differences).toEqual([]);
    expect((gameBoard as any).foundDifferences.size).toBe(0);
  });

  it('should set up event listeners on canvas elements', () => {
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should set differences correctly', () => {
    const testDifferences: MockDifference[] = [
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 100, y: 100, width: 30, height: 30 }
    ];

    (gameBoard as any).setDifferences(testDifferences);
    expect((gameBoard as any).differences).toEqual(testDifferences);
  });

  it('should detect when a point is in a difference area', () => {
    const difference: MockDifference = { x: 10, y: 10, width: 50, height: 50 };
    
    expect((gameBoard as any).isPointInDifference(30, 30, difference)).toBe(true);
    expect((gameBoard as any).isPointInDifference(5, 5, difference)).toBe(false);
    expect((gameBoard as any).isPointInDifference(70, 70, difference)).toBe(false);
  });

  it('should mark difference as found when clicked', () => {
    const testDifferences: MockDifference[] = [
      { x: 10, y: 10, width: 50, height: 50 }
    ];
    
    (gameBoard as any).setDifferences(testDifferences);
    
    const result = (gameBoard as any).checkForDifference(30, 30, 'left');
    
    expect(result).toBe(true);
    expect((gameBoard as any).foundDifferences.has(0)).toBe(true);
  });

  it('should not mark already found differences', () => {
    const testDifferences: MockDifference[] = [
      { x: 10, y: 10, width: 50, height: 50 }
    ];
    
    (gameBoard as any).setDifferences(testDifferences);
    (gameBoard as any).foundDifferences.add(0);
    
    const result = (gameBoard as any).checkForDifference(30, 30, 'left');
    
    expect(result).toBe(false);
  });

  it('should reset game state correctly', () => {
    (gameBoard as any).foundDifferences.add(0);
    (gameBoard as any).foundDifferences.add(1);
    
    (gameBoard as any).reset();
    
    expect((gameBoard as any).foundDifferences.size).toBe(0);
    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 400, 300);
  });

  it('should return correct progress information', () => {
    const testDifferences: MockDifference[] = [
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 100, y: 100, width: 30, height: 30 }
    ];
    
    (gameBoard as any).setDifferences(testDifferences);
    (gameBoard as any).foundDifferences.add(0);
    
    const progress = (gameBoard as any).getProgress();
    
    expect(progress.found).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.isComplete).toBe(false);
  });

  it('should indicate completion when all differences are found', () => {
    const testDifferences: MockDifference[] = [
      { x: 10, y: 10, width: 50, height: 50 }
    ];
    
    (gameBoard as any).setDifferences(testDifferences);
    (gameBoard as any).foundDifferences.add(0);
    
    const progress = (gameBoard as any).getProgress();
    
    expect(progress.isComplete).toBe(true);
  });
});