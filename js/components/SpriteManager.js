export class SpriteManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.spritesPath = './sprites/';
        this.loadedSprites = [];
        this.activeSprites = [];
    }

    async loadAvailableSprites() {
        try {
            const knownSprites = [
                'art_scissors.png', 'beaded_necklace.png', 'bitten_apple.png', 'cat_drawing.png',
                'chalkboard_eraser.png', 'cookie_chocolate_chip.png', 'cookie_plain.png', 'covid_lanyard.png',
                'crumpled_paper.png', 'dual_colored_eraser.png', 'flashlight_keychain.png', 'flower_keychain.png',
                'four_leaf_clover.png', 'glue_stick.png', 'gold_star.png', 'gradient_diamond.png',
                'green_beret.png', 'green_frog_toy.png', 'green_lunchbox.png', 'green_robot.png',
                'hair_clip.png', 'homework_paper.png', 'jump_rope.png', 'kids_watch.png',
                'leaf_wreath.png', 'loose_chain.png', 'lunch_bag_orange.png', 'lunch_lady.png',
                'lunch_menu.png', 'moldy_eraser.png', 'name_tag.png', 'open_storybook.png',
                'orange_crayon.png', 'orange_crayon_tip.png', 'orange_lollipop.png', 'orange_ruler.png',
                'orange_sock.png', 'paint_on_palette.png', 'paintbrush.png', 'paper_airplane.png',
                'paper_snowflake.png', 'pencil_case.png', 'permission_slip.png', 'pink_backpack.png',
                'purple_glasses.png', 'rain_boot.png', 'school_dance_flyer.png', 'shoelace.png',
                'small_orange_diamond.png', 'small_yellow_diamond.png', 'spilled_glue.png', 'spilled_juice_box.png',
                'spilled_paint_cup.png', 'star_wand.png', 'striped_sock.png', 'tape_dispenser.png',
                'torn_paper_strip.png', 'toy_dinosaur.png', 'watercolor_paint_set.png', 'winter_mitten.png',
                'winter_mittens.png', 'yellow_crayon_piece.png', 'yellow_pencil.png'
            ];
            
            console.log('Checking sprites with path:', this.spritesPath);
            const sprites = [];
            for (const filename of knownSprites) {
                const fullPath = this.spritesPath + filename;
                console.log('Checking sprite:', fullPath);
                if (await this.imageExists(fullPath)) {
                    sprites.push(filename);
                    console.log('✓ Found:', filename);
                } else {
                    console.log('✗ Not found:', filename);
                }
            }
            
            console.log('Total sprites loaded:', sprites.length);
            this.loadedSprites = sprites;
            return sprites;
        } catch (error) {
            console.warn('Could not load sprites:', error);
            return [];
        }
    }

    async imageExists(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    }

    getRandomSprites(count = 10) {
        if (this.loadedSprites.length === 0) {
            return [];
        }
        
        const shuffled = [...this.loadedSprites].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, this.loadedSprites.length));
    }

    createSpriteElement(spriteSrc, boundingBoxes = [], specificBoxIndex = null) {
        const sprite = document.createElement('img');
        sprite.src = this.spritesPath + spriteSrc;
        sprite.className = 'game-sprite';
        sprite.alt = 'Game sprite';
        
        // Position sprites relative to the background image
        const backgroundImg = document.getElementById('background-image');
        if (backgroundImg && backgroundImg.style.display !== 'none') {
            // Wait for background image to load and get its actual dimensions
            if (backgroundImg.complete) {
                this.positionSpriteOnBackground(sprite, backgroundImg, boundingBoxes, specificBoxIndex);
            } else {
                backgroundImg.onload = () => {
                    this.positionSpriteOnBackground(sprite, backgroundImg, boundingBoxes, specificBoxIndex);
                };
            }
        } else {
            // Fallback positioning within container
            const containerRect = this.container.getBoundingClientRect();
            const maxX = containerRect.width - 50;
            const maxY = containerRect.height - 50;
            
            sprite.style.left = Math.random() * Math.max(0, maxX) + 'px';
            sprite.style.top = Math.random() * Math.max(0, maxY) + 'px';
        }
        
        return sprite;
    }

    positionSpriteOnBackground(sprite, backgroundImg, boundingBoxes = [], specificBoxIndex = null) {
        // Get the actual rendered dimensions and position of the background image
        const bgRect = backgroundImg.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        // Calculate relative position within the container
        const relativeLeft = bgRect.left - containerRect.left;
        const relativeTop = bgRect.top - containerRect.top;
        
        const spriteSize = 40; // sprite width/height from CSS
        
        let randomX, randomY;
        
        if (boundingBoxes.length > 0) {
            // Use specific bounding box or pick one randomly
            const selectedBox = specificBoxIndex !== null ? 
                boundingBoxes[specificBoxIndex] : 
                boundingBoxes[Math.floor(Math.random() * boundingBoxes.length)];
            
            // Ensure we have valid dimensions for positioning
            const availableWidth = Math.max(1, selectedBox.width - spriteSize);
            const availableHeight = Math.max(1, selectedBox.height - spriteSize);
            
            // Bounding box coordinates are relative to background image, so add the background offset
            const boxX = relativeLeft + selectedBox.x + Math.floor(Math.random() * availableWidth);
            const boxY = relativeTop + selectedBox.y + Math.floor(Math.random() * availableHeight);
            
            sprite.style.left = boxX + 'px';
            sprite.style.top = boxY + 'px';
            
            console.log(`Positioned sprite in box ${specificBoxIndex || 'random'} at: ${boxX}, ${boxY} (box relative to bg: ${selectedBox.x}, ${selectedBox.y}, ${selectedBox.width}x${selectedBox.height})`);
        } else {
            // Use the full background image dimensions for positioning
            const maxX = Math.max(0, bgRect.width - spriteSize);
            const maxY = Math.max(0, bgRect.height - spriteSize);
            
            randomX = Math.floor(Math.random() * (maxX + 1));
            randomY = Math.floor(Math.random() * (maxY + 1));
            
            sprite.style.left = (relativeLeft + randomX) + 'px';
            sprite.style.top = (relativeTop + randomY) + 'px';
            
            console.log(`Positioned sprite on full background at: ${relativeLeft + randomX}, ${relativeTop + randomY} (bg: ${bgRect.width}x${bgRect.height})`);
        }
    }

    displayRandomSprites(count = 10) {
        this.clearSprites();
        
        const randomSprites = this.getRandomSprites(count);
        
        randomSprites.forEach(spriteSrc => {
            const spriteElement = this.createSpriteElement(spriteSrc);
            this.container.appendChild(spriteElement);
            this.activeSprites.push(spriteElement);
        });
        
        return this.activeSprites.length;
    }

    displayAllSprites(boundingBoxes = []) {
        this.clearSprites();
        
        // Add a small delay to ensure background image is properly rendered
        setTimeout(() => {
            if (boundingBoxes.length > 0) {
                // Distribute sprites across all bounding boxes
                this.loadedSprites.forEach((spriteSrc, index) => {
                    setTimeout(() => {
                        const boxIndex = index % boundingBoxes.length; // Cycle through boxes
                        const spriteElement = this.createSpriteElement(spriteSrc, boundingBoxes, boxIndex);
                        this.container.appendChild(spriteElement);
                        this.activeSprites.push(spriteElement);
                    }, index * 10); // Small delay between each sprite
                });
            } else {
                // No bounding boxes, use full background
                this.loadedSprites.forEach((spriteSrc, index) => {
                    setTimeout(() => {
                        const spriteElement = this.createSpriteElement(spriteSrc, boundingBoxes);
                        this.container.appendChild(spriteElement);
                        this.activeSprites.push(spriteElement);
                    }, index * 10); // Small delay between each sprite
                });
            }
        }, 100);
        
        return this.loadedSprites.length;
    }

    clearSprites() {
        this.activeSprites.forEach(sprite => {
            if (sprite.parentNode) {
                sprite.parentNode.removeChild(sprite);
            }
        });
        this.activeSprites = [];
    }

    getSpriteCount() {
        return this.activeSprites.length;
    }

    getLoadedSpritesCount() {
        return this.loadedSprites.length;
    }
}