import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sportify_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('sportify_user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('sportify_token', newToken);
    localStorage.setItem('sportify_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return res.data;
  };

  const signup = async (name, email, password, role) => {
    const res = await api.post('/auth/signup', { name, email, password, role });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('sportify_token', newToken);
    localStorage.setItem('sportify_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('sportify_token');
    localStorage.removeItem('sportify_user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';
  const isOrganizer = () => user?.role === 'organizer';
  const isViewer = () => user?.role === 'viewer';
  const canManage = () => isAdmin() || isOrganizer();

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, signup, logout,
      isAdmin, isOrganizer, isViewer, canManage,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
