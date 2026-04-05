class SudokuGenerator {
    constructor() {
        this.board = Array(81).fill(0);
        this.solution = Array(81).fill(0);
    }

    generate(difficulty) {
        this.board = Array(81).fill(0);
        this.fillDiagonal();
        this.fillRemaining(0, 3);
        this.solution = [...this.board];
        this.removeDigits(difficulty);
        return {
            puzzle: [...this.board],
            solution: [...this.solution]
        };
    }

    fillDiagonal() {
        for (let i = 0; i < 9; i = i + 3) {
            this.fillBox(i, i);
        }
    }

    fillBox(rowStart, colStart) {
        let num;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                do {
                    num = Math.floor(Math.random() * 9) + 1;
                } while (!this.isSafeInBox(rowStart, colStart, num));
                this.board[(rowStart + i) * 9 + (colStart + j)] = num;
            }
        }
    }

    isSafeInBox(rowStart, colStart, num) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.board[(rowStart + i) * 9 + (colStart + j)] === num) return false;
            }
        }
        return true;
    }

    isSafe(i, j, num) {
        return (
            this.isSafeInRow(i, num) &&
            this.isSafeInCol(j, num) &&
            this.isSafeInBox(i - (i % 3), j - (j % 3), num)
        );
    }

    isSafeInRow(i, num) {
        for (let j = 0; j < 9; j++) {
            if (this.board[i * 9 + j] === num) return false;
        }
        return true;
    }

    isSafeInCol(j, num) {
        for (let i = 0; i < 9; i++) {
            if (this.board[i * 9 + j] === num) return false;
        }
        return true;
    }

    fillRemaining(i, j) {
        if (j >= 9 && i < 8) {
            i = i + 1;
            j = 0;
        }
        if (i >= 9 && j >= 9) return true;

        if (i < 3) {
            if (j < 3) j = 3;
        } else if (i < 6) {
            if (j === Math.floor(i / 3) * 3) j += 3;
        } else {
            if (j === 6) {
                i += 1;
                j = 0;
                if (i >= 9) return true;
            }
        }

        for (let num = 1; num <= 9; num++) {
            if (this.isSafe(i, j, num)) {
                this.board[i * 9 + j] = num;
                if (this.fillRemaining(i, j + 1)) return true;
                this.board[i * 9 + j] = 0;
            }
        }
        return false;
    }

    removeDigits(difficulty) {
        let count = 40; // Default medium
        if (difficulty === 'easy') count = 30;
        if (difficulty === 'hard') count = 50;
        if (difficulty === 'expert') count = 58;

        while (count !== 0) {
            let cellId = Math.floor(Math.random() * 81);
            if (this.board[cellId] !== 0) {
                this.board[cellId] = 0;
                count--;
            }
        }
    }
    
    // Check conflicts on current grid
    static getConflicts(grid) {
        let conflicts = new Set();
        // Check rows
        for(let r=0; r<9; r++){
            let seen = new Map();
            for(let c=0; c<9; c++){
                let val = grid[r*9 + c];
                if(val !== 0) {
                    if(seen.has(val)) {
                        conflicts.add(r*9+c);
                        conflicts.add(r*9+seen.get(val));
                    }
                    seen.set(val, c);
                }
            }
        }
        // Check cols
        for(let c=0; c<9; c++){
            let seen = new Map();
            for(let r=0; r<9; r++){
                let val = grid[r*9 + c];
                if(val !== 0) {
                    if(seen.has(val)) {
                        conflicts.add(r*9+c);
                        conflicts.add(seen.get(val)*9+c);
                    }
                    seen.set(val, r);
                }
            }
        }
        // Check 3x3 boxes
        for(let b=0; b<9; b++) {
            let br = Math.floor(b/3)*3;
            let bc = (b%3)*3;
            let seen = new Map();
            for(let i=0; i<9; i++) {
                let r = br + Math.floor(i/3);
                let c = bc + (i%3);
                let val = grid[r*9 + c];
                if(val !== 0) {
                    if(seen.has(val)) {
                        conflicts.add(r*9+c);
                        conflicts.add(seen.get(val));
                    }
                    seen.set(val, r*9+c);
                }
            }
        }
        return conflicts;
    }
}
