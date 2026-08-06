"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { compare } from "bcryptjs";

/**
 * Curator moderation. There is exactly one privileged person here, so there are
 * no accounts: a single passphrase is checked against a bcrypt hash held in the
 * Convex environment variable CURATOR_PASSWORD_HASH.
 *
 * SECURITY-REVIEW: the passphrase is sent with each moderation call and verified
 * server-side every time. No session token is minted, so nothing privileged is
 * ever written to localStorage on a static site that cannot set HttpOnly cookies.
 * Generate the hash with:  node scripts/hash-passphrase.mjs
 */

const GENERIC_ERROR = "Could not verify that passphrase.";

async function verify(ctx: any, password: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const hash = process.env.CURATOR_PASSWORD_HASH;
  if (!hash) {
    return { ok: false, error: "Moderation is not configured on this deployment." };
  }
  if (typeof password !== "string" || password.length === 0 || password.length > 200) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const lock = await ctx.runMutation(internal.moderation.checkLock, {});
  if (lock.locked) {
    return { ok: false, error: "Too many attempts. Try again later." };
  }

  const match = await compare(password, hash);
  await ctx.runMutation(internal.moderation.recordResult, { success: match });
  return match ? { ok: true } : { ok: false, error: GENERIC_ERROR };
}

/** Approve or reject one submission. */
export const review = action({
  args: {
    password: v.string(),
    id: v.id("submissions"),
    decision: v.string(), // "approved" | "rejected"
  },
  handler: async (ctx, args) => {
    const auth = await verify(ctx, args.password);
    if (!auth.ok) return auth;

    if (args.decision !== "approved" && args.decision !== "rejected") {
      return { ok: false, error: "Unknown decision." };
    }
    await ctx.runMutation(internal.submissions.setStatus, {
      id: args.id,
      status: args.decision,
    });
    return { ok: true };
  },
});

/** Confirm a passphrase without changing anything, so the UI can unlock. */
export const check = action({
  args: { password: v.string() },
  handler: async (ctx, args) => verify(ctx, args.password),
});

/** Called by scripts/sync-approved.mjs once entries land in data/entries.json. */
export const markMerged = action({
  args: { password: v.string(), ids: v.array(v.id("submissions")) },
  handler: async (ctx, args) => {
    const auth = await verify(ctx, args.password);
    if (!auth.ok) return auth;
    return await ctx.runMutation(internal.submissions.markMerged, { ids: args.ids });
  },
});
