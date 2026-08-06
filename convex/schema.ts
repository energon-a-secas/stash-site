import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * Community submissions. Everything lands here as "pending" and shows in the
   * public Fresh drops shelf. The curator promotes good ones into data/entries.json
   * (see scripts/sync-approved.mjs), which is what the static API serves.
   */
  submissions: defineTable({
    name: v.string(),
    url: v.string(),
    section: v.string(),
    why: v.string(),
    price: v.string(), // "free" | "freemium" | "paid" | "unknown"
    tags: v.array(v.string()),
    /** Free-text display name. Never an email or anything identifying. */
    submittedBy: v.string(),
    /** Random per-browser id. Used for rate limiting and vote de-duplication only. */
    visitorId: v.string(),
    status: v.string(), // "pending" | "approved" | "rejected"
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    /** Set once the entry has been merged into data/entries.json. */
    mergedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_url", ["url"])
    .index("by_visitor", ["visitorId"])
    .index("by_created", ["createdAt"]),

  /**
   * "Want to use" votes. targetId is a catalog entry id (from data/entries.json)
   * or a submission id, so votes survive a submission being promoted.
   */
  votes: defineTable({
    targetId: v.string(),
    visitorId: v.string(),
    createdAt: v.number(),
  })
    .index("by_target", ["targetId"])
    .index("by_visitor_target", ["visitorId", "targetId"]),

  /** Brute-force guard for the single curator passphrase. One row, key "global". */
  curatorAttempts: defineTable({
    key: v.string(),
    failures: v.number(),
    lockedUntil: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
