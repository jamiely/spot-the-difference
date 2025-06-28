import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreDisplay } from '../js/components/ScoreDisplay.js';

describe('ScoreDisplay', () => {
  let scoreDisplay;
  let mockElement;

  beforeEach(() => {
    vi.useFakeTimers();
    mockElement = {
      textContent: '',
      style: {
        transform: '',
        color: ''
      }
    };

    global.document = {
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
    expect(global.document.addEventListener).toHaveBeenCalledWith('differenceFound', expect.any(Function));
    expect(global.document.addEventListener).toHaveBeenCalledWith('gameReset', expect.any(Function));
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
    const event = {
      detail: {
        totalFound: 3
      }
    };
    const updateScoreSpy = vi.spyOn(scoreDisplay, 'updateScore');
    scoreDisplay.setupEventListeners();
    const eventHandler = global.document.addEventListener.mock.calls
      .find(call => call[0] === 'differenceFound')[1];
    eventHandler(event);
    expect(updateScoreSpy).toHaveBeenCalledWith(3);
  });

  it('should handle gameReset event', () => {
    scoreDisplay.updateScore(5);
    const resetSpy = vi.spyOn(scoreDisplay, 'reset');
    scoreDisplay.setupEventListeners();
    const eventHandler = global.document.addEventListener.mock.calls
      .find(call => call[0] === 'gameReset')[1];
    eventHandler();
    expect(resetSpy).toHaveBeenCalled();
  });
});