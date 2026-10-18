import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { colors, fonts } from '../lib/theme';

SplashScreen.preventAutoHideAsync();

const screenOptions = {
  headerStyle: { backgroundColor: colors.canvas },
  headerTintColor: colors.textHigh,
  headerTitleStyle: { fontFamily: fonts.headlineSemiBold },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.canvas },
};

export default function RootLayout() {
  // A font failure falls back to the system font rather than blocking the app.
  const [areFontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (areFontsLoaded || fontError) SplashScreen.hideAsync();
  }, [areFontsLoaded, fontError]);

  if (!areFontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ title: 'Player' }} />
      </Stack>
    </>
  );
}
