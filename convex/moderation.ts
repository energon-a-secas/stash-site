import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Lockout state for the curator passphrase. Lives in the default runtime because
 * Node actions ("use node") can only export actions, and this needs the database.
 */

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const KEY = "global";

export const checkLock = internalMutation({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("curatorAttempts")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .first();
    if (!row) return { locked: false };
    if (row.lockedUntil > Date.now()) {
      return { locked: true, retryAfter: row.lockedUntil - Date.now() };
    }
    return { locked: false };
  },
});

export const recordResult = internalMutation({
  args: { success: v.boolean() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const row = await ctx.db
      .query("curatorAttempts")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .first();

    if (args.success) {
      if (row) await ctx.db.patch(row._id, { failures: 0, lockedUntil: 0, updatedAt: now });
      return { ok: true };
    }

    const failures = (row?.failures ?? 0) + 1;
    const lockedUntil = failures >= MAX_FAILURES ? now + LOCKOUT_MS : 0;
    if (row) {
      await ctx.db.patch(row._id, { failures, lockedUntil, updatedAt: now });
    } else {
      await ctx.db.insert("curatorAttempts", { key: KEY, failures, lockedUntil, updatedAt: now });
    }
    return { ok: true };
  },
});
