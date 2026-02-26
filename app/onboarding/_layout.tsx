import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: 'プロフィール作成',
          headerBackVisible: false, // Prevent going back to sign-in
        }}
      />
      <Stack.Screen
        name="company"
        options={{
          headerShown: true,
          title: '会社の作成・参加',
          headerBackVisible: false, // Prevent going back without finishing
        }}
      />
    </Stack>
  );
}
