// The order in which covers are tried (pure logic; downloading lives in api/coverSources.js):
// 1. automatically, from the chosen search result: its Google cover, then Open Library by ISBN;
// 2. otherwise a picker with covers of other editions and images from the web;
// 3. otherwise a photo taken or uploaded by the user.

// The picker shows up to PICKER_MAX covers, out of PICKER_CANDIDATES fetched,
// because some images fail to load (broken links, sites that block hotlinking).
export const PICKER_MAX = 6;
export const PICKER_CANDIDATES = 12;

// The picker's view of its candidates: the first `max` images that finished loading,
// in the order they loaded. `loaded` lists keys in load order, `failed` the keys that failed.
export function pickerView(candidates, { loaded, failed }, max = PICKER_MAX) {
  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const visible = loaded.map((key) => byKey.get(key)).filter(Boolean).slice(0, max);
  const allFailed = candidates.length > 0 && candidates.every((c) => failed.includes(c.key));
  return { visible, allFailed };
}

// Step 1 URLs for a search result. `toDownloadUrl` upgrades a Google thumbnail;
// `isbnUrl` builds the Open Library URL; `canDownload` filters what this setup can fetch.
export function automaticCoverUrls(result, { toDownloadUrl, isbnUrl, canDownload }) {
  const urls = [];
  if (result?.thumbnailUrl) urls.push(toDownloadUrl(result.thumbnailUrl));
  if (result?.isbn) urls.push(isbnUrl(result.isbn));
  return urls.filter((url) => url && canDownload(url));
}

// Tries each URL in order; returns { coverData, url } for the first that loads, or null.
export async function firstWorkingCover(urls, load) {
  for (const url of urls) {
    try {
      return { coverData: await load(url), url };
    } catch {
      // Try the next source.
    }
  }
  return null;
}

// Up to `max` picker candidates: half from other editions, half from the web,
// with any free slots filled from whichever list has more.
export function pickCandidates(editions, web, max = PICKER_MAX) {
  const editionSlots = Math.min(editions.length, Math.ceil(max / 2));
  const fromWeb = web.slice(0, max - editionSlots);
  const fromEditions = editions.slice(0, max - fromWeb.length);
  return [...fromEditions, ...fromWeb];
}
