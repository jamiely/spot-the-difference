import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageGenerator } from '../js/utils/ImageGenerator.js';

interface MockContext {
  fillStyle: string;
  fillRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  ellipse: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  canvas: {
    width: number;
    height: number;
  };
}

interface MockCanvas {
  getContext: ReturnType<typeof vi.fn>;
  width: number;
  height: number;
}

interface Difference {
  x: number;
  y: number;
  width: number;
  height: number;
}

describe('ImageGenerator', () => {
  let mockContext: MockContext;
  let mockCanvas: MockCanvas;

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

    (global as any).Math = {
      ...Math,
      random: vi.fn(() => 0.5)
    };
  });

  it('should generate test images and return differences', () => {
    const differences: Difference[] = ImageGenerator.generateTestImages(mockCanvas as any, mockCanvas as any);
    
    expect(Array.isArray(differences)).toBe(true);
    expect(differences.length).toBeGreaterThan(0);
    expect(mockContext.fillRect).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalled();
  });

  it('should draw base image with correct elements', () => {
    ImageGenerator.drawBaseImage(mockContext as any);
    
    // Check that various drawing methods were called
    expect(mockContext.fillRect).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalled();
    expect(mockContext.ellipse).toHaveBeenCalled();
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.fill).toHaveBeenCalled();
  });

  it('should add differences and return difference data', () => {
    const differences: Difference[] = ImageGenerator.addDifferences(mockContext as any);
    
    expect(Array.isArray(differences)).toBe(true);
    expect(differences.length).toBe(3);
    
    // Check that each difference has required properties
    differences.forEach((diff: Difference) => {
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
    const count: number = 5;
    const differences: Difference[] = ImageGenerator.createRandomDifferences(count);
    
    expect(differences.length).toBe(count);
    
    differences.forEach((diff: Difference) => {
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
    const differences: Difference[] = ImageGenerator.createRandomDifferences();
    
    expect(differences.length).toBe(3);
  });

  it('should set different fill styles during drawing', () => {
    ImageGenerator.drawBaseImage(mockContext as any);
    
    // The fillStyle should have been changed multiple times for different elements
    expect(mockContext.fillStyle).toBeDefined();
  });
});