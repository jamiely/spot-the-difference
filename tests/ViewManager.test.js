import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewManager } from '../js/utils/ViewManager.js';

describe('ViewManager', () => {
  let mockGameBoardsContainer;
  let mockLegacyBoard;
  let mockRightBoard;
  let mockBackgroundImageLeft;
  let mockGameBoardLeft;

  beforeEach(() => {
    mockGameBoardsContainer = {
      style: { display: '' }
    };

    mockLegacyBoard = {
      style: { display: '' }
    };

    mockRightBoard = {
      style: { display: '' }
    };

    mockBackgroundImageLeft = {
      id: 'background-image-left'
    };

    mockGameBoardLeft = {
      id: 'game-board-left'
    };

    global.document = {
      querySelector: vi.fn((selector) => {
        if (selector === '.game-boards') {
          return mockGameBoardsContainer;
        }
        return null;
      }),
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'legacy-game-board':
            return mockLegacyBoard;
          case 'game-board-right':
            return mockRightBoard;
          case 'background-image-left':
            return mockBackgroundImageLeft;
          case 'game-board-left':
            return mockGameBoardLeft;
          default:
            return null;
        }
      })
    };

    global.console = { log: vi.fn() };
  });

  describe('switchToSingleView', () => {
    it('should hide right board and legacy board while keeping container visible', () => {
      ViewManager.switchToSingleView();

      expect(mockGameBoardsContainer.style.display).toBe('flex');
      expect(mockLegacyBoard.style.display).toBe('none');
      expect(mockRightBoard.style.display).toBe('none');
      expect(global.console.log).toHaveBeenCalledWith('Switched to single view using unified left-side container structure');
    });

    it('should handle missing DOM elements gracefully', () => {
      global.document.querySelector.mockReturnValue(null);
      global.document.getElementById.mockReturnValue(null);

      expect(() => ViewManager.switchToSingleView()).not.toThrow();
    });
  });

  describe('switchToSideBySideView', () => {
    it('should show both boards in side-by-side layout', () => {
      ViewManager.switchToSideBySideView();

      expect(mockGameBoardsContainer.style.display).toBe('flex');
      expect(mockLegacyBoard.style.display).toBe('none');
      expect(mockRightBoard.style.display).toBe('flex');
      expect(global.console.log).toHaveBeenCalledWith('Switched to side-by-side view');
    });

    it('should handle missing DOM elements gracefully', () => {
      global.document.querySelector.mockReturnValue(null);
      global.document.getElementById.mockReturnValue(null);

      expect(() => ViewManager.switchToSideBySideView()).not.toThrow();
    });
  });

  describe('getBackgroundImage', () => {
    it('should return the left background image element', () => {
      const result = ViewManager.getBackgroundImage();
      
      expect(global.document.getElementById).toHaveBeenCalledWith('background-image-left');
      expect(result).toBe(mockBackgroundImageLeft);
    });
  });

  describe('getContainer', () => {
    it('should return the left game board element', () => {
      const result = ViewManager.getContainer();
      
      expect(global.document.getElementById).toHaveBeenCalledWith('game-board-left');
      expect(result).toBe(mockGameBoardLeft);
    });
  });
});