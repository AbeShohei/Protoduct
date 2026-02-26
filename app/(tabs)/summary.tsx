import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/convex/_generated/api';

interface Session {
  _id: string;
  userId: string;
  projectName: string;
  startTime: number;
  endTime?: number;
  tokensInput?: number;
  tokensOutput?: number;
  status: string;
}

interface Member {
  _id: string;
  clerkId: string;
  name: string;
  role: string;
  imageUrl: string;
}

interface Project {
  _id: string;
  name: string;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function calcSessionStats(sessions: Session[]) {
  let totalSeconds = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const s of sessions) {
    if (s.endTime) {
      totalSeconds += Math.floor((s.endTime - s.startTime) / 1000);
    }
    totalInput += s.tokensInput || 0;
    totalOutput += s.tokensOutput || 0;
  }

  return { totalSeconds, totalInput, totalOutput };
}

export default function SummaryScreen() {
  const { userId } = useAuth();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Get user and company info
  const userProfile = useQuery(api.users.get, userId ? { clerkId: userId } : 'skip');
  const companyId = userProfile?.companyId;
  const company = useQuery(api.companies.get, companyId ? { companyId } : 'skip');

  // Get team members and projects
  const teamMembers = useQuery(api.users.getTeamMembers, companyId ? { companyId } : 'skip') || [];
  const projects = useQuery(api.projects.list, companyId ? { companyId } : 'skip') || [];

  // Get all sessions for the team (last 30 days)
  const memberIds = teamMembers.map((m: Member) => m.clerkId);
  const teamSessions = useQuery(
    api.sessions.getCompanySessions,
    memberIds.length > 0 ? { memberIds, days: 30 } : 'skip',
  ) as Session[] | undefined;

  // Calculate stats
  const totalStats = teamSessions ? calcSessionStats(teamSessions) : null;

  // Group by member
  const memberStats = teamMembers.map((member: Member) => {
    const memberSessions = teamSessions?.filter((s) => s.userId === member.clerkId) || [];
    const stats = calcSessionStats(memberSessions);

    // Group by project for this member
    const byProject: { [key: string]: Session[] } = {};
    memberSessions.forEach((s) => {
      if (!byProject[s.projectName]) byProject[s.projectName] = [];
      byProject[s.projectName].push(s);
    });

    const projectStats = Object.entries(byProject).map(([name, sessions]) => ({
      name,
      ...calcSessionStats(sessions),
      sessionCount: sessions.length,
    }));

    return {
      ...member,
      ...stats,
      sessionCount: memberSessions.length,
      projectStats,
    };
  });

  // Sort members by total hours (descending)
  memberStats.sort((a, b) => b.totalSeconds - a.totalSeconds);

  // Group by project
  const projectStats = projects.map((project: Project) => {
    const projectSessions = teamSessions?.filter((s) => s.projectName === project.name) || [];
    const stats = calcSessionStats(projectSessions);

    // Group by member for this project
    const byMember: { [key: string]: Session[] } = {};
    projectSessions.forEach((s) => {
      if (!byMember[s.userId]) byMember[s.userId] = [];
      byMember[s.userId].push(s);
    });

    const memberBreakdown = Object.entries(byMember).map(([clerkId, sessions]) => {
      const member = teamMembers.find((m: Member) => m.clerkId === clerkId);
      return {
        member,
        ...calcSessionStats(sessions),
        sessionCount: sessions.length,
      };
    });

    // Sort by hours
    memberBreakdown.sort((a, b) => b.totalSeconds - a.totalSeconds);

    return {
      ...project,
      ...stats,
      sessionCount: projectSessions.length,
      memberBreakdown,
    };
  });

  // Filter out projects with no sessions and sort
  const activeProjects = projectStats
    .filter((p: { sessionCount: number }) => p.sessionCount > 0)
    .sort((a: { totalSeconds: number }, b: { totalSeconds: number }) => b.totalSeconds - a.totalSeconds);

  if (!teamSessions) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>サマリー</Text>
          <Text style={styles.subtitle}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>サマリー</Text>
        <Text style={styles.subtitle}>{company?.name || 'チーム'}の実績（過去30日間）</Text>
      </View>

      {/* TOTAL STATS */}
      <View style={styles.totalStatsCard}>
        <View style={styles.totalStatsRow}>
          <View style={styles.totalStatItem}>
            <View style={[styles.totalStatIcon, { backgroundColor: '#dbeafe' }]}>
              <Clock size={24} color="#3b82f6" />
            </View>
            <Text style={styles.totalStatValue}>
              {totalStats ? formatDuration(totalStats.totalSeconds) : '0m'}
            </Text>
            <Text style={styles.totalStatLabel}>総作業時間</Text>
          </View>
          <View style={styles.totalStatItem}>
            <View style={[styles.totalStatIcon, { backgroundColor: '#dcfce7' }]}>
              <TrendingUp size={24} color="#22c55e" />
            </View>
            <Text style={styles.totalStatValue}>{teamSessions?.length || 0}</Text>
            <Text style={styles.totalStatLabel}>セッション数</Text>
          </View>
          <View style={styles.totalStatItem}>
            <View style={[styles.totalStatIcon, { backgroundColor: '#fef3c7' }]}>
              <Coins size={24} color="#f59e0b" />
            </View>
            <Text style={styles.totalStatValue}>
              {totalStats ? formatNumber(totalStats.totalInput + totalStats.totalOutput) : '0'}
            </Text>
            <Text style={styles.totalStatLabel}>総トークン</Text>
          </View>
        </View>
      </View>

      {/* BY MEMBER */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={20} color="#64748b" />
          <Text style={styles.sectionTitle}>メンバー別</Text>
        </View>

        {memberStats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>データがありません</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {memberStats.map((member, index) => (
              <Animated.View
                key={member._id}
                entering={FadeInDown.duration(400).delay(index * 80)}
              >
                <TouchableOpacity
                  style={[styles.memberCard, expandedMember === member._id && styles.memberCardExpanded]}
                  onPress={() =>
                    setExpandedMember(expandedMember === member._id ? null : member._id)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.memberHeader}>
                    <View style={styles.memberInfo}>
                      <View style={styles.avatarContainer}>
                        {member.imageUrl && member.imageUrl !== 'https://via.placeholder.com/150' ? (
                          <Image source={{ uri: member.imageUrl }} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                              {member.name.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <Text style={styles.memberRole}>{member.role || 'メンバー'}</Text>
                      </View>
                    </View>
                    <View style={styles.memberStats}>
                      <Text style={styles.memberTime}>{formatDuration(member.totalSeconds)}</Text>
                      <Text style={styles.memberSessionCount}>{member.sessionCount}件</Text>
                    </View>
                    {expandedMember === member._id ? (
                      <ChevronUp size={20} color="#94a3b8" />
                    ) : (
                      <ChevronDown size={20} color="#94a3b8" />
                    )}
                  </View>

                  {expandedMember === member._id && member.projectStats.length > 0 && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.expandedTitle}>プロジェクト別</Text>
                      {member.projectStats.map((proj: { name: string; totalSeconds: number; sessionCount: number; totalInput: number; totalOutput: number }) => (
                        <View key={proj.name} style={styles.subItem}>
                          <View style={styles.subItemLeft}>
                            <View style={styles.projectDot} />
                            <Text style={styles.subItemName}>{proj.name}</Text>
                          </View>
                          <View style={styles.subItemRight}>
                            <Text style={styles.subItemTime}>{formatDuration(proj.totalSeconds)}</Text>
                            <Text style={styles.subItemTokens}>
                              {formatNumber(proj.totalInput + proj.totalOutput)} tokens
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* BY PROJECT */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Activity size={20} color="#64748b" />
          <Text style={styles.sectionTitle}>プロジェクト別</Text>
        </View>

        {activeProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>データがありません</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {activeProjects.map((project: { _id: string; name: string; totalSeconds: number; sessionCount: number; totalInput: number; totalOutput: number; memberBreakdown: any[] }, index: number) => (
              <Animated.View
                key={project._id}
                entering={FadeInDown.duration(400).delay((memberStats.length + index) * 80)}
              >
                <TouchableOpacity
                  style={[styles.projectCard, expandedProject === project._id && styles.projectCardExpanded]}
                  onPress={() =>
                    setExpandedProject(expandedProject === project._id ? null : project._id)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.projectHeader}>
                    <View style={styles.projectInfo}>
                      <View style={styles.projectBadge}>
                        <View style={styles.projectBadgeDot} />
                        <Text style={styles.projectName}>{project.name}</Text>
                      </View>
                    </View>
                    <View style={styles.projectStats}>
                      <Text style={styles.projectTime}>{formatDuration(project.totalSeconds)}</Text>
                      <Text style={styles.projectSessionCount}>{project.sessionCount}件</Text>
                    </View>
                    {expandedProject === project._id ? (
                      <ChevronUp size={20} color="#94a3b8" />
                    ) : (
                      <ChevronDown size={20} color="#94a3b8" />
                    )}
                  </View>

                  <View style={styles.projectTokens}>
                    <Coins size={14} color="#f59e0b" />
                    <Text style={styles.projectTokensText}>
                      {formatNumber(project.totalInput + project.totalOutput)} tokens
                    </Text>
                  </View>

                  {expandedProject === project._id && project.memberBreakdown.length > 0 && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.expandedTitle}>メンバー別</Text>
                      {project.memberBreakdown.map((item: { member: Member; totalSeconds: number; sessionCount: number; totalInput: number; totalOutput: number }) => (
                        <View key={item.member._id} style={styles.subItem}>
                          <View style={styles.subItemLeft}>
                            {item.member.imageUrl && item.member.imageUrl !== 'https://via.placeholder.com/150' ? (
                              <Image source={{ uri: item.member.imageUrl }} style={styles.subItemAvatar} />
                            ) : (
                              <View style={styles.subItemAvatarPlaceholder}>
                                <Text style={styles.subItemAvatarText}>
                                  {item.member.name.substring(0, 1).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.subItemName}>{item.member.name}</Text>
                          </View>
                          <View style={styles.subItemRight}>
                            <Text style={styles.subItemTime}>{formatDuration(item.totalSeconds)}</Text>
                            <Text style={styles.subItemTokens}>
                              {formatNumber(item.totalInput + item.totalOutput)} tokens
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
  },
  totalStatsCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  totalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalStatItem: {
    alignItems: 'center',
  },
  totalStatIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  totalStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  list: {
    gap: 10,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberCardExpanded: {
    borderColor: '#22c55e',
    backgroundColor: '#fefefe',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    marginRight: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  memberRole: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  memberStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  memberTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  memberSessionCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  projectCardExpanded: {
    borderColor: '#3b82f6',
    backgroundColor: '#fefefe',
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  projectStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  projectTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  projectSessionCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  projectTokens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  projectTokensText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  subItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  subItemAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  subItemAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subItemAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  subItemName: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  subItemRight: {
    alignItems: 'flex-end',
  },
  subItemTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  subItemTokens: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
});
