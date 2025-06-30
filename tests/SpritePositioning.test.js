import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpritePositioning } from '../js/utils/SpritePositioning.js';

describe('SpritePositioning', () => {
  let mockBackgroundImg;
  let mockContainer;
  let mockSpriteElement;

  beforeEach(() => {
    mockBackgroundImg = {
      id: 'background-image-left',
      src: 'http://localhost/backgrounds/test.png',
      getBoundingClientRect: vi.fn(() => ({
        left: 100,
        top: 50,
        width: 400,
        height: 300,
        right: 500,
        bottom: 350
      })),
      parentElement: null
    };

    mockContainer = {
      id: 'game-board-left',
      getBoundingClientRect: vi.fn(() => ({
        left: 50,
        top: 25,
        width: 500,
        height: 400,
        right: 550,
        bottom: 425
      }))
    };

    mockBackgroundImg.parentElement = mockContainer;

    mockSpriteElement = {
      style: {
        position: '',
        left: '',
        top: ''
      },
      getBoundingClientRect: vi.fn(() => ({
        left: 150,
        top: 100,
        width: 80,
        height: 80,
        right: 230,
        bottom: 180
      }))
    };

    global.document = {
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'background-image-left':
            return mockBackgroundImg;
          case 'game-board-left':
            return mockContainer;
          case 'background-image':
            return { id: 'background-image' };
          case 'game-container':
            return { id: 'game-container' };
          default:
            return null;
        }
      }),
      body: {
        classList: {
          contains: vi.fn(() => false)
        }
      }
    };

    global.console = { 
      log: vi.fn(), 
      warn: vi.fn(), 
      error: vi.fn() 
    };
  });

  describe('getActiveBackgroundContext', () => {
    it('should return game mode context when placement mode is not active', () => {
      const context = SpritePositioning.getActiveBackgroundContext();
      
      expect(context.backgroundImg).toBe(mockBackgroundImg);
      expect(context.container).toBe(mockContainer);
      expect(context.mode).toBe('game');
    });

    it('should return placement mode context when placement mode is active', () => {
      global.document.body.classList.contains.mockReturnValue(true);
      
      const context = SpritePositioning.getActiveBackgroundContext();
      
      expect(context.mode).toBe('placement');
    });

    it('should return fallback context when main elements are missing', () => {
      global.document.getElementById.mockImplementation((id) => {
        switch (id) {
          case 'background-image':
            return { id: 'background-image' };
          case 'game-container':
            return { id: 'game-container' };
          default:
            return null;
        }
      });
      
      const context = SpritePositioning.getActiveBackgroundContext();
      
      expect(context.mode).toBe('fallback');
    });
  });

  describe('backgroundToContainerCoords', () => {
    it('should convert background-relative coordinates to container-relative coordinates', () => {
      const result = SpritePositioning.backgroundToContainerCoords(
        10, 20, mockBackgroundImg, mockContainer
      );
      
      // Background is at (100, 50) relative to viewport
      // Container is at (50, 25) relative to viewport
      // So background is at (50, 25) relative to container
      // Background coords (10, 20) become container coords (60, 45)
      expect(result.containerX).toBe(60);
      expect(result.containerY).toBe(45);
    });

    it('should handle missing elements gracefully', () => {
      const result = SpritePositioning.backgroundToContainerCoords(
        10, 20, null, null
      );
      
      expect(result.containerX).toBe(10);
      expect(result.containerY).toBe(20);
      expect(global.console.warn).toHaveBeenCalled();
    });
  });

  describe('containerToBackgroundCoords', () => {
    it('should convert container-relative coordinates to background-relative coordinates', () => {
      const result = SpritePositioning.containerToBackgroundCoords(
        60, 45, mockBackgroundImg, mockContainer
      );
      
      // Reverse of the above calculation
      expect(result.backgroundX).toBe(10);
      expect(result.backgroundY).toBe(20);
    });

    it('should handle missing elements gracefully', () => {
      const result = SpritePositioning.containerToBackgroundCoords(
        60, 45, null, null
      );
      
      expect(result.backgroundX).toBe(60);
      expect(result.backgroundY).toBe(45);
      expect(global.console.warn).toHaveBeenCalled();
    });
  });

  describe('positionSpriteAtBackgroundCoords', () => {
    it('should position sprite using background-relative coordinates', () => {
      SpritePositioning.positionSpriteAtBackgroundCoords(
        mockSpriteElement, 10, 20, mockBackgroundImg, mockContainer
      );
      
      expect(mockSpriteElement.style.position).toBe('absolute');
      expect(mockSpriteElement.style.left).toBe('60px');
      expect(mockSpriteElement.style.top).toBe('45px');
      expect(global.console.log).toHaveBeenCalled();
    });

    it('should auto-detect context when not provided', () => {
      SpritePositioning.positionSpriteAtBackgroundCoords(
        mockSpriteElement, 10, 20
      );
      
      expect(mockSpriteElement.style.position).toBe('absolute');
      expect(mockSpriteElement.style.left).toBe('60px');
      expect(mockSpriteElement.style.top).toBe('45px');
    });

    it('should handle missing context gracefully', () => {
      global.document.getElementById.mockReturnValue(null);
      
      SpritePositioning.positionSpriteAtBackgroundCoords(
        mockSpriteElement, 10, 20
      );
      
      expect(global.console.warn).toHaveBeenCalled();
    });
  });

  describe('getSpritePosition', () => {
    it('should get sprite position from CSS styles', () => {
      mockSpriteElement.style.left = '60px';
      mockSpriteElement.style.top = '45px';
      
      const result = SpritePositioning.getSpritePosition(
        mockSpriteElement, mockBackgroundImg, mockContainer
      );
      
      expect(result.containerX).toBe(60);
      expect(result.containerY).toBe(45);
      expect(result.backgroundX).toBe(10);
      expect(result.backgroundY).toBe(20);
    });

    it('should fall back to getBoundingClientRect when CSS styles are not available', () => {
      const result = SpritePositioning.getSpritePosition(
        mockSpriteElement, mockBackgroundImg, mockContainer
      );
      
      // Sprite rect: left 150, top 100
      // Container rect: left 50, top 25
      // Container-relative: (100, 75)
      expect(result.containerX).toBe(100);
      expect(result.containerY).toBe(75);
    });

  });

  describe('createCollisionDetector', () => {
    it('should detect collisions between sprites', () => {
      const existingPositions = [
        { x: 10, y: 10, width: 80, height: 80 }
      ];
      
      const detector = SpritePositioning.createCollisionDetector(
        existingPositions, 80, 80, 5
      );
      
      // Test collision
      expect(detector.hasCollision(15, 15)).toBe(true);
      
      // Test no collision
      expect(detector.hasCollision(150, 150)).toBe(false);
    });

    it('should find non-colliding positions', () => {
      const existingPositions = [
        { x: 10, y: 10, width: 80, height: 80 }
      ];
      
      const detector = SpritePositioning.createCollisionDetector(
        existingPositions, 80, 80, 5
      );
      
      const position = detector.findNonCollidingPosition(0, 0, 400, 300, 10);
      
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.attempts).toBeGreaterThan(0);
      expect(detector.hasCollision(position.x, position.y)).toBe(false);
    });

    it('should add positions to collision detection', () => {
      const existingPositions = [];
      const detector = SpritePositioning.createCollisionDetector(
        existingPositions, 80, 80, 5
      );
      
      detector.addPosition(10, 10, 80, 80);
      
      expect(existingPositions.length).toBe(1);
      expect(existingPositions[0]).toEqual({ x: 10, y: 10, width: 80, height: 80 });
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information when context is valid', () => {
      const debugInfo = SpritePositioning.getDebugInfo();
      
      expect(debugInfo.valid).toBe(true);
      expect(debugInfo.mode).toBe('game');
      expect(debugInfo.backgroundImage.id).toBe('background-image-left');
      expect(debugInfo.container.id).toBe('game-board-left');
      expect(debugInfo.offset.x).toBe(50); // 100 - 50
      expect(debugInfo.offset.y).toBe(25); // 50 - 25
    });

    it('should return error information when context is invalid', () => {
      global.document.getElementById.mockReturnValue(null);
      
      const debugInfo = SpritePositioning.getDebugInfo();
      
      expect(debugInfo.valid).toBe(false);
      expect(debugInfo.error).toBe('Missing background or container');
    });
  });
});