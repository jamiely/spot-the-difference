import type { TemplateManager } from '../utils/TemplateManager.js';
import type { BackgroundLoader } from '../utils/BackgroundLoader.js';
import type { TemplateData, BackgroundInfo, LevelData, LevelInfo } from '../../src/types/index.js';

export type GamePhase = 'templates' | 'random';

export interface LevelCompletionStats {
    templatesCompleted: number;
    totalTemplates: number;
    randomBackgroundsCompleted: number;
    totalRandomBackgrounds: number;
    totalLevels: number;
    totalCompleted: number;
}

export interface LevelInfoExtended extends LevelInfo {
    phase: GamePhase;
    templatePhaseComplete?: boolean;
    _phaseSpecific?: {
        current: number;
        total: number;
        description: string;
    };
}

/**
 * LevelManager handles the game progression system
 * - Phase 1: Load templates randomly until all are completed
 * - Phase 2: Load random backgrounds with random sprites until all are completed
 * - Tracks completed templates and backgrounds to avoid duplicates
 * - Detects game completion and handles restart
 */
export class LevelManager {
    private templateManager: TemplateManager;
    private backgroundLoader: BackgroundLoader;
    
    // Game progression state
    private currentPhase: GamePhase;
    private completedTemplates: string[];
    private completedBackgrounds: string[];
    private allBackgrounds: BackgroundInfo[];
    private availableTemplates: TemplateData[];
    
    // Game completion tracking
    private isGameComplete: boolean;
    private isInitialized: boolean;

