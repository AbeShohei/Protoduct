import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { ChevronDown, Clock, Play, Square } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useToast } from '@/components/Toast';
import { api } from '@/convex/_generated/api';

function useLiveDuration(start: number) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [start]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${elapsed}s`;
}

// Subcomponent to handle a single active session card
function ActiveSessionCard({
  session,
  onStop,
}: {
  session: any;
  onStop: (id: string, tin: string, tout: string) => void;
}) {
  const [tokensIn, setTokensIn] = useState('');
  const [tokensOut, setTokensOut] = useState('');
  const durationText = useLiveDuration(session.startTime);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.projectBadge}>
          <View style={styles.badgeDot} />
          <Text style={styles.projectName}>{session.projectName}</Text>
        </View>
        <Text style={styles.timeText}>{durationText}</Text>
      </View>

      <View style={styles.sessionBody}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>入力 (Tokens)</Text>
          <TextInput
            style={styles.numberInput}
            value={tokensIn}
            onChangeText={setTokensIn}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>出力 (Tokens)</Text>
          <TextInput
            style={styles.numberInput}
            value={tokensOut}
            onChangeText={setTokensOut}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.stopBtn}
        onPress={() => onStop(session._id, tokensIn, tokensOut)}
      >
        <Square size={16} color="#fff" />
        <Text style={styles.stopBtnText}>退勤 (記録して終了)</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { userId } = useAuth();
  const activeSessions = useQuery(api.sessions.getActive, { userId: userId || '' }) || [];
  const allActiveTeamSessions = useQuery(api.sessions.getAllActive, {}) || [];

  const userProfile = useQuery(api.users.get, userId ? { clerkId: userId } : 'skip');
  const companyId = userProfile?.companyId;

  // Fetch all team members in the same company
  const teamMembers = useQuery(api.users.getTeamMembers, companyId ? { companyId } : 'skip') || [];

  // Combine members with their active session status
  const teamList = teamMembers.map((member) => {
    const activeSessionsForMember = allActiveTeamSessions.filter(
      (s) => s.userId === member.clerkId,
    );
    return {
      member,
      activeSessions: activeSessionsForMember,
    };
  });

  // Sort: active members first, then alphabetically by name
  teamList.sort((a, b) => {
    const aActive = a.activeSessions.length > 0;
    const bActive = b.activeSessions.length > 0;
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return a.member.name.localeCompare(b.member.name);
  });

  const rawRecentProjects =
    useQuery(api.sessions.getRecentProjects, { userId: userId || '' }) || [];
  // Filter out projects that are already active
  const recentProjects = rawRecentProjects.filter(
    (name) => !activeSessions.some((session) => session.projectName === name),
  );

  useEffect(() => {
    console.log('recentProjects:', recentProjects);
  }, [recentProjects]);

  const { showToast } = useToast();

  const startSession = useMutation(api.sessions.start);
  const stopSession = useMutation(api.sessions.stop);

  // New logic for project selection
  const companyProjects = useQuery(api.projects.list, { companyId: companyId }) || [];
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Auto-select the first project if none is selected and projects are loaded
  useEffect(() => {
    if (companyProjects.length > 0 && !selectedProject) {
      // Prioritize a recent project if possible
      const recentAvailable = recentProjects.find((name) =>
        companyProjects.some((p) => p.name === name),
      );
      if (recentAvailable) {
        const proj = companyProjects.find((p) => p.name === recentAvailable);
        if (proj) setSelectedProject(proj);
      } else {
        setSelectedProject(companyProjects[0]);
      }
    }
  }, [companyProjects, recentProjects, selectedProject]);

  const handleStart = async () => {
    if (!userId) return;
    if (!selectedProject) {
      showToast({ type: 'error', title: 'エラー', message: 'プロジェクトを選択してください。' });
      return;
    }
    await startSession({ userId, projectName: selectedProject.name });
    showToast({
      type: 'success',
      title: '🚀 作業開始',
      message: `${selectedProject.name} の作業を開始しました！`,
    });
  };

  const handleStop = async (sessionId: string, tin: string, tout: string) => {
    const input = parseInt(tin, 10) || 0;
    const output = parseInt(tout, 10) || 0;
    await stopSession({
      sessionId: sessionId as any,
      tokensInput: input,
      tokensOutput: output,
    });
    showToast({
      type: 'info',
      title: '☕️ 作業終了',
      message: '記録を保存しました！お疲れ様でした。',
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>こんにちは！</Text>
            <Text style={styles.subGreeting}>今日も一日がんばりましょう✨</Text>
          </View>
          {userProfile?.imageUrl && userProfile.imageUrl !== 'https://via.placeholder.com/150' && (
            <Image source={{ uri: userProfile.imageUrl }} style={styles.headerIcon} />
          )}
        </View>

        {/* START NEW PROJECT */}
        <View style={[styles.startCard, { zIndex: 10 }]}>
          <Text style={styles.cardTitle}>新しい作業を始める</Text>
          <View style={[styles.startRow, { zIndex: 10 }]}>
            <View style={{ flex: 1, position: 'relative', zIndex: 10 }}>
              <TouchableOpacity
                style={styles.projectSelectBtn}
                onPress={() => setIsProjectModalOpen(!isProjectModalOpen)}
              >
                <Text
                  style={[styles.projectSelectText, !selectedProject && { color: '#94a3b8' }]}
                  numberOfLines={1}
                >
                  {selectedProject ? selectedProject.name : 'プロジェクトを選択...'}
                </Text>
                <ChevronDown size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              {/* PULLDOWN MENU */}
              {isProjectModalOpen && companyProjects.length > 0 && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {companyProjects.map((proj) => (
                      <TouchableOpacity
                        key={proj._id}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setSelectedProject(proj);
                          setIsProjectModalOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText} numberOfLines={1}>
                          {proj.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.startBtn, !selectedProject && { opacity: 0.5 }]}
              onPress={handleStart}
              disabled={!selectedProject}
            >
              <Play size={20} color="#fff" fill="#fff" />
            </TouchableOpacity>
          </View>

          {companyProjects.length === 0 && (
            <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>
              ※ まずは「プロジェクト」タブからプロジェクトを作成してください。
            </Text>
          )}

          {recentProjects.length > 0 && companyProjects.length > 0 && (
            <View style={styles.recentProjectsContainer}>
              <Text style={styles.recentProjectsTitle}>最近の開発プロジェクト:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentProjectsScroll}
              >
                {recentProjects.map((name) => {
                  const proj = companyProjects.find((p) => p.name === name);
                  if (!proj) return null; // Only show if it still exists in company
                  return (
                    <TouchableOpacity
                      key={name}
                      style={styles.projectChip}
                      onPress={() => setSelectedProject(proj)}
                    >
                      <Text style={styles.projectChipText}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ACTIVE SESSIONS */}
        <Text style={styles.sectionHeading}>
          あなたの進行中プロジェクト ({activeSessions.length})
        </Text>
        {activeSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>現在進行中のプロジェクトはありません</Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {activeSessions.map((session) => (
              <ActiveSessionCard key={session._id} session={session} onStop={handleStop} />
            ))}
          </View>
        )}

        {/* TEAM VISIBILITY */}
        <Text style={styles.sectionHeading}>チームの開発状況</Text>
        {teamList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>チームメンバーが見つかりません</Text>
          </View>
        ) : (
          <View style={styles.teamList}>
            {teamList.map(({ member, activeSessions }, index) => (
              <Animated.View
                key={member._id}
                entering={FadeInDown.duration(400).delay(index * 100)}
                style={[styles.teamCard, activeSessions.length > 0 && styles.teamCardActive]}
              >
                <View style={[styles.teamUserIcon, { overflow: 'hidden' }]}>
                  {member.imageUrl && member.imageUrl !== 'https://via.placeholder.com/150' ? (
                    <Image
                      source={{ uri: member.imageUrl }}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                  ) : (
                    <Text style={styles.teamUserInitials}>
                      {member.name.substring(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamProject}>{member.name}</Text>
                  {activeSessions.length > 0 ? (
                    activeSessions.map((session, index) => (
                      <View
                        key={session._id}
                        style={[styles.teamTimeRow, index > 0 && { marginTop: 4 }]}
                      >
                        <Clock size={12} color="#22c55e" />
                        <Text
                          style={[styles.teamTimeText, { color: '#22c55e', fontWeight: '600' }]}
                        >
                          {session.projectName} を開発中
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.teamTimeRow}>
                      <Clock size={12} color="#94a3b8" />
                      <Text style={[styles.teamTimeText, { color: '#94a3b8' }]}>オフライン</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subGreeting: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  startCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  startRow: {
    flexDirection: 'row',
    gap: 12,
  },
  startInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  startBtn: {
    backgroundColor: '#22c55e',
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recentProjectsContainer: {
    marginTop: 16,
  },
  recentProjectsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  recentProjectsScroll: {
    gap: 8,
  },
  projectChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  projectChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  sessionsList: {
    gap: 16,
    marginBottom: 32,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  sessionBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  numberInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  stopBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  teamList: {
    gap: 12,
    marginBottom: 40,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  teamCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  teamUserIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  teamUserInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  teamInfo: {
    flex: 1,
  },
  teamProject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  teamTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamTimeText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  projectSelectBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
  },
  projectSelectText: {
    fontSize: 16,
    color: '#0f172a',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#334155',
  },
});
