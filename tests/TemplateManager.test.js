import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from '../js/utils/TemplateManager.js';

describe('TemplateManager', () => {
  let templateManager;

  beforeEach(() => {
    templateManager = new TemplateManager();
    global.console = { warn: vi.fn(), log: vi.fn() };
    global.fetch = vi.fn();
    global.Image = class {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this.src = '';
        // Simulate async loading
        Object.defineProperty(this, 'src', {
          set(value) {
            this._src = value;
            if (value.includes('nonexistent')) {
              setTimeout(() => this.onerror && this.onerror(new Error('Mock load error')), 100);
            } else {
              setTimeout(() => this.onload && this.onload(), 100);
            }
          },
          get() {
            return this._src;
          },
        });
      }
    };
  });

  it('should load available templates', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          name: 'Test Template',
          background: 'test_bg.png',
          sprites: [{ src: 'sprite1.png', x: 10, y: 20 }]
        }),
      })
    );

    const templates = await templateManager.loadAvailableTemplates();
    expect(templates.length).toBe(1);
    expect(templates[0].name).toBe('Test Template');
  });

  it('should validate a valid template', () => {
    const validTemplate = {
      name: 'Valid Template',
      background: 'bg.png',
      sprites: [{ src: 's1.png', x: 1, y: 2 }],
    };
    expect(templateManager.validateTemplate(validTemplate)).toBe(true);
  });

  it('should invalidate a template with missing name', () => {
    const invalidTemplate = {
      background: 'bg.png',
      sprites: [{ src: 's1.png', x: 1, y: 2 }],
    };
    expect(templateManager.validateTemplate(invalidTemplate)).toBe(false);
  });

  it('should invalidate a template with invalid sprite src', () => {
    const invalidTemplate = {
      name: 'Test',
      background: 'bg.png',
      sprites: [{ src: null, x: 1, y: 2 }],
    };
    expect(templateManager.validateTemplate(invalidTemplate)).toBe(false);
  });

  it('should get loaded templates', async () => {
    templateManager.loadedTemplates = [{ id: 't1' }, { id: 't2' }];
    expect(templateManager.getLoadedTemplates().length).toBe(2);
  });

  it('should get template by id', async () => {
    templateManager.loadedTemplates = [{ id: 't1' }, { id: 't2' }];
    expect(templateManager.getTemplateById('t1')).toEqual({ id: 't1' });
  });

  it('should get template by name', async () => {
    templateManager.loadedTemplates = [{ name: 'Template One' }, { name: 'Template Two' }];
    expect(templateManager.getTemplateByName('Template One')).toEqual({ name: 'Template One' });
  });

  it('should save a valid template', async () => {
    const validTemplate = {
      name: 'Save Test',
      background: 'bg.png',
      sprites: [{ src: 's1.png', x: 1, y: 2 }],
    };
    const savedTemplate = await templateManager.saveTemplate(validTemplate);
    expect(savedTemplate.name).toBe('Save Test');
  });

  it('should throw error for invalid template on save', async () => {
    const invalidTemplate = {
      background: 'bg.png',
      sprites: [{ src: 's1.png', x: 1, y: 2 }],
    };
    await expect(templateManager.saveTemplate(invalidTemplate)).rejects.toThrow('Invalid template data');
  });

  it('should create template from current state', () => {
    const template = templateManager.createTemplateFromCurrentState(
      'New Template',
      'new_bg.png',
      [{ src: 's1.png', x: 10, y: 20, width: 100, height: 100 }]
    );
    expect(template.name).toBe('New Template');
    expect(template.sprites.length).toBe(1);
  });

  it('should export template as JSON', () => {
    const template = {
      name: 'Export Test',
      background: 'bg.png',
      sprites: [],
    };
    const json = templateManager.exportTemplateAsJson(template);
    expect(json).toBe(JSON.stringify(template, null, 2));
  });

  it('should check if background exists', async () => {
    const img = new Image();
    img.src = './backgrounds/existing.png';
    await expect(templateManager.checkBackgroundExists('existing.png')).resolves.toBe(true);
  });

  it('should validate template with new background dimensions structure', () => {
    const validTemplate = {
      name: 'Test Template',
      background: 'test.png',
      backgroundDimensions: {
        originalDimensions: { width: 1024, height: 1536 },
        renderDimensions: { width: 400, height: 600 }
      },
      sprites: [{ src: 'sprite.png', x: 100, y: 200 }]
    };

    expect(templateManager.validateTemplate(validTemplate)).toBe(true);
  });

  it('should reject template with invalid background dimensions structure', () => {
    const invalidTemplate = {
      name: 'Invalid Template',
      background: 'test.png',
      backgroundDimensions: {
        originalWidth: 1024, // Old structure
        originalHeight: 1536,
        renderWidth: 400,
        renderHeight: 600
      },
      sprites: [{ src: 'sprite.png', x: 100, y: 200 }]
    };

    expect(templateManager.validateTemplate(invalidTemplate)).toBe(false);
  });

  it('should get background dimensions from assets', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        backgrounds: [
          { filename: 'test.png', width: 1024, height: 1536 }
        ]
      })
    });

    const dimensions = await templateManager.getBackgroundDimensionsFromAssets('test.png');
    
    expect(dimensions).toEqual({
      originalWidth: 1024,
      originalHeight: 1536
    });
  });

  it('should return null for missing background in assets', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        backgrounds: [
          { filename: 'other.png', width: 800, height: 600 }
        ]
      })
    });

    const dimensions = await templateManager.getBackgroundDimensionsFromAssets('missing.png');
    
    expect(dimensions).toBeNull();
  });

  it('should calculate render dimensions correctly', () => {
    const result = templateManager.calculateRenderDimensions(1024, 1536, 400);
    
    expect(result.renderWidth).toBe(400);
    expect(result.renderHeight).toBe(600); // Math.round(400 / (1024/1536))
  });

  it('should create template with background dimensions', () => {
    const backgroundDimensions = {
      originalDimensions: { width: 1024, height: 1536 },
      renderDimensions: { width: 400, height: 600 }
    };

    const template = templateManager.createTemplateFromCurrentState(
      'New Template',
      'new_bg.png',
      [{ src: 's1.png', x: 10, y: 20, width: 100, height: 100 }],
      backgroundDimensions
    );

    expect(template.name).toBe('New Template');
    expect(template.backgroundDimensions).toEqual(backgroundDimensions);
    expect(template.sprites.length).toBe(1);
  });
});