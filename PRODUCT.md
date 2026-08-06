# Stash — Product notes

## Purpose

A shelf of design assets and references worth reaching for on a **future** build: icons, UI kits,
UI inspiration, pixel art, music and sound, and longer reading. Open to submissions, because the
useful finds are the ones other people trip over.

## The one decision everything else follows from

Awesome Sites answers "what should I use for this, given what I have tried?"
Stash answers "what should I look at when I start something new?"

A verdict belongs in the first. A bookmark with a reason belongs here. Collapsing the two would
turn both into an undifferentiated link dump.

## Decisions

| Topic | Choice |
|-------|--------|
| Curated shelves | JSON files in repo, built into a static API |
| Submissions and votes | Convex, live |
| Accounts | None. Submitting needs no signup; only the curator has a passphrase |
| Moderation | Public queue (Fresh drops), curator promotes into the catalog |
| Taxonomy | Fixed shelves plus free tags |
| Agent access | First-class: `api/v1/`, `llms.txt`, per-section hints, Copy for AI |

## Why submissions are anonymous

The friction of creating an account is larger than the effort of sharing a link, so requiring one
would guarantee an empty queue. The trade is spam risk, handled server-side: validation, URL
restriction, duplicate rejection, and a per-browser rate limit. Nothing reaches a shelf unreviewed.

## Non-goals

- Ratings, reviews or scores. That is what Awesome Sites is for
- User profiles or submission history
- Hosting or mirroring any asset. Stash links out and always will
- Automatic link checking, for now
