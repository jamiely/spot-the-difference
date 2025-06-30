import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditMode } from '../js/components/EditMode.js';
import { PlacementMode } from '../js/components/PlacementMode.js';

describe('Mutual Exclusivity between EditMode and PlacementMode', () => {
  let editMode;
  let placementMode;
  let mockContainer;
  let mockBackgroundImg;

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
      src: 'test.png'
    };

    mockContainer = {
      appendChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 50, top: 25, width: 500, height: 400
      })),
      querySelectorAll: vi.fn(() => [])
    };

    mockBackgroundImg.parentElement = mockContainer;

    global.document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'background-image-left':
            return mockBackgroundImg;
          case 'game-board-left':
            return mockContainer;
          case 'bounding-boxes-json':
            return { value: '[]', style: {} };
          case 'edit-panel':
            return { style: { display: '' } };
          case 'game-container':
            return { appendChild: vi.fn() };
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
        classList: { add: vi.fn(), remove: vi.fn() }
      })),
      querySelector: vi.fn(() => ({ style: { display: '' } })),
      querySelectorAll: vi.fn(() => []),
      dispatchEvent: vi.fn(),
      body: { classList: { add: vi.fn(), remove: vi.fn() } }
    };

    global.CustomEvent = vi.fn();
    global.console = { log: vi.fn(), warn: vi.fn() };

    // Create instances
    editMode = new EditMode();
    placementMode = new PlacementMode();

    // Set up mutual exclusivity
    editMode.setOtherMode(placementMode);
    placementMode.setOtherMode(editMode);
  });

  describe('EditMode blocking PlacementMode', () => {
    it('should prevent placement mode from activating when edit mode is active', () => {
      // Activate edit mode first
      editMode.isActive = true;

      // Try to activate placement mode
      const initialPlacementState = placementMode.isActive;
      placementMode.togglePlacementMode();

      // Placement mode should remain inactive
      expect(placementMode.isActive).toBe(initialPlacementState);
      expect(global.console.log).toHaveBeenCalledWith('Cannot enter placement mode - edit mode is active');
    });

    it('should allow placement mode when edit mode is not active', async () => {
      // Ensure edit mode is not active
      editMode.isActive = false;

      // Mock placement mode dependencies
      placementMode.templateManager = {
        loadAvailableTemplates: vi.fn(),
        getTemplateById: vi.fn(() => null)
      };
      placementMode.clearAllSprites = vi.fn();
      placementMode.copyGameStateToPlacementMode = vi.fn();
      placementMode.enableSpriteDragging = vi.fn();
      placementMode.showPlacementInterface = vi.fn();
      placementMode.updateSpritePositions = vi.fn();

      // Try to activate placement mode
      await placementMode.togglePlacementMode();

      // Placement mode should be active
      expect(placementMode.isActive).toBe(true);
    });
  });

  describe('PlacementMode blocking EditMode', () => {
    it('should prevent edit mode from activating when placement mode is active', () => {
      // Activate placement mode first
      placementMode.isActive = true;

      // Try to activate edit mode
      const initialEditState = editMode.isActive;
      editMode.toggleEditMode();

      // Edit mode should remain inactive
      expect(editMode.isActive).toBe(initialEditState);
      expect(global.console.log).toHaveBeenCalledWith('Cannot enter edit mode - placement mode is active');
    });

    it('should allow edit mode when placement mode is not active', () => {
      // Ensure placement mode is not active
      placementMode.isActive = false;

      // Mock edit mode dependencies
      editMode.removeAllSprites = vi.fn();
      editMode.addBackgroundListeners = vi.fn();
      editMode.showEditInterface = vi.fn();
      editMode.createVisualBoxes = vi.fn();

      // Try to activate edit mode
      editMode.toggleEditMode();

      // Edit mode should be active
      expect(editMode.isActive).toBe(true);
    });
  });

  describe('Mode exit behavior', () => {
    it('should allow edit mode to exit and return to game mode', () => {
      // Activate edit mode
      editMode.isActive = true;
      editMode.removeBackgroundListeners = vi.fn();
      editMode.hideEditInterface = vi.fn();
      editMode.clearVisualBoxes = vi.fn();
      editMode.clearCurrentBox = vi.fn();

      // Exit edit mode
      editMode.toggleEditMode();

      // Edit mode should be inactive
      expect(editMode.isActive).toBe(false);
      expect(editMode.removeBackgroundListeners).toHaveBeenCalled();
      expect(editMode.hideEditInterface).toHaveBeenCalled();
    });

    it('should allow placement mode to exit and return to game mode', () => {
      // Activate placement mode
      placementMode.isActive = true;
      placementMode.storePlacementState = vi.fn();
      placementMode.disableSpriteDragging = vi.fn();
      placementMode.hidePlacementInterface = vi.fn();
      placementMode.clearSpriteSelection = vi.fn();
      placementMode.stopKeyRepeat = vi.fn();
      placementMode.clearDragState = vi.fn();

      // Exit placement mode
      placementMode.togglePlacementMode();

      // Placement mode should be inactive
      expect(placementMode.isActive).toBe(false);
      expect(placementMode.disableSpriteDragging).toHaveBeenCalled();
      expect(placementMode.hidePlacementInterface).toHaveBeenCalled();
    });
  });

  describe('setOtherMode functionality', () => {
    it('should properly set the other mode reference in EditMode', () => {
      const newPlacementMode = { isActive: false };
      editMode.setOtherMode(newPlacementMode);
      
      expect(editMode.otherMode).toBe(newPlacementMode);
    });

    it('should properly set the other mode reference in PlacementMode', () => {
      const newEditMode = { isActive: false };
      placementMode.setOtherMode(newEditMode);
      
      expect(placementMode.otherMode).toBe(newEditMode);
    });
  });

  describe('Event dispatching', () => {
    it('should dispatch editModeToggled event when edit mode toggles', () => {
      editMode.toggleEditMode();
      
      expect(global.CustomEvent).toHaveBeenCalledWith('editModeToggled', {
        detail: { isActive: editMode.isActive }
      });
      expect(global.document.dispatchEvent).toHaveBeenCalled();
    });

    it('should dispatch placementModeToggled event when placement mode toggles', async () => {
      // Mock dependencies for placement mode
      placementMode.templateManager = {
        loadAvailableTemplates: vi.fn(),
        getTemplateById: vi.fn(() => null)
      };
      placementMode.clearAllSprites = vi.fn();
      placementMode.copyGameStateToPlacementMode = vi.fn();
      placementMode.enableSpriteDragging = vi.fn();
      placementMode.showPlacementInterface = vi.fn();
      placementMode.updateSpritePositions = vi.fn();

      await placementMode.togglePlacementMode();
      
      expect(global.CustomEvent).toHaveBeenCalledWith('placementModeToggled', {
        detail: { isActive: placementMode.isActive }
      });
      expect(global.document.dispatchEvent).toHaveBeenCalled();
    });
  });
});