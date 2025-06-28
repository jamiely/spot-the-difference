export class GameBoard {
    constructor(leftCanvasId, rightCanvasId) {
        this.leftCanvas = document.getElementById(leftCanvasId);
        this.rightCanvas = document.getElementById(rightCanvasId);
        this.leftCtx = this.leftCanvas.getContext('2d');
        this.rightCtx = this.rightCanvas.getContext('2d');
        this.differences = [];
        this.foundDifferences = new Set();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.leftCanvas.addEventListener('click', (e) => this.handleCanvasClick(e, 'left'));
        this.rightCanvas.addEventListener('click', (e) => this.handleCanvasClick(e, 'right'));
    }
    
    handleCanvasClick(event, side) {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.checkForDifference(x, y, side);
    }
    
    checkForDifference(x, y, side) {
        for (let i = 0; i < this.differences.length; i++) {
            const diff = this.differences[i];
            
            if (this.foundDifferences.has(i)) continue;
            
            if (this.isPointInDifference(x, y, diff)) {
                this.markDifferenceFound(i, diff);
                return true;
            }
        }
        return false;
    }
    
    isPointInDifference(x, y, difference) {
        return x >= difference.x && 
               x <= difference.x + difference.width &&
               y >= difference.y && 
               y <= difference.y + difference.height;
    }
    
    markDifferenceFound(index, difference) {
        this.foundDifferences.add(index);
        this.highlightDifference(difference);
        this.dispatchEvent('differenceFound', { 
            index, 
            difference, 
            totalFound: this.foundDifferences.size,
            totalDifferences: this.differences.length
        });
    }
    
    highlightDifference(difference) {
        this.drawCircle(this.leftCtx, difference.x + difference.width/2, difference.y + difference.height/2);
        this.drawCircle(this.rightCtx, difference.x + difference.width/2, difference.y + difference.height/2);
    }
    
    drawCircle(ctx, x, y, radius = 20) {
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    loadImages(leftImageSrc, rightImageSrc) {
        return Promise.all([
            this.loadImage(leftImageSrc, this.leftCtx),
            this.loadImage(rightImageSrc, this.rightCtx)
        ]);
    }
    
    loadImage(src, ctx) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    }
    
    setDifferences(differences) {
        this.differences = differences;
    }
    
    reset() {
        this.foundDifferences.clear();
        this.clearCanvases();
    }

    clearCanvases() {
        this.leftCtx.clearRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);
        this.rightCtx.clearRect(0, 0, this.rightCanvas.width, this.rightCanvas.height);
    }
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    getProgress() {
        return {
            found: this.foundDifferences.size,
            total: this.differences.length,
            isComplete: this.foundDifferences.size === this.differences.length
        };
    }
}