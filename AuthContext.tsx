import { createContext, useContext, useState, ReactNode } from 'react';
import { Student } from './types';

interface AuthContextType {
  student: Student | null;
  isAdmin: boolean;
  loginAsStudent: (student: Student) => void;
  loginAsAdmin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const loginAsStudent = (studentData: Student) => {
    setStudent(studentData);
    setIsAdmin(false);
  };

  const loginAsAdmin = () => {
    setIsAdmin(true);
    setStudent(null);
  };

  const logout = () => {
    setStudent(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ student, isAdmin, loginAsStudent, loginAsAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
