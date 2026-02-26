import { ClerkProvider } from '@clerk/clerk-expo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (_err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (_err) {
      return;
    }
  },
};

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL || 'https://temp.convex.cloud',
);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing Clerk Publishable Key');
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ConvexProvider client={convex}>
        <RootLayoutNav />
      </ConvexProvider>
    </ClerkProvider>
  );
}

import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import { ToastProvider } from '@/components/Toast';
import { api } from '@/convex/_generated/api';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoaded, isSignedIn, userId } = useAuth();

  // Use actual Convex API to fetch current user profile. Skip query if userId is not ready.
  const userProfile = useQuery(api.users.get, userId ? { clerkId: userId } : 'skip');

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === 'sign-in' || segments[0] === 'sign-up';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!isSignedIn && !inAuthGroup) {
      // User is not signed in and trying to access app screens: redirect to sign-in
      router.replace('/sign-in');
    } else if (isSignedIn) {
      // Wait for mock query to evaluate...
      if (userProfile === null) {
        // userProfile is not yet created. Send to profile setup.
        if (segments[1] !== 'profile') {
          router.replace('/onboarding/profile');
        }
      } else if (userProfile && !userProfile.companyId) {
        // userProfile exists, but no companyId. Send to company setup.
        if (segments[1] !== 'company') {
          router.replace('/onboarding/company');
        }
      } else if (userProfile?.companyId) {
        // User is fully setup. Redirect them out of auth / onboarding screens.
        if (inAuthGroup || inOnboardingGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [isSignedIn, isLoaded, segments, userProfile, router.replace]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="project" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}
