import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelManager } from '../js/components/LevelManager.js';
import type { LevelInfoExtended } from '../js/components/LevelManager.js';
import type { TemplateData, BackgroundInfo } from '../src/types/index.js';

interface MockTemplateManager {
    loadAvailableTemplates: ReturnType<typeof vi.fn>;
}

interface MockBackgroundLoader {
    loadAvailableBackgrounds: ReturnType<typeof vi.fn>;
}

describe('Unified Level Numbering', () => {
    let levelManager: LevelManager;
    let mockTemplateManager: MockTemplateManager;
    let mockBackgroundLoader: MockBackgroundLoader;
    
    beforeEach(() => {
        // Mock template manager
        mockTemplateManager = {
            loadAvailableTemplates: vi.fn().mockResolvedValue([
                { name: 'template1', background: 'bg1.png' } as TemplateData,
                { name: 'template2', background: 'bg2.png' } as TemplateData,
                { name: 'template3', background: 'bg3.png' } as TemplateData
            ])
        };
        
        // Mock background loader with 5 total backgrounds (3 for templates, 2 for random)
        mockBackgroundLoader = {
            loadAvailableBackgrounds: vi.fn().mockResolvedValue([
                { filename: 'bg1.png' } as BackgroundInfo, // Used by template1
                { filename: 'bg2.png' } as BackgroundInfo, // Used by template2
                { filename: 'bg3.png' } as BackgroundInfo, // Used by template3
                { filename: 'bg4.png' } as BackgroundInfo, // Available for random
                { filename: 'bg5.png' } as BackgroundInfo  // Available for random
            ])
        };
        
        levelManager = new LevelManager(mockTemplateManager as any, mockBackgroundLoader as any);
    });

    describe('Initial level numbering', () => {
        it('should start with unified level 1 of total levels', async () => {
            await levelManager.initializeLevel();
            
            const levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            
            // Should show unified numbering: Level 1 of 5 (3 templates + 2 random)
            expect(levelInfo.current).toBe(1);
            expect(levelInfo.total).toBe(5);
            expect(levelInfo.description).toBe('Level 1 of 5');
            expect(levelInfo.phase).toBe('templates');
        });
    });

    describe('Template phase progression', () => {
        it('should show unified numbering during template phase', async () => {
            await levelManager.initializeLevel();
            
            // Complete first template
            levelManager.completeLevel('template', 'template1');
            
            let levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            expect(levelInfo.current).toBe(2);
            expect(levelInfo.total).toBe(5);
            expect(levelInfo.description).toBe('Level 2 of 5');
            
            // Complete second template
            levelManager.completeLevel('template', 'template2');
            
            levelInfo = levelManager.getLevelInfo();
            expect(levelInfo.current).toBe(3);
            expect(levelInfo.total).toBe(5);
            expect(levelInfo.description).toBe('Level 3 of 5');
        });
        
        it('should maintain backward compatibility with phase-specific info', async () => {
            await levelManager.initializeLevel();
            
            levelManager.completeLevel('template', 'template1');
            
            const levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            
            // Main info shows unified numbering
            expect(levelInfo.current).toBe(2);
            expect(levelInfo.description).toBe('Level 2 of 5');
            
            // Phase-specific info available for internal use
            expect(levelInfo._phaseSpecific!.current).toBe(2);
            expect(levelInfo._phaseSpecific!.total).toBe(3);
            expect(levelInfo._phaseSpecific!.description).toBe('Template 2 of 3');
        });
    });

    describe('Random phase progression', () => {
        it('should show unified numbering during random phase', async () => {
            await levelManager.initializeLevel();
            
            // Complete all templates to move to random phase
            levelManager.completeLevel('template', 'template1');
            levelManager.completeLevel('template', 'template2');
            levelManager.completeLevel('template', 'template3');
            
            // Call getNextLevel to trigger phase transition
            await levelManager.getNextLevel();
            
            // Now in random phase - should start at level 4 of 5
            const levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            
            expect(levelInfo.current).toBe(4);
            expect(levelInfo.total).toBe(5);
            expect(levelInfo.description).toBe('Level 4 of 5');
            expect(levelInfo.phase).toBe('random');
            expect(levelInfo.templatePhaseComplete).toBe(true);
        });
        
        it('should continue unified numbering when completing random levels', async () => {
            await levelManager.initializeLevel();
            
            // Complete all templates
            levelManager.completeLevel('template', 'template1');
            levelManager.completeLevel('template', 'template2');
            levelManager.completeLevel('template', 'template3');
            
            // Call getNextLevel to trigger phase transition  
            await levelManager.getNextLevel();
            
            // Complete first random level
            levelManager.completeLevel('random', 'bg4.png');
            
            const levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            
            // Should be at level 5 of 5 (last level)
            expect(levelInfo.current).toBe(5);
            expect(levelInfo.total).toBe(5);
            expect(levelInfo.description).toBe('Level 5 of 5');
            expect(levelInfo.phase).toBe('random');
        });
        
        it('should maintain backward compatibility for random phase', async () => {
            await levelManager.initializeLevel();
            
            // Complete all templates to move to random phase
            levelManager.completeLevel('template', 'template1');
            levelManager.completeLevel('template', 'template2');
            levelManager.completeLevel('template', 'template3');
            
            // Call getNextLevel to trigger phase transition
            await levelManager.getNextLevel();
            
            const levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            
            // Main info shows unified numbering
            expect(levelInfo.current).toBe(4);
            expect(levelInfo.description).toBe('Level 4 of 5');
            
            // Phase-specific info available for internal use
            expect(levelInfo._phaseSpecific!.current).toBe(1);
            expect(levelInfo._phaseSpecific!.total).toBe(2);
            expect(levelInfo._phaseSpecific!.description).toBe('Random Level 1 of 2');
        });
    });

    describe('Edge cases', () => {
        it('should handle case with no random backgrounds', async () => {
            // Mock scenario with only templates, no additional backgrounds
            mockBackgroundLoader.loadAvailableBackgrounds.mockResolvedValue([
                { filename: 'bg1.png' } as BackgroundInfo, // Used by template1
                { filename: 'bg2.png' } as BackgroundInfo, // Used by template2
                { filename: 'bg3.png' } as BackgroundInfo  // Used by template3
            ]);
            
            await levelManager.initializeLevel();
            
            const levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            
            // Should show 3 total levels (only templates)
            expect(levelInfo.current).toBe(1);
            expect(levelInfo.total).toBe(3);
            expect(levelInfo.description).toBe('Level 1 of 3');
        });
        
        it('should handle case with no templates', async () => {
            // Mock scenario with no templates
            mockTemplateManager.loadAvailableTemplates.mockResolvedValue([]);
            
            await levelManager.initializeLevel();
            
            const levelInfo: LevelInfoExtended = levelManager.getLevelInfo();
            
            // Should show 5 total levels (all random)
            expect(levelInfo.current).toBe(1);
            expect(levelInfo.total).toBe(5);
            expect(levelInfo.description).toBe('Level 1 of 5');
            expect(levelInfo.phase).toBe('random'); // Should skip to random phase
        });
    });

    describe('Level progression consistency', () => {
        it('should maintain consistent numbering throughout game progression', async () => {
            await levelManager.initializeLevel();
            
            const progressionChecks: Array<{
                stage: string;
                info: LevelInfoExtended;
                expected: { current: number; total: number; description: string };
            }> = [];
            
            // Check initial state
            progressionChecks.push({
                stage: 'initial',
                info: levelManager.getLevelInfo(),
                expected: { current: 1, total: 5, description: 'Level 1 of 5' }
            });
            
            // Complete each level and check numbering
            levelManager.completeLevel('template', 'template1');
            progressionChecks.push({
                stage: 'after template 1',
                info: levelManager.getLevelInfo(),
                expected: { current: 2, total: 5, description: 'Level 2 of 5' }
            });
            
            levelManager.completeLevel('template', 'template2');
            progressionChecks.push({
                stage: 'after template 2',
                info: levelManager.getLevelInfo(),
                expected: { current: 3, total: 5, description: 'Level 3 of 5' }
            });
            
            levelManager.completeLevel('template', 'template3');
            progressionChecks.push({
                stage: 'after template 3 (entering random phase)',
                info: levelManager.getLevelInfo(),
                expected: { current: 4, total: 5, description: 'Level 4 of 5' }
            });
            
            levelManager.completeLevel('random', 'bg4.png');
            progressionChecks.push({
                stage: 'after random 1',
                info: levelManager.getLevelInfo(),
                expected: { current: 5, total: 5, description: 'Level 5 of 5' }
            });
            
            // Verify all progression checks
            progressionChecks.forEach(({ stage, info, expected }) => {
                expect(info.current, `${stage} - current level`).toBe(expected.current);
                expect(info.total, `${stage} - total levels`).toBe(expected.total);
                expect(info.description, `${stage} - description`).toBe(expected.description);
            });
        });
    });
});
