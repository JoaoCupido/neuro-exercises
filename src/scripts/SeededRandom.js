export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
        this.state = seed;
    }

    // Mulberry32 algorithm - simple, fast, and good quality
    random() {
        if (this.seed === null || this.seed === undefined) {
            return Math.random();
        }

        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    randInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.randInt(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    randomChoice(array) {
        return array[this.randInt(0, array.length - 1)];
    }

    // Reset the seed to start over
    reset(seed) {
        this.seed = seed;
        this.state = seed;
    }
}