import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // Clerk's unique user ID
    name: v.string(),
    role: v.string(),
    imageUrl: v.string(),
    companyId: v.optional(v.id('companies')), // which company they belong to
  })
    .index('by_clerkId', ['clerkId'])
    .index('by_company', ['companyId']),

  companies: defineTable({
    name: v.string(),
    inviteCode: v.string(), // unique code to join
  }).index('by_inviteCode', ['inviteCode']),

  projects: defineTable({
    name: v.string(),
    companyId: v.id('companies'),
    description: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
  }).index('by_company', ['companyId']),

  sessions: defineTable({
    userId: v.string(), // Using clerkId as userId for simplicity in ongoing sessions
    startTime: v.number(),
    endTime: v.optional(v.number()),
    projectName: v.string(),
    tokensInput: v.optional(v.number()),
    tokensOutput: v.optional(v.number()),
    status: v.union(v.literal('active'), v.literal('completed')),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status']),
});
