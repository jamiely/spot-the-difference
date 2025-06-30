/**
 * Shared utility for managing game view modes (single board vs side-by-side)
 */
export class ViewManager {
    /**
     * Switch to single view mode (used by placement mode and edit mode)
     * Shows only the left board, hides the right board
     */
    static switchToSingleView() {
        // Instead of using legacy board, just hide the right side and use left side only
        const gameBoardsContainer = document.querySelector('.game-boards');
        const legacyBoard = document.getElementById('legacy-game-board');
        const rightBoard = document.getElementById('game-board-right');
        
        if (gameBoardsContainer) {
            gameBoardsContainer.style.display = 'flex'; // Keep side-by-side structure
        }
        
        if (legacyBoard) {
            legacyBoard.style.display = 'none'; // Hide legacy board completely
        }
        
        if (rightBoard) {
            rightBoard.style.display = 'none'; // Hide right side in single view mode
        }
        
        console.log('Switched to single view using unified left-side container structure');
    }
    
    /**
     * Switch to side-by-side view mode (used by game mode)
     * Shows both left and right boards
     */
    static switchToSideBySideView() {
        // Show both sides again for game mode
        const gameBoardsContainer = document.querySelector('.game-boards');
        const legacyBoard = document.getElementById('legacy-game-board');
        const rightBoard = document.getElementById('game-board-right');
        
        if (legacyBoard) {
            legacyBoard.style.display = 'none';
        }
        
        if (gameBoardsContainer) {
            gameBoardsContainer.style.display = 'flex';
        }
        
        if (rightBoard) {
            rightBoard.style.display = 'flex'; // Show right side for game mode
        }
        
        console.log('Switched to side-by-side view');
    }
    
    /**
     * Get the current background image element (always from left board)
     */
    static getBackgroundImage() {
        return document.getElementById('background-image-left');
    }
    
    /**
     * Get the current container element (always left board)
     */
    static getContainer() {
        return document.getElementById('game-board-left');
    }
}