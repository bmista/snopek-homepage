# Blog (Contentful → statyczne HTML)

## Jak to działa

1. Wpis powstaje w **Contentful** (typ treści, domyślnie ID: `blogPost`).
2. Przy deployu na **Vercel** uruchamiane jest `npm run build`, które pobiera opublikowane wpisy i zapisuje:
   - `blog/index.html` — lista wpisów,
   - `blog/<slug>/index.html` — każdy wpis.
3. `sitemap.xml` jest uzupełniany o URL-e bloga (między znacznikami `BLOG_URLS`).

Folder `blog/` jest w `.gitignore` — HTML powstaje przy buildzie na Vercelu (albo lokalnie po `npm run build`), a nie jest commitowany do repozytorium.

---

## Konfiguracja Vercel

### Repozytorium i build

- Projekt powinien być **połączony z GitHubem** (import repozytorium lub podpięcie istniejącego).
- W katalogu głównym leży `vercel.json` z m.in.:
  - `installCommand`: `npm install`
  - `buildCommand`: `npm run build` (uruchamia `scripts/build-blog.mjs`)
  - `outputDirectory`: `.` — strona statyczna leży w **korzeniu** projektu (`index.html`, `styles.css`, `assets/`, po buildzie `blog/`), a nie w domyślnym folderze `public`.

Jeśli w panelu Vercela (Settings → General) ręcznie ustawiono **Output Directory**, powinno być zgodne z powyższym (`.` lub puste, żeby nie nadpisywać `vercel.json`).

### Zmienne środowiskowe

W **Project → Settings → Environment Variables** dodaj (dla **Production** i ewentualnie **Preview**):

| Zmienna | Skąd wziąć |
|---------|-----------|
| `CONTENTFUL_SPACE_ID` | Contentful: **Settings → General settings → Space ID** |
| `CONTENTFUL_ACCESS_TOKEN` | Contentful: **Settings → API keys** — token **Content Delivery API** (tylko odczyt opublikowanych treści; **Preview** i **Management** do tego buildu nie są potrzebne) |

Opcjonalnie:

- `SITE_URL` — np. `https://snopek-koparka.pl` (domyślnie skrypt i tak używa tej domeny w kanonicznych URL-ach).
- `CONTENTFUL_ENVIRONMENT` — domyślnie `master`, jeśli używasz innego środowiska w Contentful.
- `CONTENTFUL_CONTENT_TYPE_ID` — domyślnie `blogPost`; ustaw, jeśli **API identifier** typu treści w Contentful jest inny.

Bez `CONTENTFUL_*` build się nie powiedzie — Vercel nie ma skąd pobrać treści.

### Deploy Hooks (automatyczny deploy po publikacji w CMS)

**Deploy Hooks** to unikalny URL, który po żądaniu **POST** (lub GET) uruchamia nowy deploy z ostatniego commita na wybranym branchu. Są dostępne na planie **Hobby (darmowym)** — limit **5 hooków na projekt** (to samo co na Pro w dokumentacji).

Konfiguracja:

1. Vercel: **Project → Settings → Git**.
2. Sekcja **Deploy Hooks** → utwórz hook (np. nazwa `contentful-blog`, branch `main`).
3. Skopiuj wygenerowany **URL** i wklej go w Contentful jako adres webhooka (patrz niżej).

To **nie** jest to samo co ogólne „Webhooks” w innych miejscach (np. powiadomienia wychodzące z Vercela) — tam mogą obowiązywać inne plany. Do integracji z Contentful potrzebny jest wyłącznie **Deploy Hook** w **Settings → Git**.

---

## Konfiguracja Contentful

### Space, model treści, klucze API

- **Space** — wybrany projekt w [app.contentful.com](https://app.contentful.com).
- **Content model** — typ np. „Blog Post” z polami opisanymi w tabeli poniżej; **API identifier** typu (np. `blogPost`) musi zgadzać się ze skryptem lub ze zmienną `CONTENTFUL_CONTENT_TYPE_ID`.
- **API keys**: **Settings → API keys** — **Space ID** oraz token **Content Delivery API** (te same wartości co w zmiennych Vercela i w lokalnym `.env`).

### Webhook → Vercel (opcjonalnie, zalecane)

Żeby **każda publikacja wpisu** od razu przebudowywała stronę **bez** ręcznego pusha na GitHub:

1. Contentful: **Settings → Webhooks** → **Add webhook**.
2. **URL**: wklej URL **Deploy Hooka** z Vercela (patrz wyżej).
3. **Triggers** (zdarzenia wpisu):
   - **Entry → Publish**
   - **Entry → Unpublish**
   - **Entry → Delete**  
   Dzięki temu strona przebuduje się też po cofnięciu publikacji lub usunięciu wpisu.
4. **Filters** (ograniczenie do bloga):
   - **Content type ID** = `blogPost` (dokładnie ten sam identyfikator API co typ „Blog Post” w modelu treści).

Zapisz webhook. Po każdym z powyższych zdarzeniach na wpisie typu `blogPost` Contentful wyśle żądanie do Vercela i wystartuje build z `npm run build`.

---

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

Jeśli **ID typu treści** nie jest `blogPost`: ustaw `CONTENTFUL_CONTENT_TYPE_ID` w Vercelu (wartość z *Content model → Blog Post → API Identifier*).

---

## Test lokalny (krok po kroku)

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

---

## Po dodaniu wpisu

- **Z webhookiem** (Contentful → Deploy Hook): wystarczy **Opublikuj** w Contentful — Vercel sam zrobi deploy i `npm run build`.
- **Bez webhooka**: zrób **commit i push** na branch podłączony do Vercela — build odpali się jak przy każdej zmianie w repozytorium.

Po deployu sprawdź w przeglądarce `/blog/` i konkretny slug wpisu.
