#!/usr/bin/env node
/*
 * Lead finder for Weblly.
 *
 * Searches Google Places (New) for accountants and lawyers across Israel and
 * outputs only businesses that do NOT have a website listed on their Google
 * Business Profile — i.e. real, verified leads for a web-design pitch.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=xxxxx node tools/find-leads.js > leads.csv
 *
 * Optional flags:
 *   --categories="רואה חשבון,עורך דין,רופא שיניים"   (comma separated, Hebrew ok)
 *   --cities=path/to/cities.json                      (override the built-in city list)
 *   --limit=100                                        (stop once this many leads are found)
 *
 * Notes:
 * - Google Places never returns email addresses (it doesn't collect them).
 *   The email/phone columns are left for you to fill in after a quick call —
 *   the script gives you a verified phone number and Maps link to start from.
 * - Uses the Places API (New) Text Search endpoint with a field mask, so each
 *   request only bills for the fields we actually use.
 */

const DEFAULT_CATEGORIES = ['רואה חשבון', 'עורך דין'];

const DEFAULT_CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד',
  'נתניה', 'באר שבע', 'בני ברק', 'חולון', 'רמת גן', 'בת ים', 'רחובות',
  'אשקלון', 'הרצליה', 'כפר סבא', 'מודיעין', 'רעננה', 'הוד השרון',
  'נצרת', 'לוד', 'רמלה', 'חדרה', 'נהריה', 'כרמיאל', 'אילת', 'טבריה',
  'עפולה', 'קריית שמונה', 'בית שמש', 'קריית גת', 'קריית אתא', 'קריית מוצקין',
  'קריית ים', 'קריית ביאליק', 'נס ציונה', 'יבנה', 'אור יהודה', 'גבעתיים',
  'רמת השרון', 'שוהם', 'קריית אונו', 'צפת', 'עכו', 'דימונה', 'אילת',
  'ראש העין', 'מעלה אדומים', 'ביתר עילית', 'מודיעין עילית', 'אריאל',
];

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.googleMapsUri',
].join(',');

function parseArgs(argv) {
  const args = { categories: DEFAULT_CATEGORIES, cities: DEFAULT_CITIES, limit: Infinity };
  for (const raw of argv.slice(2)) {
    const [key, val] = raw.replace(/^--/, '').split('=');
    if (key === 'categories' && val) args.categories = val.split(',').map(s => s.trim()).filter(Boolean);
    if (key === 'limit' && val) args.limit = Number(val) || Infinity;
    if (key === 'cities' && val) {
      args.cities = JSON.parse(require('fs').readFileSync(val, 'utf8'));
    }
  }
  return args;
}

async function searchText(apiKey, textQuery, pageToken) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK + (pageToken ? '' : ',nextPageToken'),
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'he',
      regionCode: 'IL',
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API error ${res.status}: ${body}`);
  }
  return res.json();
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function pitchOpener(name, category) {
  const isLawyer = category.includes('עורך דין');
  const service = isLawyer ? 'משרד עורכי הדין' : 'המשרד';
  return `שלום, שמתי לב ש${service} ${name} לא מופיע כרגע עם אתר משלו בחיפוש בגוגל — לקוחות פוטנציאליים שמחפשים ${category} באזור כנראה מגיעים למתחרים שיש להם נוכחות אונליין. בניתי אתרים ל${isLawyer ? 'עורכי דין' : 'רואי חשבון'} שמביאים פניות חדשות דרך גוגל; אשמח לשלוח דוגמה קצרה מותאמת למשרד שלכם.`;
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('Missing GOOGLE_PLACES_API_KEY env var. See tools/README.md for setup steps.');
    process.exit(1);
  }

  const args = parseArgs(process.argv);
  const seen = new Set();
  const leads = [];

  outer:
  for (const category of args.categories) {
    for (const city of args.cities) {
      const query = `${category} ב${city}`;
      let pageToken;
      let page = 0;
      do {
        let data;
        try {
          data = await searchText(apiKey, query, pageToken);
        } catch (err) {
          console.error(`[warn] "${query}" failed: ${err.message}`);
          break;
        }
        for (const place of data.places || []) {
          if (leads.length >= args.limit) break outer;
          if (seen.has(place.id)) continue;
          seen.add(place.id);
          if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') continue;
          if (place.websiteUri) continue; // has a website already — not a lead

          const name = place.displayName?.text || '';
          const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
          const rating = place.rating ?? '';
          const reviews = place.userRatingCount ?? 0;
          leads.push({
            name,
            category,
            city,
            address: place.formattedAddress || '',
            phone,
            email: '', // Google Places never exposes emails — fill in after contact
            rating,
            reviews,
            potentialScore: (Number(rating) || 0) * Math.log10((reviews || 0) + 1),
            mapsLink: place.googleMapsUri || '',
            pitchOpener: pitchOpener(name, category),
          });
        }
        pageToken = data.nextPageToken;
        page++;
        if (pageToken) await new Promise(r => setTimeout(r, 2000)); // Google requires a short delay before the token is valid
      } while (pageToken && page < 3 && leads.length < args.limit);

      if (leads.length >= args.limit) break outer;
    }
  }

  leads.sort((a, b) => b.potentialScore - a.potentialScore);

  const header = ['שם העסק', 'קטגוריה', 'עיר', 'כתובת', 'טלפון', 'אימייל', 'דירוג', "מס' ביקורות", 'ציון פוטנציאל', 'קישור Google Maps', 'פתיח למכירה'];
  const rows = leads.map(l => [l.name, l.category, l.city, l.address, l.phone, l.email, l.rating, l.reviews, l.potentialScore.toFixed(2), l.mapsLink, l.pitchOpener]);

  console.log([header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n'));
  console.error(`\nDone. ${leads.length} leads without a website found.`);
}

main().catch(err => { console.error(err); process.exit(1); });
