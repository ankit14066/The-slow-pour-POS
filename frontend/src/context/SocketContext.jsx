import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to Socket.io server:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
