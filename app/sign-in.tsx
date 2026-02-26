import { useSignIn } from '@clerk/clerk-expo';
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
import { Mail, Lock, Eye, EyeOff, LogIn, Shield } from 'lucide-react-native';

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pending2FA, setPending2FA] = useState(false);
  const [code, setCode] = useState('');

  const onSignInPress = async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      console.log('Sign in status:', signInAttempt.status);
      console.log('Sign in response:', JSON.stringify(signInAttempt, null, 2));

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/(tabs)');
      } else if (signInAttempt.status === 'needs_second_factor') {
        // Prepare the second factor - this sends the email code
        try {
          await signIn.prepareSecondFactor({ strategy: 'email_code' });
          setPending2FA(true);
          Alert.alert('認証コード送信', 'メールに認証コードを送信しました。');
        } catch (prepErr: any) {
          console.error('Prepare 2FA error:', prepErr);
          // Even if prepare fails, show the 2FA screen (code might already be sent)
          setPending2FA(true);
        }
      } else {
        console.error('Unexpected status:', signInAttempt.status);
        Alert.alert('エラー', `認証が必要です: ${signInAttempt.status}`);
      }
    } catch (err: any) {
      console.error('Sign in error:', JSON.stringify(err, null, 2));
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'ログインに失敗しました';
      Alert.alert('ログインエラー', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify2FA = async () => {
    if (!isLoaded || !code) return;

    setIsLoading(true);
    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      });

      console.log('2FA attempt status:', signInAttempt.status);

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        console.error('2FA not complete:', JSON.stringify(signInAttempt, null, 2));
        Alert.alert('エラー', '認証に失敗しました。もう一度お試しください。');
      }
    } catch (err: any) {
      console.error('2FA error:', JSON.stringify(err, null, 2));
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || '認証コードが正しくありません';
      Alert.alert('認証エラー', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (!isLoaded) return;
    try {
      await signIn.prepareSecondFactor({ strategy: 'email_code' });
      Alert.alert('送信完了', '認証コードを再送信しました。');
    } catch (err: any) {
      console.error('Resend error:', err);
      Alert.alert('エラー', '再送信に失敗しました。');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              {pending2FA ? <Shield size={32} color="#fff" /> : <LogIn size={32} color="#fff" />}
            </View>
          </View>
          <Text style={styles.appName}>Protoduct</Text>
          <Text style={styles.tagline}>
            {pending2FA ? '2段階認証' : 'おかえりなさい'}
          </Text>
        </View>

        {!pending2FA ? (
          /* SIGN IN FORM */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>ログイン</Text>
              <Text style={styles.subtitle}>アカウントにアクセスしましょう</Text>
            </View>

            <View style={styles.form}>
              {/* EMAIL INPUT */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>メールアドレス</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="name@example.com"
                    placeholderTextColor="#cbd5e1"
                    onChangeText={(email) => setEmailAddress(email)}
                    style={styles.input}
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* PASSWORD INPUT */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>パスワード</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    placeholder="パスワードを入力"
                    placeholderTextColor="#cbd5e1"
                    secureTextEntry={!showPassword}
                    onChangeText={(password) => setPassword(password)}
                    style={styles.input}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* SIGN IN BUTTON */}
              <TouchableOpacity
                style={[styles.button, (!emailAddress || !password || isLoading) && styles.buttonDisabled]}
                onPress={onSignInPress}
                disabled={!emailAddress || !password || isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'ログイン中...' : 'ログイン'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>アカウントをお持ちでないですか？</Text>
              <TouchableOpacity onPress={() => router.replace('/sign-up')}>
                <Text style={styles.linkText}>新規登録</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* 2FA FORM */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>認証コードを入力</Text>
              <Text style={styles.subtitle}>
                <Text style={styles.emailHighlight}>{emailAddress}</Text> に送信された6桁のコードを入力してください
              </Text>
            </View>

            <View style={styles.form}>
              {/* CODE INPUT */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>認証コード</Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  style={styles.codeInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor="#cbd5e1"
                  textAlign="center"
                />
              </View>

              {/* VERIFY BUTTON */}
              <TouchableOpacity
                style={[styles.button, (code.length !== 6 || isLoading) && styles.buttonDisabled]}
                onPress={onVerify2FA}
                disabled={code.length !== 6 || isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? '認証中...' : '認証する'}
                </Text>
              </TouchableOpacity>

              {/* RESEND BUTTON */}
              <TouchableOpacity style={styles.resendButton} onPress={resendCode}>
                <Text style={styles.resendButtonText}>認証コードを再送信</Text>
              </TouchableOpacity>

              {/* BACK BUTTON */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setPending2FA(false);
                  setCode('');
                }}
              >
                <Text style={styles.backButtonText}>戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* BOTTOM SPACER */}
        <View style={styles.bottomSpacer} />
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
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  eyeButton: {
    padding: 4,
  },
  codeInput: {
    width: '100%',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 16,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 40,
  },
});
