import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Use relative path to let Vite proxy handle the connection to the correct port (5001)
    const socketUrl = ''; 
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
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
