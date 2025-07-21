import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DebugMenu } from '../js/components/DebugMenu.js';

interface MockBackgroundLoader {
  loadedBackgrounds: string[];
  loadAvailableBackgrounds: ReturnType<typeof vi.fn>;
}

interface MockGame {
  backgroundLoader: MockBackgroundLoader;
}

describe('DebugMenu', () => {
  let debugMenu: DebugMenu;
  let mockGame: MockGame;
  let mockBackgroundLoader: MockBackgroundLoader;

  beforeEach(() => {
    // Clear any existing debug menu
    const existingMenu = document.getElementById('debug-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Mock game object with background loader
    mockBackgroundLoader = {
      loadedBackgrounds: ['auditorium.png', 'classroom.png', 'library.png'],
      loadAvailableBackgrounds: vi.fn().mockResolvedValue(['auditorium.png', 'classroom.png', 'library.png'])
    };

    mockGame = {
      backgroundLoader: mockBackgroundLoader
    };

    debugMenu = new DebugMenu(mockGame as any);
  });

  afterEach(() => {
    // Clean up any debug menu elements
    const existingMenu = document.getElementById('debug-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Remove event listeners by creating a new DebugMenu instance
    debugMenu = null;
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      expect((debugMenu as any).isVisible).toBe(false);
      expect((debugMenu as any).game).toBe(mockGame);
    });

    it('should set up event listeners on construction', () => {
      // Test that event listeners are set up by checking the constructor doesn't throw
      expect(() => new DebugMenu(mockGame as any)).not.toThrow();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should toggle debug menu when ? key is pressed', () => {
      expect((debugMenu as any).isVisible).toBe(false);
      
      // Simulate ? key press
      const event = new KeyboardEvent('keydown', { key: '?' });
      document.dispatchEvent(event);
      
      expect((debugMenu as any).isVisible).toBe(true);
      expect(document.getElementById('debug-menu')).toBeTruthy();
    });

    it('should close debug menu when Escape key is pressed', () => {
      // First open the menu
      debugMenu.showDebugMenu();
      expect((debugMenu as any).isVisible).toBe(true);
      
      // Simulate Escape key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      
      expect((debugMenu as any).isVisible).toBe(false);
      expect(document.getElementById('debug-menu')).toBeFalsy();
    });

    it('should prevent default behavior for ? and Escape keys', () => {
      const questionEvent = new KeyboardEvent('keydown', { key: '?' });
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      
      const questionSpy = vi.spyOn(questionEvent, 'preventDefault');
      const escapeSpy = vi.spyOn(escapeEvent, 'preventDefault');
      
      document.dispatchEvent(questionEvent);
      document.dispatchEvent(escapeEvent);
      
      expect(questionSpy).toHaveBeenCalled();
      expect(escapeSpy).toHaveBeenCalled();
    });

    it('should only close menu with Escape when menu is visible', () => {
      expect((debugMenu as any).isVisible).toBe(false);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      const spy = vi.spyOn(event, 'preventDefault');
      
      document.dispatchEvent(event);
      
      // preventDefault should not be called when menu is not visible
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('menu visibility', () => {
    it('should show debug menu', () => {
      debugMenu.showDebugMenu();
      
      expect((debugMenu as any).isVisible).toBe(true);
      expect(document.getElementById('debug-menu')).toBeTruthy();
      expect(document.querySelector('.debug-overlay')).toBeTruthy();
    });

    it('should hide debug menu', () => {
      debugMenu.showDebugMenu();
      expect((debugMenu as any).isVisible).toBe(true);
      
      debugMenu.hideDebugMenu();
      
      expect((debugMenu as any).isVisible).toBe(false);
      expect(document.getElementById('debug-menu')).toBeFalsy();
    });

    it('should toggle debug menu visibility', () => {
      expect((debugMenu as any).isVisible).toBe(false);
      
      debugMenu.toggleDebugMenu();
      expect((debugMenu as any).isVisible).toBe(true);
      
      debugMenu.toggleDebugMenu();
      expect((debugMenu as any).isVisible).toBe(false);
    });

    it('should remove existing menu before creating new one', () => {
      debugMenu.showDebugMenu();
      const firstMenu = document.getElementById('debug-menu');
      expect(firstMenu).toBeTruthy();
      
      debugMenu.showDebugMenu();
      const secondMenu = document.getElementById('debug-menu');
      expect(secondMenu).toBeTruthy();
      
      // Should only have one menu element
      expect(document.querySelectorAll('#debug-menu')).toHaveLength(1);
    });
  });

  describe('menu content', () => {
    beforeEach(() => {
      debugMenu.showDebugMenu();
    });

    it('should create debug menu with correct structure', () => {
      const menu = document.getElementById('debug-menu');
      expect(menu).toBeTruthy();
      
      expect(menu.querySelector('.debug-overlay')).toBeTruthy();
      expect(menu.querySelector('.debug-panel')).toBeTruthy();
      expect(menu.querySelector('.debug-header')).toBeTruthy();
      expect(menu.querySelector('.debug-content')).toBeTruthy();
      expect(menu.querySelector('.debug-footer')).toBeTruthy();
    });

    it('should have correct header content', () => {
      const header = document.querySelector('.debug-header');
      expect(header.querySelector('h3').textContent).toBe('Debug Menu');
      expect(header.querySelector('#debug-close')).toBeTruthy();
    });

    it('should have background selection controls', () => {
      const select = document.getElementById('background-select');
      const loadButton = document.getElementById('load-background');
      
      expect(select).toBeTruthy();
      expect(loadButton).toBeTruthy();
      expect(loadButton.textContent).toBe('Load');
    });

    it('should have correct footer content', () => {
      const footer = document.querySelector('.debug-footer');
      expect(footer.textContent).toContain('Press "?" to toggle');
      expect(footer.textContent).toContain('ESC to close');
    });
  });

  describe('background loading', () => {
    beforeEach(() => {
      debugMenu.showDebugMenu();
    });

    it('should load available backgrounds on menu creation', async () => {
      // When loadedBackgrounds is available, it doesn't call the async method
      // So let's test the case where loadedBackgrounds is empty
      mockGame.backgroundLoader.loadedBackgrounds = null;
      
      const newDebugMenu = new DebugMenu(mockGame);
      newDebugMenu.showDebugMenu();
      
      // The loadAvailableBackgrounds is called asynchronously, so we need to wait
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockBackgroundLoader.loadAvailableBackgrounds).toHaveBeenCalled();
    });

    it('should populate dropdown with available backgrounds', () => {
      const select = document.getElementById('background-select');
      const options = select.querySelectorAll('option');
      
      expect(options).toHaveLength(4); // 3 backgrounds + default option
      expect(options[0].textContent).toBe('Select a background...');
      expect(options[1].value).toBe('auditorium.png');
      expect(options[1].textContent).toBe('auditorium');
      expect(options[2].value).toBe('classroom.png');
      expect(options[2].textContent).toBe('classroom');
    });

    it('should handle empty background list', () => {
      mockGame.backgroundLoader.loadedBackgrounds = [];
      const newDebugMenu = new DebugMenu(mockGame);
      newDebugMenu.showDebugMenu();
      
      const select = document.getElementById('background-select');
      const loadButton = document.getElementById('load-background');
      
      expect(select.textContent).toBe('No backgrounds available');
      expect(loadButton.disabled).toBe(true);
    });

    it('should remove file extensions from background names', () => {
      const select = document.getElementById('background-select');
      const options = select.querySelectorAll('option');
      
      // Check that .png extension is removed from display text
      expect(options[1].textContent).toBe('auditorium');
      expect(options[2].textContent).toBe('classroom');
      expect(options[3].textContent).toBe('library');
    });
  });

  describe('background selection', () => {
    beforeEach(() => {
      debugMenu.showDebugMenu();
    });

    it('should dispatch background change event when Load is clicked', () => {
      const select = document.getElementById('background-select');
      const loadButton = document.getElementById('load-background');
      
      // Select a background
      select.value = 'classroom.png';
      
      // Set up event listener to capture the event
      let capturedEvent = null;
      document.addEventListener('requestBackgroundChange', (e) => {
        capturedEvent = e;
      });
      
      // Click the Load button
      loadButton.click();
      
      expect(capturedEvent).toBeTruthy();
      expect(capturedEvent.detail.background).toBe('classroom.png');
    });

    it('should show alert when no background is selected', () => {
      const select = document.getElementById('background-select');
      const loadButton = document.getElementById('load-background');
      
      // Ensure no background is selected (empty value)
      select.value = '';
      
      // Mock alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      // Click Load without selecting a background
      loadButton.click();
      
      expect(alertSpy).toHaveBeenCalledWith('Please select a background first.');
      
      alertSpy.mockRestore();
    });

    it('should hide debug menu after successful background load', () => {
      const select = document.getElementById('background-select');
      const loadButton = document.getElementById('load-background');
      
      select.value = 'classroom.png';
      expect((debugMenu as any).isVisible).toBe(true);
      
      loadButton.click();
      
      expect((debugMenu as any).isVisible).toBe(false);
      expect(document.getElementById('debug-menu')).toBeFalsy();
    });
  });

  describe('menu interactions', () => {
    beforeEach(() => {
      debugMenu.showDebugMenu();
    });

    it('should close menu when close button is clicked', () => {
      const closeButton = document.getElementById('debug-close');
      expect((debugMenu as any).isVisible).toBe(true);
      
      closeButton.click();
      
      expect((debugMenu as any).isVisible).toBe(false);
      expect(document.getElementById('debug-menu')).toBeFalsy();
    });

    it('should close menu when clicking outside the panel', () => {
      const overlay = document.querySelector('.debug-overlay');
      expect((debugMenu as any).isVisible).toBe(true);
      
      // Click on the overlay (outside the panel)
      overlay.click();
      
      expect((debugMenu as any).isVisible).toBe(false);
      expect(document.getElementById('debug-menu')).toBeFalsy();
    });

    it('should not close menu when clicking inside the panel', () => {
      const panel = document.querySelector('.debug-panel');
      expect((debugMenu as any).isVisible).toBe(true);
      
      // Click inside the panel
      panel.click();
      
      expect((debugMenu as any).isVisible).toBe(true);
      expect(document.getElementById('debug-menu')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should handle background loading errors gracefully', async () => {
      // Clear existing menu first
      const existingMenu = document.getElementById('debug-menu');
      if (existingMenu) {
        existingMenu.remove();
      }
      
      // Create a mock game with no loadedBackgrounds and a failing loader
      const failingGame = {
        backgroundLoader: {
          loadedBackgrounds: null, // This will force it to call the async method
          loadAvailableBackgrounds: vi.fn().mockRejectedValue(new Error('Load failed'))
        }
      };
      
      const newDebugMenu = new DebugMenu(failingGame);
      
      // Should not throw an error
      expect(() => newDebugMenu.showDebugMenu()).not.toThrow();
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should show empty dropdown
      const select = document.getElementById('background-select');
      expect(select.textContent).toBe('No backgrounds available');
    });

    it('should handle missing backgroundLoader gracefully', () => {
      const gameWithoutLoader = {};
      const newDebugMenu = new DebugMenu(gameWithoutLoader);
      
      expect(() => newDebugMenu.showDebugMenu()).not.toThrow();
    });
  });

  describe('styling', () => {
    beforeEach(() => {
      debugMenu.showDebugMenu();
    });

    it('should inject CSS styles', () => {
      const menu = document.getElementById('debug-menu');
      const style = menu.querySelector('style');
      
      expect(style).toBeTruthy();
      expect(style.textContent).toContain('.debug-overlay');
      expect(style.textContent).toContain('.debug-panel');
    });

    it('should apply correct CSS classes', () => {
      expect(document.querySelector('.debug-overlay')).toBeTruthy();
      expect(document.querySelector('.debug-panel')).toBeTruthy();
      expect(document.querySelector('.debug-header')).toBeTruthy();
      expect(document.querySelector('.debug-content')).toBeTruthy();
      expect(document.querySelector('.debug-footer')).toBeTruthy();
      expect(document.querySelector('.background-controls')).toBeTruthy();
    });
  });
});