import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditMode } from '../js/components/EditMode.js';

// Mock ViewManager
vi.mock('../js/utils/ViewManager.js', () => ({
  ViewManager: {
    getBackgroundImage: vi.fn(),
    getContainer: vi.fn(),
    switchToSingleView: vi.fn(),
    switchToSideBySideView: vi.fn()
  }
}));

describe('EditMode', () => {
  let editMode;
  let mockBackgroundImg;
  let mockGameContainer;
  let mockEditPanel;
  let mockTextarea;
  let mockCopyButton;
  let mockLoadButton;
  let mockClearButton;
  let mockBackgroundInfo;

  beforeEach(async () => {
    vi.useFakeTimers();

    let eventListeners = {};

    const mockAddEventListener = vi.fn((event, callback) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(callback);
    });

    const mockRemoveEventListener = vi.fn((event, callback) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
      }
    });

    const mockDispatchEvent = vi.fn((event) => {
      if (eventListeners[event.type]) {
        eventListeners[event.type].forEach(callback => callback(event));
      }
    });

    mockBackgroundImg = {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      dispatchEvent: mockDispatchEvent,
      style: { cursor: '', display: '', width: '', height: '', borderRadius: '' },
      getBoundingClientRect: vi.fn(() => ({
        left: 100,
        top: 50,
        width: 800,
        height: 600,
        x: 100,
        y: 50,
        right: 900,
        bottom: 650,
      })),
      parentElement: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 1000,
          height: 700,
          x: 0,
          y: 0,
          right: 1000,
          bottom: 700,
        })),
      },
      src: 'http://localhost/backgrounds/test.png',
      complete: true,
      naturalWidth: 100,
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

    mockBackgroundInfo = {
      textContent: '',
      style: { display: '' },
    };

    mockEditPanel = {
      style: { display: '' },
      innerHTML: '',
      appendChild: vi.fn(),
    };

    mockGameContainer = {
      appendChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 700,
        x: 0,
        y: 0,
        right: 1000,
        bottom: 700,
      })),
    };

    global.document = {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      getElementById: vi.fn((id) => {
        switch (id) {
          case 'background-image':
            return mockBackgroundImg;
          case 'bounding-boxes-json':
            return mockTextarea;
          case 'copy-json':
            return mockCopyButton;
          case 'load-json':
            return mockLoadButton;
          case 'clear-boxes':
            return mockClearButton;
          case 'background-info':
            return mockBackgroundInfo;
          case 'edit-panel':
            return mockEditPanel;
          case 'game-container':
            return mockGameContainer;
          default:
            return null;
        }
      }),
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
          parentNode: null, // Will be set by appendChild
        };
        element.parentNode = mockBackgroundImg.parentElement;
        return element;
      }),
      querySelectorAll: vi.fn(() => []), // Default empty array
      dispatchEvent: mockDispatchEvent,
      body: { classList: { add: vi.fn(), remove: vi.fn() } },
    };

    global.CustomEvent = vi.fn();
    global.console = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    global.navigator = {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    };

    // Set up ViewManager mocks
    const { ViewManager } = await import('../js/utils/ViewManager.js');
    ViewManager.getBackgroundImage.mockReturnValue(mockBackgroundImg);
    ViewManager.getContainer.mockReturnValue(mockGameContainer);

    editMode = new EditMode();
  });

  it('should initialize with isActive false and empty boundingBoxes', () => {
    expect(editMode.isActive).toBe(false);
    expect(editMode.boundingBoxes).toEqual([]);
  });

  

  it('should remove bounding box', () => {
    editMode.boundingBoxes = [{ id: 1, x: 0, y: 0, width: 10, height: 10 }];
    document.querySelectorAll.mockReturnValueOnce([
      { dataset: { id: '1' }, remove: vi.fn() },
    ]);
    editMode.removeBoundingBox(1);
    expect(editMode.boundingBoxes.length).toBe(0);
    expect(document.querySelectorAll).toHaveBeenCalledWith('.bounding-box');
  });


  it('should copy JSON to clipboard', async () => {
    editMode.boundingBoxes = [{ id: 1, x: 0, y: 0, width: 10, height: 10 }];
    editMode.updateJsonExport(); // Populate textarea
    await editMode.copyJsonToClipboard();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(editMode.boundingBoxes, null, 2));
    expect(mockCopyButton.textContent).toBe('JSON copied to clipboard!');
    vi.runAllTimers();
    expect(mockCopyButton.textContent).toBe(''); // Resets after timeout
  });

  it('should load JSON from textarea', () => {
    mockTextarea.value = JSON.stringify([
      { x: 10, y: 10, width: 50, height: 50 },
    ]);
    editMode.loadJsonFromTextarea();
    expect(editMode.boundingBoxes.length).toBe(1);
    expect(editMode.boundingBoxes[0].x).toBe(10);
    expect(mockLoadButton.textContent).toContain('Loaded 1 bounding boxes');
    vi.runAllTimers();
    expect(mockLoadButton.textContent).toBe(''); // Resets after timeout
  });

  it('should handle keyboard events for toggling edit mode', () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: 'e' });
    editMode.enterEditMode = vi.fn();
    editMode.exitEditMode = vi.fn();
    
    // Simulate keydown event
    document.addEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )[1](keydownEvent);
    
    expect(editMode.isActive).toBe(true);
    expect(editMode.enterEditMode).toHaveBeenCalled();
  });


  it('should validate JSON format when loading', () => {
    mockTextarea.value = 'invalid json';
    editMode.loadJsonFromTextarea();
    
    expect(mockLoadButton.textContent).toContain('Invalid JSON');
    expect(editMode.boundingBoxes.length).toBe(0);
  });

  it('should clear all bounding boxes', () => {
    editMode.boundingBoxes = [
      { id: 1, x: 0, y: 0, width: 10, height: 10 },
      { id: 2, x: 20, y: 20, width: 15, height: 15 }
    ];
    
    const mockBoxElements = [
      { remove: vi.fn() },
      { remove: vi.fn() }
    ];
    document.querySelectorAll.mockReturnValue(mockBoxElements);
    
    editMode.clearAllBoxes();
    
    expect(editMode.boundingBoxes.length).toBe(0);
    expect(mockBoxElements[0].remove).toHaveBeenCalled();
    expect(mockBoxElements[1].remove).toHaveBeenCalled();
  });

  it('should handle mouse events for drawing bounding boxes', () => {
    editMode.isActive = true;
    editMode.createCurrentBox = vi.fn();
    
    const mouseEvent = {
      preventDefault: vi.fn(),
      target: mockBackgroundImg,
      clientX: 150,
      clientY: 100
    };
    
    editMode.handleMouseDown(mouseEvent);
    
    expect(editMode.isDrawing).toBe(true);
    expect(editMode.startPoint.x).toBe(50); // 150 - 100 (left offset)
    expect(editMode.startPoint.y).toBe(50); // 100 - 50 (top offset)
    expect(editMode.createCurrentBox).toHaveBeenCalled();
  });

  it('should finalize bounding box on mouse up', () => {
    editMode.isActive = true;
    editMode.isDrawing = true;
    editMode.currentBox = {
      element: { classList: { remove: vi.fn(), add: vi.fn() }, addEventListener: vi.fn() },
      displayX: 60,
      displayY: 45,
      width: 50,
      height: 30
    };
    editMode.updateJsonExport = vi.fn();
    
    const mouseEvent = {
      preventDefault: vi.fn()
    };
    
    editMode.handleMouseUp(mouseEvent);
    
    expect(editMode.isDrawing).toBe(false);
    expect(editMode.boundingBoxes.length).toBe(1);
    expect(editMode.updateJsonExport).toHaveBeenCalled();
  });

  it('should show and hide edit interface', () => {
    editMode.showEditInterface();
    expect(mockEditPanel.style.display).toBe('block');
    
    editMode.hideEditInterface();
    expect(mockEditPanel.style.display).toBe('none');
  });

  it('should handle background listeners', () => {
    editMode.addBackgroundListeners();
    // The actual implementation adds mousedown, mousemove, mouseup listeners to document
    expect(mockBackgroundImg.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(global.document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(global.document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockBackgroundImg.style.cursor).toBe('crosshair');
    
    editMode.removeBackgroundListeners();
    expect(mockBackgroundImg.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(global.document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(global.document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockBackgroundImg.style.cursor).toBe('default');
  });

  it('should create visual boxes when loading bounding boxes', () => {
    editMode.isActive = true;
    const boundingBoxes = [
      { id: 1, x: 10, y: 10, width: 50, height: 50 }
    ];
    
    editMode.createVisualBoxes = vi.fn();
    editMode.setBoundingBoxes(boundingBoxes);
    
    expect(editMode.boundingBoxes).toEqual(boundingBoxes);
    expect(editMode.createVisualBoxes).toHaveBeenCalled();
  });

  it('should update background info display', async () => {
    editMode.boundingBoxes = [
      { id: 1, x: 10, y: 10, width: 50, height: 50 }
    ];
    
    // Mock ViewManager to return the background image
    const { ViewManager } = await import('../js/utils/ViewManager.js');
    ViewManager.getBackgroundImage.mockReturnValue(mockBackgroundImg);
    
    editMode.updateBackgroundInfo();
    
    expect(mockBackgroundInfo.textContent).toContain('test.png');
    expect(mockBackgroundInfo.textContent).toContain('1 bounding boxes');
    expect(mockBackgroundInfo.style.display).toBe('block');
  });
});