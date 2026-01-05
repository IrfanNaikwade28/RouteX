import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/data/mockData';
import { authAPI } from '@/lib/api';
import { AxiosError } from 'axios';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, role: UserRole, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('currentUser');
    const tokens = localStorage.getItem('tokens');
    
    if (storedUser && tokens) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('tokens');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.login({ email, password, role });

      const { user, tokens } = response.data;

      // Map backend user data to frontend User structure
      const userData: User = {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role || role,
        phone: user.phone_number,
        password: '', // Don't store password
      };

      // Store tokens and user data
      localStorage.setItem('tokens', JSON.stringify(tokens));
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; errors?: any }>;
      
      if (axiosError.response) {
        const errorMessage = axiosError.response.data?.message || 
                           axiosError.response.data?.errors?.non_field_errors?.[0] ||
                           'Login failed. Please check your credentials.';
        return { success: false, error: errorMessage };
      }
      
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Backend only supports client registration for now
      if (!phone) {
        return { success: false, error: 'Phone number is required' };
      }

      const response = await authAPI.register({
        full_name: name,
        email,
        password,
        phone_number: phone,
        role,
      });

      const { user, tokens } = response.data;

      // Map backend user data to frontend User structure
      const userData: User = {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role || role,
        phone: user.phone_number,
        password: '', // Don't store password
      };

      // Store tokens and user data
      localStorage.setItem('tokens', JSON.stringify(tokens));
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; errors?: any }>;
      
      if (axiosError.response) {
        const errors = axiosError.response.data?.errors;
        
        // Handle specific field errors
        if (errors) {
          if (errors.email) {
            return { success: false, error: errors.email[0] };
          }
          if (errors.phone_number) {
            return { success: false, error: errors.phone_number[0] };
          }
          if (errors.password) {
            return { success: false, error: errors.password[0] };
          }
        }
        
        const errorMessage = axiosError.response.data?.message || 
                           'Registration failed. Please try again.';
        return { success: false, error: errorMessage };
      }
      
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
