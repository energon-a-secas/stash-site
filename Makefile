.DEFAULT_GOAL := help

PORT = 8857

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "  make serve    Start dev server → http://localhost:$(PORT)"
	@echo "  make api      Rebuild api/v1/*.json from data/ (validates first)"
	@echo "  make sync     Pull approved submissions from Convex into data/entries.json"
	@echo "  make convex   Run the Convex dev backend"
	@echo "  make hash     Generate the curator passphrase hash"
	@echo "  make kill     Kill this project's HTTP server"
	@echo ""

# ── Dev server ────────────────────────────────────────────────────────────────
.PHONY: serve
serve:
	@echo "Serving → http://localhost:$(PORT)"
	@python3 -m http.server $(PORT)

# ── Static API ────────────────────────────────────────────────────────────────
.PHONY: api
api:
	@node scripts/build-api.mjs

# ── Convex ────────────────────────────────────────────────────────────────────
.PHONY: convex
convex:
	@npx convex dev

.PHONY: sync
sync:
	@node scripts/sync-approved.mjs

.PHONY: hash
hash:
	@node scripts/hash-passphrase.mjs

# ── Kill ──────────────────────────────────────────────────────────────────────
.PHONY: kill
kill:
	@lsof -ti :$(PORT) | xargs kill 2>/dev/null && echo "Stopped server on port $(PORT)" || echo "No server running on port $(PORT)"
