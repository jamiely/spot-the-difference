/**
 * Central configuration for sprite display settings
 */
export const SPRITE_CONFIG = {
    // Default sprite size as percentage of container when dimensions aren't available
    DEFAULT_SIZE_PERCENT: '25%',
    DEFAULT_SIZE_RATIO: 0.25,
    
    // Target sprite size in pixels (maximum width/height)
    TARGET_SIZE_PX: 80,
    
    // Helper function to get sprite size based on actual dimensions and target size
    getSizeFromDimensions(spriteWidth, spriteHeight, targetSize = this.TARGET_SIZE_PX) {
        if (!spriteWidth || !spriteHeight) {
            return { width: targetSize, height: targetSize };
        }
        
        // Calculate scale factor to fit target size while maintaining aspect ratio
        const scale = Math.min(targetSize / spriteWidth, targetSize / spriteHeight);
        
        return {
            width: Math.round(spriteWidth * scale),
            height: Math.round(spriteHeight * scale)
        };
    },
    
    // Helper function to get sprite size in pixels based on container (fallback)
    getSizeInPixels(containerWidth, containerHeight) {
        // Use the smaller dimension to maintain aspect ratio
        const baseSize = Math.min(containerWidth, containerHeight);
        return Math.floor(baseSize * this.DEFAULT_SIZE_RATIO);
    },
    
    // For collision detection and positioning calculations
    getSizeRatio() {
        return this.DEFAULT_SIZE_RATIO;
    },
    
    // Get CSS size value (percentage or pixel)
    getCSSSize(spriteWidth, spriteHeight) {
        if (spriteWidth && spriteHeight) {
            // Scale sprite to 25% of its original dimensions
            const scaledWidth = Math.round(spriteWidth * this.DEFAULT_SIZE_RATIO);
            const scaledHeight = Math.round(spriteHeight * this.DEFAULT_SIZE_RATIO);
            return { width: `${scaledWidth}px`, height: `${scaledHeight}px` };
        }
        // Fallback to percentage when dimensions aren't available
        return { width: this.DEFAULT_SIZE_PERCENT, height: this.DEFAULT_SIZE_PERCENT };
    }
};