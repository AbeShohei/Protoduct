import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Clock, Coins, Edit2, ExternalLink, Github, Save, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { Id } from '@/convex/_generated/dataModel';

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

function isValidGithubUrl(url: string) {
  const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w\-._]+\/[\w\-._]+\/?$/;
  return githubPattern.test(url);
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const project = useQuery(api.projects.get, { projectId: id as Id<'projects'> });
  const sessions = useQuery(
    api.sessions.getCompanySessions,
    id ? { memberIds: [], days: 365 } : 'skip',
  );

  // Filter sessions for this project
  const projectSessions = sessions?.filter((s) => s.projectName === project?.name) || [];

  // Calculate stats
  const totalSeconds = projectSessions.reduce((acc, s) => {
    if (s.endTime) return acc + Math.floor((s.endTime - s.startTime) / 1000);
    return acc;
  }, 0);
  const totalInput = projectSessions.reduce((acc, s) => acc + (s.tokensInput || 0), 0);
  const totalOutput = projectSessions.reduce((acc, s) => acc + (s.tokensOutput || 0), 0);

  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editGithubUrl, setEditGithubUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setEditName(project?.name || '');
    setEditDesc(project?.description || '');
    setEditGithubUrl(project?.githubUrl || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditName('');
    setEditDesc('');
    setEditGithubUrl('');
  };

  const saveChanges = async () => {
    if (!editName.trim()) {
      showToast({ type: 'error', title: 'エラー', message: 'プロジェクト名を入力してください' });
      return;
    }

    if (editGithubUrl.trim() && !isValidGithubUrl(editGithubUrl.trim())) {
      showToast({ type: 'error', title: 'エラー', message: 'GitHubのURLが正しくありません' });
      return;
    }

    setIsSaving(true);
    try {
      await updateProject({
        projectId: id as Id<'projects'>,
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        githubUrl: editGithubUrl.trim() || undefined,
      });
      showToast({ type: 'success', title: '保存完了', message: 'プロジェクトを更新しました' });
      setIsEditing(false);
    } catch (error) {
      showToast({ type: 'error', title: 'エラー', message: '更新に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    const doDelete = async () => {
      try {
        await removeProject({ projectId: id as Id<'projects'> });
        showToast({ type: 'info', title: '削除完了', message: 'プロジェクトを削除しました' });
        router.back();
      } catch (error) {
        showToast({ type: 'error', title: 'エラー', message: '削除に失敗しました' });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`「${project?.name}」を本当に削除しますか？\n\n※過去の同じ名前での稼働履歴は残ります。`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'プロジェクト削除',
        `「${project?.name}」を本当に削除しますか？\n\n※過去の同じ名前での稼働履歴は残ります。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '削除', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  };

  const openGithubUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      showToast({ type: 'error', title: 'エラー', message: 'URLを開けませんでした' });
    });
  };

  if (!project) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロジェクト詳細</Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <TouchableOpacity onPress={cancelEditing} style={styles.headerBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startEditing} style={styles.headerBtn}>
              <Edit2 size={22} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* PROJECT INFO CARD */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.infoCard}>
          {isEditing ? (
            <View style={styles.editForm}>
              <Text style={styles.editLabel}>プロジェクト名</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="プロジェクト名"
              />
              <Text style={styles.editLabel}>説明</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="説明（任意）"
                multiline
                numberOfLines={4}
              />
              <Text style={styles.editLabel}>GitHubリポジトリURL</Text>
              <View style={styles.githubInputContainer}>
                <Github size={18} color="#64748b" style={styles.githubIcon} />
                <TextInput
                  style={styles.githubInput}
                  value={editGithubUrl}
                  onChangeText={setEditGithubUrl}
                  placeholder="https://github.com/owner/repo"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={saveChanges}
                disabled={isSaving}
              >
                <Save size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{isSaving ? '保存中...' : '変更を保存'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.projectHeader}>
                <View style={styles.projectIcon}>
                  <Text style={styles.projectIconText}>{project.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.projectTitleRow}>
                  <Text style={styles.projectName}>{project.name}</Text>
                </View>
              </View>
              {project.description ? (
                <Text style={styles.projectDesc}>{project.description}</Text>
              ) : (
                <Text style={styles.projectDescEmpty}>説明なし</Text>
              )}

              {/* GitHub URL */}
              {project.githubUrl ? (
                <TouchableOpacity
                  style={styles.githubLinkCard}
                  onPress={() => openGithubUrl(project.githubUrl!)}
                >
                  <Github size={20} color="#24292f" />
                  <View style={styles.githubLinkInfo}>
                    <Text style={styles.githubLinkLabel}>GitHubリポジトリ</Text>
                    <Text style={styles.githubLinkUrl} numberOfLines={1}>
                      {project.githubUrl.replace('https://github.com/', '')}
                    </Text>
                  </View>
                  <ExternalLink size={18} color="#64748b" />
                </TouchableOpacity>
              ) : (
                <View style={styles.githubEmptyCard}>
                  <Github size={20} color="#cbd5e1" />
                  <Text style={styles.githubEmptyText}>GitHubリポジトリ未設定</Text>
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* STATS */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.statsCard}>
          <Text style={styles.statsTitle}>統計（全期間）</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Clock size={20} color="#3b82f6" />
              <Text style={styles.statValue}>{formatDuration(totalSeconds)}</Text>
              <Text style={styles.statLabel}>総作業時間</Text>
            </View>
            <View style={styles.statItem}>
              <Coins size={20} color="#f59e0b" />
              <Text style={styles.statValue}>{formatNumber(totalInput + totalOutput)}</Text>
              <Text style={styles.statLabel}>総トークン</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValueLarge}>{projectSessions.length}</Text>
              <Text style={styles.statLabel}>セッション数</Text>
            </View>
          </View>
        </Animated.View>

        {/* RECENT SESSIONS */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sessionsCard}>
          <Text style={styles.sessionsTitle}>最近のセッション</Text>
          {projectSessions.length === 0 ? (
            <Text style={styles.noSessions}>セッションがありません</Text>
          ) : (
            <View style={styles.sessionsList}>
              {projectSessions.slice(0, 10).map((session) => {
                const duration = session.endTime
                  ? Math.floor((session.endTime - session.startTime) / 1000)
                  : 0;
                const date = new Date(session.startTime);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

                return (
                  <View key={session._id} style={styles.sessionItem}>
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionDate}>{dateStr}</Text>
                    </View>
                    <View style={styles.sessionRight}>
                      <Text style={styles.sessionDuration}>{formatDuration(duration)}</Text>
                      <Text style={styles.sessionTokens}>
                        {formatNumber((session.tokensInput || 0) + (session.tokensOutput || 0))} tkn
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* DELETE BUTTON */}
        {!isEditing && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.dangerZone}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Trash2 size={18} color="#ef4444" />
              <Text style={styles.deleteBtnText}>プロジェクトを削除</Text>
            </TouchableOpacity>
          </Animated.View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  projectIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  projectTitleRow: {
    flex: 1,
  },
  projectName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  projectDesc: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  projectDescEmpty: {
    fontSize: 15,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  githubLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f8fa',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  githubLinkInfo: {
    flex: 1,
  },
  githubLinkLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  githubLinkUrl: {
    fontSize: 14,
    color: '#24292f',
    fontWeight: '600',
    marginTop: 2,
  },
  githubEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  githubEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  editForm: {
    gap: 12,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  editInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  editTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  githubInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  githubIcon: {
    marginRight: 8,
  },
  githubInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  statValueLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  sessionsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sessionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
  },
  noSessions: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  sessionsList: {
    gap: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sessionLeft: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  sessionTokens: {
    fontSize: 12,
    color: '#94a3b8',
  },
  dangerZone: {
    marginTop: 16,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
