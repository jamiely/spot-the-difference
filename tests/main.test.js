import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the SpotTheDifferenceGame import
vi.mock('../js/SpotTheDifferenceGame.js', () => ({
  SpotTheDifferenceGame: vi.fn().mockImplementation(() => ({
    startGame: vi.fn(),
  }))
}));

describe('main.js', () => {
  let mockGame;
  let mockDocument;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    vi.resetModules();
    
    // Mock the SpotTheDifferenceGame constructor
    const { SpotTheDifferenceGame } = await import('../js/SpotTheDifferenceGame.js');
    mockGame = {
      startGame: vi.fn()
    };
    SpotTheDifferenceGame.mockReturnValue(mockGame);

    // Mock document and DOM
    mockDocument = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    };

    global.document = mockDocument;
    global.window = { game: null };
    global.console = { log: vi.fn() };
    global.setTimeout = vi.fn((callback) => callback());
  });

  it('should initialize game on DOMContentLoaded', async () => {
    // Import main.js to trigger the DOMContentLoaded setup
    await import('../js/main.js');

    // Find and call the DOMContentLoaded handler
    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find(call => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Verify game was created and stored in window
    const { SpotTheDifferenceGame } = await import('../js/SpotTheDifferenceGame.js');
    expect(SpotTheDifferenceGame).toHaveBeenCalled();
    expect(global.window.game).toBe(mockGame);
  });

  it('should set up game event listeners', async () => {
    await import('../js/main.js');

    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find(call => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Verify event listeners were added
    expect(mockDocument.addEventListener).toHaveBeenCalledWith('gameStarted', expect.any(Function));
    expect(mockDocument.addEventListener).toHaveBeenCalledWith('gameReset', expect.any(Function));
    expect(mockDocument.addEventListener).toHaveBeenCalledWith('gameCompleted', expect.any(Function));
  });

  it('should log when game events are dispatched', async () => {
    await import('../js/main.js');

    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find(call => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Test gameStarted event
    const gameStartedHandler = mockDocument.addEventListener.mock.calls
      .find(call => call[0] === 'gameStarted')[1];
    gameStartedHandler();
    expect(global.console.log).toHaveBeenCalledWith('Game started!');

    // Test gameReset event
    const gameResetHandler = mockDocument.addEventListener.mock.calls
      .find(call => call[0] === 'gameReset')[1];
    gameResetHandler();
    expect(global.console.log).toHaveBeenCalledWith('Game reset!');

    // Test gameCompleted event
    const gameCompletedHandler = mockDocument.addEventListener.mock.calls
      .find(call => call[0] === 'gameCompleted')[1];
    gameCompletedHandler();
    expect(global.console.log).toHaveBeenCalledWith('Game completed!');
  });

  it('should auto-start the game after delay', async () => {
    await import('../js/main.js');

    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find(call => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Verify setTimeout was called with 500ms delay
    expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
    
    // Verify game.startGame was called
    expect(mockGame.startGame).toHaveBeenCalled();
  });
});