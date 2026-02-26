import { mutation } from './_generated/server';

export const createFakeSession = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the first user to use as the userId
    const users = await ctx.db.query('users').collect();
    if (users.length === 0) return 'No users found';

    const userId = users[0].clerkId;

    // Create a session that is already "completed"
    const _sessionId = await ctx.db.insert('sessions', {
      userId,
      projectName: '過去のテストプロジェクト',
      startTime: Date.now() - 100000,
      endTime: Date.now() - 50000,
      status: 'completed',
    });
    return `Created past session for user ${userId} with project name '過去のテストプロジェクト'`;
  },
});
