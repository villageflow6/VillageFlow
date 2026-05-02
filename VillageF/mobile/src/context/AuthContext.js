import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (token && userData) {
        // Optionally: Validate token with backend here
        try {
          const response = await api.get('/system/check');
          if (response.status === 200) {
             setUser(JSON.parse(userData));
          } else {
             await logout();
          }
        } catch (e) {
           await logout();
        }
      }
    } catch (e) {
      console.error('Failed to load auth status', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, token) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (e) {
      console.error('Failed to save auth data', e);
      throw e;
    }
  };

  const logout = async () => {
    console.log("🏃 Logging out...");
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (e) {
      console.error('Failed to clear auth data', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
