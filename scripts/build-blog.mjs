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

function layoutHtml({ title, description, canonicalUrl, ogImage, bodyClass, mainHtml, jsonLd, blogNavCurrent }) {
  const desc = escapeHtml(description || '');
  const og = ogImage || `${SITE_URL}/assets/koparko-ladowarka-niegowonice.png`;
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
  <meta property="og:type" content="article">
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
    const seoDesc = fields[F.seoDescription] || '';
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
    </article>`;

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
    });

    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    console.log('Zapisano:', `/blog/${p.slug}/`);
  }

  const listItems = posts
    .map(
      (p) => `
        <li class="blog-list-item">
          <a href="/blog/${escapeHtml(p.slug)}/">
            <span class="blog-list-title">${escapeHtml(p.title)}</span>
            ${p.dateLabel ? `<span class="blog-list-date">${escapeHtml(p.dateLabel)}</span>` : ''}
          </a>
        </li>`
    )
    .join('');

  const indexMain = `
    <section class="section blog-index">
      <div class="container container--narrow">
        <header class="blog-index-header">
          <h1>Blog</h1>
          <p class="section-intro">Aktualności i wpisy z naszej pracy przy robotach ziemnych i usługach koparką w Niegowonicach i okolicy.</p>
        </header>
        <ul class="blog-list">
          ${listItems || '<li class="blog-list-empty">Brak opublikowanych wpisów.</li>'}
        </ul>
      </div>
    </section>`;

  const indexHtml = layoutHtml({
    title: 'Blog – Snopek Sylwester | Koparko-ładowarka Niegowonice',
    description: 'Aktualności i wpisy: roboty ziemne, koparka, usługi w Niegowonicach i okolicy.',
    canonicalUrl: `${SITE_URL}/blog/`,
    mainHtml: indexMain,
    blogNavCurrent: 'index',
  });

  fs.writeFileSync(path.join(blogDir, 'index.html'), indexHtml, 'utf8');
  console.log('Zapisano: /blog/index.html');

  const today = new Date().toISOString().slice(0, 10);
  const blogUrlsXml = [
    `  <url>
    <loc>${SITE_URL}/blog/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`,
    ...posts.map(
      (p) => `  <url>
    <loc>${SITE_URL}/blog/${p.slug}/</loc>
    <lastmod>${today}</lastmod>
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
    console.log('Zaktualizowano sitemap.xml (wpisy bloga).');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
