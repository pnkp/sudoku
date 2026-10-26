/**
 * Sudoku Game Controller
 * UI Interaction, Mobile Gestures, Keyboard Controls, Audio, LocalStorage
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
    }

    playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.1) {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio context failed or blocked by browser
        }
    }

    tap() {
        this.playTone(480, 'sine', 0.05, 0.08);
    }

    place() {
        this.playTone(600, 'triangle', 0.08, 0.12);
        this.vibrate(15);
    }

    note() {
        this.playTone(850, 'sine', 0.04, 0.05);
        this.vibrate(10);
    }

    erase() {
        this.playTone(320, 'sine', 0.06, 0.08);
        this.vibrate(15);
    }

    error() {
        this.playTone(200, 'sawtooth', 0.15, 0.15);
        this.vibrate([40, 30, 40]);
    }

    win() {
        if (!this.enabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.25, 0.2);
            }, i * 150);
        });
        this.vibrate([100, 50, 100, 50, 200]);
    }

    vibrate(pattern) {
        if ('vibrate' in navigator) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    }
}

class ConfettiFX {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animId = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        this.particles = [];
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        for (let i = 0; i < 120; i++) {
            this.particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.7) * 16,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rSpeed: (Math.random() - 0.5) * 10,
                alpha: 1,
                decay: Math.random() * 0.008 + 0.004
            });
        }
        if (this.animId) cancelAnimationFrame(this.animId);
        this.loop();
    }

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let activeCount = 0;

        for (const p of this.particles) {
            if (p.alpha <= 0) continue;
            activeCount++;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35; // gravity
            p.rotation += p.rSpeed;
            p.alpha -= p.decay;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        }

        if (activeCount > 0) {
            this.animId = requestAnimationFrame(() => this.loop());
        }
    }

    stop() {
        if (this.animId) cancelAnimationFrame(this.animId);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class SudokuApp {
    constructor() {
        this.engine = new SudokuEngine();
        this.sound = new SoundManager();
        this.confetti = new ConfettiFX('confetti-canvas');

        this.currentDifficulty = 'easy';
        this.initialGrid = null;
        this.currentGrid = null;
        this.solutionGrid = null;
        this.notesGrid = null; // 9x9 Array of Sets
        this.history = []; // Undo stack

        this.selectedRow = -1;
        this.selectedCol = -1;
        this.notesMode = false;
        this.isPaused = false;
        this.isGameOver = false;

        this.timer = 0;
        this.timerInterval = null;
        this.errors = 0;

        this.dom = {
            grid: document.getElementById('sudoku-grid'),
            timer: document.getElementById('timer-display'),
            errors: document.getElementById('errors-display'),
            diffButtons: document.querySelectorAll('.diff-btn'),
            numpad: document.getElementById('numpad'),
            numButtons: document.querySelectorAll('.num-btn'),
            btnUndo: document.getElementById('btn-undo'),
            btnErase: document.getElementById('btn-erase'),
            btnNote: document.getElementById('btn-note'),
            btnHint: document.getElementById('btn-hint'),
            btnTheme: document.getElementById('btn-theme'),
            btnSound: document.getElementById('btn-sound'),
            btnPause: document.getElementById('btn-pause'),
            btnNewGame: document.getElementById('btn-new-game'),
            winModal: document.getElementById('win-modal'),
            btnModalRestart: document.getElementById('btn-modal-restart'),
            winTime: document.getElementById('win-time'),
            winErrors: document.getElementById('win-errors'),
            winDiff: document.getElementById('win-diff'),
            winMessage: document.getElementById('win-message'),
            newGameModal: document.getElementById('new-game-modal'),
            modalDiffButtons: document.querySelectorAll('.modal-diff-btn'),
            btnModalCancelNewGame: document.getElementById('btn-modal-cancel-new-game')
        };

        this.init();
    }

    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.initKeyboard();

        if (!this.loadGameState()) {
            this.startNewGame(this.currentDifficulty);
        }
    }

    setupEventListeners() {
        // Difficulty switch
        this.dom.diffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const diff = btn.dataset.diff;
                this.sound.tap();
                if (diff === this.currentDifficulty && !this.isGameOver) {
                    this.openNewGameModal(diff);
                } else {
                    this.startNewGame(diff);
                }
            });
        });

        // Theme toggle
        this.dom.btnTheme.addEventListener('click', () => this.toggleTheme());

        // Sound toggle
        this.dom.btnSound.addEventListener('click', () => this.toggleSound());

        // Pause toggle
        this.dom.btnPause.addEventListener('click', () => this.togglePause());

        // New game button in header
        this.dom.btnNewGame.addEventListener('click', () => {
            this.sound.tap();
            this.openNewGameModal(this.currentDifficulty);
        });

        // New game modal buttons
        this.dom.modalDiffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const diff = btn.dataset.diff;
                this.closeNewGameModal();
                this.sound.tap();
                this.startNewGame(diff);
            });
        });

        if (this.dom.btnModalCancelNewGame) {
            this.dom.btnModalCancelNewGame.addEventListener('click', () => {
                this.sound.tap();
                this.closeNewGameModal();
            });
        }

        // Close modal when clicking on overlay background
        if (this.dom.newGameModal) {
            this.dom.newGameModal.addEventListener('click', (e) => {
                if (e.target === this.dom.newGameModal) {
                    this.closeNewGameModal();
                }
            });
        }

        // Numpad actions
        this.dom.numButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.dataset.num, 10);
                this.handleNumberInput(num);
            });
        });

        // Control buttons
        this.dom.btnUndo.addEventListener('click', () => this.undo());
        this.dom.btnErase.addEventListener('click', () => this.erase());
        this.dom.btnNote.addEventListener('click', () => this.toggleNoteMode());
        this.dom.btnHint.addEventListener('click', () => this.giveHint());

        // Modal button
        this.dom.btnModalRestart.addEventListener('click', () => {
            this.dom.winModal.classList.remove('active');
            this.confetti.stop();
            this.startNewGame(this.currentDifficulty);
        });

        // Lifecycle save triggers
        window.addEventListener('beforeunload', () => this.saveGameState());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveGameState();
            }
        });
    }

    openNewGameModal(targetDiff = this.currentDifficulty) {
        if (!this.dom.newGameModal) return;
        this.dom.modalDiffButtons.forEach(b => {
            b.classList.toggle('active', b.dataset.diff === targetDiff);
        });
        this.dom.newGameModal.classList.add('active');
    }

    closeNewGameModal() {
        if (!this.dom.newGameModal) return;
        this.dom.newGameModal.classList.remove('active');
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeNewGameModal();
                if (this.dom.winModal && this.dom.winModal.classList.contains('active')) {
                    this.dom.winModal.classList.remove('active');
                }
                return;
            }

            if (this.isGameOver || this.isPaused) return;

            if (e.key >= '1' && e.key <= '9') {
                this.handleNumberInput(parseInt(e.key, 10));
            } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
                this.erase();
            } else if (e.key === 'n' || e.key === 'N') {
                this.toggleNoteMode();
            } else if (e.key === 'u' || e.key === 'U' || (e.ctrlKey && e.key === 'z') || (e.metaKey && e.key === 'z')) {
                e.preventDefault();
                this.undo();
            } else if (e.key === 'h' || e.key === 'H') {
                this.giveHint();
            } else if (e.key.startsWith('Arrow')) {
                this.handleArrowKey(e.key);
            }
        });
    }

    handleArrowKey(key) {
        if (this.selectedRow === -1 || this.selectedCol === -1) {
            this.selectCell(0, 0);
            return;
        }
        let r = this.selectedRow;
        let c = this.selectedCol;

        if (key === 'ArrowUp') r = Math.max(0, r - 1);
        if (key === 'ArrowDown') r = Math.min(8, r + 1);
        if (key === 'ArrowLeft') c = Math.max(0, c - 1);
        if (key === 'ArrowRight') c = Math.min(8, c + 1);

        this.selectCell(r, c);
    }

    startNewGame(difficulty = 'easy') {
        this.closeNewGameModal();
        if (this.dom.winModal) {
            this.dom.winModal.classList.remove('active');
        }
        this.confetti.stop();

        this.currentDifficulty = difficulty;
        this.isGameOver = false;
        this.isPaused = false;
        this.dom.btnPause.textContent = '⏸️';
        this.dom.grid.style.filter = 'none';

        this.selectedRow = -1;
        this.selectedCol = -1;
        this.history = [];
        this.errors = 0;
        this.updateErrorsDisplay();

        // Update active diff tab
        this.dom.diffButtons.forEach(b => {
            b.classList.toggle('active', b.dataset.diff === difficulty);
        });

        const puzzleData = this.engine.generatePuzzle(difficulty);
        this.initialGrid = this.engine.cloneGrid(puzzleData.puzzle);
        this.currentGrid = this.engine.cloneGrid(puzzleData.puzzle);
        this.solutionGrid = this.engine.cloneGrid(puzzleData.solution);

        // Notes grid: 9x9 Array of Sets
        this.notesGrid = Array.from({ length: 9 }, () =>
            Array.from({ length: 9 }, () => new Set())
        );

        this.startTimer(true);
        this.renderBoard();
        this.saveGameState();
    }

    renderBoard() {
        this.dom.grid.innerHTML = '';
        const conflicts = this.engine.findConflicts(this.currentGrid);

        const selectedVal = (this.selectedRow >= 0 && this.selectedCol >= 0)
            ? this.currentGrid[this.selectedRow][this.selectedCol]
            : null;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const val = this.currentGrid[r][c];
                const isGiven = this.initialGrid[r][c] !== 0;
                const isSelected = this.selectedRow === r && this.selectedCol === c;
                const isSameRowOrColOrBox = (
                    this.selectedRow === r ||
                    this.selectedCol === c ||
                    (Math.floor(this.selectedRow / 3) === Math.floor(r / 3) &&
                     Math.floor(this.selectedCol / 3) === Math.floor(c / 3))
                );

                if (isGiven) cell.classList.add('given');
                else if (val !== 0) cell.classList.add('user-filled');

                if (isSelected) cell.classList.add('selected');
                else if (isSameRowOrColOrBox && this.selectedRow !== -1) cell.classList.add('highlighted');

                if (selectedVal && val === selectedVal && !isSelected) {
                    cell.classList.add('same-number');
                }

                if (conflicts.has(`${r},${c}`)) {
                    cell.classList.add('conflict');
                }

                if (val !== 0) {
                    cell.textContent = val;
                } else {
                    // Render candidate notes if present
                    const notes = this.notesGrid[r][c];
                    if (notes && notes.size > 0) {
                        const notesGrid = document.createElement('div');
                        notesGrid.className = 'notes-grid';
                        for (let n = 1; n <= 9; n++) {
                            const noteNum = document.createElement('div');
                            noteNum.className = 'note-num';
                            if (notes.has(n)) noteNum.textContent = n;
                            notesGrid.appendChild(noteNum);
                        }
                        cell.appendChild(notesGrid);
                    }
                }

                cell.addEventListener('click', () => {
                    this.sound.tap();
                    this.selectCell(r, c);
                });

                this.dom.grid.appendChild(cell);
            }
        }

        this.updateNumberCounts();
    }

    selectCell(r, c) {
        if (this.isPaused || this.isGameOver) return;
        this.selectedRow = r;
        this.selectedCol = c;
        this.renderBoard();
        this.saveGameState();
    }

    handleNumberInput(num) {
        if (this.selectedRow === -1 || this.selectedCol === -1 || this.isPaused || this.isGameOver) return;

        const r = this.selectedRow;
        const c = this.selectedCol;

        // Given numbers cannot be edited
        if (this.initialGrid[r][c] !== 0) return;

        if (this.notesMode) {
            // Notes Mode: Toggle candidate number
            const notes = this.notesGrid[r][c];
            const oldNotes = new Set(notes);
            if (notes.has(num)) {
                notes.delete(num);
            } else {
                notes.add(num);
            }
            this.history.push({
                type: 'note',
                row: r,
                col: c,
                prevNotes: oldNotes,
                newNotes: new Set(notes)
            });
            this.sound.note();
            this.renderBoard();
            this.saveGameState();
            return;
        }

        // Normal number input
        const oldVal = this.currentGrid[r][c];
        const oldNotes = new Set(this.notesGrid[r][c]);

        if (oldVal === num) return; // No change

        this.currentGrid[r][c] = num;
        this.notesGrid[r][c].clear(); // Clear notes when number placed

        // Auto clean notes from same row, col, box
        const removedNotesHistory = this.autoCleanNotes(r, c, num);

        this.history.push({
            type: 'number',
            row: r,
            col: c,
            prevVal: oldVal,
            newVal: num,
            prevNotes: oldNotes,
            removedNotes: removedNotesHistory
        });

        // Check conflicts
        const conflicts = this.engine.findConflicts(this.currentGrid);
        if (conflicts.has(`${r},${c}`)) {
            this.errors++;
            this.updateErrorsDisplay();
            this.sound.error();
        } else {
            this.sound.place();
        }

        this.renderBoard();
        this.saveGameState();
        this.checkWinCondition();
    }

    autoCleanNotes(row, col, num) {
        const affected = [];
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;

        for (let i = 0; i < 9; i++) {
            if (this.notesGrid[row][i].has(num)) {
                this.notesGrid[row][i].delete(num);
                affected.push({ r: row, c: i, num });
            }
            if (this.notesGrid[i][col].has(num)) {
                this.notesGrid[i][col].delete(num);
                affected.push({ r: i, c: col, num });
            }
        }

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const curRow = startRow + r;
                const curCol = startCol + c;
                if (this.notesGrid[curRow][curCol].has(num)) {
                    this.notesGrid[curRow][curCol].delete(num);
                    affected.push({ r: curRow, c: curCol, num });
                }
            }
        }
        return affected;
    }

    erase() {
        if (this.selectedRow === -1 || this.selectedCol === -1 || this.isPaused || this.isGameOver) return;
        const r = this.selectedRow;
        const c = this.selectedCol;

        if (this.initialGrid[r][c] !== 0) return;

        const oldVal = this.currentGrid[r][c];
        const oldNotes = new Set(this.notesGrid[r][c]);

        if (oldVal === 0 && oldNotes.size === 0) return;

        this.currentGrid[r][c] = 0;
        this.notesGrid[r][c].clear();

        this.history.push({
            type: 'erase',
            row: r,
            col: c,
            prevVal: oldVal,
            newVal: 0,
            prevNotes: oldNotes
        });

        this.sound.erase();
        this.renderBoard();
        this.saveGameState();
    }

    undo() {
        if (this.history.length === 0 || this.isPaused || this.isGameOver) return;
        const lastAction = this.history.pop();
        const { row, col } = lastAction;

        if (lastAction.type === 'number' || lastAction.type === 'erase') {
            this.currentGrid[row][col] = lastAction.prevVal;
            this.notesGrid[row][col] = new Set(lastAction.prevNotes);

            if (lastAction.removedNotes) {
                lastAction.removedNotes.forEach(item => {
                    this.notesGrid[item.r][item.c].add(item.num);
                });
            }
        } else if (lastAction.type === 'note') {
            this.notesGrid[row][col] = new Set(lastAction.prevNotes);
        }

        this.sound.tap();
        this.selectedRow = row;
        this.selectedCol = col;
        this.renderBoard();
        this.saveGameState();
    }

    toggleNoteMode() {
        this.notesMode = !this.notesMode;
        this.dom.btnNote.classList.toggle('active', this.notesMode);
        this.sound.tap();
        this.saveGameState();
    }

    giveHint() {
        if (this.isPaused || this.isGameOver) return;

        // If a cell is currently selected and empty or wrong, solve that one
        let targetRow = this.selectedRow;
        let targetCol = this.selectedCol;

        if (
            targetRow === -1 ||
            targetCol === -1 ||
            this.initialGrid[targetRow][targetCol] !== 0 ||
            this.currentGrid[targetRow][targetCol] === this.solutionGrid[targetRow][targetCol]
        ) {
            // Find first empty or wrong cell
            let found = false;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (this.currentGrid[r][c] !== this.solutionGrid[r][c]) {
                        targetRow = r;
                        targetCol = c;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (!found) return; // Board already complete!
        }

        const correctVal = this.solutionGrid[targetRow][targetCol];
        this.selectedRow = targetRow;
        this.selectedCol = targetCol;

        const oldVal = this.currentGrid[targetRow][targetCol];
        const oldNotes = new Set(this.notesGrid[targetRow][targetCol]);

        this.currentGrid[targetRow][targetCol] = correctVal;
        this.notesGrid[targetRow][targetCol].clear();
        const removedNotesHistory = this.autoCleanNotes(targetRow, targetCol, correctVal);

        this.history.push({
            type: 'number',
            row: targetRow,
            col: targetCol,
            prevVal: oldVal,
            newVal: correctVal,
            prevNotes: oldNotes,
            removedNotes: removedNotesHistory
        });

        this.sound.place();
        this.renderBoard();
        this.saveGameState();
        this.checkWinCondition();
    }

    updateNumberCounts() {
        // Count count of each number 1-9 on board
        const counts = Array(10).fill(0);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = this.currentGrid[r][c];
                if (val > 0) counts[val]++;
            }
        }

        this.dom.numButtons.forEach(btn => {
            const num = parseInt(btn.dataset.num, 10);
            if (counts[num] >= 9) {
                btn.classList.add('completed');
            } else {
                btn.classList.remove('completed');
            }
        });
    }

    checkWinCondition() {
        if (this.engine.isCompleteAndValid(this.currentGrid)) {
            this.isGameOver = true;
            this.stopTimer();
            this.sound.win();
            this.confetti.start();

            // Clear saved active state
            localStorage.removeItem('sudoku_saved_state');

            setTimeout(() => {
                const diffNames = {
                    easy: 'Łatwy',
                    normal: 'Normalny',
                    hard: 'Trudny',
                    hell: 'Piekło'
                };
                this.dom.winTime.textContent = this.formatTime(this.timer);
                this.dom.winDiff.textContent = diffNames[this.currentDifficulty];
                if (this.dom.winErrors) {
                    this.dom.winErrors.textContent = this.errors;
                }
                if (this.dom.winMessage) {
                    this.dom.winMessage.textContent = this.errors === 0
                        ? 'Rozwiązałeś całe Sudoku bezbłędnie!'
                        : `Rozwiązałeś całe Sudoku z liczbą błędów: ${this.errors}.`;
                }
                this.dom.winModal.classList.add('active');
            }, 300);
        }
    }

    startTimer(reset = false) {
        this.stopTimer();
        if (reset) this.timer = 0;
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            if (!this.isPaused && !this.isGameOver) {
                this.timer++;
                this.updateTimerDisplay();
                if (this.timer % 5 === 0) {
                    this.saveGameState();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        this.dom.btnPause.textContent = this.isPaused ? '▶️' : '⏸️';
        if (this.isPaused) {
            this.dom.grid.style.filter = 'blur(8px)';
        } else {
            this.dom.grid.style.filter = 'none';
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    updateTimerDisplay() {
        this.dom.timer.textContent = this.formatTime(this.timer);
    }

    updateErrorsDisplay() {
        if (this.dom.errors) {
            this.dom.errors.textContent = this.errors;
        }
    }

    toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        this.dom.btnTheme.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('sudoku_theme', newTheme);
        this.sound.tap();
    }

    loadTheme() {
        const saved = localStorage.getItem('sudoku_theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.dom.btnTheme.textContent = saved === 'dark' ? '☀️' : '🌙';
    }

    toggleSound() {
        this.sound.enabled = !this.sound.enabled;
        this.dom.btnSound.textContent = this.sound.enabled ? '🔊' : '🔇';
    }

    saveGameState() {
        if (this.isGameOver || !this.currentGrid) return;
        const state = {
            currentDifficulty: this.currentDifficulty,
            initialGrid: this.initialGrid,
            currentGrid: this.currentGrid,
            solutionGrid: this.solutionGrid,
            notesGrid: this.notesGrid.map(row => row.map(s => Array.from(s))),
            history: this.history.map(item => ({
                ...item,
                prevNotes: item.prevNotes ? Array.from(item.prevNotes) : undefined,
                newNotes: item.newNotes ? Array.from(item.newNotes) : undefined
            })),
            timer: this.timer,
            errors: this.errors,
            notesMode: this.notesMode,
            selectedRow: this.selectedRow,
            selectedCol: this.selectedCol
        };
        try {
            localStorage.setItem('sudoku_saved_state', JSON.stringify(state));
        } catch (e) {}
    }

    loadGameState() {
        try {
            const raw = localStorage.getItem('sudoku_saved_state');
            if (!raw) return false;
            const state = JSON.parse(raw);

            if (!state ||
                !Array.isArray(state.initialGrid) || state.initialGrid.length !== 9 ||
                !Array.isArray(state.currentGrid) || state.currentGrid.length !== 9 ||
                !Array.isArray(state.solutionGrid) || state.solutionGrid.length !== 9 ||
                !Array.isArray(state.notesGrid) || state.notesGrid.length !== 9) {
                return false;
            }

            this.currentDifficulty = (this.engine.DIFFICULTIES[state.currentDifficulty]) ? state.currentDifficulty : 'easy';
            this.initialGrid = state.initialGrid;
            this.currentGrid = state.currentGrid;
            this.solutionGrid = state.solutionGrid;
            this.notesGrid = state.notesGrid.map(row => row.map(arr => new Set(arr || [])));

            if (Array.isArray(state.history)) {
                this.history = state.history.map(item => ({
                    ...item,
                    prevNotes: item.prevNotes ? new Set(item.prevNotes) : undefined,
                    newNotes: item.newNotes ? new Set(item.newNotes) : undefined
                }));
            } else {
                this.history = [];
            }

            this.timer = typeof state.timer === 'number' && state.timer >= 0 ? state.timer : 0;
            this.errors = typeof state.errors === 'number' && state.errors >= 0 ? state.errors : 0;
            this.notesMode = !!state.notesMode;
            this.dom.btnNote.classList.toggle('active', this.notesMode);

            this.selectedRow = (typeof state.selectedRow === 'number' && state.selectedRow >= 0 && state.selectedRow < 9) ? state.selectedRow : -1;
            this.selectedCol = (typeof state.selectedCol === 'number' && state.selectedCol >= 0 && state.selectedCol < 9) ? state.selectedCol : -1;

            this.isPaused = false;
            this.isGameOver = false;
            this.dom.btnPause.textContent = '⏸️';
            this.dom.grid.style.filter = 'none';

            this.dom.diffButtons.forEach(b => {
                b.classList.toggle('active', b.dataset.diff === this.currentDifficulty);
            });

            this.updateErrorsDisplay();
            this.startTimer(false);
            this.renderBoard();
            return true;
        } catch (e) {
            return false;
        }
    }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sudokuApp = new SudokuApp();
});
