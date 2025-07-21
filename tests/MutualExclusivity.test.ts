import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditMode } from '../js/components/EditMode.js';
import { PlacementMode } from '../js/components/PlacementMode.js';
import type { TemplateManager } from '../js/utils/TemplateManager.js';

// Mock interfaces for DOM elements
interface MockElement {
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    style: { 
        cursor: string; 
        display: string; 
        width: string; 
        height: string; 
        borderRadius: string; 
    };
    getBoundingClientRect: ReturnType<typeof vi.fn>;
    parentElement: MockElement | null;
    src: string;
    querySelectorAll: ReturnType<typeof vi.fn>;
    appendChild: ReturnType<typeof vi.fn>;
    value?: string;
}

interface MockDocument {
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    getElementById: ReturnType<typeof vi.fn>;
    createElement: ReturnType<typeof vi.fn>;
    querySelector: ReturnType<typeof vi.fn>;
    querySelectorAll: ReturnType<typeof vi.fn>;
    dispatchEvent: ReturnType<typeof vi.fn>;
    body: { 
        classList: { 
            add: ReturnType<typeof vi.fn>; 
            remove: ReturnType<typeof vi.fn>; 
        }; 
    };
}

// Mock template manager
interface MockTemplateManager {
    loadAvailableTemplates: ReturnType<typeof vi.fn>;
    getTemplateById: ReturnType<typeof vi.fn>;
}

// Mock mode interface for mutual exclusivity
interface MockMode {
    isActive: boolean;
}

