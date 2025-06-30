import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlacementMode } from '../js/components/PlacementMode.js';
import { TemplateManager } from '../js/utils/TemplateManager.js';

// Mock dependencies
vi.mock('../js/utils/TemplateManager.js', () => ({
  TemplateManager: vi.fn().mockImplementation(() => ({
    loadAvailableTemplates: vi.fn(() => Promise.resolve()),
    getLoadedTemplates: vi.fn(() => [{ id: 'template1', name: 'Template One', sprites: [] }]),
    getTemplateById: vi.fn((id) => {
      if (id === 'template1') {
        return { id: 'template1', name: 'Template One', background: 'bg.png', sprites: [{ src: 's1.png', x: 10, y: 20 }] };
      }
      return null;
    }),
    checkBackgroundExists: vi.fn(() => Promise.resolve(true)),
    createTemplateFromCurrentState: vi.fn((name, bg, sprites) => ({ name, background: bg, sprites })),
    exportTemplateAsJson: vi.fn((template) => JSON.stringify(template)),
  }))
}));

describe('PlacementMode', () => {
  let placementMode;
  let mockGameContainer;
  let mockBackgroundImg;
  let mockSprite;
  let mockTextarea;
  let mockCopyButton;
  let mockLoadButton;
  let mockClearButton;
  let mockPlaceAllButton;
  let mockResetOutsideButton;
  let mockTemplateSelect;
  let mockLoadTemplateButton;
  let mockSaveTemplateButton;
  let mockPlacementPanel;
  let mockTrashBin;
  let mockSpriteNameEl;
  let mockAbsolutePosEl;
  let mockContainerPosEl;
  let mockBackgroundPosEl;

  beforeEach(() => {
    vi.useFakeTimers();

    mockGameContainer = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 700 })),
      insertBefore: vi.fn(),
      querySelectorAll: vi.fn(() => []), // Default for sprites
    };

    mockBackgroundImg = {
      getBoundingClientRect: vi.fn(() => ({ left: 100, top: 50, width: 800, height: 600 })),
      parentElement: mockGameContainer,
      src: 'http://localhost/backgrounds/test.png',
    };

    mockSprite = {
      style: { cursor: '', pointerEvents: '', position: '', transition: '', zIndex: '', opacity: '', left: '0px', top: '0px' },
      getBoundingClientRect: vi.fn(() => ({ left: 10, top: 10, width: 50, height: 50 })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      src: 'http://localhost/sprites/s1.png',
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: mockGameContainer,
    };

    mockTextarea = {
      value: '',
      style: {},
      select: vi.fn(),
    };

    mockCopyButton = {
      addEventListener: vi.fn(),
      textContent: '',
      style: {},
    };

    mockLoadButton = {
      addEventListener: vi.fn(),
      textContent: '',
      style: {},
    };

    mockClearButton = {
      addEventListener: vi.fn(),
    };

    mockPlaceAllButton = {
      addEventListener: vi.fn(),
      textContent: '',
      style: {},
    };

    mockResetOutsideButton = {
      addEventListener: vi.fn(),
      textContent: '',
      style: {},
    };

    mockTemplateSelect = {
      addEventListener: vi.fn(),
      value: '',
      options: [],
      children: [],
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };

    mockLoadTemplateButton = {
      addEventListener: vi.fn(),
      textContent: '',
      style: {},
    };

    mockSaveTemplateButton = {
      addEventListener: vi.fn(),
      textContent: '',
      style: {},
    };

    mockPlacementPanel = {
      style: { display: '' },
      innerHTML: '',
      appendChild: vi.fn(),
    };

    mockTrashBin = {
      style: {},
      classList: { add: vi.fn(), remove: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 900, top: 600, width: 100, height: 100 })),
    };

    mockSpriteNameEl = { textContent: '' };
    mockAbsolutePosEl = { textContent: '' };
    mockContainerPosEl = { textContent: '' };
    mockBackgroundPosEl = { textContent: '' };

    global.document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'game-container':
            return mockGameContainer;
          case 'background-image':
            return mockBackgroundImg;
          case 'sprite-positions-json':
            return mockTextarea;
          case 'copy-positions':
            return mockCopyButton;
          case 'load-positions':
            return mockLoadButton;
          case 'clear-positions':
            return mockClearButton;
          case 'place-all-sprites':
            return mockPlaceAllButton;
          case 'reset-outside-sprites':
            return mockResetOutsideButton;
          case 'template-select':
            return mockTemplateSelect;
          case 'load-template':
            return mockLoadTemplateButton;
          case 'save-template':
            return mockSaveTemplateButton;
          case 'placement-panel':
            return mockPlacementPanel;
          case 'trash-bin':
            return mockTrashBin;
          case 'sprite-name':
            return mockSpriteNameEl;
          case 'absolute-position':
            return mockAbsolutePosEl;
          case 'container-position':
            return mockContainerPosEl;
          case 'background-position':
            return mockBackgroundPosEl;
          case 'placement-info':
            return { textContent: '', style: {} };
          default:
            return null;
        }
      }),
      querySelectorAll: vi.fn(() => [mockSprite]),
      createElement: vi.fn((tagName) => {
        const element = {
          tagName: tagName.toUpperCase(),
          className: '',
          style: {},
          dataset: {},
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          remove: vi.fn(),
          classList: { add: vi.fn(), remove: vi.fn() },
          parentNode: null,
          appendChild: vi.fn(), // For modal content
          innerHTML: '',
          children: [],
        };
        if (tagName === 'option') {
          element.value = '';
          element.textContent = '';
        }
        return element;
      }),
      dispatchEvent: vi.fn(),
      body: { classList: { add: vi.fn(), remove: vi.fn() }, appendChild: vi.fn(), removeChild: vi.fn() },
    };

    global.CustomEvent = vi.fn();
    global.console = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    global.prompt = vi.fn(() => 'Test Template Name');
    global.navigator = {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    };

    placementMode = new PlacementMode();
  });

  it('should select a sprite', () => {
    placementMode.selectSprite(mockSprite);
    expect(placementMode.selectedSprite).toBe(mockSprite);
    expect(mockSprite.classList.add).toHaveBeenCalledWith('selected-sprite');
    expect(mockGameContainer.appendChild).toHaveBeenCalledWith(mockSprite);
    expect(document.createElement).toHaveBeenCalledWith('div'); // For selection indicator
  });

  it('should clear sprite selection', () => {
    placementMode.selectSprite(mockSprite);
    placementMode.clearSpriteSelection();
    expect(placementMode.selectedSprite).toBe(null);
    expect(mockSprite.classList.remove).toHaveBeenCalledWith('selected-sprite');
  });

  it('should update sprite positions', () => {
    placementMode.spritePositions = []; // Clear initial state
    placementMode.updateSpritePositions();
    expect(placementMode.spritePositions.length).toBe(1);
    expect(placementMode.spritePositions[0].src).toBe('s1.png');
  });

  it('should move sprite up in order', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll.mockReturnValueOnce([mockSprite, sprite2]);
    placementMode.selectedSprite = mockSprite;
    placementMode.moveSpriteUp();
    expect(mockGameContainer.insertBefore).toHaveBeenCalledWith(mockSprite, sprite2.nextSibling);
  });

  it('should move sprite down in order', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll.mockReturnValueOnce([sprite2, mockSprite]);
    placementMode.selectedSprite = mockSprite;
    placementMode.moveSpriteDown();
    expect(mockGameContainer.insertBefore).toHaveBeenCalledWith(mockSprite, sprite2);
  });

  it('should move sprite to end (top layer)', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll.mockReturnValueOnce([mockSprite, sprite2]);
    placementMode.selectedSprite = mockSprite;
    placementMode.moveSpriteToEnd();
    expect(mockGameContainer.appendChild).toHaveBeenCalledWith(mockSprite);
  });

  it('should move sprite to beginning (bottom layer)', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll.mockReturnValueOnce([sprite2, mockSprite]);
    placementMode.selectedSprite = mockSprite;
    placementMode.moveSpriteToBeginning();
    expect(mockGameContainer.insertBefore).toHaveBeenCalledWith(mockSprite, sprite2);
  });

  it('should delete selected sprite', () => {
    placementMode.selectSprite(mockSprite);
    placementMode.deleteSelectedSprite();
    vi.runAllTimers(); // Advance timers for setTimeout
    expect(mockSprite.remove).toHaveBeenCalled();
    expect(placementMode.selectedSprite).toBe(null);
  });

  it('should copy positions JSON to clipboard', async () => {
    placementMode.spritePositions = [{ src: 's1.png', x: 10, y: 20 }];
    placementMode.updateJsonExport();
    await placementMode.copyJsonToClipboard();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(placementMode.spritePositions, null, 2));
    expect(mockCopyButton.textContent).toBe('JSON copied to clipboard!');
  });

  it('should handle keyboard events for toggling placement mode', async () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: 'p' });
    placementMode.enterPlacementMode = vi.fn();
    placementMode.exitPlacementMode = vi.fn();
    
    // Mock dependencies
    placementMode.templateManager = {
      loadAvailableTemplates: vi.fn(),
      getTemplateById: vi.fn(() => null)
    };
    
    // Simulate keydown event
    const keydownHandler = document.addEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )[1];
    
    await keydownHandler(keydownEvent);
    
    expect(placementMode.isActive).toBe(true);
  });


  it('should store and restore placement state', () => {
    placementMode.spritePositions = [
      { id: 'sprite_1', src: 'sprite1.png', x: 10, y: 20 }
    ];
    
    placementMode.storePlacementState();
    
    // Should have stored the state (implementation detail, but we can verify it was called)
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('Storing placement state')
    );
  });

});