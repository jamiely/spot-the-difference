import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the SpotTheDifferenceGame import
vi.mock('../js/SpotTheDifferenceGame.js', () => ({
  SpotTheDifferenceGame: vi.fn().mockImplementation(() => ({
    startGame: vi.fn(),
  }))
}));

interface MockGame {
  startGame: ReturnType<typeof vi.fn>;
}

interface MockDocument {
  addEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
}

describe('main.ts', () => {
  let mockGame: MockGame;
  let mockDocument: MockDocument;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    vi.resetModules();
    
    // Mock the SpotTheDifferenceGame constructor
    const { SpotTheDifferenceGame } = await import('../js/SpotTheDifferenceGame.js');
    mockGame = {
      startGame: vi.fn()
    };
    (SpotTheDifferenceGame as any).mockReturnValue(mockGame);

    // Mock document and DOM
    mockDocument = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    };

    (global as any).document = mockDocument;
    (global as any).window = { game: null };
    (global as any).console = { log: vi.fn() };
    (global as any).setTimeout = vi.fn((callback: () => void) => callback());
  });

  it('should initialize game on DOMContentLoaded', async () => {
    // Import main.ts to trigger the DOMContentLoaded setup
    await import('../js/main.js');

    // Find and call the DOMContentLoaded handler
    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Verify game was created and stored in window
    const { SpotTheDifferenceGame } = await import('../js/SpotTheDifferenceGame.js');
    expect(SpotTheDifferenceGame).toHaveBeenCalled();
    expect((global as any).window.game).toBe(mockGame);
  });

  it('should set up game event listeners', async () => {
    await import('../js/main.js');

    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Verify event listeners were added
    expect(mockDocument.addEventListener).toHaveBeenCalledWith('gameStarted', expect.any(Function));
    expect(mockDocument.addEventListener).toHaveBeenCalledWith('gameReset', expect.any(Function));
    expect(mockDocument.addEventListener).toHaveBeenCalledWith('gameCompleted', expect.any(Function));
  });

  it('should log when game events are dispatched', async () => {
    await import('../js/main.js');

    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Test gameStarted event
    const gameStartedHandler = mockDocument.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'gameStarted')[1];
    gameStartedHandler();
    expect((global as any).console.log).toHaveBeenCalledWith('Game started!');

    // Test gameReset event
    const gameResetHandler = mockDocument.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'gameReset')[1];
    gameResetHandler();
    expect((global as any).console.log).toHaveBeenCalledWith('Game reset!');

    // Test gameCompleted event
    const gameCompletedHandler = mockDocument.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'gameCompleted')[1];
    gameCompletedHandler();
    expect((global as any).console.log).toHaveBeenCalledWith('Game completed!');
  });

  it('should skip auto-start in test environment', async () => {
    await import('../js/main.js');

    const domContentLoadedHandler = mockDocument.addEventListener.mock.calls
      .find((call: any[]) => call[0] === 'DOMContentLoaded')[1];
    
    domContentLoadedHandler();

    // Verify setTimeout was NOT called because we're in test environment
    expect((global as any).setTimeout).not.toHaveBeenCalledWith(expect.any(Function), 500);
    
    // Verify game.startGame was NOT called automatically
    expect(mockGame.startGame).not.toHaveBeenCalled();
  });
});