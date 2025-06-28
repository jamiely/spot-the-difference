import { GameBoard } from './components/GameBoard.js';
import { ScoreDisplay } from './components/ScoreDisplay.js';
import { ImageGenerator } from './utils/ImageGenerator.js';

export class Game {
    constructor() {
        this.gameBoard = new GameBoard('left-canvas', 'right-canvas');
        this.scoreDisplay = new ScoreDisplay('score-count');
        this.isGameActive = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('reset-game').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.addEventListener('differenceFound', (e) => {
            this.handleDifferenceFound(e.detail);
        });
    }
    
    startGame() {
        this.isGameActive = true;
        this.updateButtonStates();
        
        const leftCanvas = document.getElementById('left-canvas');
        const rightCanvas = document.getElementById('right-canvas');
        
        const differences = ImageGenerator.generateTestImages(leftCanvas, rightCanvas);
        this.gameBoard.setDifferences(differences);
        
        this.dispatchEvent('gameStarted');
    }
    
    resetGame() {
        this.isGameActive = false;
        this.updateButtonStates();
        
        this.gameBoard.reset();
        this.dispatchEvent('gameReset');
    }
    
    handleDifferenceFound(detail) {
        console.log(`Difference found! Progress: ${detail.totalFound}/${detail.totalDifferences}`);
        
        if (detail.totalFound === detail.totalDifferences) {
            this.handleGameComplete();
        }
    }
    
    handleGameComplete() {
        this.isGameActive = false;
        this.updateButtonStates();
        
        setTimeout(() => {
            alert(`Congratulations! You found all differences! Score: ${this.scoreDisplay.getScore()}`);
        }, 500);
        
        this.dispatchEvent('gameCompleted');
    }
    
    updateButtonStates() {
        const startButton = document.getElementById('start-game');
        const resetButton = document.getElementById('reset-game');
        
        startButton.disabled = this.isGameActive;
        resetButton.disabled = !this.isGameActive && this.scoreDisplay.getScore() === 0;
    }
    
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    getGameState() {
        return {
            isActive: this.isGameActive,
            progress: this.gameBoard.getProgress(),
            score: this.scoreDisplay.getScore()
        };
    }
}