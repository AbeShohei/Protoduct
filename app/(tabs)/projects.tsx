import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Briefcase, ChevronRight, FolderPlus, Github } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useToast } from '@/components/Toast';
import { api } from '@/convex/_generated/api';

export default function ProjectsScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const userProfile = useQuery(api.users.get, { clerkId: userId || '' });

  const projects =
    useQuery(api.projects.list, {
      companyId: userProfile?.companyId,
    }) || [];

  const createProject = useMutation(api.projects.create);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newGithubUrl, setNewGithubUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!userProfile?.companyId) {
      showToast({ type: 'error', title: 'エラー', message: '会社情報が取得できません。' });
      return;
    }
    if (!newProjectName.trim()) {
      showToast({ type: 'error', title: 'エラー', message: 'プロジェクト名を入力してください。' });
      return;
    }

    // Validate GitHub URL if provided
    if (newGithubUrl.trim() && !isValidGithubUrl(newGithubUrl.trim())) {
      showToast({ type: 'error', title: 'エラー', message: 'GitHubのURLが正しくありません。' });
      return;
    }

    try {
      setIsSubmitting(true);
      await createProject({
        name: newProjectName.trim(),
        companyId: userProfile.companyId,
        description: newProjectDesc.trim() || undefined,
        githubUrl: newGithubUrl.trim() || undefined,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setNewGithubUrl('');
      showToast({
        type: 'success',
        title: 'プロジェクト作成成功',
        message: '新しいプロジェクトを作成しました！',
      });
    } catch (_error) {
      showToast({ type: 'error', title: 'エラー', message: 'プロジェクトの作成に失敗しました。' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidGithubUrl = (url: string) => {
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w\-._]+\/[\w\-._]+\/?$/;
    return githubPattern.test(url);
  };

  const handleProjectPress = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  const openGithubUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      showToast({ type: 'error', title: 'エラー', message: 'URLを開けませんでした。' });
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionHeading}>
        プロジェクト管理
        {projects.length > 0 && ` (${projects.length})`}
      </Text>

      {/* CREATE NEW PROJECT CARD */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.createCard}>
        <View style={styles.cardHeader}>
          <FolderPlus size={20} color="#16a34a" />
          <Text style={styles.cardTitle}>新規プロジェクト作成</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="プロジェクト名 (必須)"
          placeholderTextColor="#94a3b8"
          value={newProjectName}
          onChangeText={setNewProjectName}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="説明 (任意)"
          placeholderTextColor="#94a3b8"
          value={newProjectDesc}
          onChangeText={setNewProjectDesc}
          multiline
        />
        <View style={styles.githubInputContainer}>
          <Github size={18} color="#64748b" style={styles.githubIcon} />
          <TextInput
            style={styles.githubInput}
            placeholder="GitHubリポジトリURL (任意)"
            placeholderTextColor="#94a3b8"
            value={newGithubUrl}
            onChangeText={setNewGithubUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
        <TouchableOpacity
          style={[styles.createBtn, isSubmitting && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          <Text style={styles.createBtnText}>{isSubmitting ? '作成中...' : '作成する'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* PROJECT LIST */}
      <Text style={styles.sectionSubHeading}>登録済みプロジェクト一覧</Text>
      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>まだプロジェクトがありません。</Text>
        </View>
      ) : (
        <View style={styles.projectList}>
          {projects.map((project, index) => (
            <Animated.View
              key={project._id}
              entering={FadeInDown.duration(400).delay(index * 100)}
            >
              <TouchableOpacity
                style={styles.projectCard}
                onPress={() => handleProjectPress(project._id)}
                activeOpacity={0.7}
              >
                <View style={styles.projectIconBox}>
                  <Briefcase size={20} color="#22c55e" />
                </View>
                <View style={styles.projectInfo}>
                  <View style={styles.projectNameRow}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    {project.githubUrl && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          openGithubUrl(project.githubUrl!);
                        }}
                        style={styles.githubBadge}
                      >
                        <Github size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {project.description ? (
                    <Text style={styles.projectDesc} numberOfLines={2}>
                      {project.description}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  sectionHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 24,
    marginTop: 16,
  },
  sectionSubHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
    marginTop: 16,
  },
  createCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  githubInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  githubIcon: {
    marginRight: 8,
  },
  githubInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  createBtn: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.7,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '500',
  },
  projectList: {
    gap: 12,
  },
  projectCard: {
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
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  projectIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  projectInfo: {
    flex: 1,
  },
  projectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  githubBadge: {
    backgroundColor: '#24292f',
    padding: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  projectDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
