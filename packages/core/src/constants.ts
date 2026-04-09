/**
 * Bump when chunking / FTS indexing semantics change so older imports are
 * re-indexed on next app open (see `ensureSearchIndexUpToDate` in pipeline).
 */
export const SEARCH_INDEX_VERSION = 1;
