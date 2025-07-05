import { SpotTheDifferenceGame } from './SpotTheDifferenceGame.js';
import { DebugMenu } from './components/DebugMenu.js';

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
    
    // Auto-start the game after assets are loaded
    setTimeout(() => {
        game.startGame();
    }, 500);
    
    window.game = game;
});