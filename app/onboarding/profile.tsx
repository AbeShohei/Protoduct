import { useAuth } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
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
import { api } from '@/convex/_generated/api';

export default function ProfileSetupScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const createProfile = useMutation(api.users.createProfile);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only allow images
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 0.8, // Better quality now that we don't use base64
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      let storageId: string | undefined;

      if (imageUri) {
        // 1. Get a short-lived upload URL
        const uploadUrl = await generateUploadUrl();

        // 2. Fetch the local image as a Blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // 3. POST the file to Convex
        const uploadResult = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'image/jpeg' },
          body: blob,
        });

        if (!uploadResult.ok) {
          throw new Error('Failed to upload image');
        }

        const json = await uploadResult.json();
        storageId = json.storageId;
      }

      await createProfile({
        clerkId: userId || '',
        name,
        role,
        storageId: storageId as any,
        imageUrl: imageUri ? undefined : 'https://via.placeholder.com/150',
      });
      router.replace('/onboarding/company');
    } catch (e) {
      console.error(e);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>ようこそ！</Text>
          <Text style={styles.subtitle}>まずはあなたのプロフィールを作成しましょう。</Text>
        </View>

        <View style={styles.form}>
          {/* Image Picker Section */}
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.profileImage} />
              ) : (
                <View style={styles.iconContainer}>
                  <Camera size={32} color="#94a3b8" />
                  <Text style={styles.uploadText}>画像を選択</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>名前 (必須)</Text>
            <TextInput
              style={styles.input}
              placeholder="山田 太郎"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>役職/ロール</Text>
            <TextInput
              style={styles.input}
              placeholder="フロントエンドエンジニア"
              value={role}
              onChangeText={setRole}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || loading}
          >
            <Text style={styles.buttonText}>{loading ? '保存中...' : '次へ進む'}</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 40,
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
  form: {
    gap: 20,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  iconContainer: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
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
