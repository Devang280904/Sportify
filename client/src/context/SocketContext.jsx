import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
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

  const joinMatch = (matchId) => {
    if (socket) socket.emit('joinMatch', matchId);
  };

  const leaveMatch = (matchId) => {
    if (socket) socket.emit('leaveMatch', matchId);
  };

  return (
    <SocketContext.Provider value={{ socket, joinMatch, leaveMatch }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
