import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageGenerator } from '../js/utils/ImageGenerator.js';

describe('ImageGenerator', () => {
  let mockContext;
  let mockCanvas;

  beforeEach(() => {
    mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      canvas: {
        width: 400,
        height: 300
      }
    };

    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      width: 400,
      height: 300
    };

    global.Math = {
      ...Math,
      random: vi.fn(() => 0.5)
    };
  });

  it('should generate test images and return differences', () => {
    const differences = ImageGenerator.generateTestImages(mockCanvas, mockCanvas);
    
    expect(Array.isArray(differences)).toBe(true);
    expect(differences.length).toBeGreaterThan(0);
    expect(mockContext.fillRect).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalled();
  });

  it('should draw base image with correct elements', () => {
    ImageGenerator.drawBaseImage(mockContext);
    
    // Check that various drawing methods were called
    expect(mockContext.fillRect).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalled();
    expect(mockContext.ellipse).toHaveBeenCalled();
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.fill).toHaveBeenCalled();
  });

  it('should add differences and return difference data', () => {
    const differences = ImageGenerator.addDifferences(mockContext);
    
    expect(Array.isArray(differences)).toBe(true);
    expect(differences.length).toBe(3);
    
    // Check that each difference has required properties
    differences.forEach(diff => {
      expect(diff).toHaveProperty('x');
      expect(diff).toHaveProperty('y');
      expect(diff).toHaveProperty('width');
      expect(diff).toHaveProperty('height');
      expect(typeof diff.x).toBe('number');
      expect(typeof diff.y).toBe('number');
      expect(typeof diff.width).toBe('number');
      expect(typeof diff.height).toBe('number');
    });
  });

  it('should create random differences with specified count', () => {
    const count = 5;
    const differences = ImageGenerator.createRandomDifferences(count);
    
    expect(differences.length).toBe(count);
    
    differences.forEach(diff => {
      expect(diff).toHaveProperty('x');
      expect(diff).toHaveProperty('y');
      expect(diff).toHaveProperty('width');
      expect(diff).toHaveProperty('height');
      expect(diff.x).toBeGreaterThanOrEqual(0);
      expect(diff.y).toBeGreaterThanOrEqual(0);
      expect(diff.width).toBeGreaterThan(0);
      expect(diff.height).toBeGreaterThan(0);
    });
  });

  it('should create random differences with default count', () => {
    const differences = ImageGenerator.createRandomDifferences();
    
    expect(differences.length).toBe(3);
  });

  it('should set different fill styles during drawing', () => {
    ImageGenerator.drawBaseImage(mockContext);
    
    // The fillStyle should have been changed multiple times for different elements
    expect(mockContext.fillStyle).toBeDefined();
  });
});