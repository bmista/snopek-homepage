# Blog (Contentful → statyczne HTML)

## Jak to działa

1. Wpis powstaje w **Contentful** (typ treści, domyślnie ID: `blogPost`).
2. Przy deployu na **Vercel** uruchamiane jest `npm run build`, które pobiera opublikowane wpisy i zapisuje:
   - `blog/index.html` — lista wpisów,
   - `blog/<slug>/index.html` — każdy wpis.
3. `sitemap.xml` jest uzupełniany o URL-e bloga (między znacznikami `BLOG_URLS`).

## Oczekiwane pola w typie „Blog Post”

| ID pola (Contentful) | Typ | Wymagane |
|----------------------|-----|----------|
| `title` | Krótki tekst | tak |
| `slug` | Krótki tekst | tak (np. `pierwszy-wpis`) |
| `body` | Rich text | tak |
| `seoDescription` | Długi tekst | nie (meta description) |
| `featuredImage` | Media (jeden plik) | nie |
| `publishDate` | Data i czas | nie (sortowanie i data na stronie) |

Jeśli w Contentful masz **inne ID pól** (np. `content` zamiast `body`), edytuj mapę `F` w pliku `scripts/build-blog.mjs`.

Jeśli **ID typu treści** nie jest `blogPost`: w Vercel ustaw `CONTENTFUL_CONTENT_TYPE_ID` (wartość z *Content model → Blog Post → API Identifier*).

## Zmienne środowiskowe (Vercel)

W **Project → Settings → Environment Variables** dodaj:

- `CONTENTFUL_SPACE_ID` — Settings → General → Space ID  
- `CONTENTFUL_ACCESS_TOKEN` — Content Delivery API (tylko odczyt, **Preview** nie jest potrzebny do produkcji)

Opcjonalnie: `SITE_URL` (domyślnie `https://snopek-koparka.pl`), `CONTENTFUL_ENVIRONMENT` (domyślnie `master`).

### Test lokalny (krok po kroku)

1. W Contentful: **Settings → API keys** — skopiuj **Space ID** oraz token **Content Delivery API** (nie Preview, nie Management).
2. W katalogu projektu plik `.env` (możesz skopiować `.env.example` → `.env`) z treścią:
   ```env
   CONTENTFUL_SPACE_ID=twoj_space_id
   CONTENTFUL_ACCESS_TOKEN=twoj_token_delivery
   ```
   Bez cudzysłowów i bez spacji wokół `=`.
3. W terminalu:
   ```bash
   npm install
   npm run build
   ```
4. Jeśli build się uda, zobaczysz logi `Zapisano: /blog/...`. Podgląd statycznej strony:
   ```bash
   npm run serve
   ```
   Otwórz w przeglądarce [http://localhost:3000/blog/](http://localhost:3000/blog/) (lista) i konkretny wpis pod `/blog/<slug>/`.

Jeśli `npm run build` kończy się komunikatem o braku `CONTENTFUL_*`, plik `.env` jest pusty albo nie leży w **głównym folderze** projektu (tam gdzie `package.json`).

## Po dodaniu wpisu

Commit i push uruchomią build na Vercelu — nowe strony pojawią się po deployu.
