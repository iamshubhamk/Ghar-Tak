import '../i18n';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Mukta_400Regular, Mukta_600SemiBold, Mukta_700Bold } from '@expo-google-fonts/mukta';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

// Cached data stays visible on patchy networks; two retries with backoff.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000, gcTime: 24 * 3600_000 } },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Mukta_400Regular, Mukta_600SemiBold, Mukta_700Bold });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
