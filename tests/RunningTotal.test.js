import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotTheDifferenceGame } from '../js/SpotTheDifferenceGame.js';

describe('Running Total of Differences', () => {
    let game;
    
    beforeEach(() => {
        // Mock DOM elements required by the game
        document.body.innerHTML = `
            <button id="start-game">Start Game</button>
            <button id="reset-game">Reset</button>
            <div id="game-container"></div>
            <div class="game-boards">
                <div id="game-board-left" class="game-board">
                    <img id="background-image-left" alt="Game background left" style="display: none;">
                </div>
                <div id="game-board-right" class="game-board">
                    <img id="background-image-right" alt="Game background right" style="display: none;">
                </div>
            </div>
            <div id="legacy-game-board"></div>
            <span id="score-count">0</span>
        `;
        
        // Create game instance
        game = new SpotTheDifferenceGame();
    });

    describe('Total differences tracking', () => {
        it('should initialize with zero total differences', () => {
            expect(game.totalDifferencesFound).toBe(0);
        });

        it('should reset total differences when starting new game', async () => {
            // Set some initial total
            game.totalDifferencesFound = 5;
            
            // Mock level manager to avoid actual level loading
            game.levelManager = {
                getNextLevel: vi.fn().mockResolvedValue(null)
            };
            
            // Mock loadNextLevel to avoid complex setup
            game.loadNextLevel = vi.fn().mockResolvedValue();
            
            // Start game should reset total
            await game.startGame();
            
            expect(game.totalDifferencesFound).toBe(0);
        });

        it('should increment total when difference is found', () => {
            // Set up a difference
            const difference = {
                id: 'test-diff',
                centerX: 100,
                centerY: 100
            };
            
            game.differences = [difference];
            game.foundDifferences = [];
            
            // Mock createDifferenceMarker to avoid DOM manipulation
            game.createDifferenceMarker = vi.fn();
            
            // Mock endGame to avoid complex game ending logic
            game.endGame = vi.fn();
            
            // Mark difference found
            game.markDifferenceFound(difference, 'left', 100, 100);
            
            // Total should increment
            expect(game.totalDifferencesFound).toBe(1);
        });

        it('should maintain total across level transitions', () => {
            // Set up initial state
            game.totalDifferencesFound = 3;
            game.foundDifferences = ['diff1', 'diff2'];
            game.differences = ['diff1', 'diff2'];
            
            // Clear level data (simulating level transition)
            game.clearAllPreviousLevelData();
            
            // Total should persist
            expect(game.totalDifferencesFound).toBe(3);
            
            // But level-specific arrays should be cleared
            expect(game.foundDifferences).toEqual([]);
            expect(game.differences).toEqual([]);
        });

        it('should accumulate differences across multiple levels', () => {
            // Mock createDifferenceMarker to avoid DOM manipulation
            game.createDifferenceMarker = vi.fn();
            
            // Mock endGame to avoid complex game ending logic
            game.endGame = vi.fn();
            
            // Level 1: Find 2 differences
            game.differences = [
                { id: 'diff1', centerX: 50, centerY: 50 },
                { id: 'diff2', centerX: 150, centerY: 150 }
            ];
            game.foundDifferences = [];
            
            game.markDifferenceFound(game.differences[0], 'left', 50, 50);
            game.markDifferenceFound(game.differences[1], 'left', 150, 150);
            
            expect(game.totalDifferencesFound).toBe(2);
            
            // Transition to level 2
            game.clearAllPreviousLevelData();
            
            // Level 2: Find 1 more difference
            game.differences = [
                { id: 'diff3', centerX: 100, centerY: 100 }
            ];
            game.foundDifferences = [];
            
            game.markDifferenceFound(game.differences[0], 'left', 100, 100);
            
            // Total should be cumulative
            expect(game.totalDifferencesFound).toBe(3);
        });

        it('should continue incrementing after level completion', () => {
            // Mock createDifferenceMarker to avoid DOM manipulation
            game.createDifferenceMarker = vi.fn();
            
            // Mock endGame to avoid complex game ending logic
            game.endGame = vi.fn();
            
            // Set up a level with one difference
            const difference = {
                id: 'final-diff',
                centerX: 200,
                centerY: 200
            };
            
            game.differences = [difference];
            game.foundDifferences = [];
            game.totalDifferencesFound = 4; // Already found 4 in previous levels
            
            // Find the final difference
            game.markDifferenceFound(difference, 'right', 200, 200);
            
            // Total should increment even when level is complete
            expect(game.totalDifferencesFound).toBe(5);
            expect(game.endGame).toHaveBeenCalled();
        });
    });

    describe('Integration with existing score system', () => {
        it('should maintain separate level and total counts', () => {
            // Mock createDifferenceMarker to avoid DOM manipulation
            game.createDifferenceMarker = vi.fn();
            
            // Mock endGame to avoid complex game ending logic
            game.endGame = vi.fn();
            
            // Set up initial state with some total from previous levels
            game.totalDifferencesFound = 5;
            
            // Current level has 2 differences
            game.differences = [
                { id: 'level-diff1', centerX: 50, centerY: 50 },
                { id: 'level-diff2', centerX: 150, centerY: 150 }
            ];
            game.foundDifferences = [];
            
            // Find first difference
            game.markDifferenceFound(game.differences[0], 'left', 50, 50);
            
            // Level count should be 1, total should be 6
            expect(game.foundDifferences.length).toBe(1);
            expect(game.totalDifferencesFound).toBe(6);
            
            // Find second difference
            game.markDifferenceFound(game.differences[1], 'left', 150, 150);
            
            // Level count should be 2, total should be 7
            expect(game.foundDifferences.length).toBe(2);
            expect(game.totalDifferencesFound).toBe(7);
        });
    });
});