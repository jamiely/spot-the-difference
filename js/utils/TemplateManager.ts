import type { TemplateData, SpriteData, Dimensions } from '../../src/types/index.js';

export interface TemplateStats {
    spriteCount: number;
    background: string;
    name: string;
}

export interface BackgroundDimensions {
    originalWidth: number;
    originalHeight: number;
}

export interface RenderDimensions {
    renderWidth: number;
    renderHeight: number;
}

export class TemplateManager {
    private templatesPath: string;
    private loadedTemplates: TemplateData[];

    constructor() {
        this.templatesPath = './templates/';
        this.loadedTemplates = [];
    }

    async loadAvailableTemplates(): Promise<TemplateData[]> {
        try {
            // For now, we'll manually define the available templates
            // In a more dynamic system, this could query a directory listing
            const templateFiles = [
                'template1.json'
            ];

            const templates: TemplateData[] = [];
            
            for (const templateFile of templateFiles) {
                const templatePath = this.templatesPath + templateFile;
                
                console.log('Loading template:', templatePath);
                try {
                    const response = await fetch(templatePath);
                    if (response.ok) {
                        const templateData = await response.json() as TemplateData;
                        
                        // Validate template structure
                        if (this.validateTemplate(templateData)) {
                            templateData.filename = templateFile;
                            templateData.id = templateFile.replace('.json', '');
                            templates.push(templateData);
                            console.log('✓ Loaded template:', templateData.name);
                        } else {
                            console.warn('✗ Invalid template structure:', templateFile);
                        }
                    } else {
                        console.log('✗ Template not found:', templateFile);
                    }
                } catch (error) {
                    console.warn(`Could not load template ${templateFile}:`, error);
                }
            }
            
            console.log('Total templates loaded:', templates.length);
            this.loadedTemplates = templates;
            return templates;
        } catch (error) {
            console.warn('Could not load templates:', error);
            return [];
        }
    }

    validateTemplate(template: any): template is TemplateData {
        // Check required fields
        if (!template.name || typeof template.name !== 'string') {
            console.warn('Template missing or invalid name field');
            return false;
        }
        
        if (!template.background || typeof template.background !== 'string') {
            console.warn('Template missing or invalid background field');
            return false;
        }
        
        if (!template.sprites || !Array.isArray(template.sprites)) {
            console.warn('Template missing or invalid sprites field');
            return false;
        }
        
        // Validate background dimensions if present
        if (template.backgroundDimensions) {
            const dims = template.backgroundDimensions;
            if (!dims.originalDimensions || !dims.renderDimensions ||
                typeof dims.originalDimensions.width !== 'number' || 
                typeof dims.originalDimensions.height !== 'number' || 
                typeof dims.renderDimensions.width !== 'number' || 
                typeof dims.renderDimensions.height !== 'number') {
                console.warn('Template has invalid backgroundDimensions structure');
                return false;
            }
        }
        
        // Validate each sprite entry
        for (let i = 0; i < template.sprites.length; i++) {
            const sprite = template.sprites[i];
            if (!sprite.src || typeof sprite.src !== 'string') {
                console.warn(`Template sprite ${i} missing or invalid src field`);
                return false;
            }
            
            // Check coordinates (support both old and new format)
            const hasOldCoords = typeof sprite.x === 'number' && typeof sprite.y === 'number';
            const hasNewCoords = sprite.renderCoordinates && 
                                typeof sprite.renderCoordinates.x === 'number' && 
                                typeof sprite.renderCoordinates.y === 'number';
            
            if (!hasOldCoords && !hasNewCoords) {
                console.warn(`Template sprite ${i} missing or invalid coordinates`);
                return false;
            }
        }
        
        return true;
    }

    getLoadedTemplates(): TemplateData[] {
        return this.loadedTemplates;
    }

    getTemplateById(templateId: string): TemplateData | undefined {
        return this.loadedTemplates.find(template => template.id === templateId);
    }

    getTemplateByName(templateName: string): TemplateData | undefined {
        return this.loadedTemplates.find(template => template.name === templateName);
    }

    async saveTemplate(templateData: TemplateData): Promise<TemplateData> {
        // In a real application, this would save to the server
        // For now, we'll just return the JSON that could be saved
        
        if (!this.validateTemplate(templateData)) {
            throw new Error('Invalid template data');
        }
        
        // Generate a unique filename if not provided
        if (!templateData.filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            templateData.filename = `template-${timestamp}.json`;
            templateData.id = templateData.filename.replace('.json', '');
        }
        
        console.log('Template ready for saving:', templateData);
        return templateData;
    }

    createTemplateFromCurrentState(
        name: string, 
        background: string, 
        spritePositions: SpriteData[], 
        backgroundDimensions: Dimensions | null = null
    ): TemplateData {
        const template: TemplateData = {
            id: '',
            name: name,
            background: background,
            sprites: spritePositions.map((sprite, index) => ({
                id: sprite.id || `sprite_${index}`,
                src: sprite.src,
                renderCoordinates: {
                    x: sprite.renderCoordinates ? sprite.renderCoordinates.x : sprite.x || 0,
                    y: sprite.renderCoordinates ? sprite.renderCoordinates.y : sprite.y || 0
                },
                renderDimensions: {
                    width: sprite.renderDimensions ? sprite.renderDimensions.width : (sprite.width || 155),
                    height: sprite.renderDimensions ? sprite.renderDimensions.height : (sprite.height || 155)
                }
            } as SpriteData))
        };
        
        if (backgroundDimensions) {
            template.backgroundDimensions = backgroundDimensions;
        }
        
        return template;
    }

    exportTemplateAsJson(template: TemplateData): string {
        return JSON.stringify(template, null, 2);
    }

    async loadBackgroundImage(backgroundFilename: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Could not load background: ${backgroundFilename}`));
            img.src = `./backgrounds/${backgroundFilename}`;
        });
    }

    async checkBackgroundExists(backgroundFilename: string): Promise<boolean> {
        try {
            await this.loadBackgroundImage(backgroundFilename);
            return true;
        } catch (error) {
            return false;
        }
    }

    getTemplateStats(template: TemplateData): TemplateStats {
        if (!template || !template.sprites) {
            return { spriteCount: 0, background: 'Unknown', name: 'Unknown' };
        }
        
        return {
            spriteCount: template.sprites.length,
            background: template.background,
            name: template.name
        };
    }

    async getBackgroundDimensionsFromAssets(backgroundFilename: string): Promise<BackgroundDimensions | null> {
        try {
            const response = await fetch('./config/assets.json');
            if (!response.ok) {
                throw new Error('Could not load assets.json');
            }
            
            const assets = await response.json();
            const backgroundAsset = assets.backgrounds.find((bg: any) => bg.filename === backgroundFilename);
            
            if (!backgroundAsset) {
                throw new Error(`Background ${backgroundFilename} not found in assets.json`);
            }
            
            return {
                originalWidth: backgroundAsset.width,
                originalHeight: backgroundAsset.height
            };
        } catch (error) {
            console.warn('Could not get background dimensions from assets:', error);
            return null;
        }
    }

    calculateRenderDimensions(originalWidth: number, originalHeight: number, maxWidth: number = 400): RenderDimensions {
        const aspectRatio = originalWidth / originalHeight;
        let renderWidth = maxWidth;
        let renderHeight = Math.round(maxWidth / aspectRatio);
        
        return {
            renderWidth,
            renderHeight
        };
    }
}