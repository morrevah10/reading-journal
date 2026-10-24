// Israeli book sites (stores, publishers, catalogs), preferred for covers of Hebrew books.
// A wrong or outdated domain is harmless: it only changes the order of results.
export const ISRAELI_BOOK_SITES = [
  'steimatzky.co.il',
  'tzomet-sfarim.co.il',
  'e-vrit.co.il',
  'simania.co.il',
  'booknet.co.il',
  'indiebook.co.il',
  'mihzuron.co.il',
  'keter-books.co.il',
  'kinbooks.co.il',
  'zmora.co.il',
  'modan.co.il',
  'am-oved.co.il',
  'ybook.co.il',
];

export function isHebrewQuery(text) {
  return /[֐-׿]/.test(text ?? '');
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

const onSite = (host, site) => host === site || host.endsWith(`.${site}`);

// 0 = a listed book site, 1 = another Israeli site, 2 = anything else.
function siteRank(image) {
  const hosts = [hostOf(image.pageUrl), hostOf(image.imageUrl)].filter(Boolean);
  if (hosts.some((host) => ISRAELI_BOOK_SITES.some((site) => onSite(host, site)))) return 0;
  if (hosts.some((host) => host.endsWith('.il'))) return 1;
  return 2;
}

// Stable sort: Israeli book sites first, otherwise the provider's order is kept.
export function preferIsraeliSites(images) {
  return images
    .map((image, index) => ({ image, index, rank: siteRank(image) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ image }) => image);
}
