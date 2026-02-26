import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Building2, LogOut, User } from 'lucide-react-native';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { api } from '@/convex/_generated/api';

export default function SettingsScreen() {
  const { signOut, userId } = useAuth();
  const router = useRouter();
  const userProfile = useQuery(api.users.get, { clerkId: userId || '' });
  const company = useQuery(
    api.companies.get,
    userProfile?.companyId ? { companyId: userProfile.companyId } : 'skip',
  );

  const leaveCompany = useMutation(api.users.leaveCompany);

  const handleSignOut = async () => {
    const doSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out error:', error);
        Alert.alert('エラー', 'ログアウトに失敗しました');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('本当にログアウトしますか？')) {
        await doSignOut();
      }
    } else {
      Alert.alert(
        'ログアウト',
        '本当にログアウトしますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ログアウト',
            style: 'destructive',
            onPress: doSignOut,
          },
        ],
      );
    }
  };

  const handleLeaveCompany = async () => {
    const doLeave = async () => {
      try {
        await leaveCompany({ clerkId: userId || '' });
        router.replace('/onboarding/company');
      } catch (error) {
        console.error('Leave company error:', error);
        if (Platform.OS === 'web') {
          window.alert('脱退に失敗しました');
        } else {
          Alert.alert('エラー', '脱退に失敗しました');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('本当にこのワークスペースから脱退しますか？\n\n※あなたの作業履歴は残りますが、チームの情報にはアクセスできなくなります。')) {
        await doLeave();
      }
    } else {
      Alert.alert(
        'ワークスペースから脱退',
        '本当に脱退しますか？\n\n※あなたの作業履歴は残りますが、チームの情報にはアクセスできなくなります。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '脱退する',
            style: 'destructive',
            onPress: doLeave,
          },
        ],
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionHeading}>設定</Text>

      {/* Profile Card */}
      {userProfile && (
        <Animated.View entering={FadeInUp.duration(400)} style={styles.profileCard}>
          <Image
            source={{ uri: userProfile.imageUrl || 'https://via.placeholder.com/150' }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userProfile.name}</Text>
            <Text style={styles.profileRole}>{userProfile.role || '役割未設定'}</Text>
          </View>
        </Animated.View>
      )}

      {/* Workspace Info */}
      {company && (
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.workspaceCard}>
          <View style={styles.workspaceHeader}>
            <Building2 size={20} color="#3b82f6" />
            <Text style={styles.workspaceTitle}>ワークスペース</Text>
          </View>
          <Text style={styles.workspaceName}>{company.name}</Text>
          <View style={styles.inviteCodeRow}>
            <Text style={styles.inviteCodeLabel}>招待コード:</Text>
            <Text style={styles.inviteCode}>{company.inviteCode}</Text>
          </View>
        </Animated.View>
      )}

      {/* Menu Items */}
      <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.menuGroup}>
        {/* Leave Workspace */}
        {company && (
          <TouchableOpacity style={styles.menuItem} onPress={handleLeaveCompany}>
            <User size={20} color="#f59e0b" />
            <View style={styles.menuTextContainer}>
              <Text style={styles.leaveText}>ワークスペースから脱退</Text>
              <Text style={styles.menuSubtext}>別のワークスペースに参加できます</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={[styles.menuItem, styles.lastMenuItem]} onPress={handleSignOut}>
          <LogOut size={20} color="#ef4444" />
          <View style={styles.menuTextContainer}>
            <Text style={styles.signOutText}>ログアウト</Text>
            <Text style={styles.menuSubtext}>アカウントからログアウトします</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* App Info */}
      <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.appInfo}>
        <Text style={styles.appName}>Protoduct</Text>
        <Text style={styles.appVersion}>v1.0.0</Text>
      </Animated.View>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: '#f1f5f9',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  workspaceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  workspaceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  workspaceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 8,
  },
  inviteCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: 2,
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  leaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  appVersion: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
});
