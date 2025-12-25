import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, role: UserRole) => {
    // Simulating backend response based on role
    let userData: User;

    if (role === UserRole.SuperAdmin) {
      userData = {
        id: 'sa1',
        name: 'المشرف العام',
        email: email,
        role: UserRole.SuperAdmin
      };
    } else if (role === UserRole.Admin) {
      userData = {
        id: 'ad1',
        name: 'مدير المركز',
        email: email,
        role: UserRole.Admin,
        centerName: 'مركز الأمل للتخاطب'
      };
    } else {
      userData = {
        id: 'sp1',
        name: 'د. محمد عبدالله',
        email: email,
        role: UserRole.Specialist,
        centerName: 'مركز الأمل للتخاطب'
      };
    }

    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (isLoading) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);