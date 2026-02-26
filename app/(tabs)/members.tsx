import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { Users } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/convex/_generated/api';

export default function MembersScreen() {
  const { userId } = useAuth();
  const userProfile = useQuery(api.users.get, userId ? { clerkId: userId } : 'skip');
  const companyId = userProfile?.companyId;

  const company = useQuery(api.companies.get, companyId ? { companyId } : 'skip');
  const teamMembers = useQuery(api.users.getTeamMembers, companyId ? { companyId } : 'skip') || [];

  // Get all active sessions to show who's currently working
  const allActiveSessions = useQuery(api.sessions.getAllActive, {}) || [];

  // Combine members with their active session status
  const membersWithStatus = teamMembers.map((member) => {
    const activeSessions = allActiveSessions.filter((s) => s.userId === member.clerkId);
    return {
      ...member,
      isActive: activeSessions.length > 0,
      currentProjects: activeSessions.map((s) => s.projectName),
    };
  });

  // Sort: active members first, then alphabetically
  membersWithStatus.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.name.localeCompare(b.name);
  });

  const activeCount = membersWithStatus.filter((m) => m.isActive).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Users size={32} color="#22c55e" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.companyName}>{company?.name || 'チーム'}</Text>
          <Text style={styles.memberCount}>
            {teamMembers.length}名のメンバー ・ {activeCount}名が作業中
          </Text>
        </View>
      </View>

      {/* INVITE CODE */}
      {company?.inviteCode && (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteLabel}>招待コード</Text>
          <Text style={styles.inviteCode}>{company.inviteCode}</Text>
          <Text style={styles.inviteHint}>このコードを共有してメンバーを招待</Text>
        </View>
      )}

      {/* MEMBERS LIST */}
      <Text style={styles.sectionTitle}>メンバー一覧</Text>

      {membersWithStatus.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>メンバーがいません</Text>
        </View>
      ) : (
        <View style={styles.membersList}>
          {membersWithStatus.map((member, index) => (
            <Animated.View
              key={member._id}
              entering={FadeInDown.duration(400).delay(index * 80)}
              style={[styles.memberCard, member.isActive && styles.memberCardActive]}
            >
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
                {member.isActive && <View style={styles.onlineIndicator} />}
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {member.isActive && <View style={styles.activeBadge} />}
                </View>
                <Text style={styles.memberRole}>{member.role || 'メンバー'}</Text>

                {member.isActive && member.currentProjects.length > 0 && (
                  <View style={styles.projectTags}>
                    {member.currentProjects.map((project, i) => (
                      <View key={i} style={styles.projectTag}>
                        <Text style={styles.projectTagText}>{project}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.statusBadge}>
                <View
                  style={[styles.statusDot, member.isActive ? styles.statusActive : styles.statusOffline]}
                />
                <Text style={[styles.statusText, member.isActive && styles.statusTextActive]}>
                  {member.isActive ? '作業中' : 'オフライン'}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  memberCount: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
  },
  inviteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inviteLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22c55e',
    letterSpacing: 4,
  },
  inviteHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberCardActive: {
    borderColor: '#22c55e',
    backgroundColor: '#fefefe',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e2e8f0',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  activeBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  memberRole: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  projectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  projectTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectTagText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#22c55e',
  },
  statusOffline: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  statusTextActive: {
    color: '#22c55e',
  },
});
