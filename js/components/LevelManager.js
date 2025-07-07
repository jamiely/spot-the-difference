/**
 * LevelManager handles the game progression system
 * - Phase 1: Load templates randomly until all are completed
 * - Phase 2: Load random backgrounds with random sprites until all are completed
 * - Tracks completed templates and backgrounds to avoid duplicates
 * - Detects game completion and handles restart
 */
export class LevelManager {
    constructor(templateManager, backgroundLoader) {
        this.templateManager = templateManager;
        this.backgroundLoader = backgroundLoader;
        
        // Game progression state
        this.currentPhase = 'templates'; // 'templates' or 'random'
        this.completedTemplates = [];
        this.completedBackgrounds = [];
        this.allBackgrounds = [];
        this.availableTemplates = [];
        
        // Game completion tracking
        this.isGameComplete = false;
        this.isInitialized = false;
        
        // Initialize asynchronously
        this.initializeLevel();
    }
    
    async initializeLevel() {
        try {
            // Load available templates and backgrounds
            this.availableTemplates = await this.templateManager.loadAvailableTemplates();
            this.allBackgrounds = await this.backgroundLoader.loadAvailableBackgrounds();
            
            console.log('LevelManager initialized:');
            console.log('- Available templates:', this.availableTemplates.length);
            console.log('- Available backgrounds:', this.allBackgrounds.length);
            
            // Start with templates if available, otherwise go to random phase
            if (this.availableTemplates.length > 0) {
                this.currentPhase = 'templates';
            } else {
                this.currentPhase = 'random';
            }
            
            this.isInitialized = true;
            console.log('LevelManager initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize LevelManager:', error);
            this.currentPhase = 'random';
            this.isInitialized = true;
        }
    }
    
