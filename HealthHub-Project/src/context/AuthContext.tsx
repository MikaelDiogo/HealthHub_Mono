import { createContext, useContext, useState } from 'react';

export type UserRole = 'medico' | 'recepcionista' | 'enfermeiro';

interface AuthContextData {
  role: UserRole | null;
  nome: string | null;
  setAuth: (token: string, role: UserRole, nome: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextData>({
  role: null,
  nome: null,
  setAuth: () => {},
  clearAuth: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(
    () => localStorage.getItem('role') as UserRole | null
  );
  const [nome, setNome] = useState<string | null>(() => localStorage.getItem('nome'));

  const setAuth = (token: string, newRole: UserRole, newNome: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', newRole);
    localStorage.setItem('nome', newNome);
    setRole(newRole);
    setNome(newNome);
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('nome');
    setRole(null);
    setNome(null);
  };

  return (
    <AuthContext.Provider value={{ role, nome, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
