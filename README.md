# Sudoku Mobile & Web

Nowoczesna, zoptymalizowana pod urządzenia mobilne gra Sudoku w czystym JavaScript (HTML5/CSS3/ES6+).

## 🚀 Poziomy trudności
- **Łatwy** – idealny na szybką, relaksującą rozgrywkę
- **Normalny** – zbalansowany poziom logiczny
- **Trudny** – wymaga zaawansowanych technik eliminacji
- **Piekło** – ekstremalne wyzwanie dla mistrzów Sudoku

## ✨ Główne funkcje
- **Mobile-First UX**: Idealne dopasowanie do ekranów dotykowych, ergonomiczny numpad, brak niepożądanego zoomu.
- **Tryb notatek (ołówek)**: Wpisywanie kandydatów w komórkach 3x3 z automatycznym czyszczeniem.
- **Wielopoziomowe cofanie (Undo)**: Pełna historia ruchów i notatek.
- **System podpowiedzi**: Pomoc w zaciętych momentach.
- **Wykrywanie błędów**: Podświetlanie konfliktów w wierszach, kolumnach i kwadratach 3x3.
- **Podświetlanie powiązanych pól i liczb**: Zmniejsza zmęczenie wzroku i przyspiesza analizę.
- **Dźwięk i wibracje**: Web Audio API i Vibration API (z opcją wyciszenia).
- **Tryb ciemny / jasny**: Przełącznik motywu z zapisem w pamięci.
- **Automatyczny zapis (LocalStorage)**: Stan gry i czas nie przepadają po odświeżeniu strony.
- **Efekty wygranej**: Animacja konfetti, statystyki czasu i poziomu.

## 🌐 Wdrożenie na GitHub Pages

### Metoda 1: Automatyczna (GitHub Actions)
Repozytorium zawiera gotowy workflow `.github/workflows/deploy.yml`.
1. Prześlij kod do repozytorium GitHub na gałąź `main`.
2. Wejdź w repozytorium w **Settings** -> **Pages**.
3. W sekcji **Build and deployment** wybierz **Source**: `GitHub Actions`.
4. Strona zostanie automatycznie opublikowana.

### Metoda 2: Bezpośrednio z gałęzi
1. Wejdź w **Settings** -> **Pages**.
2. W sekcji **Build and deployment** wybierz **Source**: `Deploy from a branch`.
3. Wybierz gałąź `main` (lub `master`) oraz katalog `/ (root)`.
4. Kliknij **Save**. Strona będzie dostępna pod adresem: `https://<twoj-login>.github.io/<nazwa-repozytorium>/`.

## 💻 Uruchomienie lokalne
Wystarczy otworzyć plik `index.html` w dowolnej przeglądarce internetowej lub uruchomić prosty serwer HTTP:
```bash
npx serve .
```
