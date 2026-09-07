import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getToken, saveToken, saveUserData, removeToken, getUserData } from '../utils/storage';
import { loginApi, registerCustomerApi, registerProviderApi, getMeApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email?: string; phone?: string; password: string }) => Promise<User>;
  registerCustomer: (payload: any) => Promise<User>;
  registerProvider: (payload: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedToken = await getToken();
        const storedUser = await getUserData();

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            setUser(storedUser);
          }
          // Validate with server
          try {
            const me = await getMeApi();
            setUser(me);
            await saveUserData(me);
          } catch (e) {
            console.warn('Stored token invalid or expired');
            await removeToken();
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error bootstrapping auth', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (credentials: { email?: string; phone?: string; password: string }) => {
    setIsLoading(true);
    try {
      const data = await loginApi(credentials);
      const accessToken = data?.access_token;
      const userData = data?.user;

      if (!accessToken || !userData) {
        throw new Error('Server returned incomplete auth response (missing token or user profile).');
      }

      await saveToken(accessToken);
      await saveUserData(userData);

      setToken(accessToken);
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (payload: any) => {
    setIsLoading(true);
    try {
      const data = await registerCustomerApi(payload);
      const accessToken = data?.access_token;
      const userData = data?.user;

      if (!accessToken || !userData) {
        throw new Error('Server returned incomplete registration response.');
      }

      await saveToken(accessToken);
      await saveUserData(userData);

      setToken(accessToken);
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const registerProvider = async (payload: any) => {
    setIsLoading(true);
    try {
      const data = await registerProviderApi(payload);
      const accessToken = data?.access_token;
      const userData = data?.user;

      if (!accessToken || !userData) {
        throw new Error('Server returned incomplete registration response.');
      }

      await saveToken(accessToken);
      await saveUserData(userData);

      setToken(accessToken);
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };


  const logout = async () => {
    setIsLoading(true);
    try {
      await removeToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const me = await getMeApi();
      setUser(me);
      await saveUserData(me);
      return me;
    } catch (e) {
      console.error('Failed to refresh user profile', e);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerCustomer,
        registerProvider,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
