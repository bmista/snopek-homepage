import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_PATH = path.join(DATA_DIR, 'google-reviews.json');

const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const GBP_LOCATION_NAME = process.env.GBP_LOCATION_NAME || ''; // np. accounts/123456789/locations/987654321
const GBP_ACCOUNT_ID = process.env.GBP_ACCOUNT_ID || '';
const GBP_LOCATION_ID = process.env.GBP_LOCATION_ID || '';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const GOOGLE_PLACE_ID = process.env.GOOGLE_PLACE_ID || '';

const FALLBACK_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Us%C5%82ugi+Transportowo+Sprz%C4%99towe+Snopek+Sylwester+Niegowonice';
const FALLBACK_REVIEW_URL = 'https://g.page/r/CaXp-15LtaL4EAE/review';
const STRICT_SYNC = process.env.STRICT_REVIEW_SYNC === '1';

function requireEnv(name, value) {
  if (!value) throw new Error(`Brak zmiennej środowiskowej: ${name}`);
}

function locationName() {
  if (GBP_LOCATION_NAME) return GBP_LOCATION_NAME;
  if (GBP_ACCOUNT_ID && GBP_LOCATION_ID) return `accounts/${GBP_ACCOUNT_ID}/locations/${GBP_LOCATION_ID}`;
  throw new Error('Ustaw GBP_LOCATION_NAME albo parę GBP_ACCOUNT_ID + GBP_LOCATION_ID.');
}

async function getAccessToken() {
  requireEnv('GOOGLE_CLIENT_ID', CLIENT_ID);
  requireEnv('GOOGLE_CLIENT_SECRET', CLIENT_SECRET);
  requireEnv('GOOGLE_REFRESH_TOKEN', REFRESH_TOKEN);

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Nie udało się pobrać access_token (${res.status}): ${txt}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error('Brak access_token w odpowiedzi OAuth.');
  return json.access_token;
}

async function fetchGoogleBusinessReviews(accessToken) {
  const loc = locationName();
  const url = `https://mybusiness.googleapis.com/v4/${loc}/reviews?pageSize=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Błąd pobierania opinii z GBP (${res.status}): ${txt}`);
  }
  const json = await res.json();
  const reviews = (json.reviews || [])
    .map((r) => ({
      reviewId: r.reviewId || '',
      authorName: r.reviewer?.displayName || 'Użytkownik Google',
      rating: Number(r.starRating) || 5,
      comment: (r.comment || '').trim(),
      createTime: r.createTime || null,
      updateTime: r.updateTime || null,
      reviewer: r.reviewer || null,
      reviewReply: r.reviewReply || null,
    }))
    .sort((a, b) => new Date(b.updateTime || b.createTime || 0) - new Date(a.updateTime || a.createTime || 0));
  return reviews;
}

async function fetchPlaceSummary() {
  if (!GOOGLE_MAPS_API_KEY || !GOOGLE_PLACE_ID) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(GOOGLE_PLACE_ID)}?fields=rating,userRatingCount,googleMapsUri`, {
    headers: { 'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY },
  });
  if (!res.ok) return null;
  const place = await res.json();
  return {
    averageRating: Number(place.rating) || null,
    totalReviewCount: Number(place.userRatingCount) || null,
    mapsUrl: place.googleMapsUri || null,
  };
}

async function fetchPlaceSummaryBySearch() {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: 'Usługi transportowo-sprzętowe Snopek Sylwester Niegowonice',
      pageSize: 1,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const p = (json.places || [])[0];
  if (!p) return null;
  return {
    averageRating: Number(p.rating) || null,
    totalReviewCount: Number(p.userRatingCount) || null,
    mapsUrl: p.googleMapsUri || null,
    placeId: p.id || null,
  };
}

function averageFromReviews(reviews) {
  if (!reviews.length) return null;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return Number((sum / reviews.length).toFixed(1));
}

function readExistingPayload() {
  if (!fs.existsSync(DATA_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writePlaceholderPayload() {
  const payload = {
    source: 'fallback-placeholder',
    updatedAt: new Date().toISOString(),
    summary: {
      averageRating: 5.0,
      totalReviewCount: 0,
      mapsUrl: FALLBACK_MAPS_URL,
      leaveReviewUrl: FALLBACK_REVIEW_URL,
    },
    reviews: [],
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.warn('Utworzono placeholder data/google-reviews.json (brak wcześniejszych danych).');
}

async function main() {
  let allReviews = [];
  let latestReviews = [];
  let source = 'google-business-profile-api';
  let gbpError = null;

  try {
    const token = await getAccessToken();
    allReviews = await fetchGoogleBusinessReviews(token);
    latestReviews = allReviews.slice(0, 10);
  } catch (err) {
    gbpError = err;
  }

  const existing = readExistingPayload();
  const placeSummary = (await fetchPlaceSummary()) || (await fetchPlaceSummaryBySearch());

  if (latestReviews.length === 0 && existing?.reviews?.length) {
    latestReviews = existing.reviews.slice(0, 10);
    allReviews = existing.reviews;
    source = gbpError ? 'places-summary + cached-reviews' : source;
  }

  if (latestReviews.length === 0 && gbpError && !placeSummary) {
    throw gbpError;
  }

  if (gbpError && placeSummary) {
    source = 'places-summary + cached-reviews';
    console.warn(`GBP niedostępne, odświeżam tylko podsumowanie z Places: ${gbpError.message || gbpError}`);
    if (placeSummary.placeId && placeSummary.placeId !== GOOGLE_PLACE_ID) {
      console.warn(`Wskazówka: GOOGLE_PLACE_ID wygląda na nieaktualne. Aktualny Place ID: ${placeSummary.placeId}`);
    }
  }

  const payload = {
    source,
    updatedAt: new Date().toISOString(),
    summary: {
      averageRating: placeSummary?.averageRating ?? averageFromReviews(allReviews) ?? 5.0,
      totalReviewCount: placeSummary?.totalReviewCount ?? existing?.summary?.totalReviewCount ?? allReviews.length,
      mapsUrl: placeSummary?.mapsUrl ?? FALLBACK_MAPS_URL,
      leaveReviewUrl: FALLBACK_REVIEW_URL,
    },
    reviews: latestReviews,
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Zapisano ${latestReviews.length} opinii do data/google-reviews.json`);
}

main().catch((err) => {
  const message = err?.message || String(err);
  const existing = readExistingPayload();

  if (STRICT_SYNC) {
    console.error(message);
    process.exit(1);
  }

  console.warn(`Sync opinii pominięty: ${message}`);
  if (existing) {
    console.warn('Pozostawiam ostatni poprawny data/google-reviews.json.');
    process.exit(0);
  }

  writePlaceholderPayload();
  process.exit(0);
});
