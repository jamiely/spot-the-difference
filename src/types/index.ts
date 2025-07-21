/**
 * Core type definitions for the Spot the Difference game
 * These interfaces define the structure of data used throughout the application
 */

// ===== BASIC GEOMETRIC TYPES =====

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Rectangle extends Position, Dimensions {}

export interface Coordinates extends Position {
  width?: number;
  height?: number;
}

// ===== SPRITE AND ASSET TYPES =====

export interface SpritePosition extends Position {
  width?: number;
  height?: number;
  id?: string;
  src?: string;
}

export interface SpriteData {
  id: string;
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  renderCoordinates?: Position;
  renderDimensions?: Dimensions;
}

export interface SpriteInfo {
  filename: string;
  width: number;
  height: number;
}

export interface AssetInfo {
  filename: string;
  width: number;
  height: number;
}

// ===== TEMPLATE AND BACKGROUND TYPES =====

export interface TemplateData {
  id: string;
  name: string;
  background: string;
  sprites: SpriteData[];
  filename?: string;
  backgroundDimensions?: Dimensions;
}

export interface BackgroundData {
  filename: string;
}

export interface BackgroundInfo {
  filename: string;
  width?: number;
  height?: number;
}

export type LevelDataType = 'template' | 'random';

export interface LevelInfo {
  description: string;
  current: number;
  total: number;
  phase?: string;
}

export interface LevelData {
  type: LevelDataType;
  data: TemplateData | BackgroundData;
  levelInfo: LevelInfo;
}

// ===== GAME STATE TYPES =====

export interface GameDifference {
  id: string;
  centerX: number;
  centerY: number;
  side: 'left' | 'right';
}

export interface GameState {
  isGameActive: boolean;
  isTestMode: boolean;
  currentTemplate: TemplateData | null;
  currentLevelData: LevelData | null;
  differences: GameDifference[];
  foundDifferences: string[];
  totalDifferencesFound: number;
  seed: number;
}

export interface LevelManagerState {
  currentPhase: 'templates' | 'random';
  completedTemplates: string[];
  completedBackgrounds: string[];
  allBackgrounds: BackgroundData[];
  availableTemplates: TemplateData[];
  isGameComplete: boolean;
  isInitialized: boolean;
}

// ===== BOUNDING BOX AND POSITIONING TYPES =====

export interface BoundingBox extends Rectangle {
  id?: string;
}

export interface SpritePositionData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScalingContext {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  templateDimensions: Dimensions;
  actualDimensions: Dimensions;
}

export interface BackgroundContext {
  backgroundImg: HTMLImageElement;
  container: HTMLElement;
  mode: 'game' | 'placement' | 'fallback' | string;
  valid?: boolean;
  error?: string;
}

// ===== UI AND MODAL TYPES =====

export interface ModalOptions {
  title: string;
  message: string;
  restrictive?: boolean;
}

export interface GameModalInterface {
  showAlert(title: string, message: string, restrictive?: boolean): Promise<boolean>;
  showConfirm(title: string, message: string, restrictive?: boolean): Promise<boolean>;
  destroy(): void;
}

// ===== EVENT TYPES =====

export interface GameEventDetail {
  [key: string]: any;
}

export interface BackgroundChangeEvent extends CustomEvent {
  detail: {
    background: string;
  };
}

export interface DifferenceFoundEvent extends CustomEvent {
  detail: {
    totalFound: number;
    differenceId: string;
  };
}

export interface GameEvent extends CustomEvent {
  detail: GameEventDetail;
}

// ===== CONFIGURATION TYPES =====

export interface SpriteConfig {
  DEFAULT_SIZE_PERCENT: string;
  DEFAULT_SIZE_RATIO: number;
  TARGET_SIZE_PX: number;
  getSizeFromDimensions(width: number, height: number, targetSize?: number): Dimensions;
  getCSSSize(width?: number, height?: number): { width: string; height: string };
}

export interface BoundingBoxConfigEntry {
  background: string;
  boxes: BoundingBox[];
}

// ===== COMPONENT INTERFACES =====

export interface SpriteManagerInterface {
  container: HTMLElement;
  activeSprites: HTMLElement[];
  loadedSprites: string[];
  spritePositions: SpritePositionData[];
  
