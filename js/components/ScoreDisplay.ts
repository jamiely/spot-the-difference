interface DifferenceFoundEvent extends CustomEvent {
    detail: {
        totalFound: number;
    };
}

export class ScoreDisplay {
    private scoreElement: HTMLElement;
    private score: number = 0;

    constructor(scoreElementId: string) {
        this.scoreElement = document.getElementById(scoreElementId) as HTMLElement;
        if (!this.scoreElement) {
            throw new Error(`Score element with id "${scoreElementId}" not found`);
        }
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        document.addEventListener('differenceFound', (e: Event) => {
            const event = e as DifferenceFoundEvent;
            this.updateScore(event.detail.totalFound);
        });
        
        document.addEventListener('gameReset', () => {
            this.reset();
        });
    }
    
    updateScore(newScore: number): void {
        this.score = newScore;
        this.render();
        this.animateScore();
    }
    
    private render(): void {
        this.scoreElement.textContent = this.score.toString();
    }
    
    private animateScore(): void {
        this.scoreElement.style.transform = 'scale(1.2)';
        this.scoreElement.style.color = '#38a169';
        
        setTimeout(() => {
            this.scoreElement.style.transform = 'scale(1)';
            this.scoreElement.style.color = '#667eea';
        }, 200);
    }
    
    reset(): void {
        this.score = 0;
        this.render();
    }
    
    getScore(): number {
        return this.score;
    }
}