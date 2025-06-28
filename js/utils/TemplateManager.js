export class TemplateManager {
    constructor() {
        this.templatesPath = './templates/';
        this.loadedTemplates = [];
    }

    async loadAvailableTemplates() {
        try {
            // For now, we'll manually define the available templates
            // In a more dynamic system, this could query a directory listing
            const templateFiles = [
                'template1.json'
            ];

            const templates = [];
            
            for (const templateFile of templateFiles) {
                const templatePath = this.templatesPath + templateFile;
                
                console.log('Loading template:', templatePath);
                try {
                    const response = await fetch(templatePath);
                    if (response.ok) {
                        const templateData = await response.json();
                        
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

    validateTemplate(template) {
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
        
        // Validate each sprite entry
        for (let i = 0; i < template.sprites.length; i++) {
            const sprite = template.sprites[i];
            if (!sprite.src || typeof sprite.src !== 'string') {
                console.warn(`Template sprite ${i} missing or invalid src field`);
                return false;
            }
            
            if (typeof sprite.x !== 'number' || typeof sprite.y !== 'number') {
                console.warn(`Template sprite ${i} missing or invalid x/y coordinates`);
                return false;
            }
        }
        
        return true;
    }

    getLoadedTemplates() {
        return this.loadedTemplates;
    }

    getTemplateById(templateId) {
        return this.loadedTemplates.find(template => template.id === templateId);
    }

    getTemplateByName(templateName) {
        return this.loadedTemplates.find(template => template.name === templateName);
    }

    async saveTemplate(templateData) {
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

    createTemplateFromCurrentState(name, background, spritePositions) {
        const template = {
            name: name,
            background: background,
            sprites: spritePositions.map((sprite, index) => ({
                id: sprite.id || `sprite_${index}`,
                src: sprite.src,
                x: sprite.x,
                y: sprite.y,
                width: sprite.width || 155,
                height: sprite.height || 155
            }))
        };
        
        return template;
    }

    exportTemplateAsJson(template) {
        return JSON.stringify(template, null, 2);
    }

    async loadBackgroundImage(backgroundFilename) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Could not load background: ${backgroundFilename}`));
            img.src = `./backgrounds/${backgroundFilename}`;
        });
    }

    async checkBackgroundExists(backgroundFilename) {
        try {
            await this.loadBackgroundImage(backgroundFilename);
            return true;
        } catch (error) {
            return false;
        }
    }

    getTemplateStats(template) {
        if (!template || !template.sprites) {
            return { spriteCount: 0, background: 'Unknown' };
        }
        
        return {
            spriteCount: template.sprites.length,
            background: template.background,
            name: template.name
        };
    }
}