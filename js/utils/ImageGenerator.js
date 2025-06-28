export class ImageGenerator {
    static generateTestImages(canvas1, canvas2) {
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');
        
        this.drawBaseImage(ctx1);
        this.drawBaseImage(ctx2);
        
        const differences = this.addDifferences(ctx2);
        
        return differences;
    }
    
    static drawBaseImage(ctx) {
        const { width, height } = ctx.canvas;
        
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(0, height - 60, width, 60);
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(80, 80, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(150, 100, 25, 15, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(200, 90, 20, 12, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(320, 180, 15, 80);
        
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(327, 170, 25, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#FF6347';
        ctx.fillRect(50, 200, 80, 40);
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(60, 240, 60, 20);
    }
    
    static addDifferences(ctx) {
        const differences = [];
        
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(80, 80, 30, 0, 2 * Math.PI);
        ctx.fill();
        differences.push({ x: 50, y: 50, width: 60, height: 60 });
        
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(327, 170, 35, 0, 2 * Math.PI);
        ctx.fill();
        differences.push({ x: 292, y: 135, width: 70, height: 70 });
        
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(50, 200, 80, 40);
        differences.push({ x: 50, y: 200, width: 80, height: 40 });
        
        return differences;
    }
    
    static createRandomDifferences(count = 3) {
        const differences = [];
        
        for (let i = 0; i < count; i++) {
            differences.push({
                x: Math.random() * 300,
                y: Math.random() * 200,
                width: 20 + Math.random() * 40,
                height: 20 + Math.random() * 40
            });
        }
        
        return differences;
    }
}