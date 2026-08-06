/**
 * Deployment configuration.
 *
 * CONVEX_URL is empty until `npx convex deploy` has run. While it is empty the
 * site stays fully usable: shelves render from the static API and "Add a find"
 * falls back to opening a prefilled GitHub issue instead of writing to a database.
 */
export const CONVEX_URL = '';

export const CONVEX_CLIENT = 'https://esm.sh/convex@1.43.0/browser';

export const REPO = 'energon-a-secas/stash-site';

export const SITE_URL = 'https://stash.neorgon.com/';

/** Static catalog built by `make api` from data/. */
export const CATALOG_URL = 'api/v1/catalog.json';

export const hasBackend = () => CONVEX_URL.startsWith('https://');
