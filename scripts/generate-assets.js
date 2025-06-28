#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sizeOf from 'image-size';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Function to get files from a directory with specific extensions
function getFilesFromDirectory(dirPath, extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']) {
    try {
        if (!fs.existsSync(dirPath)) {
            console.warn(`Directory ${dirPath} does not exist`);
            return [];
        }

        const files = fs.readdirSync(dirPath);
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return extensions.includes(ext);
        }).sort();
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error.message);
        return [];
    }
}

// Function to get detailed image information including dimensions
function getImageInfo(dirPath, filename) {
    try {
        const fullPath = path.join(dirPath, filename);
        const buffer = fs.readFileSync(fullPath);
        const dimensions = sizeOf(buffer);
        const stats = fs.statSync(fullPath);
        
        return {
            filename,
            width: dimensions.width,
            height: dimensions.height,
            type: dimensions.type,
            size: stats.size // File size in bytes
        };
    } catch (error) {
        console.warn(`Could not read image info for ${filename}:`, error.message);
        return {
            filename,
            width: null,
            height: null,
            type: null,
            size: null
        };
    }
}

// Generate assets configuration
function generateAssetsConfig() {
    const backgroundsDir = path.join(projectRoot, 'backgrounds');
    const spritesDir = path.join(projectRoot, 'sprites');
    
    const backgroundFiles = getFilesFromDirectory(backgroundsDir);
    const spriteFiles = getFilesFromDirectory(spritesDir);
    
    // Get detailed information for each background
    const backgrounds = backgroundFiles.map(filename => 
        getImageInfo(backgroundsDir, filename)
    );
    
    // Get detailed information for each sprite
    const sprites = spriteFiles.map(filename => 
        getImageInfo(spritesDir, filename)
    );
    
    // Add metadata about the asset collection
    const config = {
        meta: {
            generated: new Date().toISOString(),
            backgroundCount: backgrounds.length,
            spriteCount: sprites.length
        },
        backgrounds,
        sprites
    };
    
    return config;
}

// Write assets.json file
function writeAssetsConfig(config) {
    const configPath = path.join(projectRoot, 'config', 'assets.json');
    const configDir = path.dirname(configPath);
    
    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✓ Generated assets.json successfully');
        console.log(`  - ${config.backgrounds.length} backgrounds found`);
        console.log(`  - ${config.sprites.length} sprites found`);
        
        if (config.backgrounds.length > 0) {
            console.log('  Backgrounds:');
            config.backgrounds.forEach(bg => {
                console.log(`    ${bg.filename} (${bg.width}x${bg.height})`);
            });
        }
        
        if (config.sprites.length > 0 && config.sprites.length <= 10) {
            console.log('  Sample sprites:');
            config.sprites.slice(0, 5).forEach(sprite => {
                console.log(`    ${sprite.filename} (${sprite.width}x${sprite.height})`);
            });
            if (config.sprites.length > 5) {
                console.log(`    ... and ${config.sprites.length - 5} more`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error writing assets.json:', error.message);
        return false;
    }
}

// Main function
function main() {
    console.log('Generating assets.json from directory contents...');
    
    const config = generateAssetsConfig();
    const success = writeAssetsConfig(config);
    
    if (!success) {
        process.exit(1);
    }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { generateAssetsConfig, writeAssetsConfig };