    /**
     * Wait for initialization to complete
     * @returns {Promise} Promise that resolves when initialization is complete
     */
    async waitForInitialization() {
        if (this.isInitialized) {
            return;
        }
        
        // Wait for initialization to complete
        return new Promise((resolve) => {
            const checkInitialized = () => {
                if (this.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkInitialized, 10);
                }
            };
            checkInitialized();
        });
    }
    
    /**
     * Get the next level to play
     * @returns {Object} Level configuration with type ('template' or 'random') and data
     */
    async getNextLevel() {
        // Wait for initialization if not complete
        await this.waitForInitialization();
        if (this.isGameComplete) {
            return null;
        }
        
        if (this.currentPhase === 'templates') {
            return this.getNextTemplate();
        } else {
            return this.getNextRandomBackground();
        }
    }
    
    /**
     * Get the next template level
     * @returns {Object|null} Template level configuration or null if templates phase is complete
     */
    getNextTemplate() {
        if (!this.availableTemplates || this.availableTemplates.length === 0) {
            console.log('No templates available, moving to random background phase');
            this.currentPhase = 'random';
            return this.getNextRandomBackground();
        }
        
        const unusedTemplates = this.availableTemplates.filter(
            template => !this.completedTemplates.includes(template.name)
        );
        
        if (unusedTemplates.length === 0) {
            // All templates completed, move to random phase
            console.log('All templates completed, moving to random background phase');
            this.currentPhase = 'random';
            return this.getNextRandomBackground();
        }
        
        // Select random template from unused ones
        const randomIndex = Math.floor(Math.random() * unusedTemplates.length);
        const selectedTemplate = unusedTemplates[randomIndex];
        
        console.log(`Selected template: ${selectedTemplate.name}`);
        
        return {
            type: 'template',
            data: selectedTemplate,
            levelInfo: this.getLevelInfo()
        };
    }
    
    /**
     * Get the next random background level
     * @returns {Object|null} Random background level configuration or null if game is complete
     */
    getNextRandomBackground() {
        // Get backgrounds used in templates to avoid duplicates
        const templateBackgrounds = this.availableTemplates ? this.availableTemplates.map(t => t.background) : [];
        
        // Find unused backgrounds (not used in templates or previous random levels)
        const unusedBackgrounds = this.allBackgrounds.filter(bg => 
            !templateBackgrounds.includes(bg.filename) && 
            !this.completedBackgrounds.includes(bg.filename)
        );
        
        if (unusedBackgrounds.length === 0) {
            // All backgrounds completed - game is won!
            console.log('All backgrounds completed - game won!');
            this.isGameComplete = true;
            return null;
        }
        
        // Select random background from unused ones
        const randomIndex = Math.floor(Math.random() * unusedBackgrounds.length);
        const selectedBackground = unusedBackgrounds[randomIndex];
        
        console.log(`Selected random background: ${selectedBackground.filename}`);
        
        return {
            type: 'random',
            data: selectedBackground,
            levelInfo: this.getLevelInfo()
        };
    }
    
    /**
     * Mark a level as completed
     * @param {string} type - 'template' or 'random'
     * @param {string} identifier - Template name or background filename
     */
    completeLevel(type, identifier) {
        if (type === 'template') {
            if (!this.completedTemplates.includes(identifier)) {
                this.completedTemplates.push(identifier);
                console.log(`Template completed: ${identifier}`);
                console.log(`Templates remaining: ${this.availableTemplates.length - this.completedTemplates.length}`);
            }
        } else if (type === 'random') {
            if (!this.completedBackgrounds.includes(identifier)) {
                this.completedBackgrounds.push(identifier);
                console.log(`Random background completed: ${identifier}`);
                
                // Calculate total remaining backgrounds
                const templateBackgrounds = this.availableTemplates ? this.availableTemplates.map(t => t.background) : [];
                const unusedBackgrounds = this.allBackgrounds.filter(bg => 
                    !templateBackgrounds.includes(bg.filename) && 
                    !this.completedBackgrounds.includes(bg.filename)
                );
                console.log(`Random backgrounds remaining: ${unusedBackgrounds.length}`);
            }
        }
    }
    
    /**
     * Get current level information for display
     * @returns {Object} Level info with phase, progress, etc.
     */
    getLevelInfo() {
        const totalTemplates = this.availableTemplates ? this.availableTemplates.length : 0;
        const completedTemplatesCount = this.completedTemplates.length;
        
        // Calculate total random backgrounds (excluding template backgrounds)
        const templateBackgrounds = this.availableTemplates ? this.availableTemplates.map(t => t.background) : [];
        const randomBackgrounds = this.allBackgrounds.filter(bg => 
            !templateBackgrounds.includes(bg.filename)
        );
        const totalRandomBackgrounds = randomBackgrounds.length;
        const completedRandomCount = this.completedBackgrounds.length;
        
        if (this.currentPhase === 'templates') {
            return {
                phase: 'templates',
                current: completedTemplatesCount + 1,
                total: totalTemplates,
                description: `Template ${completedTemplatesCount + 1} of ${totalTemplates}`
            };
        } else {
            return {
                phase: 'random',
                current: completedRandomCount + 1,
                total: totalRandomBackgrounds,
                description: `Random Level ${completedRandomCount + 1} of ${totalRandomBackgrounds}`,
                templatePhaseComplete: true
            };
        }
    }
    
    /**
     * Check if the entire game is complete
     * @returns {boolean} True if all levels are completed
     */
    isEntireGameComplete() {
        return this.isGameComplete;
    }
    
    /**
     * Reset the level progression to start over
     */
    resetGame() {
        this.completedTemplates = [];
        this.completedBackgrounds = [];
        this.isGameComplete = false;
        
        // Start with templates if available
        if (this.availableTemplates && this.availableTemplates.length > 0) {
            this.currentPhase = 'templates';
        } else {
            this.currentPhase = 'random';
        }
        
        console.log('Level progression reset - starting over');
    }
    
    /**
     * Get game completion statistics
     * @returns {Object} Completion stats
     */
    getCompletionStats() {
        const totalTemplates = this.availableTemplates ? this.availableTemplates.length : 0;
        const templateBackgrounds = this.availableTemplates ? this.availableTemplates.map(t => t.background) : [];
        const totalRandomBackgrounds = this.allBackgrounds.filter(bg => 
            !templateBackgrounds.includes(bg.filename)
        ).length;
        
        return {
            templatesCompleted: this.completedTemplates.length,
            totalTemplates,
            randomBackgroundsCompleted: this.completedBackgrounds.length,
            totalRandomBackgrounds,
            totalLevels: totalTemplates + totalRandomBackgrounds,
            totalCompleted: this.completedTemplates.length + this.completedBackgrounds.length
        };
    }
}