# TypeScript Conversion Plan

## Overview
Convert the spot-the-difference game from JavaScript to TypeScript incrementally, allowing both .js and .ts files to coexist during the transition.

## Configuration
- **Target**: ES2020+
- **Modules**: ES modules (maintain current approach)
- **Mode**: Strict TypeScript
- **DOM Types**: Use built-in DOM types
- **Strategy**: Convert files one-by-one
- **Tests**: Convert test files to TypeScript

## Phase 1: Project Setup ✅
- [x] Install TypeScript and related dependencies
- [x] Create tsconfig.json with strict settings
- [x] Update package.json scripts for TypeScript
- [x] Configure development server to handle .ts files
- [x] Update .gitignore for TypeScript build artifacts
- [x] Verify basic TypeScript compilation works

## Phase 2: Core Type Definitions ✅
- [x] Create shared type definitions (src/types/index.ts)
  - [x] Game state interfaces
  - [x] Level data types
  - [x] Sprite configuration types
  - [x] Template and background types
  - [x] Modal and UI types
- [x] Create custom event types for game events

## Phase 3: Utility Classes (Start Here - Self-contained) ✅
- [x] Convert js/utils/ScalingUtils.js → .ts
- [x] Convert js/utils/AssetConfigLoader.js → .ts
- [x] Convert js/utils/BackgroundLoader.js → .ts
- [x] Convert js/utils/TemplateManager.js → .ts
- [x] Convert js/utils/SpritePositioning.js → .ts
- [x] Update imports in dependent files

## Phase 4: Configuration Files ✅
- [x] Convert js/config/SpriteConfig.js → .ts
- [x] Convert js/config/BoundingBoxConfig.js → .ts
- [x] Update imports in dependent files

## Phase 5: Component Classes ✓
- [x] Convert js/components/SpriteManager.js → .ts
- [x] Convert js/components/LevelManager.js → .ts
- [x] Convert js/components/GameModal.js → .ts
- [x] Convert js/components/ScoreDisplay.js → .ts
- [x] Convert js/utils/ViewManager.js → .ts
- [x] Convert js/components/DebugMenu.js → .ts
- [x] Update imports in dependent files

## Phase 6: Core Game Classes ✓
- [x] Convert js/Game.js → .ts (base class)
- [x] Convert js/SpotTheDifferenceGame.js → .ts (main game)
- [x] Update imports in dependent files

## Phase 7: Entry Point ✅
- [x] Convert js/main.js → .ts
- [x] Update index.html to reference main.ts or compiled output
- [x] All unit tests passing with TypeScript conversion ✅
- [x] Fixed TypeScript import paths for browser compatibility
- [⚠️] E2E tests: Basic functionality working, sprite area coverage has intermittent issues

## Phase 8: Test Files Conversion
- [ ] Convert tests/ScalingUtils.test.js � .ts
- [ ] Convert tests/AssetConfigLoader.test.js � .ts
- [ ] Convert tests/SpriteConfig.test.js � .ts
- [ ] Convert tests/BoundingBoxConfig.test.js � .ts
- [ ] Convert tests/SpriteManager.test.js � .ts
- [ ] Convert tests/LevelManager.test.js � .ts
- [ ] Convert tests/GameModal.test.js � .ts
- [ ] Convert tests/DebugMenu.test.js � .ts
- [ ] Convert tests/SpotTheDifferenceGame.test.js � .ts
- [ ] Convert tests/ViewManager.test.js � .ts
- [ ] Convert tests/ScoreDisplay.test.js � .ts
- [ ] Convert tests/ImageGenerator.test.js � .ts
- [ ] Convert tests/SpriteAreaCoverage.test.js � .ts
- [ ] Convert tests/LevelScoreReset.test.js � .ts
- [ ] Convert tests/RunningTotal.test.js � .ts
- [ ] Convert tests/LevelCompletionStats.test.js � .ts
- [ ] Convert tests/UnifiedLevelNumbering.test.js � .ts
- [ ] Convert tests/RestrictiveModal.test.js � .ts
- [ ] Convert tests/PageTitleUpdate.test.js � .ts
- [ ] Convert tests/DebugAutoComplete.test.js � .ts
- [ ] Convert tests/SpriteObscuration.test.js � .ts

## Phase 9: E2E Test Files (Optional)
- [ ] Convert e2e/*.spec.js � .ts (if desired)
- [ ] Update Playwright configuration for TypeScript

## Phase 10: ESLint Setup and Code Quality
- [ ] Install ESLint with TypeScript support
  - [ ] @typescript-eslint/parser
  - [ ] @typescript-eslint/eslint-plugin
  - [ ] eslint-plugin-import (for ES modules)
  - [ ] eslint-plugin-vitest (for test files)
- [ ] Create .eslintrc.json with appropriate rules
  - [ ] TypeScript recommended rules
  - [ ] Import/export validation
  - [ ] Code style consistency
  - [ ] Test-specific rules for vitest files
- [ ] Add eslint scripts to package.json
  - [ ] npm run lint (check)
  - [ ] npm run lint:fix (auto-fix)
- [ ] Fix all existing linting issues
- [ ] Add ESLint to pre-commit hooks or CI

## Phase 11: Final Cleanup and Optimization
- [ ] Remove all .js files once .ts equivalents are working
- [ ] Optimize TypeScript configuration
- [ ] Add stricter type checking if needed
- [ ] Update documentation for TypeScript setup
- [ ] Verify all tests pass with full TypeScript conversion
- [ ] Ensure ESLint passes with zero warnings/errors

## Development Guidelines During Conversion

### Type Safety Priorities
1. **Strict null checks**: Avoid `null`/`undefined` issues
2. **No implicit any**: Explicit typing for all variables
3. **Interface definitions**: Clear contracts between components
4. **Generic types**: For reusable components and utilities

### Import/Export Patterns
```typescript
// Maintain ES module syntax
import { SpriteManager } from './components/SpriteManager.js';
export class Game { }
```

### Type Definition Examples
```typescript
interface LevelData {
  type: 'template' | 'random';
  data: TemplateData | BackgroundData;
  levelInfo: LevelInfo;
}

interface SpritePosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}
```

### Mixed JS/TS Period
- Keep .js extension in imports during transition
- Use `// @ts-ignore` sparingly for temporary compatibility
- Ensure TypeScript compiler can handle mixed file types

## Notes
- Each phase should be completed and tested before moving to the next
- Maintain full test coverage throughout conversion
- Keep the existing functionality working at all times
- Consider creating interfaces before converting implementation files
- Use strict TypeScript settings from the start to catch more potential issues