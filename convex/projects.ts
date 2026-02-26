import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: { companyId: v.optional(v.id('companies')) },
  handler: async (ctx, args) => {
    if (!args.companyId) return [];

    return await ctx.db
      .query('projects')
      .withIndex('by_company', (q) => q.eq('companyId', args.companyId!))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    companyId: v.id('companies'),
    description: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('projects', {
      name: args.name,
      companyId: args.companyId,
      description: args.description,
      githubUrl: args.githubUrl,
    });
  },
});

export const remove = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.projectId);
  },
});

export const update = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    await ctx.db.patch(projectId, updates);
    return await ctx.db.get(projectId);
  },
});

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});