    constructor(templateManager: TemplateManager, backgroundLoader: BackgroundLoader) {
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
    
    private async initializeLevel(): Promise<void> {
        try {
            // Load available templates and backgrounds
            this.availableTemplates = await this.templateManager.loadAvailableTemplates();
            this.allBackgrounds = await this.backgroundLoader.loadAvailableBackgrounds();
            
            console.log('LevelManager initialized:');
            console.log('- Available templates:', this.availableTemplates.length);
            console.log('- Available backgrounds:', this.allBackgrounds.length);
            
            // Check for random mode parameter in URL
            const urlParams = new URLSearchParams(window.location.search);
            const forceRandom = urlParams.has('random');
            
            // Start with templates if available and not forced to random, otherwise go to random phase
            if (this.availableTemplates.length > 0 && !forceRandom) {
                this.currentPhase = 'templates';
            } else {
                this.currentPhase = 'random';
                console.log(forceRandom ? 'Forcing random mode due to URL parameter' : 'No templates available, using random mode');
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
     */
    async waitForInitialization(): Promise<void> {
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
     */
    async getNextLevel(): Promise<LevelData | null> {
        // Wait for initialization if not complete
        await this.waitForInitialization();
        if (this.isGameComplete) {
            console.log('Game is complete, returning null');
            return null;
        }
        
        console.log(`Getting next level - current phase: ${this.currentPhase}`);
        console.log(`Completed templates: [${this.completedTemplates.join(', ')}]`);
        console.log(`Available templates: [${this.availableTemplates.map(t => t.name).join(', ')}]`);
        
        if (this.currentPhase === 'templates') {
            console.log('In templates phase, calling getNextTemplate()');
            return this.getNextTemplate();
        } else {
            console.log('In random phase, calling getNextRandomBackground()');
            return this.getNextRandomBackground();
        }
    }
    
    /**
     * Get the next template level
     */
    private getNextTemplate(): LevelData | null {
        if (!this.availableTemplates || this.availableTemplates.length === 0) {
            console.log('No templates available, moving to random background phase');
            this.currentPhase = 'random';
            return this.getNextRandomBackground();
        }
        
        console.log(`Checking for unused templates...`);
        const unusedTemplates = this.availableTemplates.filter(
            template => !this.completedTemplates.includes(template.name)
        );
        console.log(`Found ${unusedTemplates.length} unused templates: [${unusedTemplates.map(t => t.name).join(', ')}]`);
        
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
     */
    private getNextRandomBackground(): LevelData | null {
        // Get backgrounds used in templates to avoid duplicates
        const templateBackgrounds = this.availableTemplates ? this.availableTemplates.map(t => t.background) : [];
        console.log(`Template backgrounds to exclude: [${templateBackgrounds.join(', ')}]`);
        console.log(`Completed random backgrounds: [${this.completedBackgrounds.join(', ')}]`);
        console.log(`All available backgrounds: [${this.allBackgrounds.map(bg => bg.filename).join(', ')}]`);
        
        // Find unused backgrounds (not used in templates or previous random levels)
        const unusedBackgrounds = this.allBackgrounds.filter(bg => 
            !templateBackgrounds.includes(bg.filename) && 
            !this.completedBackgrounds.includes(bg.filename)
        );
        console.log(`Unused backgrounds found: [${unusedBackgrounds.map(bg => bg.filename).join(', ')}]`);
        
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
     */
    completeLevel(type: 'template' | 'random', identifier: string): void {
        console.log(`Completing level: type=${type}, identifier="${identifier}"`);
        
        if (type === 'template') {
            if (!this.completedTemplates.includes(identifier)) {
                this.completedTemplates.push(identifier);
                console.log(`Template completed: ${identifier}`);
                console.log(`Completed templates list: [${this.completedTemplates.join(', ')}]`);
                console.log(`Available templates list: [${this.availableTemplates.map(t => t.name).join(', ')}]`);
                console.log(`Templates remaining: ${this.availableTemplates.length - this.completedTemplates.length}`);
            } else {
                console.log(`Template ${identifier} was already completed`);
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
            } else {
                console.log(`Random background ${identifier} was already completed`);
            }
        }
    }
    
    /**
     * Get current level information for display
     */
    getLevelInfo(): LevelInfoExtended {
        const totalTemplates = this.availableTemplates ? this.availableTemplates.length : 0;
        const completedTemplatesCount = this.completedTemplates.length;
        
        // Calculate total random backgrounds (excluding template backgrounds)
        const templateBackgrounds = this.availableTemplates ? this.availableTemplates.map(t => t.background) : [];
        const randomBackgrounds = this.allBackgrounds.filter(bg => 
            !templateBackgrounds.includes(bg.filename)
        );
        const totalRandomBackgrounds = randomBackgrounds.length;
        const completedRandomCount = this.completedBackgrounds.length;
        
        // Calculate unified level numbering across both phases
        const totalLevels = totalTemplates + totalRandomBackgrounds;
        const totalCompletedLevels = completedTemplatesCount + completedRandomCount;
        const currentUnifiedLevel = totalCompletedLevels + 1;
        
        if (this.currentPhase === 'templates') {
            return {
                phase: 'templates',
                current: currentUnifiedLevel,
                total: totalLevels,
                description: `Level ${currentUnifiedLevel} of ${totalLevels}`,
                // Keep internal tracking for backward compatibility
                _phaseSpecific: {
                    current: completedTemplatesCount + 1,
                    total: totalTemplates,
                    description: `Template ${completedTemplatesCount + 1} of ${totalTemplates}`
                }
            };
        } else {
            return {
                phase: 'random',
                current: currentUnifiedLevel,
                total: totalLevels,
                description: `Level ${currentUnifiedLevel} of ${totalLevels}`,
                templatePhaseComplete: true,
                // Keep internal tracking for backward compatibility
                _phaseSpecific: {
                    current: completedRandomCount + 1,
                    total: totalRandomBackgrounds,
                    description: `Random Level ${completedRandomCount + 1} of ${totalRandomBackgrounds}`
                }
            };
        }
    }
    
    /**
     * Check if the entire game is complete
     */
    isEntireGameComplete(): boolean {
        return this.isGameComplete;
    }
    
    /**
     * Reset the level progression to start over
     */
    resetGame(): void {
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
     */
    getCompletionStats(): LevelCompletionStats {
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