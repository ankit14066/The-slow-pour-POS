import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sp_token') || null);

  const saveAuth = (token, user) => {
    localStorage.setItem('sp_token', token);
    localStorage.setItem('sp_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    saveAuth(res.data.token, res.data.user);
    return res.data.user;
  }, []);

  const pinLogin = useCallback(async (email, pin) => {
    const res = await api.post('/auth/pin-login', { email, pin });
    saveAuth(res.data.token, res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    setToken(null);
    setUser(null);
    toast.success('Logged out');
  }, []);

  const startShift = useCallback(async () => {
    const res = await api.post('/auth/shift/start');
    toast.success('Shift started');
    if (res.data?.user) {
      setUser(res.data.user);
      localStorage.setItem('sp_user', JSON.stringify(res.data.user));
    }
    return res.data;
  }, []);

  const endShift = useCallback(async () => {
    const res = await api.post('/auth/shift/end');
    toast.success(`Shift ended (${res.data?.durationHours || 0} hrs)`);
    if (res.data?.user) {
      setUser(res.data.user);
      localStorage.setItem('sp_user', JSON.stringify(res.data.user));
    }
    return res.data;
  }, []);

  useEffect(() => {
    const syncUser = async () => {
      if (!token) return;
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('sp_user', JSON.stringify(res.data.user));
        }
      } catch {
        // global interceptor handles unauthorized flow
      }
    };
    syncUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, pinLogin, logout, startShift, endShift }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
