# CLAUDE.md — Stash

A wishlist of design assets to use later, open to submissions. Sibling of `awesome-sites-site`.

**Live:** stash.neorgon.com
**Port:** 8857 (`make serve`)

## The distinction that defines this project

| | Awesome Sites | Stash |
|---|---|---|
| Claim | "I tried this, it works" | "I should use this" |
| Who adds | Curator only | Anyone |
| Storage | JSON in repo | JSON in repo **+** Convex for the live queue |

Keep it. If an entry starts carrying a verdict, it belongs in `awesome-sites-site` instead. The
`status` field (`untried` / `tried`) is the seam: almost everything here should stay `untried`.

## Two data sources, deliberately

| Layer | Holds | Why |
|---|---|---|
| `data/*.json` -> `api/v1/*.json` | The curated shelves | Fast, diffable, works with the backend down, readable by agents and crawlers |
| Convex | Submissions and votes | Needs to be live and writable by strangers |

`api/v1/` is **generated** by `make api`. Never hand-edit it. Edit `data/` and rebuild.

## Workflow

1. Edit `data/entries.json` or `data/sections.json`
2. `make api` (validates: unique ids, known sections, valid http URLs, a `why` worth reading)
3. `make serve` and check on port 8857

For community submissions: approve on the site at `#curate`, then
`CONVEX_URL=... STASH_CURATOR_PASSWORD=... npm run sync`, then `make api` and commit.

## Convex

Deployment needs `CURATOR_PASSWORD_HASH` set (`make hash` prints the command). `js/config.js`
holds `CONVEX_URL`; while it is empty the site degrades to opening a prefilled GitHub issue on
submit, and voting is disabled. That fallback is intentional, do not remove it.

Moderation has no accounts: one passphrase, bcrypt-verified server-side on every call, held in
memory for the tab only. Never persist it, and never mint a token into localStorage.

## Gotchas

- Adding a shelf means editing **three** places: `data/sections.json`, `SECTION_IDS` in
  `convex/lib/validate.ts`, and the section list in `llms.txt`.
- All submission text is untrusted. Render through `escHtml()`; build hrefs through `safeUrl()`.
- The header and footer come from the Neorgon kits. Never style `.header-*` or `.neo-footer` here.
