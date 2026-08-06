import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  clean,
  cleanTags,
  isPrice,
  isSection,
  isVisitorId,
  LIMITS,
  normalizeUrl,
  urlKey,
} from "./lib/validate";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 20;

/** Fields safe to send to an unauthenticated browser. */
function publicView(row: {
  _id: string;
  name: string;
  url: string;
  section: string;
  why: string;
  price: string;
  tags: string[];
  submittedBy: string;
  createdAt: number;
}) {
  return {
    id: row._id,
    name: row.name,
    url: row.url,
    section: row.section,
    why: row.why,
    price: row.price,
    tags: row.tags,
    submittedBy: row.submittedBy,
    createdAt: row.createdAt,
  };
}

/**
 * Public submission endpoint. No account required by design: the friction of
 * signing up is what stops people sharing a link they found five minutes ago.
 * Everything lands as "pending" and is visible on the Fresh drops shelf.
 */
export const submit = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    section: v.string(),
    why: v.string(),
    price: v.string(),
    tags: v.array(v.string()),
    submittedBy: v.string(),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isVisitorId(args.visitorId)) {
      return { ok: false, error: "Could not verify this browser. Reload and try again." };
    }

    const name = clean(args.name, LIMITS.name);
    const why = clean(args.why, LIMITS.why);
    const url = normalizeUrl(args.url);
    const section = clean(args.section, 40);
    const price = clean(args.price, 20) || "unknown";
    const submittedBy = clean(args.submittedBy, LIMITS.submittedBy) || "anonymous";
    const tags = cleanTags(args.tags);

    if (name.length < 2) return { ok: false, error: "Give it a name." };
    if (!url) return { ok: false, error: "That does not look like a web address." };
    if (!isSection(section)) return { ok: false, error: "Pick a shelf." };
    if (!isPrice(price)) return { ok: false, error: "Pick a price tier." };
    if (why.length < 15) {
      return { ok: false, error: "Say why it is worth using, in a sentence or two." };
    }

    const now = Date.now();
    const recent = await ctx.db
      .query("submissions")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();
    const lastHour = recent.filter((r) => now - r.createdAt < HOUR).length;
    const lastDay = recent.filter((r) => now - r.createdAt < DAY).length;
    if (lastHour >= MAX_PER_HOUR || lastDay >= MAX_PER_DAY) {
      return { ok: false, error: "That is a lot of finds at once. Try again later." };
    }

    const key = urlKey(url);
    const existing = await ctx.db.query("submissions").collect();
    if (existing.some((r) => r.status !== "rejected" && urlKey(r.url) === key)) {
      return { ok: false, error: "Someone already dropped that one." };
    }

    const id = await ctx.db.insert("submissions", {
      name,
      url,
      section,
      why,
      price,
      tags,
      submittedBy,
      visitorId: args.visitorId,
      status: "pending",
      createdAt: now,
    });

    return { ok: true, id };
  },
});

/** Fresh drops: everything waiting for review, newest first. */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).map(publicView);
  },
});

/** Approved but not yet merged into data/entries.json. */
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    return rows
      .filter((r) => !r.mergedAt)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(publicView);
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return { pending: pending.length };
  },
});

/**
 * Internal only: reachable through convex/admin.ts after the curator password
 * has been verified. Never exposed to the browser.
 */
export const setStatus = internalMutation({
  args: { id: v.id("submissions"), status: v.string() },
  handler: async (ctx, args) => {
    if (!["pending", "approved", "rejected"].includes(args.status)) {
      throw new Error("Unknown status");
    }
    await ctx.db.patch(args.id, { status: args.status, reviewedAt: Date.now() });
    return { ok: true };
  },
});

export const markMerged = internalMutation({
  args: { ids: v.array(v.id("submissions")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, { mergedAt: now });
    }
    return { ok: true, count: args.ids.length };
  },
});
