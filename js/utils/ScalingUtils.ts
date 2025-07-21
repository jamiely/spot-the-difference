import type { 
  Dimensions, 
  Position, 
  ScalingContext, 
  TemplateData, 
  SpriteData 
} from '../../src/types/index.js';

interface TemplateDimensions {
  renderWidth: number;
  renderHeight: number;
}

interface ScalingFactor {
  scaleX: number;
  scaleY: number;
}

interface ScaledCoordinates extends Position {
  width: number;
  height: number;
}

interface SpriteCoordinates extends Position {
  width?: number;
  height?: number;
  renderDimensions?: Dimensions;
}

export class ScalingUtils {
  /**
   * Calculate the scaling factor between template render dimensions and actual displayed dimensions
   */
  static calculateScalingFactor(
    templateDimensions: TemplateDimensions, 
    actualDimensions: Dimensions
  ): ScalingFactor {
    const scaleX = actualDimensions.width / templateDimensions.renderWidth;
    const scaleY = actualDimensions.height / templateDimensions.renderHeight;
    
    return { scaleX, scaleY };
  }
  
  /**
   * Scale sprite coordinates from template space to actual display space
   */
  static scaleCoordinates(
    spriteCoords: SpriteCoordinates, 
    scalingFactor: ScalingFactor
  ): ScaledCoordinates {
    return {
      x: Math.round(spriteCoords.x * scalingFactor.scaleX),
      y: Math.round(spriteCoords.y * scalingFactor.scaleY),
      width: spriteCoords.renderDimensions 
        ? Math.round(spriteCoords.renderDimensions.width * scalingFactor.scaleX) 
        : Math.round((spriteCoords.width || 0) * scalingFactor.scaleX),
      height: spriteCoords.renderDimensions 
        ? Math.round(spriteCoords.renderDimensions.height * scalingFactor.scaleY) 
        : Math.round((spriteCoords.height || 0) * scalingFactor.scaleY)
    };
  }
  
  /**
   * Scale sprite coordinates from actual display space back to template space
   */
  static unscaleCoordinates(
    spriteCoords: ScaledCoordinates, 
    scalingFactor: ScalingFactor
  ): ScaledCoordinates {
    return {
      x: Math.round(spriteCoords.x / scalingFactor.scaleX),
      y: Math.round(spriteCoords.y / scalingFactor.scaleY),
      width: Math.round(spriteCoords.width / scalingFactor.scaleX),
      height: Math.round(spriteCoords.height / scalingFactor.scaleY)
    };
  }
  
  /**
   * Get the actual display dimensions of a background element
   */
  static getActualBackgroundDimensions(backgroundElement: HTMLElement): Dimensions {
    const rect = backgroundElement.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height
    };
  }
  
  /**
   * Create a scaling context for a template and background element
   */
  static createScalingContext(
    template: TemplateData, 
    backgroundElement: HTMLElement
  ): any {
    if (!template || !template.backgroundDimensions) {
      console.warn('Template missing backgroundDimensions, scaling will not work properly');
      return null;
    }
    
    // Type guard to ensure backgroundDimensions has the expected structure
    const bgDimensions = template.backgroundDimensions as any;
    if (!bgDimensions.renderDimensions) {
      console.warn('Template backgroundDimensions missing renderDimensions');
      return null;
    }
    
    const templateDimensions: TemplateDimensions = {
      renderWidth: bgDimensions.renderDimensions.width,
      renderHeight: bgDimensions.renderDimensions.height
    };
    
    const actualDimensions = this.getActualBackgroundDimensions(backgroundElement);
    const scalingFactor = this.calculateScalingFactor(templateDimensions, actualDimensions);
    
    return {
      templateDimensions,
      actualDimensions,
      scalingFactor
    };
  }
  
  /**
   * Apply scaling to all sprites in a template
   */
  static scaleAllSprites(
    template: TemplateData, 
    scalingContext: any
  ): SpriteData[] {
    if (!scalingContext) {
      console.warn('No scaling context provided, returning original coordinates');
      return template.sprites;
    }
    
    return template.sprites.map(sprite => ({
      ...sprite,
      ...this.scaleCoordinates(sprite, scalingContext.scalingFactor)
    }));
  }
  
  /**
   * Check if scaling is needed (actual dimensions differ from template render dimensions)
   */
  static isScalingNeeded(scalingContext: any, tolerance: number = 1): boolean {
    if (!scalingContext) return false;
    
    const { templateDimensions, actualDimensions } = scalingContext;
    
    return Math.abs(actualDimensions.width - templateDimensions.renderWidth) > tolerance ||
           Math.abs(actualDimensions.height - templateDimensions.renderHeight) > tolerance;
  }
}