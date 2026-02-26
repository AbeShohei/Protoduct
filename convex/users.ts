import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Get current user by Clerk ID
export const get = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', clerkId))
      .first();
  },
});

// Get all users in a specific company
export const getTeamMembers = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, { companyId }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_company', (q) => q.eq('companyId', companyId))
      .collect();
  },
});

// Generate an upload URL for images
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Create or update user profile
export const createProfile = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    role: v.string(),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    let finalImageUrl = args.imageUrl || 'https://via.placeholder.com/150';
    if (args.storageId) {
      finalImageUrl = (await ctx.storage.getUrl(args.storageId)) || finalImageUrl;
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .first();

    if (existing) {
      // Update if already exists
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        imageUrl: finalImageUrl,
      });
      return existing._id;
    }

    // Insert new user
    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      name: args.name,
      role: args.role,
      imageUrl: finalImageUrl,
    });
  },
});

// Join a company
export const joinCompany = mutation({
  args: {
    clerkId: v.string(),
    companyId: v.id('companies'),
  },
  handler: async (ctx, { clerkId, companyId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', clerkId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(user._id, {
      companyId: companyId,
    });

    return user._id;
  },
});

// Leave current company
export const leaveCompany = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', clerkId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(user._id, {
      companyId: undefined,
    });

    return user._id;
  },
});
