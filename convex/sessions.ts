import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Get active sessions for user (returns array to support multiple projects)
export const getActive = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user_status', (q) => q.eq('userId', userId).eq('status', 'active'))
      .collect();
  },
});

// Get ALL active sessions across the team (for home screen)
export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    // Collect all active sessions. In a real app with many users, you might want
    // to index purely on 'status' or paginate. Here we filter in memory or use full table scan
    // since we use a custom index `by_user_status` which implies userId first.
    const allSessions = await ctx.db.query('sessions').collect();
    return allSessions.filter((s) => s.status === 'active');
  },
});

// Start a new session (allows multiple)
export const start = mutation({
  args: {
    userId: v.string(),
    projectName: v.string(),
  },
  handler: async (ctx, { userId, projectName }) => {
    const sessionId = await ctx.db.insert('sessions', {
      userId,
      projectName,
      startTime: Date.now(),
      status: 'active',
    });

    return await ctx.db.get(sessionId);
  },
});

// Stop session
export const stop = mutation({
  args: {
    sessionId: v.id('sessions'),
    tokensInput: v.optional(v.number()),
    tokensOutput: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, tokensInput, tokensOutput }) => {
    await ctx.db.patch(sessionId, {
      endTime: Date.now(),
      status: 'completed',
      tokensInput: tokensInput ?? 0,
      tokensOutput: tokensOutput ?? 0,
    });

    return await ctx.db.get(sessionId);
  },
});

// Get unique recent project names for a user
export const getRecentProjects = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const recentSessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(50);

    // Extract unique project names
    const uniqueProjects = Array.from(new Set(recentSessions.map((s) => s.projectName)));
    return uniqueProjects;
  },
});

// Get sessions history
export const list = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 10 }) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit);
  },
});

// Get today's sessions
export const getToday = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.gte(q.field('startTime'), startOfDay.getTime()))
      .collect();
  },
});

// Get this week's sessions
export const getWeek = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.gte(q.field('startTime'), weekAgo.getTime()))
      .collect();
  },
});

// Get all completed sessions for a company (for team summary)
export const getCompanySessions = query({
  args: {
    memberIds: v.array(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, { memberIds, days = 30 }) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const allSessions = await ctx.db.query('sessions').collect();

    return allSessions.filter(
      (s) =>
        memberIds.includes(s.userId) &&
        s.status === 'completed' &&
        s.startTime >= startDate.getTime(),
    );
  },
});
