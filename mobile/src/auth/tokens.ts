import * as SecureStore from 'expo-secure-store';

// Rule 10: tokens live in secure storage only, never AsyncStorage.
const ACCESS = 'ghartak.access';
const REFRESH = 'ghartak.refresh';

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH);

export async function saveTokens(access: string, refresh?: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
}

export async function clearTokens() {
  await Promise.all([SecureStore.deleteItemAsync(ACCESS), SecureStore.deleteItemAsync(REFRESH)]);
}
