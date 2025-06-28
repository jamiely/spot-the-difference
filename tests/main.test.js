import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';

// Mock the SpotTheDifferenceGame class
vi.mock('../js/SpotTheDifferenceGame.js', () => ({
  SpotTheDifferenceGame: vi.fn().mockImplementation(() => ({
    startGame: vi.fn(),
  })),
}));

describe('main.js', () => {
  let addEventListenerSpy;
  let setTimeoutSpy;

  beforeEach(() => {
    // Reset mocks and spies before each test
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    // Manually trigger DOMContentLoaded after mocks are set up
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
  });

  it('should add DOMContentLoaded event listener', () => {
    expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
  });

  it('should initialize SpotTheDifferenceGame and start it after DOMContentLoaded', () => {
    expect(SpotTheDifferenceGame).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);

    // Advance timers to trigger startGame
    vi.runAllTimers();
    const gameInstance = SpotTheDifferenceGame.mock.results[0].value;
    expect(gameInstance.startGame).toHaveBeenCalledTimes(1);
  });

  it('should expose game instance globally', () => {
    const gameInstance = SpotTheDifferenceGame.mock.results[0].value;
    expect(window.game).toBe(gameInstance);
  });
});