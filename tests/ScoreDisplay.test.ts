import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreDisplay } from '../js/components/ScoreDisplay.js';

interface MockElement {
  textContent: string;
  style: {
    transform: string;
    color: string;
  };
}

interface DifferenceFoundEvent {
  detail: {
    totalFound: number;
  };
}

describe('ScoreDisplay', () => {
  let scoreDisplay: ScoreDisplay;
  let mockElement: MockElement;

  beforeEach(() => {
    vi.useFakeTimers();
    mockElement = {
      textContent: '',
      style: {
        transform: '',
        color: ''
      }
    };

    (global as any).document = {
      getElementById: vi.fn(() => mockElement),
      addEventListener: vi.fn()
    };

    scoreDisplay = new ScoreDisplay('score-count');
  });

  it('should initialize with score of 0', () => {
    expect(scoreDisplay.getScore()).toBe(0);
  });

  it('should set up event listeners', () => {
    scoreDisplay.setupEventListeners();
    expect((global as any).document.addEventListener).toHaveBeenCalledWith('differenceFound', expect.any(Function));
    expect((global as any).document.addEventListener).toHaveBeenCalledWith('gameReset', expect.any(Function));
  });

  it('should animate score when updated', () => {
    scoreDisplay.updateScore(3);
    expect(mockElement.style.transform).toBe('scale(1.2)');
    expect(mockElement.style.color).toBe('#38a169');
    vi.runAllTimers();
    expect(mockElement.style.transform).toBe('scale(1)');
    expect(mockElement.style.color).toBe('#667eea');
  });

  it('should handle differenceFound event', () => {
    const event: DifferenceFoundEvent = {
      detail: {
        totalFound: 3
      }
    };
    const updateScoreSpy = vi.spyOn(scoreDisplay, 'updateScore');
    (scoreDisplay as any).setupEventListeners();
    const eventHandler = (global as any).document.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'differenceFound')[1];
    eventHandler(event);
    expect(updateScoreSpy).toHaveBeenCalledWith(3);
  });

  it('should handle gameReset event', () => {
    scoreDisplay.updateScore(5);
    const resetSpy = vi.spyOn(scoreDisplay, 'reset');
    (scoreDisplay as any).setupEventListeners();
    const eventHandler = (global as any).document.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'gameReset')[1];
    eventHandler();
    expect(resetSpy).toHaveBeenCalled();
  });
});