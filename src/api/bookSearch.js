import { isBridgeConfigured } from './bridge';
import { searchBooks } from './googleBooks';
import { searchNli } from './nli';
import { mergeResults } from '../lib/searchMerge';

export const SEARCH_SOURCES = { GOOGLE: 'google', NLI: 'nli' };

// Searches Google Books and the National Library of Israel in parallel and merges the results.
// Returns { results, failed } where `failed` lists sources that errored. Throws only when
// every source failed. The NLI is skipped when the Worker isn't configured.
export async function searchAllSources(query, { signal, bridgeConfigured = isBridgeConfigured() } = {}) {
  const searches = [[SEARCH_SOURCES.GOOGLE, searchBooks(query, { signal })]];
  if (bridgeConfigured) searches.push([SEARCH_SOURCES.NLI, searchNli(query, { signal })]);

  const settled = await Promise.allSettled(searches.map(([, promise]) => promise));
  const bySource = {};
  const failed = [];
  settled.forEach((outcome, i) => {
    const source = searches[i][0];
    if (outcome.status === 'fulfilled') {
      bySource[source] = outcome.value;
    } else {
      if (outcome.reason?.name === 'AbortError') throw outcome.reason;
      failed.push(source);
    }
  });

  if (failed.length === searches.length) throw new Error(`All searches failed: ${failed.join(', ')}`);
  return {
    results: mergeResults(bySource.google ?? [], bySource.nli ?? [], query),
    failed,
  };
}
