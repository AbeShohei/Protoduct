import React, { createContext, ReactNode, useContext, useState } from 'react';

// Type definitions for mock data
export interface Session {
  _id: string;
  userId: string;
  projectName: string;
  startTime: number;
  endTime?: number;
  tokensInput?: number;
  tokensOutput?: number;
}

export interface User {
  _id: string;
  clerkId: string;
  name: string;
  role: string;
  imageUrl: string;
  companyId?: string;
}

export interface Company {
  _id: string;
  name: string;
  inviteCode: string;
}

// Global static mock data
let mockSessions: Session[] = [
  {
    _id: 'session_1',
    userId: 'user_123',
    projectName: 'Frontend React Task',
    startTime: Date.now() - 3600000 * 2, // 2 hours ago
    endTime: Date.now() - 3600000,
    tokensInput: 1500,
    tokensOutput: 800,
  },
  {
    _id: 'session_2',
    userId: 'user_123',
    projectName: 'UI Design Setup',
    startTime: Date.now() - 3600000 * 24, // 1 day ago
    endTime: Date.now() - 3600000 * 23,
    tokensInput: 300,
    tokensOutput: 1500,
  },
];

let mockUsers: User[] = [];

let mockCompanies: Company[] = [
  {
    _id: 'company_mock_1',
    name: 'Mighty Corp',
    inviteCode: 'MIGHTY',
  },
];

// Context
interface MockConvexContextType {
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
}

const MockConvexContext = createContext<MockConvexContextType | null>(null);

// Provider
export function MockConvexProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);

  // Sync state back to global to persist across hot reloads if needed
  React.useEffect(() => {
    mockSessions = sessions;
    mockUsers = users;
    mockCompanies = companies;
  }, [sessions, users, companies]);

  return (
    <MockConvexContext.Provider
      value={{ sessions, setSessions, users, setUsers, companies, setCompanies }}
    >
      {children}
    </MockConvexContext.Provider>
  );
}

// Hook to access the context internally
function useMockConvex() {
  const context = useContext(MockConvexContext);
  if (!context) {
    throw new Error('useMockConvex must be used within a MockConvexProvider');
  }
  return context;
}

// --- MOCK HOOKS TO REPLACE CONVEX/REACT ---

// Mocking the `api` object structure used in the app
export const api = {
  sessions: {
    getActive: 'sessions.getActive',
    getAllActive: 'sessions.getAllActive',
    start: 'sessions.start',
    stop: 'sessions.stop',
    getToday: 'sessions.getToday',
    getWeek: 'sessions.getWeek',
    list: 'sessions.list',
  },
  users: {
    get: 'users.get',
    createProfile: 'users.createProfile',
    joinCompany: 'users.joinCompany',
  },
  companies: {
    get: 'companies.get',
    getByInviteCode: 'companies.getByInviteCode',
    create: 'companies.create',
  },
};

/**
 * Mocks convex useQuery hook
 */
export function useQuery<T = any>(query: string, args: any): T {
  const { sessions, users, companies } = useMockConvex();

  switch (query) {
    // ---- USERS ----
    case api.users.get:
      if (!args?.clerkId) return null as T;
      return (users.find((u) => u.clerkId === args.clerkId) || null) as T;

    // ---- COMPANIES ----
    case api.companies.get:
      if (!args?.companyId) return null as T;
      return (companies.find((c) => c._id === args.companyId) || null) as T;

    case api.companies.getByInviteCode:
      if (!args?.inviteCode) return null as T;
      return (companies.find((c) => c.inviteCode === args.inviteCode.toUpperCase()) || null) as T;

    // ---- SESSIONS ----
    case api.sessions.getActive:
      if (!args?.userId) return null as T;
      return sessions.filter((s) => s.userId === args.userId && !s.endTime) as T;

    case api.sessions.getAllActive:
      return sessions.filter((s) => !s.endTime) as T;

    case api.sessions.getToday: {
      if (!args?.userId) return null as T;
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return sessions.filter(
        (s) => s.userId === args.userId && s.startTime >= startOfToday.getTime(),
      ) as T;
    }
    case api.sessions.getWeek: {
      if (!args?.userId) return null as T;
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      return sessions.filter(
        (s) => s.userId === args.userId && s.startTime >= startOfWeek.getTime(),
      ) as T;
    }

    case api.sessions.list:
      if (!args?.userId) return null as T;
      // Note: Ignoring `limit` for simplicity, but could be added easily
      return sessions
        .filter((s) => s.userId === args.userId)
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, args.limit || 20) as T;

    default:
      console.warn('Unhandled mock query:', query);
      return null as T;
  }
}

/**
 * Mocks convex useMutation hook
 */
export function useMutation<T = any>(mutation: string): T {
  const { setSessions, setUsers, setCompanies } = useMockConvex();

  switch (mutation) {
    // ---- USERS ----
    case api.users.createProfile:
      return (async (args: { clerkId: string; name: string; role: string; imageUrl: string }) => {
        let newUserId = `user_${Date.now()}`;
        setUsers((prev) => {
          const existing = prev.find((u) => u.clerkId === args.clerkId);
          if (existing) {
            newUserId = existing._id;
            return prev.map((u) => (u.clerkId === args.clerkId ? { ...u, ...args } : u));
          }
          return [
            ...prev,
            {
              _id: newUserId,
              clerkId: args.clerkId,
              name: args.name,
              role: args.role,
              imageUrl: args.imageUrl,
            },
          ];
        });
        return newUserId;
      }) as T;

    case api.users.joinCompany:
      return (async (args: { clerkId: string; companyId: string }) => {
        setUsers((prev) =>
          prev.map((u) => (u.clerkId === args.clerkId ? { ...u, companyId: args.companyId } : u)),
        );
        return true;
      }) as T;

    // ---- COMPANIES ----
    case api.companies.create:
      return (async (args: { name: string; creatorClerkId: string }) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let inviteCode = '';
        for (let i = 0; i < 6; i++) {
          inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const newCompany = {
          _id: `company_${Date.now()}`,
          name: args.name,
          inviteCode,
        };

        setCompanies((prev) => [...prev, newCompany]);

        // Auto join creator
        setUsers((prev) =>
          prev.map((u) =>
            u.clerkId === args.creatorClerkId ? { ...u, companyId: newCompany._id } : u,
          ),
        );

        return newCompany._id;
      }) as T;

    // ---- SESSIONS ----
    case api.sessions.start:
      return (async (args: { userId: string; projectName: string }) => {
        const newSession: Session = {
          _id: `session_${Date.now()}`,
          userId: args.userId,
          projectName: args.projectName,
          startTime: Date.now(),
        };
        setSessions((prev) => [...prev, newSession]);
        return newSession._id;
      }) as T;

    case api.sessions.stop:
      return (async (args: { sessionId: string; tokensInput?: number; tokensOutput?: number }) => {
        setSessions((prev) =>
          prev.map((s) =>
            s._id === args.sessionId
              ? {
                  ...s,
                  endTime: Date.now(),
                  tokensInput: args.tokensInput,
                  tokensOutput: args.tokensOutput,
                }
              : s,
          ),
        );
      }) as T;

    default:
      console.warn('Unhandled mock mutation:', mutation);
      return (async () => {}) as T;
  }
}
