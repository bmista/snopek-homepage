/**
 * Generuje statyczne blog/index.html oraz blog/<slug>/index.html z Contentful.
 * Wymaga zmiennych środowiskowych (Vercel → Environment Variables).
 * Lokalnie: skopiuj .env.example → .env (obsługuje dotenv).
 */
import 'dotenv/config';
import contentful from 'contentful';

const { createClient } = contentful;
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SITE_URL = process.env.SITE_URL || 'https://snopek-koparka.pl';
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
const ENVIRONMENT = process.env.CONTENTFUL_ENVIRONMENT || 'master';
const CONTENT_TYPE = process.env.CONTENTFUL_CONTENT_TYPE_ID || 'blogPost';

/** Nazwy pól w modelu Contentful (dostosuj, jeśli w panelu są inne ID pól) */
const F = {
  title: 'title',
  slug: 'slug',
  body: 'body',
  seoDescription: 'seoDescription',
  featuredImage: 'featuredImage',
  publishDate: 'publishDate',
};

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function assetUrl(asset) {
  if (!asset?.fields?.file?.url) return '';
  const u = asset.fields.file.url;
  return u.startsWith('//') ? `https:${u}` : u;
}

function richToHtml(document) {
  if (!document) return '';
  const options = {
    renderNode: {
      'embedded-asset-block': (node) => {
        const target = node.data.target;
        if (!target?.fields?.file) return '';
        const url = assetUrl(target);
        const alt = escapeHtml(target.fields.title || target.fields.description || '');
        return `<figure class="blog-figure"><img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" decoding="async" /></figure>`;
      },
    },
  };
  return documentToHtmlString(document, options);
}

/**
 * Pole seoDescription w Contentful może być krótkim tekstem (string) albo rich text (obiekt dokumentu).
 * Zawsze zwracamy zwykły string do meta / excerpt.
 */
function seoFieldToPlainText(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value.nodeType === 'document') {
    const html = documentToHtmlString(value, {
      renderNode: { 'embedded-asset-block': () => '' },
    });
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return String(value).trim();
}

/** Skrót do kafelka na liście: najpierw seoDescription, potem początek treści (bez HTML). */
function excerptForCard(seoDescription, richBody, maxLen = 180) {
  const fromSeo = seoFieldToPlainText(seoDescription);
  if (fromSeo.length >= 40) {
    return fromSeo.length > maxLen ? `${fromSeo.slice(0, maxLen).trim()}…` : fromSeo;
  }
  if (!richBody) return '';
  const html = documentToHtmlString(richBody, {
    renderNode: { 'embedded-asset-block': () => '' },
  });
  let text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 50 ? cut.slice(0, lastSpace) : cut}…`;
}

const PLACEHOLDER_IMG = '/assets/koparko-ladowarka-niegowonice.png';

function contactSectionHtml() {
  return `<section class="section section--blog-contact" id="kontakt">
      <div class="container">
        <h2>Kontakt</h2>
        <p class="section-intro">Potrzebujesz koparko-ładowarki, wykopów lub transportu materiałów w Niegowonicach lub w promieniu ok. 10 km? Zadzwoń!</p>
        <div class="contact-box">
          <a href="tel:+48507168835" class="contact-phone">📞 507 168 835</a>
          <p>Usługi transportowo-sprzętowe<br><strong>Snopek Sylwester</strong></p>
          <p class="contact-address"><a href="https://maps.google.com/?q=ul.+Ko%C5%9Bciuszki+24,+42-454+Niegowonice" target="_blank" rel="noopener">ul. Kościuszki 24, 42-454 Niegowonice</a></p>
          <p class="contact-area">Niegowonice, Grabowa, Łazy, Ogrodzieniec, i okolica (standardowy zasięg ok. 10 km)</p>
          <div class="contact-icons">
            <a href="mailto:sylwek@snopek-koparka.pl" class="contact-icon" aria-label="E-mail: sylwek@snopek-koparka.pl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61576650450712" class="contact-icon" target="_blank" rel="noopener noreferrer" aria-label="Facebook – profil firmy">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://www.instagram.com/snopek.koparka/" class="contact-icon" target="_blank" rel="noopener noreferrer" aria-label="Instagram – profil firmy">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://linktr.ee/snopek.koparka" class="contact-icon" target="_blank" rel="noopener noreferrer" aria-label="Linktree – wszystkie linki i kontakt">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m13.73635 5.85251 4.00467-4.11665 2.3248 2.3808-4.20064 4.00466h5.9085v3.30473h-5.9365l4.22865 4.10766-2.3248 2.3338L12.0005 12.099l-5.74052 5.76852-2.3248-2.3248 4.22864-4.10766h-5.9375V8.12132h5.9085L3.93417 4.11666l2.3248-2.3808 4.00468 4.11665V0h3.4727zm-3.4727 10.30614h3.4727V24h-3.4727z"/></svg>
            </a>
          </div>
          <p class="contact-vcard-wrap"><a href="/assets/snopek-sylwester.vcf" class="contact-vcard-link" download="Snopek-Sylwester.vcf">Zapisz kontakt w książce adresowej</a></p>
        </div>
      </div>
    </section>`;
}

function layoutHtml({ title, description, canonicalUrl, ogImage, bodyClass, mainHtml, jsonLd, blogNavCurrent, ogType }) {
  const desc = escapeHtml(description || '');
  const og = ogImage || `${SITE_URL}/assets/koparko-ladowarka-niegowonice.png`;
  const ogTypeVal = ogType || 'article';
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1e5631">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="icon" type="image/png" href="/assets/favicon.png">
  <link rel="apple-touch-icon" href="/assets/favicon.png">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${escapeHtml(og)}">
  <meta property="og:type" content="${escapeHtml(ogTypeVal)}">
  <meta property="og:locale" content="pl_PL">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18015624290"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('config', 'AW-18015624290');
    gtag('config', 'G-7WZ1JPDE6V', { anonymize_ip: true });
  </script>
  ${jsonLd ? `<script type="application/ld+json">
