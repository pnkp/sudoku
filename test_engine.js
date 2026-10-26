const SudokuEngine = require('./engine.js');

const engine = new SudokuEngine();
const difficulties = ['easy', 'normal', 'hard', 'hell'];

console.log('=== TESTY SILNIKA SUDOKU ===');

// 1. Testy poprawności reguł sprawdzania konfliktów i poprawności
console.log('1. Testy reguł walidacji (wiersze, kolumny, bloki 3x3)...');
const testGrid = engine.createEmptyGrid();
testGrid[0][0] = 5;
testGrid[0][5] = 5; // Konflikt w wierszu 0
testGrid[2][0] = 5; // Konflikt w bloku 3x3
testGrid[7][0] = 5; // Konflikt w kolumnie 0

const conflicts = engine.findConflicts(testGrid);
if (!conflicts.has('0,0') || !conflicts.has('0,5') || !conflicts.has('2,0') || !conflicts.has('7,0')) {
    console.error('BŁĄD: findConflicts nie wykrył wszystkich konfliktów!');
    process.exit(1);
}

// 2. Testy generowania wielu plansz dla każdego poziomu trudności
console.log('2. Testy generowania plansz (po 10 dla każdego poziomu)...');
for (const diff of difficulties) {
    for (let i = 0; i < 10; i++) {
        const start = Date.now();
        const puzzleData = engine.generatePuzzle(diff);
        const duration = Date.now() - start;

        // Sprawdź czy rozwiązanie jest pełne i poprawne
        if (!engine.isCompleteAndValid(puzzleData.solution)) {
            console.error(`BŁĄD: Rozwiązanie dla ${diff} (próba ${i + 1}) nie jest poprawne!`);
            process.exit(1);
        }

        // Sprawdź czy puzzle nie zawiera żadnych konfliktów
        const puzzleConflicts = engine.findConflicts(puzzleData.puzzle);
        if (puzzleConflicts.size > 0) {
            console.error(`BŁĄD: Nowo wygenerowana plansza ${diff} (próba ${i + 1}) zawiera konflikty!`);
            process.exit(1);
        }

        // Sprawdź unikalność cyfr 1-9 w każdym wierszu, kolumnie i bloku rozwiązania
        for (let r = 0; r < 9; r++) {
            const rowSet = new Set(puzzleData.solution[r]);
            if (rowSet.size !== 9 || rowSet.has(0)) {
                console.error(`BŁĄD: Wiersz ${r} w rozwiązaniu nie zawiera unikalnych cyfr 1-9!`);
                process.exit(1);
            }
        }
        for (let c = 0; c < 9; c++) {
            const colSet = new Set(puzzleData.solution.map(row => row[c]));
            if (colSet.size !== 9 || colSet.has(0)) {
                console.error(`BŁĄD: Kolumna ${c} w rozwiązaniu nie zawiera unikalnych cyfr 1-9!`);
                process.exit(1);
            }
        }
        for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
                const boxSet = new Set();
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        boxSet.add(puzzleData.solution[br * 3 + r][bc * 3 + c]);
                    }
                }
                if (boxSet.size !== 9 || boxSet.has(0)) {
                    console.error(`BŁĄD: Blok (${br},${bc}) w rozwiązaniu nie zawiera unikalnych cyfr 1-9!`);
                    process.exit(1);
                }
            }
        }
    }
    console.log(`- Poziom ${diff.toUpperCase()}: 10/10 plansz wygenerowanych i zweryfikowanych pomyślnie.`);
}

console.log('Wszystkie testy silnika przeszły pomyślnie!');
