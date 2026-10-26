import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import SudokuEngine from '../engine.js';

describe('SudokuEngine', () => {
    let engine;
    const difficulties = ['easy', 'normal', 'hard', 'hell'];

    beforeEach(() => {
        engine = new SudokuEngine();
    });

    describe('Operacje na siatce (Grid Operations)', () => {
        it('createEmptyGrid() tworzy siatkę 9x9 wypełnioną zerami', () => {
            const grid = engine.createEmptyGrid();
            assert.strictEqual(grid.length, 9);
            for (let r = 0; r < 9; r++) {
                assert.strictEqual(grid[r].length, 9);
                for (let c = 0; c < 9; c++) {
                    assert.strictEqual(grid[r][c], 0);
                }
            }

            // Weryfikacja niezależności referencji wierszy
            grid[0][0] = 7;
            assert.strictEqual(grid[1][0], 0, 'Wiersze muszą być niezależnymi tablicami');
        });

        it('cloneGrid() tworzy głęboką kopię siatki 9x9', () => {
            const original = engine.createEmptyGrid();
            original[3][4] = 9;
            const clone = engine.cloneGrid(original);

            assert.deepStrictEqual(clone, original);
            clone[3][4] = 1;
            assert.strictEqual(original[3][4], 9, 'Modyfikacja klonu nie może zmieniać oryginału');
        });

        it('shuffle() zachowuje elementy tablicy i zwraca poprawną długość', () => {
            const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            const shuffled = engine.shuffle(input);

            assert.strictEqual(shuffled.length, input.length);
            assert.deepStrictEqual([...shuffled].sort(), [...input].sort());
        });
    });

    describe('Reguły poprawności i sprawdzanie konfliktów (Validation & Conflicts)', () => {
        it('isValid() prawidłowo weryfikuje dopuszczalność wstawienia cyfry', () => {
            const grid = engine.createEmptyGrid();
            grid[0][0] = 5;

            // Dozwolone w innym miejscu bez kolizji
            assert.strictEqual(engine.isValid(grid, 1, 1, 5), false, 'Kolizja w tym samym bloku 3x3');
            assert.strictEqual(engine.isValid(grid, 0, 8, 5), false, 'Kolizja w tym samym wierszu');
            assert.strictEqual(engine.isValid(grid, 8, 0, 5), false, 'Kolizja w tej samej kolumnie');
            assert.strictEqual(engine.isValid(grid, 4, 4, 5), true, 'Brak kolizji');
        });

        it('findConflicts() wykrywa konflikty w wierszach, kolumnach i blokach 3x3', () => {
            const testGrid = engine.createEmptyGrid();
            testGrid[0][0] = 5;
            testGrid[0][5] = 5; // Konflikt w wierszu 0
            testGrid[2][0] = 5; // Konflikt w bloku 3x3
            testGrid[7][0] = 5; // Konflikt w kolumnie 0

            const conflicts = engine.findConflicts(testGrid);
            assert.ok(conflicts.has('0,0'), 'Konflikt 0,0 powinien zostać wykryty');
            assert.ok(conflicts.has('0,5'), 'Konflikt 0,5 powinien zostać wykryty');
            assert.ok(conflicts.has('2,0'), 'Konflikt 2,0 powinien zostać wykryty');
            assert.ok(conflicts.has('7,0'), 'Konflikt 7,0 powinien zostać wykryty');
            assert.strictEqual(conflicts.size, 4);
        });

        it('findConflicts() zwraca pusty zbiór dla planszy bez konfliktów', () => {
            const grid = engine.createEmptyGrid();
            grid[0][0] = 1;
            grid[1][3] = 1;
            grid[4][1] = 1;

            const conflicts = engine.findConflicts(grid);
            assert.strictEqual(conflicts.size, 0);
        });
    });

    describe('Rozwiązywanie i zliczanie rozwiązań (Solver & Solution Counter)', () => {
        it('fillGrid() generuje kompletną i poprawną planszę Sudoku', () => {
            const grid = engine.createEmptyGrid();
            const success = engine.fillGrid(grid);

            assert.strictEqual(success, true);
            assert.strictEqual(engine.isCompleteAndValid(grid), true);
        });

        it('countSolutions() zlicza liczbę możliwych rozwiązań', () => {
            const solution = engine.createEmptyGrid();
            engine.fillGrid(solution);

            const countObjSingle = { count: 0 };
            engine.countSolutions(solution, countObjSingle);
            assert.strictEqual(countObjSingle.count, 1, 'Pełna plansza ma dokładnie 1 rozwiązanie');

            // Plansza z usuniętą jedną cyfrą nadal ma 1 unikalne rozwiązanie
            const singleHole = engine.cloneGrid(solution);
            singleHole[0][0] = 0;
            const countObjHole = { count: 0 };
            engine.countSolutions(singleHole, countObjHole);
            assert.strictEqual(countObjHole.count, 1);

            // Nierozwiązywalna plansza
            const invalidGrid = engine.createEmptyGrid();
            for (let i = 0; i < 9; i++) invalidGrid[0][i] = i + 1;
            invalidGrid[1][0] = 2;
            invalidGrid[1][1] = 1;
            invalidGrid[1][2] = 3;
            const countObjInvalid = { count: 0 };
            engine.countSolutions(invalidGrid, countObjInvalid);
            assert.strictEqual(countObjInvalid.count, 0, 'Nierozwiązywalna plansza ma 0 rozwiązań');
        });
    });

    describe('Walidacja kompletności i poprawności (Validation Logic)', () => {
        it('isCompleteAndValid() poprawnie waliduje kompletność planszy', () => {
            const valid = engine.createEmptyGrid();
            engine.fillGrid(valid);
            assert.strictEqual(engine.isCompleteAndValid(valid), true);

            // Niekompletna plansza
            const incomplete = engine.cloneGrid(valid);
            incomplete[0][0] = 0;
            assert.strictEqual(engine.isCompleteAndValid(incomplete), false);

            // Nieprawidłowe typy / dane wejściowe
            assert.strictEqual(engine.isCompleteAndValid(null), false);
            assert.strictEqual(engine.isCompleteAndValid([]), false);
            assert.strictEqual(engine.isCompleteAndValid(Array(9).fill([])), false);

            // Konflikt na planszy
            const conflict = engine.cloneGrid(valid);
            conflict[0][0] = conflict[0][1];
            assert.strictEqual(engine.isCompleteAndValid(conflict), false);
        });

        it('validatePuzzle() akceptuje prawidłowo wygenerowaną planszę', () => {
            const validSample = engine.generateCandidate('normal');
            assert.strictEqual(engine.validatePuzzle(validSample), true);
            assert.strictEqual(engine.isPuzzleValid(validSample), true, 'isPuzzleValid powinien być zgodny z validatePuzzle');
        });

        it('validatePuzzle() odrzuca niepoprawne struktury danych', () => {
            assert.strictEqual(engine.validatePuzzle(null), false);
            assert.strictEqual(engine.validatePuzzle({}), false);
            assert.strictEqual(engine.validatePuzzle({ puzzle: null, solution: null }), false);
            assert.strictEqual(engine.validatePuzzle({ puzzle: [[1]], solution: [[1]] }), false);
        });

        it('validatePuzzle() odrzuca rozwiązanie z konfliktem', () => {
            const sample = engine.generateCandidate('normal');
            const invalidSolution = {
                puzzle: engine.cloneGrid(sample.puzzle),
                solution: engine.cloneGrid(sample.solution),
                difficulty: 'normal'
            };
            invalidSolution.solution[0][0] = invalidSolution.solution[0][1];
            assert.strictEqual(engine.validatePuzzle(invalidSolution), false);
        });

        it('validatePuzzle() odrzuca niekompletne rozwiązanie zawierające 0', () => {
            const sample = engine.generateCandidate('normal');
            const incompleteSolution = {
                puzzle: engine.cloneGrid(sample.puzzle),
                solution: engine.cloneGrid(sample.solution),
                difficulty: 'normal'
            };
            incompleteSolution.solution[0][0] = 0;
            assert.strictEqual(engine.validatePuzzle(incompleteSolution), false);
        });

        it('validatePuzzle() odrzuca planszę początkową zawierającą bezpośredni konflikt', () => {
            const sample = engine.generateCandidate('normal');
            const conflictPuzzle = {
                puzzle: engine.cloneGrid(sample.puzzle),
                solution: engine.cloneGrid(sample.solution),
                difficulty: 'normal'
            };

            let conflictAdded = false;
            for (let r = 0; r < 9 && !conflictAdded; r++) {
                for (let c1 = 0; c1 < 9 && !conflictAdded; c1++) {
                    if (conflictPuzzle.puzzle[r][c1] !== 0) {
                        for (let c2 = 0; c2 < 9; c2++) {
                            if (c1 !== c2 && conflictPuzzle.puzzle[r][c2] === 0) {
                                conflictPuzzle.puzzle[r][c2] = conflictPuzzle.puzzle[r][c1];
                                conflictAdded = true;
                                break;
                            }
                        }
                    }
                }
            }
            assert.strictEqual(engine.validatePuzzle(conflictPuzzle), false);
        });

        it('validatePuzzle() odrzuca planszę ze wskazówką niezgodną z rozwiązaniem', () => {
            const sample = engine.generateCandidate('normal');
            const mismatchPuzzle = {
                puzzle: engine.cloneGrid(sample.puzzle),
                solution: engine.cloneGrid(sample.solution),
                difficulty: 'normal'
            };
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (mismatchPuzzle.puzzle[r][c] !== 0) {
                        mismatchPuzzle.puzzle[r][c] = (mismatchPuzzle.solution[r][c] % 9) + 1;
                        break;
                    }
                }
            }
            assert.strictEqual(engine.validatePuzzle(mismatchPuzzle), false);
        });

        it('validatePuzzle() odrzuca pustą planszę lub planszę ze zbyt małą liczbą wskazówek', () => {
            const sample = engine.generateCandidate('normal');
            const emptyPuzzle = {
                puzzle: engine.createEmptyGrid(),
                solution: engine.cloneGrid(sample.solution),
                difficulty: 'normal'
            };
            assert.strictEqual(engine.validatePuzzle(emptyPuzzle), false);
        });

        it('validatePuzzle() odrzuca nierozwiązywalną planszę', () => {
            const sample = engine.generateCandidate('normal');
            const unsolvableGrid = engine.createEmptyGrid();
            for (let i = 0; i < 9; i++) {
                unsolvableGrid[0][i] = i + 1;
            }
            unsolvableGrid[1][0] = 2;
            unsolvableGrid[1][1] = 1;
            unsolvableGrid[1][2] = 3;

            const unsolvableSample = {
                puzzle: unsolvableGrid,
                solution: sample.solution,
                difficulty: 'normal'
            };
            assert.strictEqual(engine.validatePuzzle(unsolvableSample), false);
        });
    });

    describe('Generowanie plansz i retry (Generation & Retry Mechanism)', () => {
        it('generatePuzzle() ponawia próbę w razie wygenerowania wadliwego kandydata', () => {
            let callCount = 0;
            const originalGenerateCandidate = engine.generateCandidate.bind(engine);
            engine.generateCandidate = function(diff) {
                callCount++;
                if (callCount === 1) {
                    const broken = originalGenerateCandidate(diff);
                    broken.puzzle[0][0] = 0;
                    broken.solution[0][0] = 0;
                    return broken;
                }
                return originalGenerateCandidate(diff);
            };

            const generatedResult = engine.generatePuzzle('normal');
            assert.ok(callCount >= 2, 'generatePuzzle powinien ponowić losowanie po wykryciu wady');
            assert.strictEqual(engine.validatePuzzle(generatedResult), true);

            engine.generateCandidate = originalGenerateCandidate;
        });

        for (const diff of difficulties) {
            it(`generatePuzzle('${diff}') generuje w pełni poprawną planszę i rozwiązanie`, () => {
                const puzzleData = engine.generatePuzzle(diff);

                assert.strictEqual(puzzleData.difficulty, diff);
                assert.strictEqual(engine.validatePuzzle(puzzleData), true, 'Plansza musi przejść validatePuzzle');
                assert.strictEqual(engine.isCompleteAndValid(puzzleData.solution), true, 'Rozwiązanie musi być kompletne i bez konfliktów');
                assert.strictEqual(engine.findConflicts(puzzleData.puzzle).size, 0, 'Siatka startowa nie może mieć konfliktów');

                // Weryfikacja unikalności 1-9 w wierszach rozwiązania
                for (let r = 0; r < 9; r++) {
                    const rowSet = new Set(puzzleData.solution[r]);
                    assert.strictEqual(rowSet.size, 9, `Wiersz ${r} musi mieć 9 unikalnych cyfr`);
                    assert.strictEqual(rowSet.has(0), false);
                }

                // Weryfikacja unikalności 1-9 w kolumnach rozwiązania
                for (let c = 0; c < 9; c++) {
                    const colSet = new Set(puzzleData.solution.map(row => row[c]));
                    assert.strictEqual(colSet.size, 9, `Kolumna ${c} musi mieć 9 unikalnych cyfr`);
                    assert.strictEqual(colSet.has(0), false);
                }

                // Weryfikacja unikalności 1-9 w blokach 3x3 rozwiązania
                for (let br = 0; br < 3; br++) {
                    for (let bc = 0; bc < 3; bc++) {
                        const boxSet = new Set();
                        for (let r = 0; r < 3; r++) {
                            for (let c = 0; c < 3; c++) {
                                boxSet.add(puzzleData.solution[br * 3 + r][bc * 3 + c]);
                            }
                        }
                        assert.strictEqual(boxSet.size, 9, `Blok (${br},${bc}) musi mieć 9 unikalnych cyfr`);
                        assert.strictEqual(boxSet.has(0), false);
                    }
                }
            });
        }

        it('Masowe generowanie plansz zachowuje 100% poprawność dla wszystkich poziomów', () => {
            const countPerDiff = 5;
            for (const diff of difficulties) {
                for (let i = 0; i < countPerDiff; i++) {
                    const puzzleData = engine.generatePuzzle(diff);
                    assert.strictEqual(engine.validatePuzzle(puzzleData), true);
                    assert.strictEqual(engine.isCompleteAndValid(puzzleData.solution), true);
                }
            }
        });
    });
});
