import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '@/convex/_generated/api';

export default function CompanySetupScreen() {
  const { userId } = useAuth();
  const router = useRouter();

  const createCompany = useMutation(api.companies.create);
  const joinCompany = useMutation(api.users.joinCompany);

  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [error, setError] = useState<string | null>(null);

  // Query company by invite code (only when user is trying to join)
  const companyByCode = useQuery(
    api.companies.getByInviteCode,
    activeTab === 'join' && inviteCode.trim().length === 6
      ? { inviteCode: inviteCode.trim().toUpperCase() }
      : 'skip',
  );

  const handleCreate = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createCompany({
        name: companyName.trim(),
        creatorClerkId: userId || '',
      });
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      setError('会社の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // The company should already be queried via useQuery above
      if (!companyByCode) {
        setError('招待コードが見つかりません');
        setLoading(false);
        return;
      }

      await joinCompany({
        clerkId: userId || '',
        companyId: companyByCode._id,
      });
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      setError('参加に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const showError = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('エラー', message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>ワークスペースの設定</Text>
          <Text style={styles.subtitle}>あなたが所属するワークスペースを設定します。</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.tabActive]}
            onPress={() => {
              setActiveTab('create');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
              新規作成
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'join' && styles.tabActive]}
            onPress={() => {
              setActiveTab('join');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'join' && styles.tabTextActive]}>
              招待で参加
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'create' ? (
          <View style={styles.formContainer}>
            <Text style={styles.label}>新しいワークスペースを作成</Text>
            <Text style={styles.hint}>
              組織の代表として新しいワークスペースを作成します。作成後、他のメンバーを招待できます。
            </Text>
            <TextInput
              style={styles.input}
              placeholder="会社名またはチーム名"
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TouchableOpacity
              style={[styles.button, (!companyName.trim() || loading) && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={!companyName.trim() || loading}
            >
              <Text style={styles.buttonText}>
                {loading ? '作成中...' : 'ワークスペースを作成'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.label}>招待コードで参加</Text>
            <Text style={styles.hint}>管理者から共有された6桁の英数字を入力してください。</Text>
            <TextInput
              style={[
                styles.input,
                styles.codeInput,
                companyByCode && styles.codeInputValid,
                inviteCode.trim().length === 6 && companyByCode === null && styles.codeInputInvalid,
              ]}
              placeholder="A1B2C3"
              value={inviteCode}
              onChangeText={(text) => {
                setInviteCode(text.toUpperCase());
                setError(null);
              }}
              autoCapitalize="characters"
              maxLength={6}
            />

            {/* Status indicator */}
            {inviteCode.trim().length === 6 && (
              <View style={styles.codeStatus}>
                {companyByCode ? (
                  <View style={styles.codeValid}>
                    <Text style={styles.codeValidText}>✓ 「{companyByCode.name}」が見つかりました</Text>
                  </View>
                ) : (
                  <View style={styles.codeInvalid}>
                    <Text style={styles.codeInvalidText}>招待コードが見つかりません</Text>
                  </View>
                )}
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                (!inviteCode.trim() || loading || !companyByCode) && styles.buttonDisabled,
              ]}
              onPress={handleJoin}
              disabled={!inviteCode.trim() || loading || !companyByCode}
            >
              <Text style={styles.buttonText}>
                {loading ? '参加中...' : '参加する'}
              </Text>
            </TouchableOpacity>
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
  scroll: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    color: '#0f172a',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  codeInputValid: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  codeInputInvalid: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  codeStatus: {
    marginBottom: 16,
  },
  codeValid: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeValidText: {
    color: '#166534',
    fontWeight: '600',
    fontSize: 14,
  },
  codeInvalid: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeInvalidText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