${jsonLd}
  </script>` : ''}
</head>
<body class="${bodyClass || ''}">
  <header class="header" id="header">
    <div class="header-inner">
      <a href="/" class="logo">Snopek Sylwester</a>
      <nav class="nav" aria-label="Menu główne">
        <a href="/#uslugi">Usługi</a>
        <a href="/#sprzet">Sprzęt</a>
        <a href="/#obszar"><span class="nav-desktop">Gdzie działamy</span><span class="nav-mobile">Obszar</span></a>
        <a href="/#faq">FAQ</a>
        <a href="/#opinie">Opinie</a>
        <a href="/blog/"${blogNavCurrent === 'index' ? ' aria-current="page"' : ''}>Blog</a>
        <a href="/#kontakt">Kontakt</a>
      </nav>
      <a href="tel:+48507168835" class="header-phone">📞 507 168 835</a>
    </div>
  </header>
  <main>
${mainHtml}
  </main>
  <footer class="footer">
    <div class="container">
      <p>© Usługi Transportowo-Sprzętowe Snopek Sylwester – usługi koparką Niegowonice i okolica</p>
    </div>
  </footer>
  <div id="cookie-consent" class="cookie-consent" role="dialog" aria-label="Zgoda na ciasteczka" aria-describedby="cookie-consent-text">
    <p id="cookie-consent-text" class="cookie-consent-text">
      Używamy Google Analytics, żeby wiedzieć, skąd przychodzą odwiedzający. Potrzebujemy Twojej zgody na ciasteczka (RODO).
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Polityka prywatności Google</a>.
    </p>
    <div class="cookie-consent-btns">
      <button type="button" class="cookie-consent-accept" id="cookie-accept">Akceptuję</button>
      <button type="button" class="cookie-consent-reject" id="cookie-reject">Odrzuć</button>
    </div>
  </div>
  <script>
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.pageYOffset > 50);
    });
  </script>
  <script>
    (function() {
      var COOKIE_CONSENT_KEY = 'cookie_consent_snopek';
      var consentBanner = document.getElementById('cookie-consent');
      var saved = localStorage.getItem(COOKIE_CONSENT_KEY);
      function hideBanner() { if (consentBanner) consentBanner.classList.add('hidden'); }
      function grantConsentAndAttachEvents() {
        if (typeof gtag !== 'function') return;
        gtag('consent', 'update', {
          analytics_storage: 'granted', ad_storage: 'granted',
          ad_user_data: 'granted', ad_personalization: 'granted'
        });
        document.querySelectorAll('a[href^="tel:"]').forEach(function(link) {
          link.addEventListener('click', function() {
            gtag('event', 'phone_click', { event_category: 'contact', event_label: 'zadzwon' });
            gtag('event', 'conversion', { send_to: 'AW-18015624290/ad7UCL7gookcEOK4wo5D' });
            gtag('event', 'conversion', { send_to: 'AW-18015624290/piyECLWT34kcEOK4wo5D', value: 1.0, currency: 'PLN' });
          });
        });
      }
      if (saved === 'accepted') { hideBanner(); grantConsentAndAttachEvents(); }
      else if (saved === 'rejected') { hideBanner(); }
      document.getElementById('cookie-accept') && document.getElementById('cookie-accept').addEventListener('click', function() {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        hideBanner();
        grantConsentAndAttachEvents();
      });
      document.getElementById('cookie-reject') && document.getElementById('cookie-reject').addEventListener('click', function() {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
        hideBanner();
      });
    })();
  </script>
</body>
</html>`;
}

