class SudokuApp {
    constructor() {
        this.boardElement = document.getElementById('sudoku-board');
        this.numpadElement = document.getElementById('numpad');
        this.generator = new SudokuGenerator();
        
        this.state = {
            puzzle: [],
            solution: [],
            currentGrid: [],
            notes: Array(81).fill().map(() => new Set()),
            selectedCell: null,
            memoMode: false,
            mistakes: 0,
            timer: 0,
            isPlaying: false
        };
        
        this.history = [];
        this.timerInterval = null;
        
        this.initUI();
        this.initTheme();
        this.bindEvents();
        this.startNewGame();
    }

    initUI() {
        // Create 81 cells
        this.boardElement.innerHTML = '';
        this.cells = [];
        for (let i = 0; i < 81; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            this.boardElement.appendChild(cell);
            this.cells.push(cell);
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('sudoku-theme') || 'dark';
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.getElementById('theme-icon-moon').style.display = 'none';
            document.getElementById('theme-icon-sun').style.display = 'block';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        if (newTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.getElementById('theme-icon-moon').style.display = 'none';
            document.getElementById('theme-icon-sun').style.display = 'block';
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.getElementById('theme-icon-sun').style.display = 'none';
            document.getElementById('theme-icon-moon').style.display = 'block';
        }
        localStorage.setItem('sudoku-theme', newTheme);
    }

    bindEvents() {
        // Cell selection
        this.boardElement.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (!cell) return;
            this.selectCell(parseInt(cell.dataset.index));
        });

