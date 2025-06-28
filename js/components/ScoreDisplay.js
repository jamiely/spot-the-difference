export class ScoreDisplay {
    constructor(scoreElementId) {
        this.scoreElement = document.getElementById(scoreElementId);
        this.score = 0;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('differenceFound', (e) => {
            this.updateScore(e.detail.totalFound);
        });
        
        document.addEventListener('gameReset', () => {
            this.reset();
        });
    }
    
    updateScore(newScore) {
        this.score = newScore;
        this.render();
        this.animateScore();
    }
    
    render() {
        this.scoreElement.textContent = this.score;
    }
    
    animateScore() {
        this.scoreElement.style.transform = 'scale(1.2)';
        this.scoreElement.style.color = '#38a169';
        
        setTimeout(() => {
            this.scoreElement.style.transform = 'scale(1)';
            this.scoreElement.style.color = '#667eea';
        }, 200);
    }
    
    reset() {
        this.score = 0;
        this.render();
    }
    
    getScore() {
        return this.score;
    }
}