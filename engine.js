/**
 * Sudoku Core Engine
 * Generowanie plansz, sprawdzanie poprawności, rozwiązywanie backtrackingiem.
 */

class SudokuEngine {
    constructor() {
        this.DIFFICULTIES = {
            easy: { name: 'Łatwy', clues: 42 },
            normal: { name: 'Normalny', clues: 32 },
            hard: { name: 'Trudny', clues: 26 },
            hell: { name: 'Piekło', clues: 21 }
        };
    }

    createEmptyGrid() {
        return Array.from({ length: 9 }, () => Array(9).fill(0));
    }

    cloneGrid(grid) {
        return grid.map(row => [...row]);
    }

    isValid(grid, row, col, num) {
        for (let i = 0; i < 9; i++) {
            if (grid[row][i] === num && i !== col) return false;
            if (grid[i][col] === num && i !== row) return false;
        }

        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const curRow = startRow + r;
                const curCol = startCol + c;
                if (grid[curRow][curCol] === num && (curRow !== row || curCol !== col)) {
                    return false;
                }
            }
        }
        return true;
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    fillGrid(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (const num of numbers) {
                        if (this.isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            if (this.fillGrid(grid)) return true;
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    countSolutions(grid, countObj = { count: 0 }) {
        let emptySpot = null;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    emptySpot = [r, c];
                    break;
                }
            }
            if (emptySpot) break;
        }

        if (!emptySpot) {
            countObj.count++;
            return;
        }

        const [row, col] = emptySpot;
        for (let num = 1; num <= 9; num++) {
            if (this.isValid(grid, row, col, num)) {
                grid[row][col] = num;
                this.countSolutions(grid, countObj);
                grid[row][col] = 0;
                if (countObj.count >= 2) return;
            }
        }
    }

    generateCandidate(difficultyKey = 'normal') {
        const targetClues = this.DIFFICULTIES[difficultyKey]?.clues || 32;
        const solution = this.createEmptyGrid();
        this.fillGrid(solution);

        const puzzle = this.cloneGrid(solution);
        const cells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                cells.push([r, c]);
            }
        }
        const shuffledCells = this.shuffle(cells);

        let currentClues = 81;

        for (const [r, c] of shuffledCells) {
            if (currentClues <= targetClues) break;

            const backup = puzzle[r][c];
            puzzle[r][c] = 0;

            const testGrid = this.cloneGrid(puzzle);
            const countObj = { count: 0 };
            this.countSolutions(testGrid, countObj);

            // W 'piekło' dopuszczamy minimalnie szybszą redukcję, dla reszty wymuszamy 1 unikalne rozwiązanie
            if (countObj.count !== 1 && difficultyKey !== 'hell') {
                puzzle[r][c] = backup;
            } else if (countObj.count === 0) {
                puzzle[r][c] = backup;
            } else {
                currentClues--;
            }
        }

        return {
            puzzle,
            solution,
            initialClues: currentClues,
            difficulty: difficultyKey
        };
    }

    generatePuzzle(difficultyKey = 'normal') {
        const maxAttempts = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidate = this.generateCandidate(difficultyKey);
            // Test poprawności wygenerowanej planszy przed jej zwróceniem
            if (this.validatePuzzle(candidate)) {
                return candidate;
            }
        }

        // W razie potrzeby ponawiaj losowanie aż do uzyskania w 100% poprawnej planszy
        while (true) {
            const candidate = this.generateCandidate(difficultyKey);
            if (this.validatePuzzle(candidate)) {
                return candidate;
            }
        }
    }

    findConflicts(grid) {
        const conflicts = new Set();

        // Rows and cols
        for (let i = 0; i < 9; i++) {
            const rowMap = new Map();
            const colMap = new Map();
            for (let j = 0; j < 9; j++) {
                const rVal = grid[i][j];
                if (rVal !== 0) {
                    if (!rowMap.has(rVal)) rowMap.set(rVal, []);
                    rowMap.get(rVal).push(`${i},${j}`);
                }

                const cVal = grid[j][i];
                if (cVal !== 0) {
                    if (!colMap.has(cVal)) colMap.set(cVal, []);
                    colMap.get(cVal).push(`${j},${i}`);
                }
            }

            for (const list of rowMap.values()) {
                if (list.length > 1) list.forEach(coord => conflicts.add(coord));
            }
            for (const list of colMap.values()) {
                if (list.length > 1) list.forEach(coord => conflicts.add(coord));
            }
        }

        // 3x3 Boxes
        for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
                const boxMap = new Map();
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        const row = br * 3 + r;
                        const col = bc * 3 + c;
                        const val = grid[row][col];
                        if (val !== 0) {
                            if (!boxMap.has(val)) boxMap.set(val, []);
                            boxMap.get(val).push(`${row},${col}`);
                        }
                    }
                }
                for (const list of boxMap.values()) {
                    if (list.length > 1) list.forEach(coord => conflicts.add(coord));
                }
            }
        }

        return conflicts;
    }

    isCompleteAndValid(grid) {
        if (!grid || !Array.isArray(grid) || grid.length !== 9) return false;
        for (let r = 0; r < 9; r++) {
            if (!Array.isArray(grid[r]) || grid[r].length !== 9) return false;
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c];
                if (typeof val !== 'number' || val < 1 || val > 9) return false;
            }
        }
        return this.findConflicts(grid).size === 0;
    }

    validatePuzzle(puzzleData) {
        if (!puzzleData || typeof puzzleData !== 'object') return false;
        const { puzzle, solution, difficulty } = puzzleData;

        if (!puzzle || !Array.isArray(puzzle) || puzzle.length !== 9) return false;
        if (!solution || !Array.isArray(solution) || solution.length !== 9) return false;

        for (let r = 0; r < 9; r++) {
            if (!Array.isArray(puzzle[r]) || puzzle[r].length !== 9) return false;
            if (!Array.isArray(solution[r]) || solution[r].length !== 9) return false;
        }

        // 1. Sprawdzenie rozwiązania: musi być kompletne, z cyframi 1-9 i bez żadnych konfliktów
        if (!this.isCompleteAndValid(solution)) {
            return false;
        }

        // 2. Sprawdzenie początkowej planszy: nie może zawierać bezpośrednich konfliktów
        if (this.findConflicts(puzzle).size > 0) {
            return false;
        }

        // 3. Sprawdzenie spójności początkowych cyfr z rozwiązaniem
        let clueCount = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = puzzle[r][c];
                if (typeof val !== 'number' || val < 0 || val > 9) return false;
                if (val !== 0) {
                    if (val !== solution[r][c]) return false;
                    clueCount++;
                }
            }
        }

        // Liczba wskazówek musi być w prawidłowym zakresie
        if (clueCount < 17 || clueCount > 80) {
            return false;
        }

        // 4. Test rozwiązywalności i jednoznaczności za pomocą algorytmu rozwiązywania
        const testGrid = this.cloneGrid(puzzle);
        const countObj = { count: 0 };
        this.countSolutions(testGrid, countObj);

        // Plansza musi mieć co najmniej 1 rozwiązanie
        if (countObj.count === 0) {
            return false;
        }

        // Dla poziomów easy/normal/hard (oraz domyślnie) plansza musi mieć dokładnie 1 unikalne rozwiązanie
        if (difficulty !== 'hell' && countObj.count !== 1) {
            return false;
        }

        return true;
    }

    isPuzzleValid(puzzleData) {
        return this.validatePuzzle(puzzleData);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SudokuEngine;
}
