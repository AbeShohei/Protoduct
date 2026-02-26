import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Utility to generate a random 6-character alphanumeric code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get company by invite code
export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    return await ctx.db
      .query('companies')
      .withIndex('by_inviteCode', (q) => q.eq('inviteCode', inviteCode.toUpperCase()))
      .first();
  },
});

// Get company by ID
export const get = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, { companyId }) => {
    return await ctx.db.get(companyId);
  },
});

// Create a new company
export const create = mutation({
  args: {
    name: v.string(),
    creatorClerkId: v.string(), // The user creating the company
  },
  handler: async (ctx, { name, creatorClerkId }) => {
    // Generate a unique invite code
    let inviteCode = '';
    let isUnique = false;

    // Safety loop to ensure uniqueness
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      inviteCode = generateInviteCode();
      const existing = await ctx.db
        .query('companies')
        .withIndex('by_inviteCode', (q) => q.eq('inviteCode', inviteCode))
        .first();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) throw new Error('Failed to generate unique invite code');

    // Create the company
    const companyId = await ctx.db.insert('companies', {
      name,
      inviteCode,
    });

    // Automatically join the creator to this new company
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', creatorClerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { companyId });
    }

    return companyId;
  },
});
