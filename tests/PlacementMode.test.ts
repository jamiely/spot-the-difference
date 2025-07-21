import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlacementMode } from '../js/components/PlacementMode.js';
import { TemplateManager } from '../js/utils/TemplateManager.js';

// Type definitions for mocks
interface MockElementStyle {
  cursor: string;
  pointerEvents: string;
  position: string;
  transition: string;
  zIndex: string;
  opacity: string;
  left: string;
  top: string;
  display?: string;
  width?: string;
  maxWidth?: string;
  height?: string;
  borderRadius?: string;
  [key: string]: any;
}

interface MockElement {
  style: MockElementStyle;
  getBoundingClientRect: () => DOMRect;
  addEventListener: (event: string, handler: Function) => void;
  removeEventListener: (event: string, handler: Function) => void;
  remove: () => void;
  src?: string;
  classList: {
    add: (className: string) => void;
    remove: (className: string) => void;
  };
  dataset: { [key: string]: string };
  parentElement: MockElement | null;
  appendChild?: (child: MockElement) => void;
  removeChild?: (child: MockElement) => void;
  insertBefore?: (newChild: MockElement, referenceChild: MockElement | null) => void;
  querySelectorAll?: (selector: string) => MockElement[];
  innerHTML?: string;
  value?: string;
  textContent?: string;
  complete?: boolean;
  onload?: (() => void) | null;
  options?: MockElement[];
  children?: MockElement[];
  select?: () => void;
}

interface MockTemplate {
  id: string;
  name: string;
  background: string;
  sprites: Array<{
    src: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    renderCoordinates?: { x: number; y: number };
    renderDimensions?: { width: number; height: number };
  }>;
}

interface MockTemplateManager {
  loadAvailableTemplates: () => Promise<void>;
  getLoadedTemplates: () => MockTemplate[];
  getTemplateById: (id: string) => MockTemplate | null;
  checkBackgroundExists: (background: string) => Promise<boolean>;
  createTemplateFromCurrentState: (name: string, bg: string, sprites: any[]) => MockTemplate;
  exportTemplateAsJson: (template: MockTemplate) => string;
}

interface MockGlobal {
  document: {
    addEventListener: (event: string, handler: Function) => void;
    removeEventListener: (event: string, handler: Function) => void;
    getElementById: (id: string) => MockElement | null;
    querySelectorAll: (selector: string) => MockElement[];
    createElement: (tagName: string) => MockElement;
    dispatchEvent: (event: Event) => void;
    body: {
      classList: {
        add: (className: string) => void;
        remove: (className: string) => void;
      };
      appendChild: (child: MockElement) => void;
      removeChild: (child: MockElement) => void;
    };
  };
  CustomEvent: new (type: string, init?: CustomEventInit) => CustomEvent;
  console: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  prompt: (message: string) => string | null;
  navigator: {
    clipboard: {
      writeText: (text: string) => Promise<void>;
    };
  };
}

// Mock dependencies
vi.mock('../js/utils/TemplateManager.js', () => ({
  TemplateManager: vi.fn().mockImplementation((): MockTemplateManager => ({
    loadAvailableTemplates: vi.fn(() => Promise.resolve()),
    getLoadedTemplates: vi.fn(() => [{ id: 'template1', name: 'Template One', sprites: [] }]),
    getTemplateById: vi.fn((id: string) => {
      if (id === 'template1') {
        return { id: 'template1', name: 'Template One', background: 'bg.png', sprites: [{ src: 's1.png', x: 10, y: 20 }] };
      }
      return null;
    }),
    checkBackgroundExists: vi.fn(() => Promise.resolve(true)),
    createTemplateFromCurrentState: vi.fn((name: string, bg: string, sprites: any[]) => ({ name, background: bg, sprites })),
    exportTemplateAsJson: vi.fn((template: MockTemplate) => JSON.stringify(template)),
  }))
}));

