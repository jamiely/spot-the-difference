import { SpotTheDifferenceGame } from './SpotTheDifferenceGame.js';
import { DebugMenu } from './components/DebugMenu.js';

// Detect if running in E2E test environment
function isE2ETest() {
    // Check for test environment (unit tests)
    if (typeof window === 'undefined' || !window.location) {
        return true; // Assume test environment if no window.location
    }
    
    // Check for Playwright test indicators
    return (
        // Check for Playwright user agent
        navigator.userAgent.includes('Playwright') ||
        // Check if window.__playwright is defined (Playwright injects this)
        typeof window.__playwright !== 'undefined' ||
        // Check for test mode in URL parameters
        new URLSearchParams(window.location.search).has('test') ||
        // Check for common test hostnames
        window.location.hostname === 'localhost' && window.location.port !== '3000'
    );
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new SpotTheDifferenceGame();
    const debugMenu = new DebugMenu(game);
    
    document.addEventListener('gameStarted', () => {
        console.log('Game started!');
    });
    
    document.addEventListener('gameReset', () => {
        console.log('Game reset!');
    });
    
    document.addEventListener('gameCompleted', () => {
        console.log('Game completed!');
    });
    
    // Auto-start the game after assets are loaded (disabled during E2E tests)
    if (!isE2ETest()) {
        setTimeout(() => {
            game.startGame();
        }, 500);
    }
    
    window.game = game;
});