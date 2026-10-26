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

// 2. Testy validatePuzzle (test poprawności planszy przed oddaniem do gry)
console.log('2. Testy validatePuzzle (walidacja poprawności plansz)...');
const validSample = engine.generateCandidate('normal');
if (!engine.validatePuzzle(validSample)) {
    console.error('BŁĄD: Prawidłowa plansza została odrzucona przez validatePuzzle!');
    process.exit(1);
}

// 2.1. Test: plansza z błędem w rozwiązaniu (np. konflikt)
const invalidSolutionSample = {
    puzzle: engine.cloneGrid(validSample.puzzle),
    solution: engine.cloneGrid(validSample.solution),
    difficulty: 'normal'
};
invalidSolutionSample.solution[0][0] = invalidSolutionSample.solution[0][1]; // Wprowadź konflikt w wierszu 0
if (engine.validatePuzzle(invalidSolutionSample)) {
    console.error('BŁĄD: validatePuzzle zaakceptował rozwiązanie z konfliktem!');
    process.exit(1);
}

// 2.2. Test: plansza z niekompletnym rozwiązaniem (zawiera 0)
const incompleteSolutionSample = {
    puzzle: engine.cloneGrid(validSample.puzzle),
    solution: engine.cloneGrid(validSample.solution),
    difficulty: 'normal'
};
incompleteSolutionSample.solution[0][0] = 0;
if (engine.validatePuzzle(incompleteSolutionSample)) {
    console.error('BŁĄD: validatePuzzle zaakceptował niekompletne rozwiązanie z zerem!');
    process.exit(1);
}

// 2.3. Test: początkowa plansza z bezpośrednim konfliktem
const conflictPuzzleSample = {
    puzzle: engine.cloneGrid(validSample.puzzle),
    solution: engine.cloneGrid(validSample.solution),
    difficulty: 'normal'
};
// Znajdź puste pole w wierszu, gdzie jest już jakaś cyfra i wstaw powtórkę
let conflictAdded = false;
for (let r = 0; r < 9 && !conflictAdded; r++) {
    for (let c1 = 0; c1 < 9 && !conflictAdded; c1++) {
        if (conflictPuzzleSample.puzzle[r][c1] !== 0) {
            for (let c2 = 0; c2 < 9; c2++) {
                if (c1 !== c2 && conflictPuzzleSample.puzzle[r][c2] === 0) {
                    conflictPuzzleSample.puzzle[r][c2] = conflictPuzzleSample.puzzle[r][c1];
                    conflictAdded = true;
                    break;
                }
            }
        }
    }
}
if (engine.validatePuzzle(conflictPuzzleSample)) {
    console.error('BŁĄD: validatePuzzle zaakceptował planszę startową z konfliktem!');
    process.exit(1);
}

// 2.4. Test: cyfra na planszy początkowej niezgodna z rozwiązaniem
const mismatchPuzzleSample = {
    puzzle: engine.cloneGrid(validSample.puzzle),
    solution: engine.cloneGrid(validSample.solution),
    difficulty: 'normal'
};
for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
        if (mismatchPuzzleSample.puzzle[r][c] !== 0) {
            // Zmień cyfrę na inną niż w rozwiązaniu
            mismatchPuzzleSample.puzzle[r][c] = (mismatchPuzzleSample.solution[r][c] % 9) + 1;
            break;
        }
    }
}
if (engine.validatePuzzle(mismatchPuzzleSample)) {
    console.error('BŁĄD: validatePuzzle zaakceptował planszę ze wskazówką niezgodną z rozwiązaniem!');
    process.exit(1);
}

// 2.5. Test: pusta plansza lub zbyt mało wskazówek
const emptyPuzzleSample = {
    puzzle: engine.createEmptyGrid(),
    solution: engine.cloneGrid(validSample.solution),
    difficulty: 'normal'
};
if (engine.validatePuzzle(emptyPuzzleSample)) {
    console.error('BŁĄD: validatePuzzle zaakceptował pustą planszę!');
    process.exit(1);
}

// 2.6. Test: plansza nierozwiązywalna (sprzeczne reguły uniemożliwiające rozwiązanie)
const unsolvableGrid = engine.createEmptyGrid();
// Wstawienie wzajemnie blokujących się cyfr
for (let i = 0; i < 9; i++) {
    unsolvableGrid[0][i] = i + 1;
}
unsolvableGrid[1][0] = 2;
unsolvableGrid[1][1] = 1;
unsolvableGrid[1][2] = 3;
const unsolvableSample = {
    puzzle: unsolvableGrid,
    solution: validSample.solution,
    difficulty: 'normal'
};
if (engine.validatePuzzle(unsolvableSample)) {
    console.error('BŁĄD: validatePuzzle zaakceptował nierozwiązywalną planszę!');
    process.exit(1);
}

console.log('Walidacja validatePuzzle zakończona sukcesem!');

// 3. Test mechanizmu ponownego losowania (retry) przy wykryciu niepoprawnej planszy
console.log('3. Test ponownego losowania (retry) w generatePuzzle...');
let callCount = 0;
const originalGenerateCandidate = engine.generateCandidate.bind(engine);
engine.generateCandidate = function(diff) {
    callCount++;
    if (callCount === 1) {
        // Zwróć nieprawidłową planszę za pierwszym razem
        const broken = originalGenerateCandidate(diff);
        broken.puzzle[0][0] = 0;
        broken.solution[0][0] = 0; // Uszkodzone rozwiązanie
        return broken;
    }
    // Za drugim razem zwróć prawidłową planszę
    return originalGenerateCandidate(diff);
};

const generatedResult = engine.generatePuzzle('normal');
if (callCount < 2) {
    console.error('BŁĄD: generatePuzzle nie ponowił losowania po wygenerowaniu wadliwej planszy!');
    process.exit(1);
}
if (!engine.validatePuzzle(generatedResult)) {
    console.error('BŁĄD: generatePuzzle po ponowieniu zwrócił nieprawidłową planszę!');
    process.exit(1);
}
// Przywróć oryginalną metodę
engine.generateCandidate = originalGenerateCandidate;
console.log('Test ponownego losowania zdany (plansza wylosowana ponownie i zweryfikowana).');

// 4. Testy generowania wielu plansz dla każdego poziomu trudności (weryfikacja automatycznej poprawności)
console.log('4. Testy masowego generowania plansz (po 10 dla każdego poziomu)...');
for (const diff of difficulties) {
    for (let i = 0; i < 10; i++) {
        const start = Date.now();
        const puzzleData = engine.generatePuzzle(diff);
        const duration = Date.now() - start;

        // Sprawdź czy plansza spełnia pełny test poprawności validatePuzzle
        if (!engine.validatePuzzle(puzzleData)) {
            console.error(`BŁĄD: Wygenerowana plansza dla ${diff} (próba ${i + 1}) nie przeszła validatePuzzle!`);
            process.exit(1);
        }

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
