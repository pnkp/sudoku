const SudokuEngine = require('./engine.js');

const engine = new SudokuEngine();
const difficulties = ['easy', 'normal', 'hard', 'hell'];

console.log('=== TESTY SILNIKA SUDOKU ===');

for (const diff of difficulties) {
    const start = Date.now();
    const puzzleData = engine.generatePuzzle(diff);
    const duration = Date.now() - start;

    console.log(`[${diff.toUpperCase()}] Wskazówki: ${puzzleData.initialClues}, Czas: ${duration}ms`);

    // Sprawdź czy rozwiązanie jest pełne i poprawne
    if (!engine.isCompleteAndValid(puzzleData.solution)) {
        console.error(`BŁĄD: Rozwiązanie dla ${diff} nie jest poprawne!`);
        process.exit(1);
    }

    // Sprawdź czy puzzle ma poprawne konflikty (brak)
    const conflicts = engine.findConflicts(puzzleData.puzzle);
    if (conflicts.size > 0) {
        console.error(`BŁĄD: Nowo wygenerowana plansza ${diff} zawiera konflikty!`);
        process.exit(1);
    }
}

console.log('Wszystkie testy silnika przeszły pomyślnie!');
