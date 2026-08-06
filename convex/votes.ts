import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { clean, isVisitorId } from "./lib/validate";

/**
 * "Want to use" votes. Deliberately anonymous: a visitor id in localStorage is
 * enough to stop accidental double-counting, and nothing here identifies anyone.
 * It is not a ballot box, so it does not need to resist a determined cheater.
 */
export const toggle = mutation({
  args: { targetId: v.string(), visitorId: v.string() },
  handler: async (ctx, args) => {
    if (!isVisitorId(args.visitorId)) {
      return { ok: false, error: "Could not verify this browser." };
    }
    const targetId = clean(args.targetId, 64);
    if (targetId.length < 2) return { ok: false, error: "Unknown item." };

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_visitor_target", (q) =>
        q.eq("visitorId", args.visitorId).eq("targetId", targetId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { ok: true, voted: false };
    }

    await ctx.db.insert("votes", {
      targetId,
      visitorId: args.visitorId,
      createdAt: Date.now(),
    });
    return { ok: true, voted: true };
  },
});

/** Vote counts for every item, plus what this visitor has already voted for. */
export const summary = query({
  args: { visitorId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const votes = await ctx.db.query("votes").collect();
    const counts: Record<string, number> = {};
    const mine: string[] = [];
    for (const vote of votes) {
      counts[vote.targetId] = (counts[vote.targetId] || 0) + 1;
      if (args.visitorId && vote.visitorId === args.visitorId) mine.push(vote.targetId);
    }
    return { counts, mine };
  },
});
