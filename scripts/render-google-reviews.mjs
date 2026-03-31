import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const DATA_PATH = path.join(ROOT, 'data', 'google-reviews.json');

const START = '<!-- GOOGLE_REVIEWS_START -->';
const END = '<!-- GOOGLE_REVIEWS_END -->';

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function starsHtml(rating = 5) {
  const n = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = '★'.repeat(Math.round(n));
  return `<div class="review-stars" aria-label="Ocena ${Math.round(n)} na 5">${[...full].map((s) => `<span>${s}</span>`).join('')}</div>`;
}

function quoteHtml(comment) {
  const text = String(comment || '').trim();
  if (!text) return '<blockquote class="review-text" cite="https://www.google.com/maps/"><p>Brak treści opinii.</p></blockquote>';
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n                      ');
  return `<blockquote class="review-text" cite="https://www.google.com/maps/">${paragraphs}</blockquote>`;
}

function buildSection(data) {
  const totalCount = Number(data?.summary?.totalReviewCount) || (data?.reviews?.length || 0);
  const avg = Number(data?.summary?.averageRating);
  const ratingLabel = Number.isFinite(avg) ? avg.toFixed(1) : '5.0';
  const mapsUrl =
    data?.summary?.mapsUrl ||
    'https://www.google.com/maps/search/?api=1&query=Us%C5%82ugi+Transportowo+Sprz%C4%99towe+Snopek+Sylwester+Niegowonice';
  const leaveReviewUrl = data?.summary?.leaveReviewUrl || 'https://g.page/r/CaXp-15LtaL4EAE/review';
  const reviews = (data?.reviews || []).slice(0, 10);

  const slides = reviews
    .map(
      (r) => `              <div class="reviews-carousel-slide">
                <article class="review-card">
                  <div class="review-card-inner">
                    ${starsHtml(r.rating)}
                    ${quoteHtml(r.comment)}
                    <footer class="review-meta"><span class="review-author">${escapeHtml(r.authorName || 'Użytkownik Google')}</span></footer>
                  </div>
                </article>
              </div>`
    )
    .join('\n');

  const totalSlides = reviews.length || 1;
  const carouselContent =
    reviews.length > 0
      ? slides
      : `              <div class="reviews-carousel-slide">
                <article class="review-card">
                  <div class="review-card-inner">
                    ${starsHtml(5)}
                    <blockquote class="review-text" cite="https://www.google.com/maps/"><p>Opinie są tymczasowo niedostępne. Sprawdź bezpośrednio w Google Maps.</p></blockquote>
                    <footer class="review-meta"><span class="review-author">Google Maps</span></footer>
                  </div>
                </article>
              </div>`;

  return `    <section class="section" id="opinie">
      <div class="container">
        <h2>Opinie klientów</h2>
        <p class="section-intro">Klienci oceniają nas w <strong>Google Maps</strong> — mamy <strong>${escapeHtml(totalCount)}</strong> opinii. Poniżej <strong>10 najnowszych</strong> cytatów. Przewiń strzałkami, klawiszami (← →) lub palcem.</p>
        <div class="reviews-summary">
          <div class="reviews-summary-main">
            <div class="reviews-stars reviews-stars--summary" aria-hidden="true"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
            <p class="reviews-summary-numbers"><span class="reviews-rating-value">${escapeHtml(ratingLabel)}</span> / 5 · <span class="reviews-count-value">${escapeHtml(totalCount)}</span> opinii</p>
          </div>
          <a href="${escapeHtml(mapsUrl)}" class="btn btn-outline reviews-maps-link" target="_blank" rel="noopener noreferrer">Zobacz wszystkie opinie w Google Maps</a>
        </div>
        <div class="reviews-carousel" id="reviews-carousel">
          <div class="reviews-carousel-controls">
            <button type="button" class="reviews-carousel-btn reviews-carousel-btn--prev" aria-controls="reviews-carousel-viewport" aria-label="Poprzednia opinia" disabled>‹</button>
            <span class="reviews-carousel-status" aria-live="polite"><span class="reviews-carousel-current">1</span> / <span class="reviews-carousel-total">${totalSlides}</span></span>
            <button type="button" class="reviews-carousel-btn reviews-carousel-btn--next" aria-controls="reviews-carousel-viewport" aria-label="Następna opinia">›</button>
          </div>
          <div class="reviews-carousel-viewport" id="reviews-carousel-viewport" tabindex="0" role="region" aria-roledescription="karuzela" aria-label="Opinie klientów z Google Maps">
            <div class="reviews-carousel-track">
${carouselContent}
            </div>
          </div>
        </div>
        <p class="reviews-cta-wrap">
          <a href="${escapeHtml(leaveReviewUrl)}" class="btn btn-primary reviews-cta" target="_blank" rel="noopener noreferrer">Zostaw opinię w Google</a>
        </p>
      </div>
    </section>`;
}

function readReviewsData() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Brak pliku ${DATA_PATH}. Najpierw uruchom sync opinii.`);
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function replaceReviewSection(indexHtml, sectionHtml) {
  if (indexHtml.includes(START) && indexHtml.includes(END)) {
    return indexHtml.replace(
      new RegExp(`${START}[\\s\\S]*?${END}`),
      `${START}\n${sectionHtml}\n${END}`
    );
  }

  const pattern = /<section class="section" id="opinie">[\s\S]*?<\/section>\n\n    <section class="section" id="kontakt">/;
  if (!pattern.test(indexHtml)) {
    throw new Error('Nie znaleziono sekcji #opinie w index.html.');
  }
  return indexHtml.replace(pattern, `${START}\n${sectionHtml}\n${END}\n\n    <section class="section" id="kontakt">`);
}

function main() {
  const data = readReviewsData();
  const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const sectionHtml = buildSection(data);
  const output = replaceReviewSection(indexHtml, sectionHtml);
  fs.writeFileSync(INDEX_PATH, output, 'utf8');
  console.log('Zaktualizowano sekcję opinii w index.html');
}

main();
