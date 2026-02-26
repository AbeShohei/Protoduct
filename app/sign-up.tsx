import { useSignUp } from '@clerk/clerk-expo';
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
import { Mail, Lock, Eye, EyeOff, CheckCircle, UserPlus } from 'lucide-react-native';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.match(/[a-z]/)) strength++;
    if (pwd.match(/[A-Z]/)) strength++;
    if (pwd.match(/[0-9]/)) strength++;
    if (pwd.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthColor = () => {
    if (passwordStrength <= 1) return '#ef4444';
    if (passwordStrength <= 2) return '#f59e0b';
    if (passwordStrength <= 3) return '#eab308';
    return '#22c55e';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return '弱い';
    if (passwordStrength <= 2) return '普通';
    if (passwordStrength <= 3) return '良い';
    return '強い';
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!validateEmail(emailAddress)) {
      setEmailError('有効なメールアドレスを入力してください');
      return;
    }
    setEmailError('');

    if (password.length < 8) {
      Alert.alert('エラー', 'パスワードは8文字以上で入力してください');
      return;
    }

    setIsLoading(true);
    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      const msg = err.errors?.[0]?.message || '登録に失敗しました';
      Alert.alert('登録エラー', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    if (code.length !== 6) {
      Alert.alert('エラー', '6桁のコードを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/(tabs)');
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
        Alert.alert('認証エラー', '追加情報が必要です');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      const msg = err.errors?.[0]?.message || '認証に失敗しました';
      Alert.alert('認証エラー', msg);
    } finally {
      setIsLoading(false);
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
              <UserPlus size={32} color="#fff" />
            </View>
          </View>
          <Text style={styles.appName}>Protoduct</Text>
          <Text style={styles.tagline}>チームの時間を、もっとスマートに</Text>
        </View>

        {!pendingVerification ? (
          /* SIGN UP FORM */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>アカウント作成</Text>
              <Text style={styles.subtitle}>無料で始めましょう</Text>
            </View>

            <View style={styles.form}>
              {/* EMAIL INPUT */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>メールアドレス</Text>
                <View style={[styles.inputWrapper, emailError && styles.inputError]}>
                  <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="name@example.com"
                    placeholderTextColor="#cbd5e1"
                    onChangeText={(email) => {
                      setEmailAddress(email);
                      setEmailError('');
                    }}
                    style={styles.input}
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>
                {emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              {/* PASSWORD INPUT */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>パスワード</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    placeholder="8文字以上"
                    placeholderTextColor="#cbd5e1"
                    secureTextEntry={!showPassword}
                    onChangeText={setPassword}
                    style={styles.input}
                    autoComplete="password-new"
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

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthSegment,
                            i <= passwordStrength && { backgroundColor: getStrengthColor() },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
                      {getStrengthLabel()}
                    </Text>
                  </View>
                )}
              </View>

              {/* SIGN UP BUTTON */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={onSignUpPress}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? '処理中...' : 'アカウントを作成'}
                </Text>
              </TouchableOpacity>

              {/* TERMS */}
              <Text style={styles.termsText}>
                アカウントを作成することで、
                <Text style={styles.termsLink}>利用規約</Text>と
                <Text style={styles.termsLink}>プライバシーポリシー</Text>に同意したものとみなされます
              </Text>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>すでにアカウントをお持ちですか？</Text>
              <TouchableOpacity onPress={() => router.replace('/sign-in')}>
                <Text style={styles.linkText}>ログイン</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* VERIFICATION FORM */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.verifyIcon}>
                <Mail size={32} color="#22c55e" />
              </View>
              <Text style={styles.title}>メールを確認</Text>
              <Text style={styles.subtitle}>
                <Text style={styles.emailHighlight}>{emailAddress}</Text> に送信された6桁のコードを入力してください
              </Text>
            </View>

            <View style={styles.form}>
              {/* CODE INPUT */}
              <View style={styles.codeContainer}>
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
                onPress={onPressVerify}
                disabled={code.length !== 6 || isLoading}
              >
                <CheckCircle size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {isLoading ? '確認中...' : '認証を完了する'}
                </Text>
              </TouchableOpacity>

              {/* RESEND */}
              <TouchableOpacity style={styles.resendButton}>
                <Text style={styles.resendText}>コードを再送信</Text>
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
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
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
  verifyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emailHighlight: {
    color: '#22c55e',
    fontWeight: '600',
  },
  form: {
    gap: 20,
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
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
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
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  strengthSegment: {
    flex: 1,
    height: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  termsLink: {
    color: '#22c55e',
    fontWeight: '600',
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
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
  },
  codeContainer: {
    alignItems: 'center',
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
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
