import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Bypass Vite proxy during development to avoid ECONNABORTED errors, 
    // but use the current hostname to allow other devices on the LAN to connect.
    const isDev = import.meta.env.MODE === 'development';
    const socketUrl = isDev ? `http://${window.location.hostname}:5001` : '';
    
    const newSocket = io(socketUrl, {
      path: '/socket.io/', // Explicitly defined path
      transports: ['websocket', 'polling'], // Fallback to polling if needed
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying
      timeout: 20000,
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
