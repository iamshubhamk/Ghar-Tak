import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@ghartak_access_token';
const USER_KEY = '@ghartak_user_data';

export const saveToken = async (token: string): Promise<void> => {
  try {
    if (!token) {
      console.warn('saveToken called with null/undefined token');
      return;
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save access token', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get access token', error);
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to clear session', error);
  }
};

export const saveUserData = async (userData: any): Promise<void> => {
  try {
    if (!userData) {
      console.warn('saveUserData called with null/undefined userData');
      return;
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to save user data', error);
  }
};


export const getUserData = async (): Promise<any | null> => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to get user data', error);
    return null;
  }
};