async function main() {
  if (!SPACE_ID || !ACCESS_TOKEN) {
    console.error(
      'Brak CONTENTFUL_SPACE_ID lub CONTENTFUL_ACCESS_TOKEN. Ustaw zmienne środowiskowe (lokalnie plik .env lub Vercel → Settings → Environment Variables).'
    );
    process.exit(1);
  }

  const client = createClient({
    space: SPACE_ID,
    accessToken: ACCESS_TOKEN,
    environment: ENVIRONMENT,
  });

  const res = await client.getEntries({
    content_type: CONTENT_TYPE,
    order: 'sys.createdAt',
    limit: 100,
  });

  const items = res.items || [];
  const posts = [];

  for (const item of items) {
    const fields = item.fields || {};
    const title = fields[F.title];
    let slug = (fields[F.slug] || '').trim();
    if (!slug && title) {
      slug = String(title)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    if (!slug || !title) {
      console.warn('Pomijam wpis bez tytułu lub slug:', item.sys?.id);
      continue;
    }
    const bodyHtml = richToHtml(fields[F.body]);
    const seoDesc = seoFieldToPlainText(fields[F.seoDescription]);
    const excerpt = excerptForCard(seoDesc, fields[F.body]);
    const img = fields[F.featuredImage];
    const imgUrl = img ? assetUrl(img) : '';
    const date = fields[F.publishDate];
    const dateIso = date ? new Date(date).toISOString() : item.sys?.updatedAt || new Date().toISOString();

    posts.push({
      id: item.sys.id,
      title,
      slug,
      bodyHtml,
      seoDescription: seoDesc,
      excerpt,
      featuredImageUrl: imgUrl,
      dateIso,
      dateLabel: date ? new Date(date).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
    });
  }

  posts.sort((a, b) => new Date(b.dateIso) - new Date(a.dateIso));

  const blogDir = path.join(ROOT, 'blog');
  fs.mkdirSync(blogDir, { recursive: true });

  for (const p of posts) {
    const dir = path.join(blogDir, p.slug);
    fs.mkdirSync(dir, { recursive: true });
    const canonical = `${SITE_URL}/blog/${p.slug}/`;
    const desc = p.seoDescription || p.title;
    const hero = p.featuredImageUrl
      ? `<div class="blog-hero"><img src="${escapeHtml(p.featuredImageUrl)}" alt="${escapeHtml(p.title)}" width="1200" height="630" loading="eager" /></div>`
      : '';
    const article = `
    <article class="blog-article section">
      <div class="container container--narrow">
        <nav class="blog-breadcrumb" aria-label="Ścieżka nawigacji"><a href="/blog/">Blog</a> <span aria-hidden="true">/</span></nav>
        <header class="blog-header">
          <h1>${escapeHtml(p.title)}</h1>
          ${p.dateLabel ? `<p class="blog-date">${escapeHtml(p.dateLabel)}</p>` : ''}
        </header>
        ${hero}
        <div class="blog-prose">${p.bodyHtml}</div>
      </div>
    </article>
    <div class="container container--narrow">
      <p class="blog-back-wrap">
        <a href="/blog/" class="btn btn-outline blog-back-btn">← Wróć do listy wpisów</a>
      </p>
    </div>
    ${contactSectionHtml()}`;

    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: p.title,
      datePublished: p.dateIso,
      dateModified: p.dateIso,
      author: { '@type': 'Organization', name: 'Usługi Transportowo-Sprzętowe Snopek Sylwester' },
      publisher: {
        '@type': 'Organization',
        name: 'Usługi Transportowo-Sprzętowe Snopek Sylwester',
        url: SITE_URL,
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      description: desc,
      ...(p.featuredImageUrl ? { image: p.featuredImageUrl } : {}),
    });

    const html = layoutHtml({
      title: `${p.title} – blog | Snopek Sylwester`,
      description: desc,
      canonicalUrl: canonical,
      ogImage: p.featuredImageUrl || undefined,
      mainHtml: article,
      jsonLd,
      blogNavCurrent: 'none',
      ogType: 'article',
    });

    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    console.log('Zapisano:', `/blog/${p.slug}/`);
  }

  const gridCards = posts
    .map((p) => {
      const imgSrc = p.featuredImageUrl || PLACEHOLDER_IMG;
      const alt = escapeHtml(p.title);
      return `
        <article class="blog-card">
          <a href="/blog/${escapeHtml(p.slug)}/" class="blog-card-link">
            <div class="blog-card-image">
              <img src="${escapeHtml(imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc)}" alt="${alt}" width="800" height="450" loading="lazy" decoding="async" />
            </div>
            <div class="blog-card-body">
              <h2 class="blog-card-title">${escapeHtml(p.title)}</h2>
              ${p.dateLabel ? `<p class="blog-card-date">${escapeHtml(p.dateLabel)}</p>` : ''}
              ${p.excerpt ? `<p class="blog-card-excerpt">${escapeHtml(p.excerpt)}</p>` : ''}
              <span class="blog-card-cta">Czytaj <span aria-hidden="true">→</span></span>
            </div>
          </a>
        </article>`;
    })
    .join('');

  const indexMain = `
    <section class="section blog-index">
      <div class="container">
        <header class="blog-index-header">
          <h1>Blog</h1>
          <p class="section-intro">Aktualności i wpisy z naszej pracy przy robotach ziemnych i usługach koparką w Niegowonicach i okolicy.</p>
        </header>
        <div class="blog-grid">
          ${gridCards || '<p class="blog-grid-empty">Brak opublikowanych wpisów.</p>'}
        </div>
      </div>
    </section>`;

  const indexHtml = layoutHtml({
    title: 'Blog – Snopek Sylwester | Koparko-ładowarka Niegowonice',
    description: 'Aktualności i wpisy: roboty ziemne, koparka, usługi w Niegowonicach i okolicy.',
    canonicalUrl: `${SITE_URL}/blog/`,
    mainHtml: indexMain,
    blogNavCurrent: 'index',
    ogType: 'website',
  });

  fs.writeFileSync(path.join(blogDir, 'index.html'), indexHtml, 'utf8');
  console.log('Zapisano: /blog/index.html');

  /** YYYY-MM-DD z ISO treści (Contentful / sys) */
  function lastmodDay(iso) {
    if (!iso) return new Date().toISOString().slice(0, 10);
    const d = String(iso).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10);
  }

  const today = new Date().toISOString().slice(0, 10);
  /** Data ostatniej zmiany listy bloga: najnowszy wpis albo dziś (przebudowa listy). */
  const blogListLastMod =
    posts.length > 0
      ? posts.map((p) => lastmodDay(p.dateIso)).sort().reverse()[0]
      : today;

  /** Przy każdym `npm run build` (np. na Vercelu po deployu / webhooku) ten blok jest generowany od zera z aktualnej listy wpisów z Contentful. */
  const blogUrlsXml = [
    `  <url>
    <loc>${SITE_URL}/blog/</loc>
    <lastmod>${blogListLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`,
    ...posts.map(
      (p) => `  <url>
    <loc>${SITE_URL}/blog/${p.slug}/</loc>
    <lastmod>${lastmodDay(p.dateIso)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    ),
  ].join('\n');

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const blogBlock = `<!-- BLOG_URLS -->\n${blogUrlsXml}\n  <!-- /BLOG_URLS -->`;
  if (!sitemap.includes('<!-- BLOG_URLS -->')) {
    console.warn('sitemap.xml: brak znaczników BLOG_URLS – pomijam aktualizację.');
  } else {
    sitemap = sitemap.replace(/<!-- BLOG_URLS -->[\s\S]*?<!-- \/BLOG_URLS -->/, blogBlock);
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    console.log(
      `Zaktualizowano sitemap.xml: /blog/ + ${posts.length} wpis(ów) (URL-e z bieżącego buildu).`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