  loadAvailableSprites(): Promise<string[]>;
  createSpriteElement(spriteSrc: string, boundingBoxes?: BoundingBox[], specificBoxIndex?: number | null): Promise<HTMLElement>;
  clearSprites(): void;
  getRandomSprites(count: number): string[];
  displayAllSprites(boundingBoxes?: BoundingBox[], spriteCount?: number): Promise<number>;
}

export interface LevelManagerInterface {
  templateManager: any; // Will be typed when converting TemplateManager
  backgroundLoader: any; // Will be typed when converting BackgroundLoader
  currentPhase: 'templates' | 'random';
  completedTemplates: string[];
  completedBackgrounds: string[];
  allBackgrounds: BackgroundData[];
  availableTemplates: TemplateData[];
  isGameComplete: boolean;
  isInitialized: boolean;
  
  getNextLevel(): Promise<LevelData | null>;
  completeLevel(type: LevelDataType, identifier: string): void;
  resetGame(): void;
  getLevelInfo(): LevelInfo;
  waitForInitialization(): Promise<void>;
}

export interface ScoreDisplayInterface {
  incrementScore(): void;
  reset(): void;
  getScore(): number;
}

// ===== UTILITY TYPES =====

export type SeededRNG = {
  next(): number;
};

export interface RandomGeneratorConfig {
  seed: number;
}

// ===== ASSET LOADER TYPES =====

export interface AssetConfig {
  backgrounds: (string | AssetInfo)[];
  sprites: (string | SpriteInfo)[];
}

export interface AssetConfigLoaderInterface {
  getBackgrounds(): Promise<(string | AssetInfo)[]>;
  getSprites(): Promise<(string | SpriteInfo)[]>;
  getBackgroundInfo(filename: string): Promise<AssetInfo | null>;
  getSpriteInfo(filename: string): Promise<SpriteInfo | null>;
}

// ===== TEMPLATE MANAGER TYPES =====

export interface TemplateManagerInterface {
  loadAvailableTemplates(): Promise<TemplateData[]>;
  getTemplateById(id: string): TemplateData | null;
  saveTemplate(templateData: TemplateData): Promise<TemplateData>;
  validateTemplate(template: any): boolean;
  createTemplateFromCurrentState(
    name: string, 
    background: string, 
    spritePositions: SpritePosition[], 
    backgroundDimensions?: Dimensions | null
  ): TemplateData;
  exportTemplateAsJson(template: TemplateData): string;
}

// ===== ERROR TYPES =====

export class GameError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'GameError';
  }
}

export class TemplateError extends GameError {
  constructor(message: string) {
    super(message, 'TEMPLATE_ERROR');
    this.name = 'TemplateError';
  }
}

export class SpriteError extends GameError {
  constructor(message: string) {
    super(message, 'SPRITE_ERROR');
    this.name = 'SpriteError';
  }
}

// ===== TYPE GUARDS =====

export function isTemplateData(data: any): data is TemplateData {
  return data && 
         typeof data.id === 'string' &&
         typeof data.name === 'string' &&
         typeof data.background === 'string' &&
         Array.isArray(data.sprites);
}

export function isBackgroundData(data: any): data is BackgroundData {
  return data && typeof data.filename === 'string';
}

export function isLevelData(data: any): data is LevelData {
  return data &&
         (data.type === 'template' || data.type === 'random') &&
         data.data &&
         data.levelInfo &&
         typeof data.levelInfo.description === 'string';
}

export function isGameDifference(obj: any): obj is GameDifference {
  return obj &&
         typeof obj.id === 'string' &&
         typeof obj.centerX === 'number' &&
         typeof obj.centerY === 'number' &&
         (obj.side === 'left' || obj.side === 'right');
}

// ===== UTILITY FUNCTIONS FOR TYPE CONVERSION =====

export function ensureBackgroundData(data: BackgroundData | string): BackgroundData {
  if (typeof data === 'string') {
    return { filename: data };
  }
  return data;
}

export function ensureTemplateData(data: TemplateData | any): TemplateData {
  if (!isTemplateData(data)) {
    throw new TemplateError('Invalid template data structure');
  }
  return data;
}

// ===== DOM EVENT HELPER TYPES =====

export interface ClickCoordinates {
  clickX: number;
  clickY: number;
  backgroundX: number;
  backgroundY: number;
  containerX: number;
  containerY: number;
}

export interface BoardClickEvent extends MouseEvent {
  currentTarget: HTMLElement;
}

// ===== EXPORT ALL TYPES =====

export * from './index';