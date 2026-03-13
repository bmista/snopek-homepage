# GitHub + Vercel – przewodnik krok po kroku

Ten przewodnik pokazuje, jak wrzucić stronę na Vercel z użyciem GitHub. Po konfiguracji każdy `git push` automatycznie aktualizuje stronę.

---

## Część 1: GitHub

### Krok 1: Załóż konto na GitHub (jeśli nie masz)

1. Wejdź na [github.com](https://github.com)
2. Kliknij **Sign up**
3. Wypełnij formularz i potwierdź e-mail

### Krok 2: Utwórz nowe repozytorium

1. Zaloguj się na GitHub
2. Kliknij zielony przycisk **New** (lub ikonę „+” → **New repository**)
3. Ustawienia:
   - **Repository name:** `snopek-strona` (lub inna nazwa)
   - **Description:** opcjonalnie, np. „Strona firmy Snopek Sylwester”
   - **Public**
   - **Nie zaznaczaj** „Add a README file” – folder jest już niepusty
   - **Add .gitignore:** opcjonalnie
   - **License:** opcjonalnie
4. Kliknij **Create repository**

### Krok 3: Wgraj pliki z komputera do repozytorium

Otwórz terminal (np. w Cursorze lub Terminal.app) i przejdź do folderu projektu:

```bash
cd /Users/bmista/Documents/cursor/snopek
```

Następnie wykonaj:

```bash
# 1. Inicjalizacja repozytorium Git (jeśli jeszcze nie ma)
git init

# 2. Dodanie plików (.gitignore pomija .venv i zbędne pliki)
git add .

# 3. Pierwszy commit
git commit -m "Strona Snopek - wersja początkowa"

# 4. Nazwa gałęzi
git branch -M main

# 5. Połączenie z repozytorium na GitHub
# Zamień TWOJ_LOGIN na swoją nazwę użytkownika GitHub!
git remote add origin https://github.com/TWOJ_LOGIN/snopek-strona.git

# 6. Wysłanie plików na GitHub
git push -u origin main
```

**Uwaga:** Przy `git push` GitHub poprosi o logowanie. Możesz:
- użyć hasła (jeśli masz włączone 2FA, potrzebny jest Personal Access Token zamiast hasła),
- albo użyć GitHub Desktop (ściągnij z [desktop.github.com](https://desktop.github.com)) i zamiast terminala zrobić to przez interfejs.

---

## Część 2: Vercel

### Krok 4: Załóż konto na Vercel i zaloguj się przez GitHub

1. Wejdź na [vercel.com](https://vercel.com)
2. Kliknij **Sign Up**
3. Wybierz **Continue with GitHub**
4. Zaloguj się na GitHub i zaakceptuj uprawnienia dla Vercel

### Krok 5: Zaimportuj projekt

1. Na stronie głównej Vercel kliknij **Add New…** → **Project**
2. Z listy repozytoriów znajdź **snopek-strona** (lub inną nazwę repo)
3. Kliknij **Import** przy tym repozytorium

### Krok 6: Ustawienia projektu

1. **Project Name:** możesz zostawić domyślną nazwę (np. `snopek-strona`)
2. **Framework Preset:** **Other** (Vercel wykryje statyczną stronę)
3. **Root Directory:** zostaw puste (pliki są w głównym katalogu repo)
4. **Build and Output Settings:** domyślne – wystarczą
5. Kliknij **Deploy**

### Krok 7: Odczekaj na wdrożenie

- Vercel zbuduje i opublikuje stronę (zwykle ok. 30 sekund)
- Na końcu zobaczysz adres, np. `https://snopek-strona.vercel.app`

---

## Część 3: Aktualizacje strony

### Jak aktualizować stronę po zmianach w plikach

1. Wprowadź zmiany w plikach (np. `index.html`, `styles.css`)
2. W terminalu w folderze projektu:

```bash
git add .
git commit -m "Opis zmian - np. zmiana numeru telefonu"
git push
```

3. Vercel sam wykryje `git push` i odświeży stronę (zwykle w ok. 1–2 minuty)

---

## Podsumowanie – co trzeba zrobić

| Krok | Gdzie | Akcja |
|------|--------|--------|
| 1 | GitHub | Utworzenie repozytorium `snopek-strona` |
| 2 | Terminal | `git init`, `git add`, `git commit`, `git push` |
| 3 | Vercel | Logowanie przez GitHub |
| 4 | Vercel | Import projektu → Deploy |
| 5 | Vercel | Sprawdzenie adresu strony |

---

## Opcjonalnie: własna domena

1. W Vercel: projekt → **Settings** → **Domains**
2. Dodaj np. `snopek.pl`
3. Vercel wskaże, jakie rekordy DNS ustawić u rejestratora domeny

---

## Problemy

**„git: command not found”**  
- Zainstaluj Git: [git-scm.com](https://git-scm.com)

**„Permission denied” przy git push**  
- Upewnij się, że jesteś zalogowany na GitHub i masz uprawnienia do repo (np. jesteś jego właścicielem)

**Strona jest pusta / 404**  
- Sprawdź, czy `index.html` jest w głównym folderze repozytorium (Root Directory w Vercel powinno być puste)
