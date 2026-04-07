import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Bypass Vite proxy during development to avoid ECONNABORTED errors
    const isDev = import.meta.env.MODE === 'development';
    const socketUrl = isDev ? 'http://localhost:5001' : '';
    const newSocket = io(socketUrl, {
      path: '/socket.io/', // Explicitly defined path
      transports: ['websocket'], // Use WebSocket primarily
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10, // Increased for better recovery
      timeout: 20000, // Matching proxy timeouts
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinMatch = useCallback((matchId) => {
    if (socket) {
      socket.emit('joinMatch', matchId);
      console.log('Emitted joinMatch for:', matchId);
    }
  }, [socket]);

  const leaveMatch = useCallback((matchId) => {
    if (socket) {
      socket.emit('leaveMatch', matchId);
      console.log('Emitted leaveMatch for:', matchId);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, joinMatch, leaveMatch }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