describe('Mutual Exclusivity between EditMode and PlacementMode', () => {
  let editMode: EditMode;
  let placementMode: PlacementMode;
  let mockContainer: MockElement;
  let mockBackgroundImg: MockElement;

  beforeEach(() => {
    // Setup DOM mocks
    mockBackgroundImg = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: { cursor: '', display: '', width: '', height: '', borderRadius: '' },
      getBoundingClientRect: vi.fn(() => ({
        left: 100, top: 50, width: 400, height: 300
      })),
      parentElement: null,
      src: 'test.png',
      querySelectorAll: vi.fn(() => []),
      appendChild: vi.fn()
    };

    mockContainer = {
      appendChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 50, top: 25, width: 500, height: 400
      })),
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: { cursor: '', display: '', width: '', height: '', borderRadius: '' },
      parentElement: null,
      src: ''
    };

    mockBackgroundImg.parentElement = mockContainer;

    const mockDocument: MockDocument = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getElementById: vi.fn((id: string) => {
        switch (id) {
          case 'background-image-left':
            return mockBackgroundImg;
          case 'game-board-left':
            return mockContainer;
          case 'bounding-boxes-json':
            return { 
              value: '[]', 
              style: {},
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              getBoundingClientRect: vi.fn(),
              parentElement: null,
              src: '',
              querySelectorAll: vi.fn(() => []),
              appendChild: vi.fn()
            };
          case 'edit-panel':
            return { 
              style: { display: '', cursor: '', width: '', height: '', borderRadius: '' },
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              getBoundingClientRect: vi.fn(),
              parentElement: null,
              src: '',
              querySelectorAll: vi.fn(() => []),
              appendChild: vi.fn()
            };
          case 'game-container':
            return { 
              appendChild: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              getBoundingClientRect: vi.fn(),
              parentElement: null,
              src: '',
              style: { cursor: '', display: '', width: '', height: '', borderRadius: '' },
              querySelectorAll: vi.fn(() => [])
            };
          default:
            return null;
        }
      }),
      createElement: vi.fn(() => ({
        className: '',
        style: {},
        dataset: {},
        addEventListener: vi.fn(),
        remove: vi.fn(),
        classList: { add: vi.fn(), remove: vi.fn() },
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(),
        parentElement: null,
        src: '',
        querySelectorAll: vi.fn(() => []),
        appendChild: vi.fn()
      })),
      querySelector: vi.fn(() => ({ 
        style: { display: '', cursor: '', width: '', height: '', borderRadius: '' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(),
        parentElement: null,
        src: '',
        querySelectorAll: vi.fn(() => []),
        appendChild: vi.fn()
      })),
      querySelectorAll: vi.fn(() => []),
      dispatchEvent: vi.fn(),
      body: { classList: { add: vi.fn(), remove: vi.fn() } }
    };

    (global as any).document = mockDocument;
    (global as any).CustomEvent = vi.fn();
    (global as any).console = { log: vi.fn(), warn: vi.fn() };

    // Create instances
    editMode = new EditMode();
    placementMode = new PlacementMode();

    // Set up mutual exclusivity
    (editMode as any).setOtherMode(placementMode);
    (placementMode as any).setOtherMode(editMode);
  });

  describe('EditMode blocking PlacementMode', () => {
    it('should prevent placement mode from activating when edit mode is active', () => {
      // Activate edit mode first
      (editMode as any).isActive = true;

      // Try to activate placement mode
      const initialPlacementState = (placementMode as any).isActive;
      (placementMode as any).togglePlacementMode();

      // Placement mode should remain inactive
      expect((placementMode as any).isActive).toBe(initialPlacementState);
      expect((global as any).console.log).toHaveBeenCalledWith('Cannot enter placement mode - edit mode is active');
    });

    it('should allow placement mode when edit mode is not active', async () => {
      // Ensure edit mode is not active
      (editMode as any).isActive = false;

      // Mock placement mode dependencies
      const mockTemplateManager: MockTemplateManager = {
        loadAvailableTemplates: vi.fn(),
        getTemplateById: vi.fn(() => null)
      };
      (placementMode as any).templateManager = mockTemplateManager;
      (placementMode as any).clearAllSprites = vi.fn();
      (placementMode as any).copyGameStateToPlacementMode = vi.fn();
      (placementMode as any).enableSpriteDragging = vi.fn();
      (placementMode as any).showPlacementInterface = vi.fn();
      (placementMode as any).updateSpritePositions = vi.fn();

      // Try to activate placement mode
      await (placementMode as any).togglePlacementMode();

      // Placement mode should be active
      expect((placementMode as any).isActive).toBe(true);
    });
  });

  describe('PlacementMode blocking EditMode', () => {
    it('should prevent edit mode from activating when placement mode is active', () => {
      // Activate placement mode first
      (placementMode as any).isActive = true;

      // Try to activate edit mode
      const initialEditState = (editMode as any).isActive;
      (editMode as any).toggleEditMode();

      // Edit mode should remain inactive
      expect((editMode as any).isActive).toBe(initialEditState);
      expect((global as any).console.log).toHaveBeenCalledWith('Cannot enter edit mode - placement mode is active');
    });

    it('should allow edit mode when placement mode is not active', () => {
      // Ensure placement mode is not active
      (placementMode as any).isActive = false;

      // Mock edit mode dependencies
      (editMode as any).removeAllSprites = vi.fn();
      (editMode as any).addBackgroundListeners = vi.fn();
      (editMode as any).showEditInterface = vi.fn();
      (editMode as any).createVisualBoxes = vi.fn();

      // Try to activate edit mode
      (editMode as any).toggleEditMode();

      // Edit mode should be active
      expect((editMode as any).isActive).toBe(true);
    });
  });

  describe('Mode exit behavior', () => {
    it('should allow edit mode to exit and return to game mode', () => {
      // Activate edit mode
      (editMode as any).isActive = true;
      (editMode as any).removeBackgroundListeners = vi.fn();
      (editMode as any).hideEditInterface = vi.fn();
      (editMode as any).clearVisualBoxes = vi.fn();
      (editMode as any).clearCurrentBox = vi.fn();

      // Exit edit mode
      (editMode as any).toggleEditMode();

      // Edit mode should be inactive
      expect((editMode as any).isActive).toBe(false);
      expect((editMode as any).removeBackgroundListeners).toHaveBeenCalled();
      expect((editMode as any).hideEditInterface).toHaveBeenCalled();
    });

    it('should allow placement mode to exit and return to game mode', () => {
      // Activate placement mode
      (placementMode as any).isActive = true;
      (placementMode as any).storePlacementState = vi.fn();
      (placementMode as any).disableSpriteDragging = vi.fn();
      (placementMode as any).hidePlacementInterface = vi.fn();
      (placementMode as any).clearSpriteSelection = vi.fn();
      (placementMode as any).stopKeyRepeat = vi.fn();
      (placementMode as any).clearDragState = vi.fn();

      // Exit placement mode
      (placementMode as any).togglePlacementMode();

      // Placement mode should be inactive
      expect((placementMode as any).isActive).toBe(false);
      expect((placementMode as any).disableSpriteDragging).toHaveBeenCalled();
      expect((placementMode as any).hidePlacementInterface).toHaveBeenCalled();
    });
  });

  describe('setOtherMode functionality', () => {
    it('should properly set the other mode reference in EditMode', () => {
      const newPlacementMode: MockMode = { isActive: false };
      (editMode as any).setOtherMode(newPlacementMode);
      
      expect((editMode as any).otherMode).toBe(newPlacementMode);
    });

    it('should properly set the other mode reference in PlacementMode', () => {
      const newEditMode: MockMode = { isActive: false };
      (placementMode as any).setOtherMode(newEditMode);
      
      expect((placementMode as any).otherMode).toBe(newEditMode);
    });
  });

  describe('Event dispatching', () => {
    it('should dispatch editModeToggled event when edit mode toggles', () => {
      (editMode as any).toggleEditMode();
      
      expect((global as any).CustomEvent).toHaveBeenCalledWith('editModeToggled', {
        detail: { isActive: (editMode as any).isActive }
      });
      expect((global as any).document.dispatchEvent).toHaveBeenCalled();
    });

    it('should dispatch placementModeToggled event when placement mode toggles', async () => {
      // Mock dependencies for placement mode
      const mockTemplateManager: MockTemplateManager = {
        loadAvailableTemplates: vi.fn(),
        getTemplateById: vi.fn(() => null)
      };
      (placementMode as any).templateManager = mockTemplateManager;
      (placementMode as any).clearAllSprites = vi.fn();
      (placementMode as any).copyGameStateToPlacementMode = vi.fn();
      (placementMode as any).enableSpriteDragging = vi.fn();
      (placementMode as any).showPlacementInterface = vi.fn();
      (placementMode as any).updateSpritePositions = vi.fn();

      await (placementMode as any).togglePlacementMode();
      
      expect((global as any).CustomEvent).toHaveBeenCalledWith('placementModeToggled', {
        detail: { isActive: (placementMode as any).isActive }
      });
      expect((global as any).document.dispatchEvent).toHaveBeenCalled();
    });
  });
});