        // Numpad input
        this.numpadElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('num-btn')) {
                this.inputNumber(parseInt(e.target.dataset.val));
            }
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                this.inputNumber(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.eraseNumber();
            } else if (e.key === 'ArrowUp') this.moveSelection(-9);
            else if (e.key === 'ArrowDown') this.moveSelection(9);
            else if (e.key === 'ArrowLeft') this.moveSelection(-1);
            else if (e.key === 'ArrowRight') this.moveSelection(1);
        });

        // Controls
        document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());
        document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());
        
        // Tools
        document.getElementById('btn-memo').addEventListener('click', () => this.toggleMemoMode());
        document.getElementById('btn-erase').addEventListener('click', () => this.eraseNumber());
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-hint').addEventListener('click', () => this.useHint());
    }

    startNewGame() {
        const diff = document.getElementById('difficulty').value;
        const generated = this.generator.generate(diff);
        
        this.state = {
            puzzle: [...generated.puzzle],
            solution: [...generated.solution],
            currentGrid: [...generated.puzzle],
            notes: Array(81).fill().map(() => new Set()),
            selectedCell: null,
            memoMode: false,
            mistakes: 0,
            timer: 0,
            isPlaying: true
        };
        
        this.history = [];
        this.updateMistakesDisplay();
        this.startTimer();
        this.render();
        
        document.getElementById('display-difficulty').innerText = 
            document.getElementById('difficulty').options[document.getElementById('difficulty').selectedIndex].text;
    }

    selectCell(index) {
        if(!this.state.isPlaying) return;
        this.state.selectedCell = index;
        this.render();
    }
    
    moveSelection(offset) {
        if (this.state.selectedCell === null) {
            this.selectCell(40); // Center
            return;
        }
        let current = this.state.selectedCell;
        let c = current % 9;
        let r = Math.floor(current / 9);
        
        if(offset === -1 && c > 0) current -=1;
        if(offset === 1 && c < 8) current += 1;
        if(offset === -9 && r > 0) current -= 9;
        if(offset === 9 && r < 8) current += 9;
        this.selectCell(current);
    }

    toggleMemoMode() {
        this.state.memoMode = !this.state.memoMode;
        const btn = document.getElementById('btn-memo');
        document.getElementById('label-memo').innerText = this.state.memoMode ? "메모: 켜짐" : "메모: 끄기";
        if(this.state.memoMode) btn.classList.add('active');
        else btn.classList.remove('active');
    }

    inputNumber(num) {
        if (this.state.selectedCell === null || !this.state.isPlaying) return;
        
        const idx = this.state.selectedCell;
        if (this.state.puzzle[idx] !== 0) return; // Fixed cells cannot be modified

        this.saveHistory();

        if (this.state.memoMode) {
            if (this.state.notes[idx].has(num)) {
                this.state.notes[idx].delete(num);
            } else {
                this.state.notes[idx].add(num);
            }
            this.state.currentGrid[idx] = 0; // Clear actual number if annotating
        } else {
            this.state.currentGrid[idx] = num;
            this.state.notes[idx].clear(); // Clear notes when assigned
            
            // Checking mistake
            if (this.state.solution[idx] !== num) {
                this.state.mistakes++;
                this.updateMistakesDisplay();
            }
        }
        
        this.render();
        this.checkWin();
    }

    eraseNumber() {
        if (this.state.selectedCell === null || !this.state.isPlaying) return;
        const idx = this.state.selectedCell;
        if (this.state.puzzle[idx] !== 0) return;

        this.saveHistory();
        this.state.currentGrid[idx] = 0;
        this.state.notes[idx].clear();
        this.render();
    }
    
    useHint() {
        if (this.state.selectedCell === null || !this.state.isPlaying) return;
        const idx = this.state.selectedCell;
        if (this.state.currentGrid[idx] !== 0) return; // Already filled
        
        this.saveHistory();
        this.state.currentGrid[idx] = this.state.solution[idx];
        this.state.notes[idx].clear();
        this.render();
        this.checkWin();
    }
    
    saveHistory() {
        this.history.push({
            grid: [...this.state.currentGrid],
            notes: this.state.notes.map(n => new Set(n))
        });
    }
    
    undo() {
        if(this.history.length === 0 || !this.state.isPlaying) return;
        const prev = this.history.pop();
        this.state.currentGrid = prev.grid;
        this.state.notes = prev.notes;
        this.render();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if(!this.state.isPlaying) return;
            this.state.timer++;
            let m = Math.floor(this.state.timer / 60).toString().padStart(2, '0');
            let s = (this.state.timer % 60).toString().padStart(2, '0');
            document.getElementById('display-timer').innerText = `${m}:${s}`;
        }, 1000);
    }
    
    updateMistakesDisplay() {
        document.getElementById('display-mistakes').innerText = `${this.state.mistakes} / 3`;
        if(this.state.mistakes >= 3) {
            setTimeout(() => {
                alert("실수 3회 누적. 게임 오버!");
                this.state.isPlaying = false;
            }, 100);
        }
    }

    checkWin() {
        if(!this.state.isPlaying) return;
        if(this.state.currentGrid.includes(0)) return;
        
        let conflicts = SudokuGenerator.getConflicts(this.state.currentGrid);
        if(conflicts.size === 0) {
            setTimeout(() => {
                alert(`축하합니다! ${document.getElementById('display-timer').innerText}만에 성공하셨습니다!`);
                this.state.isPlaying = false;
                clearInterval(this.timerInterval);
            }, 100);
        }
    }

    render() {
        const conflicts = SudokuGenerator.getConflicts(this.state.currentGrid);
        
        let highlightValue = null;
        if(this.state.selectedCell !== null) {
            highlightValue = this.state.currentGrid[this.state.selectedCell];
        }

        let sr = -1, sc = -1, sb = -1;
        if(this.state.selectedCell !== null) {
            sr = Math.floor(this.state.selectedCell / 9);
            sc = this.state.selectedCell % 9;
            sb = Math.floor(sr/3)*3 + Math.floor(sc/3);
        }

        for (let i = 0; i < 81; i++) {
            const cell = this.cells[i];
            let classes = ['cell'];
            
            const val = this.state.currentGrid[i];
            const isFixed = this.state.puzzle[i] !== 0;
            
            if (val === 0 && this.state.notes[i].size > 0) {
                let html = '<div class="notes">';
                for(let n=1; n<=9; n++){
                    let vis = this.state.notes[i].has(n) ? n : '';
                    html += `<div class="note-num">${vis}</div>`;
                }
                html += '</div>';
                cell.innerHTML = html;
            } else {
                cell.innerHTML = val === 0 ? '' : val;
            }

            if (!isFixed && val !== 0) classes.push('user-input');
            if (i === this.state.selectedCell) classes.push('selected');
            
            let r = Math.floor(i / 9);
            let c = i % 9;
            let b = Math.floor(r/3)*3 + Math.floor(c/3);
            if(i !== this.state.selectedCell && (r===sr || c===sc || b===sb)) {
                classes.push('highlighted');
            }
            
            if (highlightValue && highlightValue !== 0 && val === highlightValue && i !== this.state.selectedCell) {
                classes.push('same-number');
            }
            
            if(conflicts.has(i) && val !== 0) {
                classes.push('error');
            }

            cell.className = classes.join(' ');
        }
    }
}

const app = new SudokuApp();
