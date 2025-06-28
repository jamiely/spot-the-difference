#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Generate assets configuration
function generateAssetsConfig() {
    const backgroundsDir = path.join(projectRoot, 'backgrounds');
    const spritesDir = path.join(projectRoot, 'sprites');
    
    const backgrounds = getFilesFromDirectory(backgroundsDir);
    const sprites = getFilesFromDirectory(spritesDir);
    
    const config = {
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
            console.log('  Backgrounds:', config.backgrounds.join(', '));
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