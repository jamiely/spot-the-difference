export class ScalingUtils {
    /**
     * Calculate the scaling factor between template render dimensions and actual displayed dimensions
     * @param {Object} templateDimensions - Template render dimensions {renderWidth, renderHeight}
     * @param {Object} actualDimensions - Actual displayed dimensions {width, height}
     * @returns {Object} Scaling factors {scaleX, scaleY}
     */
    static calculateScalingFactor(templateDimensions, actualDimensions) {
        const scaleX = actualDimensions.width / templateDimensions.renderWidth;
        const scaleY = actualDimensions.height / templateDimensions.renderHeight;
        
        return { scaleX, scaleY };
    }
    
    /**
     * Scale sprite coordinates from template space to actual display space
     * @param {Object} spriteCoords - Template sprite coordinates {x, y, width, height}
     * @param {Object} scalingFactor - Scaling factors {scaleX, scaleY}
     * @returns {Object} Scaled coordinates {x, y, width, height}
     */
    static scaleCoordinates(spriteCoords, scalingFactor) {
        return {
            x: Math.round(spriteCoords.x * scalingFactor.scaleX),
            y: Math.round(spriteCoords.y * scalingFactor.scaleY),
            width: spriteCoords.renderDimensions ? Math.round(spriteCoords.renderDimensions.width * scalingFactor.scaleX) : Math.round(spriteCoords.width * scalingFactor.scaleX),
            height: spriteCoords.renderDimensions ? Math.round(spriteCoords.renderDimensions.height * scalingFactor.scaleY) : Math.round(spriteCoords.height * scalingFactor.scaleY)
        };
    }
    
    /**
     * Scale sprite coordinates from actual display space back to template space
     * @param {Object} spriteCoords - Actual sprite coordinates {x, y, width, height}
     * @param {Object} scalingFactor - Scaling factors {scaleX, scaleY}
     * @returns {Object} Template coordinates {x, y, width, height}
     */
    static unscaleCoordinates(spriteCoords, scalingFactor) {
        return {
            x: Math.round(spriteCoords.x / scalingFactor.scaleX),
            y: Math.round(spriteCoords.y / scalingFactor.scaleY),
            width: Math.round(spriteCoords.width / scalingFactor.scaleX),
            height: Math.round(spriteCoords.height / scalingFactor.scaleY)
        };
    }
    
    /**
     * Get the actual display dimensions of a background element
     * @param {HTMLElement} backgroundElement - The background image element
     * @returns {Object} Actual dimensions {width, height}
     */
    static getActualBackgroundDimensions(backgroundElement) {
        const rect = backgroundElement.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    }
    
    /**
     * Create a scaling context for a template and background element
     * @param {Object} template - Template object with backgroundDimensions
     * @param {HTMLElement} backgroundElement - The background image element
     * @returns {Object} Scaling context {templateDimensions, actualDimensions, scalingFactor}
     */
    static createScalingContext(template, backgroundElement) {
        if (!template || !template.backgroundDimensions) {
            console.warn('Template missing backgroundDimensions, scaling will not work properly');
            return null;
        }
        
        const templateDimensions = {
            renderWidth: template.backgroundDimensions.renderDimensions.width,
            renderHeight: template.backgroundDimensions.renderDimensions.height
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
     * @param {Object} template - Template object with sprites
     * @param {Object} scalingContext - Scaling context from createScalingContext
     * @returns {Array} Array of scaled sprite coordinates
     */
    static scaleAllSprites(template, scalingContext) {
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
     * @param {Object} scalingContext - Scaling context from createScalingContext
     * @param {number} tolerance - Tolerance for dimension comparison (default 1px)
     * @returns {boolean} True if scaling is needed
     */
    static isScalingNeeded(scalingContext, tolerance = 1) {
        if (!scalingContext) return false;
        
        const { templateDimensions, actualDimensions } = scalingContext;
        
        return Math.abs(actualDimensions.width - templateDimensions.renderWidth) > tolerance ||
               Math.abs(actualDimensions.height - templateDimensions.renderHeight) > tolerance;
    }
}