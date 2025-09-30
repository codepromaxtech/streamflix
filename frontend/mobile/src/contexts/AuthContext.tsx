import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keychain } from 'react-native-keychain';
import DeviceInfo from 'react-native-device-info';
import { apolloClient } from '../services/apollo-client';
import { authService } from '../services/auth-service';
import { biometricService } from '../services/biometric-service';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription?: {
    plan: 'free' | 'premium';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  loginWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check for stored authentication
      const storedAuth = await AsyncStorage.getItem('auth_data');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        
        // Verify token is still valid
        const isValid = await authService.verifyToken(authData.token);
        if (isValid) {
          setUser(authData.user);
        } else {
          // Try to refresh token
          const refreshed = await refreshToken();
          if (!refreshed) {
            await logout();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe = false): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Get device information for security
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();
      
      const response = await authService.login({
        email,
        password,
        deviceId,
        deviceName,
        rememberMe,
      });

      if (response.success && response.user && response.token) {
        setUser(response.user);
        
        // Store authentication data
        const authData = {
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
        };
        
        await AsyncStorage.setItem('auth_data', JSON.stringify(authData));
        
        // Store credentials securely for biometric login if enabled
        if (rememberMe) {
          await Keychain.setInternetCredentials(
            'streamflix_auth',
            email,
            password
          );
        }
        
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();
      
      const response = await authService.register({
        email,
        password,
        name,
        deviceId,
        deviceName,
      });

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call logout API
      await authService.logout();
      
      // Clear local storage
      await AsyncStorage.removeItem('auth_data');
      await Keychain.resetInternetCredentials('streamflix_auth');
      
      // Reset Apollo Client cache
      await apolloClient.clearStore();
      
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedAuth = await AsyncStorage.getItem('auth_data');
      if (!storedAuth) return false;
      
      const authData = JSON.parse(storedAuth);
      const response = await authService.refreshToken(authData.refreshToken);
      
      if (response.success && response.token) {
        const updatedAuthData = {
          ...authData,
          token: response.token,
          refreshToken: response.refreshToken,
        };
        
        await AsyncStorage.setItem('auth_data', JSON.stringify(updatedAuthData));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const enableBiometric = async (): Promise<boolean> => {
    try {
      const isAvailable = await biometricService.isAvailable();
      if (!isAvailable) {
        return false;
      }
      
      const credentials = await Keychain.getInternetCredentials('streamflix_auth');
      if (!credentials) {
        return false;
      }
      
      // Test biometric authentication
      const biometricResult = await biometricService.authenticate('Enable biometric login');
      if (biometricResult.success) {
        await AsyncStorage.setItem('biometric_enabled', 'true');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Biometric enable error:', error);
      return false;
    }
  };

  const loginWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
      if (biometricEnabled !== 'true') {
        return { success: false, error: 'Biometric login not enabled' };
      }
      
      const biometricResult = await biometricService.authenticate('Login with biometric');
      if (!biometricResult.success) {
        return { success: false, error: 'Biometric authentication failed' };
      }
      
      const credentials = await Keychain.getInternetCredentials('streamflix_auth');
      if (!credentials) {
        return { success: false, error: 'No stored credentials found' };
      }
      
      return await login(credentials.username, credentials.password, true);
    } catch (error) {
      console.error('Biometric login error:', error);
      return { success: false, error: 'Biometric login failed' };
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.updateProfile(data);
      
      if (response.success && response.user) {
        setUser(response.user);
        
        // Update stored auth data
        const storedAuth = await AsyncStorage.getItem('auth_data');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          authData.user = response.user;
          await AsyncStorage.setItem('auth_data', JSON.stringify(authData));
        }
        
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Profile update failed' };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    enableBiometric,
    loginWithBiometric,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