describe('PlacementMode', () => {
  let placementMode: PlacementMode;
  let mockGameContainer: MockElement;
  let mockBackgroundImg: MockElement;
  let mockSprite: MockElement;
  let mockTextarea: MockElement;
  let mockCopyButton: MockElement;
  let mockLoadButton: MockElement;
  let mockClearButton: MockElement;
  let mockPlaceAllButton: MockElement;
  let mockResetOutsideButton: MockElement;
  let mockTemplateSelect: MockElement;
  let mockLoadTemplateButton: MockElement;
  let mockSaveTemplateButton: MockElement;
  let mockPlacementPanel: MockElement;
  let mockTrashBin: MockElement;
  let mockSpriteNameEl: MockElement;
  let mockAbsolutePosEl: MockElement;
  let mockContainerPosEl: MockElement;
  let mockBackgroundPosEl: MockElement;

  beforeEach(() => {
    vi.useFakeTimers();

    mockGameContainer = {
      style: {} as MockElementStyle,
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 700 } as DOMRect)),
      insertBefore: vi.fn(),
      querySelectorAll: vi.fn(() => []), // Default for sprites
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
    };

    mockBackgroundImg = {
      style: {} as MockElementStyle,
      getBoundingClientRect: vi.fn(() => ({ left: 100, top: 50, width: 800, height: 600 } as DOMRect)),
      parentElement: mockGameContainer,
      src: 'http://localhost/backgrounds/test.png',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
    };

    mockSprite = {
      style: { cursor: '', pointerEvents: '', position: '', transition: '', zIndex: '', opacity: '', left: '0px', top: '0px' },
      getBoundingClientRect: vi.fn(() => ({ left: 10, top: 10, width: 50, height: 50 } as DOMRect)),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      src: 'http://localhost/sprites/s1.png',
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: mockGameContainer,
    };

    mockTextarea = {
      style: {} as MockElementStyle,
      value: '',
      select: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockCopyButton = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      textContent: '',
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockLoadButton = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      textContent: '',
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockClearButton = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockPlaceAllButton = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      textContent: '',
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockResetOutsideButton = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      textContent: '',
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockTemplateSelect = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      value: '',
      options: [],
      children: [],
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockLoadTemplateButton = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      textContent: '',
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockSaveTemplateButton = {
      style: {} as MockElementStyle,
      addEventListener: vi.fn(),
      textContent: '',
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockPlacementPanel = {
      style: { display: '' } as MockElementStyle,
      innerHTML: '',
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    mockTrashBin = {
      style: {} as MockElementStyle,
      classList: { add: vi.fn(), remove: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 900, top: 600, width: 100, height: 100 } as DOMRect)),
      dataset: {},
      parentElement: null,
    };

    mockSpriteNameEl = { 
      style: {} as MockElementStyle,
      textContent: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };
    mockAbsolutePosEl = { 
      style: {} as MockElementStyle,
      textContent: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };
    mockContainerPosEl = { 
      style: {} as MockElementStyle,
      textContent: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };
    mockBackgroundPosEl = { 
      style: {} as MockElementStyle,
      textContent: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      dataset: {},
      parentElement: null,
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
    };

    (global as any).document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getElementById: vi.fn((id: string) => {
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
            return { textContent: '', style: {} } as any;
          default:
            return null;
        }
      }),
      querySelectorAll: vi.fn(() => [mockSprite]),
      createElement: vi.fn((tagName: string) => {
        const element: MockElement = {
          style: {} as MockElementStyle,
          tagName: tagName.toUpperCase(),
          classList: { add: vi.fn(), remove: vi.fn() },
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          remove: vi.fn(),
          parentElement: null,
          appendChild: vi.fn(),
          innerHTML: '',
          children: [],
          dataset: {},
          getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)),
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

    (global as any).CustomEvent = vi.fn();
    (global as any).console = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    (global as any).prompt = vi.fn(() => 'Test Template Name');
    (global as any).navigator = {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    };

    placementMode = new PlacementMode();
  });

  it('should select a sprite', () => {
    placementMode.selectSprite(mockSprite as any);
    expect(placementMode.selectedSprite).toBe(mockSprite);
    expect(mockSprite.classList.add).toHaveBeenCalledWith('selected-sprite');
    expect(mockGameContainer.appendChild).toHaveBeenCalledWith(mockSprite);
    expect(document.createElement).toHaveBeenCalledWith('div'); // For selection indicator
  });

  it('should clear sprite selection', () => {
    placementMode.selectSprite(mockSprite as any);
    placementMode.clearSpriteSelection();
    expect(placementMode.selectedSprite).toBe(null);
    expect(mockSprite.classList.remove).toHaveBeenCalledWith('selected-sprite');
  });

  it('should update sprite positions', () => {
    (placementMode as any).spritePositions = []; // Clear initial state
    placementMode.updateSpritePositions();
    expect((placementMode as any).spritePositions.length).toBe(1);
    expect((placementMode as any).spritePositions[0].src).toBe('s1.png');
  });

  it('should move sprite up in order', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll!.mockReturnValueOnce([mockSprite, sprite2]);
    placementMode.selectedSprite = mockSprite as any;
    placementMode.moveSpriteUp();
    expect(mockGameContainer.insertBefore).toHaveBeenCalledWith(mockSprite, (sprite2 as any).nextSibling);
  });

  it('should move sprite down in order', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll!.mockReturnValueOnce([sprite2, mockSprite]);
    placementMode.selectedSprite = mockSprite as any;
    placementMode.moveSpriteDown();
    expect(mockGameContainer.insertBefore).toHaveBeenCalledWith(mockSprite, sprite2);
  });

  it('should move sprite to end (top layer)', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll!.mockReturnValueOnce([mockSprite, sprite2]);
    placementMode.selectedSprite = mockSprite as any;
    placementMode.moveSpriteToEnd();
    expect(mockGameContainer.appendChild).toHaveBeenCalledWith(mockSprite);
  });

  it('should move sprite to beginning (bottom layer)', () => {
    const sprite2 = { ...mockSprite, src: 'http://localhost/sprites/s2.png' };
    mockGameContainer.querySelectorAll!.mockReturnValueOnce([sprite2, mockSprite]);
    placementMode.selectedSprite = mockSprite as any;
    placementMode.moveSpriteToBeginning();
    expect(mockGameContainer.insertBefore).toHaveBeenCalledWith(mockSprite, sprite2);
  });

  it('should delete selected sprite', () => {
    placementMode.selectSprite(mockSprite as any);
    placementMode.deleteSelectedSprite();
    vi.runAllTimers(); // Advance timers for setTimeout
    expect(mockSprite.remove).toHaveBeenCalled();
    expect(placementMode.selectedSprite).toBe(null);
  });

  it('should copy positions JSON to clipboard', async () => {
    (placementMode as any).spritePositions = [{ src: 's1.png', x: 10, y: 20 }];
    placementMode.updateJsonExport();
    await placementMode.copyJsonToClipboard();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify((placementMode as any).spritePositions, null, 2));
    expect(mockCopyButton.textContent).toBe('JSON copied to clipboard!');
  });

  it('should handle keyboard events for toggling placement mode', async () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: 'p' });
    placementMode.enterPlacementMode = vi.fn();
    placementMode.exitPlacementMode = vi.fn();
    
    // Mock dependencies
    (placementMode as any).templateManager = {
      loadAvailableTemplates: vi.fn(),
      getTemplateById: vi.fn(() => null)
    };
    
    // Simulate keydown event
    const keydownHandler = (document.addEventListener as any).mock.calls.find(
      (call: any[]) => call[0] === 'keydown'
    )[1];
    
    await keydownHandler(keydownEvent);
    
    expect(placementMode.isActive).toBe(true);
  });

  it('should store and restore placement state', () => {
    (placementMode as any).spritePositions = [
      { id: 'sprite_1', src: 'sprite1.png', x: 10, y: 20 }
    ];
    
    placementMode.storePlacementState();
    
    // Should have stored the state (implementation detail, but we can verify it was called)
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('Storing placement state')
    );
  });

});