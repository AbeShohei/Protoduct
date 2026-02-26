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

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  // start the sign up process.
  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // send the email.
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // change the UI to our pending section.
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      const msg = err.errors?.[0]?.message || err.message;
      Alert.alert('Sign Up Error', msg);
    }
  };

  // This verifies the user using email code that is delivered.
  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/(tabs)');
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
        Alert.alert('Verification incomplete', 'You may need to provide more info');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      const msg = err.errors?.[0]?.message || err.message;
      Alert.alert('Verification Error', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>アカウント作成</Text>

          {!pendingVerification && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>メールアドレス</Text>
                <TextInput
                  autoCapitalize="none"
                  value={emailAddress}
                  placeholder="name@example.com"
                  onChangeText={(email) => setEmailAddress(email)}
                  style={styles.input}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>パスワード</Text>
                <TextInput
                  value={password}
                  placeholder="パスワードを入力"
                  secureTextEntry={true}
                  onChangeText={(password) => setPassword(password)}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={onSignUpPress}>
                <Text style={styles.buttonText}>続行する</Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>すでにアカウントをお持ちですか？</Text>
                <TouchableOpacity onPress={() => router.replace('/sign-in')}>
                  <Text style={styles.linkText}> ログイン</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {pendingVerification && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>認証コード</Text>
                <Text style={styles.subLabel}>メールに届いたコードを入力してください</Text>
                <TextInput
                  value={code}
                  placeholder="123456"
                  onChangeText={(code) => setCode(code)}
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={onPressVerify}>
                <Text style={styles.buttonText}>メールを認証する</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
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
    color: '#555',
  },
  subLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
